import {
  TransitDomainError,
  type BoardTransitRequest,
  type TransitAlightRequest,
  type TransitCatalog,
  type TransitDeparture,
  type TransitRoute,
  type TransitSchedule,
  type TransitServiceTime,
  type TransitStop,
  type TransitStopEvent,
  type TransitSystemState,
  type TransitTripState,
  type TransitVehicleState,
  type TransitVehicleUpdate,
} from './types';

const activeTripStatuses = new Set<TransitTripState['status']>([
  'boarded',
  'riding',
  'ready-to-alight',
]);

const transitVehiclePhases = new Set<TransitVehicleState['phase']>([
  'out-of-service',
  'boarding',
  'dwelling',
  'in-transit',
]);

const transitTripStatuses = new Set<TransitTripState['status']>([
  ...activeTripStatuses,
  'completed',
  'completed-early',
  'cancelled',
]);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteInteger(value: unknown, minimum = 0): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum;
}

function validateServiceTime(time: TransitServiceTime): void {
  if (!isFiniteInteger(time.serviceDay) || time.serviceDay > 6) {
    throw new TransitDomainError('INVALID_TIME', 'Service day must be an integer from 0 through 6.');
  }
  if (!isFiniteInteger(time.serviceMinute)) {
    throw new TransitDomainError('INVALID_TIME', 'Service minute must be a non-negative integer.');
  }
}

function nextStopIndex(route: TransitRoute, currentStopIndex: number): number {
  const next = currentStopIndex + 1;
  if (next < route.stopIds.length) return next;
  if (route.loop) return 0;
  throw new TransitDomainError('INVALID_TRANSITION', `${route.publicName} is at its terminal stop.`);
}

function stopOffsetMinutes(route: TransitRoute, stopIndex: number): number {
  let offset = 0;
  for (let index = 0; index < stopIndex; index += 1) {
    offset += route.segmentTravelMinutes[index] + route.dwellMinutes[index + 1];
  }
  return offset;
}

function validateCatalog(catalog: TransitCatalog): void {
  const stopIds = new Set<string>();
  for (const stop of catalog.stops) {
    if (!isNonEmptyText(stop.id) || !isNonEmptyText(stop.name) || stopIds.has(stop.id)) {
      throw new TransitDomainError('INVALID_CATALOG', 'Transit stops require unique non-empty ids and names.');
    }
    stopIds.add(stop.id);
  }

  const routeIds = new Set<string>();
  for (const route of catalog.routes) {
    if (!isNonEmptyText(route.id) || !isNonEmptyText(route.publicName) || routeIds.has(route.id)) {
      throw new TransitDomainError('INVALID_CATALOG', 'Transit routes require unique non-empty ids and names.');
    }
    if (route.stopIds.length < 2 || route.stopIds.some((id) => !stopIds.has(id))) {
      throw new TransitDomainError('INVALID_CATALOG', `${route.id} references an unknown stop or has too few stops.`);
    }
    const expectedSegments = route.loop ? route.stopIds.length : route.stopIds.length - 1;
    if (
      route.segmentTravelMinutes.length !== expectedSegments ||
      route.segmentTravelMinutes.some((minutes) => !isFiniteInteger(minutes, 1)) ||
      route.dwellMinutes.length !== route.stopIds.length ||
      route.dwellMinutes.some((minutes) => !isFiniteInteger(minutes))
    ) {
      throw new TransitDomainError('INVALID_CATALOG', `${route.id} has invalid segment or dwell timing.`);
    }
    routeIds.add(route.id);
  }

  const scheduleIds = new Set<string>();
  for (const schedule of catalog.schedules) {
    if (!isNonEmptyText(schedule.id) || scheduleIds.has(schedule.id) || !routeIds.has(schedule.routeId)) {
      throw new TransitDomainError('INVALID_CATALOG', 'Transit schedules require unique ids and known routes.');
    }
    if (
      !isNonEmptyText(schedule.timezone) ||
      schedule.serviceDays.length === 0 ||
      schedule.serviceDays.some((day) => !isFiniteInteger(day) || day > 6) ||
      schedule.windows.length === 0 ||
      schedule.windows.some(
        (window) =>
          !isFiniteInteger(window.startMinute) ||
          !isFiniteInteger(window.endMinute, 1) ||
          window.endMinute <= window.startMinute ||
          !isFiniteInteger(window.headwayMinutes, 1),
      )
    ) {
      throw new TransitDomainError('INVALID_CATALOG', `${schedule.id} has invalid service timing.`);
    }
    scheduleIds.add(schedule.id);
  }

  const vehicleIds = new Set<string>();
  for (const vehicle of catalog.vehicles) {
    const route = catalog.routes.find((candidate) => candidate.id === vehicle.routeId);
    if (
      !isNonEmptyText(vehicle.id) ||
      vehicleIds.has(vehicle.id) ||
      !route ||
      !route.stopIds.includes(vehicle.initialStopId) ||
      !isFiniteInteger(vehicle.capacity, 1)
    ) {
      throw new TransitDomainError('INVALID_CATALOG', 'Transit vehicles require unique ids, valid routes and valid capacity.');
    }
    vehicleIds.add(vehicle.id);
  }
}

export class TransitSystem {
  readonly #catalog: TransitCatalog;
  readonly #stops: Map<string, TransitStop>;
  readonly #routes: Map<string, TransitRoute>;
  readonly #schedulesByRoute: Map<string, TransitSchedule[]>;
  #state: TransitSystemState;

  constructor(catalog: TransitCatalog, state?: TransitSystemState) {
    validateCatalog(catalog);
    this.#catalog = clone(catalog);
    this.#stops = new Map(this.#catalog.stops.map((stop) => [stop.id, stop]));
    this.#routes = new Map(this.#catalog.routes.map((route) => [route.id, route]));
    this.#schedulesByRoute = new Map();
    for (const schedule of this.#catalog.schedules) {
      const schedules = this.#schedulesByRoute.get(schedule.routeId) ?? [];
      schedules.push(schedule);
      this.#schedulesByRoute.set(schedule.routeId, schedules);
    }
    this.#state = state ? this.#validatedState(state) : this.#createInitialState();
  }

  snapshot(): TransitSystemState {
    return clone(this.#state);
  }

  listStops(): readonly TransitStop[] {
    return clone(this.#catalog.stops);
  }

  listRoutes(): readonly TransitRoute[] {
    return clone(this.#catalog.routes);
  }

  getVehicle(vehicleId: string): TransitVehicleState {
    return clone(this.#vehicle(vehicleId));
  }

  getTrip(tripId: string): TransitTripState {
    return clone(this.#trip(tripId));
  }

  departuresFrom(stopId: string, from: TransitServiceTime, horizonMinutes = 90): readonly TransitDeparture[] {
    validateServiceTime(from);
    if (!this.#stops.has(stopId)) {
      throw new TransitDomainError('UNKNOWN_STOP', `Unknown transit stop: ${stopId}`);
    }
    if (!isFiniteInteger(horizonMinutes, 1) || horizonMinutes > 24 * 60) {
      throw new TransitDomainError('INVALID_TIME', 'Departure horizon must be from 1 through 1,440 minutes.');
    }

    const departures: TransitDeparture[] = [];
    for (const route of this.#catalog.routes) {
      const stopIndex = route.stopIds.indexOf(stopId);
      if (stopIndex < 0) continue;
      const stopOffset = stopOffsetMinutes(route, stopIndex);
      for (const schedule of this.#schedulesByRoute.get(route.id) ?? []) {
        if (!schedule.serviceDays.includes(from.serviceDay)) continue;
        for (const window of schedule.windows) {
          for (
            let originDeparture = window.startMinute;
            originDeparture <= window.endMinute;
            originDeparture += window.headwayMinutes
          ) {
            const scheduledServiceMinute = originDeparture + stopOffset;
            if (
              scheduledServiceMinute >= from.serviceMinute &&
              scheduledServiceMinute <= from.serviceMinute + horizonMinutes
            ) {
              departures.push({
                routeId: route.id,
                routeName: route.publicName,
                mode: route.mode,
                stopId,
                serviceDay: from.serviceDay,
                scheduledServiceMinute,
                headsign: route.headsign,
              });
            }
          }
        }
      }
    }
    return departures.sort((left, right) => left.scheduledServiceMinute - right.scheduledServiceMinute);
  }

  board(request: BoardTransitRequest): TransitTripState {
    validateServiceTime(request);
    if (!isNonEmptyText(request.riderId) || !isNonEmptyText(request.occurredAt)) {
      throw new TransitDomainError('INVALID_STATE', 'Boarding requires a rider id and timestamp.');
    }
    const vehicle = this.#vehicle(request.vehicleId);
    const route = this.#route(vehicle.routeId);
    const currentStopId = route.stopIds[vehicle.currentStopIndex];
    if (vehicle.phase !== 'boarding' && vehicle.phase !== 'dwelling') {
      throw new TransitDomainError('VEHICLE_NOT_BOARDING', `${vehicle.id} is not accepting riders.`);
    }
    if (currentStopId !== request.stopId) {
      throw new TransitDomainError('STOP_MISMATCH', `${vehicle.id} is currently at ${currentStopId}.`);
    }
    if (vehicle.passengerCount >= vehicle.capacity) {
      throw new TransitDomainError('VEHICLE_FULL', `${vehicle.id} is at capacity.`);
    }
    if (
      request.intendedDestinationStopId &&
      (!route.stopIds.includes(request.intendedDestinationStopId) || request.intendedDestinationStopId === currentStopId)
    ) {
      throw new TransitDomainError('DESTINATION_MISMATCH', 'The intended destination must be another stop on the route.');
    }
    if (this.#state.trips.some((trip) => trip.riderId === request.riderId && activeTripStatuses.has(trip.status))) {
      throw new TransitDomainError('RIDER_ALREADY_TRAVELLING', `${request.riderId} already has an active transit trip.`);
    }

    this.#synchronizeVehicleClock(vehicle, request);
    const trip: TransitTripState = {
      id: `transit-trip-${this.#state.nextTripSequence.toString().padStart(6, '0')}`,
      riderId: request.riderId,
      routeId: route.id,
      vehicleId: vehicle.id,
      boardingStopId: currentStopId,
      ...(request.intendedDestinationStopId
        ? { intendedDestinationStopId: request.intendedDestinationStopId }
        : {}),
      currentStopId,
      visitedStopIds: [currentStopId],
      status: 'boarded',
      boardedAt: request.occurredAt,
    };
    this.#state.nextTripSequence += 1;
    this.#state.trips.push(trip);
    vehicle.passengerCount += 1;
    vehicle.lastUpdatedAt = request.occurredAt;
    return clone(trip);
  }

  departNextStop(event: TransitStopEvent): TransitVehicleState {
    validateServiceTime(event);
    const vehicle = this.#vehicle(event.vehicleId);
    if (vehicle.phase !== 'boarding' && vehicle.phase !== 'dwelling') {
      throw new TransitDomainError('INVALID_TRANSITION', `${vehicle.id} cannot depart from phase ${vehicle.phase}.`);
    }
    this.#synchronizeVehicleClock(vehicle, event);
    const route = this.#route(vehicle.routeId);
    const destinationIndex = nextStopIndex(route, vehicle.currentStopIndex);
    vehicle.phase = 'in-transit';
    vehicle.nextArrivalServiceMinute =
      event.serviceMinute + route.segmentTravelMinutes[vehicle.currentStopIndex] + vehicle.delayMinutes;
    vehicle.lastUpdatedAt = event.occurredAt;
    for (const trip of this.#activeTripsForVehicle(vehicle.id)) {
      trip.status = 'riding';
      trip.nextStopId = route.stopIds[destinationIndex];
    }
    return clone(vehicle);
  }

  arriveNextStop(event: TransitStopEvent): TransitVehicleState {
    validateServiceTime(event);
    const vehicle = this.#vehicle(event.vehicleId);
    if (vehicle.phase !== 'in-transit' || vehicle.nextArrivalServiceMinute === undefined) {
      throw new TransitDomainError('INVALID_TRANSITION', `${vehicle.id} is not travelling between stops.`);
    }
    if (event.serviceDay !== vehicle.serviceDay || event.serviceMinute < vehicle.nextArrivalServiceMinute) {
      throw new TransitDomainError('TOO_EARLY', `${vehicle.id} has not reached its next stop.`);
    }
    const route = this.#route(vehicle.routeId);
    vehicle.currentStopIndex = nextStopIndex(route, vehicle.currentStopIndex);
    vehicle.phase = 'dwelling';
    vehicle.serviceDay = event.serviceDay;
    vehicle.serviceMinute = event.serviceMinute;
    vehicle.nextArrivalServiceMinute = undefined;
    vehicle.lastUpdatedAt = event.occurredAt;
    const stopId = route.stopIds[vehicle.currentStopIndex];
    for (const trip of this.#activeTripsForVehicle(vehicle.id)) {
      trip.currentStopId = stopId;
      trip.nextStopId = undefined;
      if (trip.visitedStopIds.at(-1) !== stopId) trip.visitedStopIds.push(stopId);
      trip.status = trip.intendedDestinationStopId === stopId ? 'ready-to-alight' : 'riding';
    }
    return clone(vehicle);
  }

  alight(request: TransitAlightRequest): TransitTripState {
    if (!isNonEmptyText(request.occurredAt)) {
      throw new TransitDomainError('INVALID_STATE', 'Alighting requires a timestamp.');
    }
    const trip = this.#trip(request.tripId);
    if (!activeTripStatuses.has(trip.status) || trip.status === 'riding') {
      throw new TransitDomainError('TRIP_NOT_ALIGHTABLE', `${trip.id} is not currently stopped for alighting.`);
    }
    const vehicle = this.#vehicle(trip.vehicleId);
    if (vehicle.phase !== 'boarding' && vehicle.phase !== 'dwelling') {
      throw new TransitDomainError('TRIP_NOT_ALIGHTABLE', `${vehicle.id} is not stopped.`);
    }
    const planned = !trip.intendedDestinationStopId || trip.intendedDestinationStopId === trip.currentStopId;
    trip.status = planned ? 'completed' : 'completed-early';
    trip.completedAt = request.occurredAt;
    vehicle.passengerCount = Math.max(0, vehicle.passengerCount - 1);
    vehicle.lastUpdatedAt = request.occurredAt;
    return clone(trip);
  }

  cancelBoarding(tripId: string, occurredAt: string): TransitTripState {
    const trip = this.#trip(tripId);
    if (trip.status !== 'boarded') {
      throw new TransitDomainError('INVALID_TRANSITION', 'Only a trip that has not departed can be cancelled.');
    }
    const vehicle = this.#vehicle(trip.vehicleId);
    trip.status = 'cancelled';
    trip.completedAt = occurredAt;
    vehicle.passengerCount = Math.max(0, vehicle.passengerCount - 1);
    vehicle.lastUpdatedAt = occurredAt;
    return clone(trip);
  }

  updateVehicle(update: TransitVehicleUpdate): TransitVehicleState {
    validateServiceTime(update);
    const vehicle = this.#vehicle(update.vehicleId);
    if (!isNonEmptyText(update.occurredAt)) {
      throw new TransitDomainError('INVALID_STATE', 'Vehicle updates require a timestamp.');
    }
    if (vehicle.phase === 'in-transit' && update.phase !== undefined) {
      throw new TransitDomainError('INVALID_TRANSITION', 'Use the arrival transition before changing an in-transit vehicle phase.');
    }
    if (update.delayMinutes !== undefined) {
      if (!isFiniteInteger(update.delayMinutes) || update.delayMinutes > 180) {
        throw new TransitDomainError('INVALID_STATE', 'Vehicle delay must be from 0 through 180 minutes.');
      }
      vehicle.delayMinutes = update.delayMinutes;
    }
    if (update.capacity !== undefined) {
      if (!isFiniteInteger(update.capacity, 1) || update.capacity < vehicle.passengerCount) {
        throw new TransitDomainError('INVALID_STATE', 'Vehicle capacity cannot be below one or below its passenger count.');
      }
      vehicle.capacity = update.capacity;
    }
    if (update.phase !== undefined) vehicle.phase = update.phase;
    this.#synchronizeVehicleClock(vehicle, update);
    vehicle.lastUpdatedAt = update.occurredAt;
    return clone(vehicle);
  }

  #createInitialState(): TransitSystemState {
    return {
      version: 1,
      nextTripSequence: 1,
      vehicles: this.#catalog.vehicles.map((seed) => {
        const route = this.#route(seed.routeId);
        return {
          id: seed.id,
          routeId: seed.routeId,
          capacity: seed.capacity,
          passengerCount: 0,
          currentStopIndex: route.stopIds.indexOf(seed.initialStopId),
          phase: seed.initialPhase ?? 'out-of-service',
          serviceDay: 0,
          serviceMinute: 0,
          delayMinutes: 0,
          lastUpdatedAt: new Date(0).toISOString(),
        };
      }),
      trips: [],
    };
  }

  #validatedState(candidate: TransitSystemState): TransitSystemState {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      !Array.isArray(candidate.vehicles) ||
      !Array.isArray(candidate.trips)
    ) {
      throw new TransitDomainError('INVALID_STATE', 'Transit state must contain vehicle and trip arrays.');
    }
    const state = clone(candidate);
    if (state.version !== 1 || !isFiniteInteger(state.nextTripSequence, 1)) {
      throw new TransitDomainError('INVALID_STATE', 'Transit state version or trip sequence is invalid.');
    }
    const catalogVehicleIds = new Set(this.#catalog.vehicles.map((vehicle) => vehicle.id));
    const seenVehicleIds = new Set<string>();
    for (const vehicle of state.vehicles) {
      if (!vehicle || typeof vehicle !== 'object') {
        throw new TransitDomainError('INVALID_STATE', 'Vehicle entries must be objects.');
      }
      const route = this.#routes.get(vehicle.routeId);
      if (
        !catalogVehicleIds.has(vehicle.id) ||
        seenVehicleIds.has(vehicle.id) ||
        !route ||
        !isFiniteInteger(vehicle.capacity, 1) ||
        !isFiniteInteger(vehicle.passengerCount) ||
        vehicle.passengerCount > vehicle.capacity ||
        !isFiniteInteger(vehicle.currentStopIndex) ||
        vehicle.currentStopIndex >= route.stopIds.length ||
        !transitVehiclePhases.has(vehicle.phase) ||
        !isFiniteInteger(vehicle.serviceDay) ||
        vehicle.serviceDay > 6 ||
        !isFiniteInteger(vehicle.serviceMinute) ||
        !isFiniteInteger(vehicle.delayMinutes) ||
        !isNonEmptyText(vehicle.lastUpdatedAt)
      ) {
        throw new TransitDomainError('INVALID_STATE', `Vehicle state is invalid for ${vehicle.id}.`);
      }
      if (vehicle.phase === 'in-transit' && !isFiniteInteger(vehicle.nextArrivalServiceMinute)) {
        throw new TransitDomainError('INVALID_STATE', `${vehicle.id} is in transit without an arrival time.`);
      }
      if (vehicle.phase !== 'in-transit' && vehicle.nextArrivalServiceMinute !== undefined) {
        throw new TransitDomainError('INVALID_STATE', `${vehicle.id} has an arrival time while it is not in transit.`);
      }
      seenVehicleIds.add(vehicle.id);
    }
    if (seenVehicleIds.size !== catalogVehicleIds.size) {
      throw new TransitDomainError('INVALID_STATE', 'Transit state must contain every catalog vehicle exactly once.');
    }

    const seenTripIds = new Set<string>();
    const activeRiderIds = new Set<string>();
    for (const trip of state.trips) {
      if (!trip || typeof trip !== 'object' || !Array.isArray(trip.visitedStopIds)) {
        throw new TransitDomainError('INVALID_STATE', 'Trip entries must contain a visited-stop array.');
      }
      const route = this.#routes.get(trip.routeId);
      const vehicle = state.vehicles.find((candidateVehicle) => candidateVehicle.id === trip.vehicleId);
      if (
        !isNonEmptyText(trip.id) ||
        seenTripIds.has(trip.id) ||
        !isNonEmptyText(trip.riderId) ||
        !transitTripStatuses.has(trip.status) ||
        !route ||
        !vehicle ||
        vehicle.routeId !== trip.routeId ||
        !route.stopIds.includes(trip.boardingStopId) ||
        !route.stopIds.includes(trip.currentStopId) ||
        (trip.nextStopId !== undefined && !route.stopIds.includes(trip.nextStopId)) ||
        (trip.intendedDestinationStopId !== undefined && !route.stopIds.includes(trip.intendedDestinationStopId)) ||
        trip.visitedStopIds.length === 0 ||
        trip.visitedStopIds.some((stopId) => !route.stopIds.includes(stopId)) ||
        !isNonEmptyText(trip.boardedAt)
      ) {
        throw new TransitDomainError('INVALID_STATE', `Trip state is invalid for ${trip.id}.`);
      }
      if (activeTripStatuses.has(trip.status)) {
        if (activeRiderIds.has(trip.riderId) || trip.completedAt !== undefined) {
          throw new TransitDomainError('INVALID_STATE', `Active trip state is invalid for ${trip.id}.`);
        }
        activeRiderIds.add(trip.riderId);
      } else if (!isNonEmptyText(trip.completedAt)) {
        throw new TransitDomainError('INVALID_STATE', `Completed trip lacks a timestamp: ${trip.id}.`);
      }
      seenTripIds.add(trip.id);
    }
    for (const vehicle of state.vehicles) {
      const representedPassengers = state.trips.filter(
        (trip) => trip.vehicleId === vehicle.id && activeTripStatuses.has(trip.status),
      ).length;
      if (vehicle.passengerCount !== representedPassengers) {
        throw new TransitDomainError('INVALID_STATE', `Passenger count does not match active trips for ${vehicle.id}.`);
      }
    }
    return state;
  }

  #vehicle(vehicleId: string): TransitVehicleState {
    const vehicle = this.#state.vehicles.find((candidate) => candidate.id === vehicleId);
    if (!vehicle) throw new TransitDomainError('UNKNOWN_VEHICLE', `Unknown transit vehicle: ${vehicleId}`);
    return vehicle;
  }

  #trip(tripId: string): TransitTripState {
    const trip = this.#state.trips.find((candidate) => candidate.id === tripId);
    if (!trip) throw new TransitDomainError('UNKNOWN_TRIP', `Unknown transit trip: ${tripId}`);
    return trip;
  }

  #route(routeId: string): TransitRoute {
    const route = this.#routes.get(routeId);
    if (!route) throw new TransitDomainError('UNKNOWN_ROUTE', `Unknown transit route: ${routeId}`);
    return route;
  }

  #activeTripsForVehicle(vehicleId: string): TransitTripState[] {
    return this.#state.trips.filter((trip) => trip.vehicleId === vehicleId && activeTripStatuses.has(trip.status));
  }

  #synchronizeVehicleClock(vehicle: TransitVehicleState, time: TransitServiceTime): void {
    const sameServiceDay = time.serviceDay === vehicle.serviceDay;
    const nextServiceDay = time.serviceDay === ((vehicle.serviceDay + 1) % 7);
    if (!sameServiceDay && !nextServiceDay) {
      throw new TransitDomainError('INVALID_TIME', 'Vehicle updates must follow service-day order.');
    }
    if (sameServiceDay && time.serviceMinute < vehicle.serviceMinute) {
      throw new TransitDomainError('INVALID_TIME', 'Vehicle updates cannot move backwards within a service day.');
    }
    vehicle.serviceDay = time.serviceDay;
    vehicle.serviceMinute = time.serviceMinute;
  }
}
