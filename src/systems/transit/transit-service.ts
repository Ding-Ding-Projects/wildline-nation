import { TransitDomainError } from './errors';
import type {
  Disruption, FareValidation, FareValidationRequest, HeadwayWindow,
  PassengerJourney, ServiceClock, TransitPass, TransitResult, DeterministicTransitRoute,
  TransitServiceOptions, TransitSnapshot, TransitStatusSnapshot,
  VehicleTrip, DeterministicTransitStop,
} from './types';

type Journey = PassengerJourney;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const ok = <T>(value: T): TransitResult<T> => ({ ok: true, value });
const fail = <T>(code: ConstructorParameters<typeof TransitDomainError>[0], message: string, details: Record<string, unknown> = {}): TransitResult<T> => ({ ok: false, error: new TransitDomainError(code, message, details) });
const nonEmpty = (value: string): boolean => value.trim().length > 0;
const integer = (value: number, min = 0): boolean => Number.isSafeInteger(value) && value >= min;

function validateClock(clock: ServiceClock): boolean {
  return Number.isFinite(clock.epochMs) && integer(clock.minuteOfDay) && clock.minuteOfDay < 1440 && /^\d{4}-\d{2}-\d{2}$/.test(clock.localDate);
}
function validateHeadway(window: HeadwayWindow): boolean {
  return integer(window.startMinute) && integer(window.endMinute) && window.endMinute > window.startMinute && window.endMinute <= 1440 && integer(window.headwayMinutes, 1);
}

export class TransitService {
  private readonly stops = new Map<string, DeterministicTransitStop>();
  private readonly routes = new Map<string, DeterministicTransitRoute>();
  private readonly now: () => number;
  private trips = new Map<string, VehicleTrip>();
  private journeys = new Map<string, Journey>();
  private passes = new Map<string, TransitPass>();
  private disruptions = new Map<string, Disruption>();

  constructor(options: TransitServiceOptions) {
    if (options.stops.length === 0 || options.routes.length === 0) throw new TypeError('TransitService requires stops and routes.');
    for (const stop of options.stops) {
      if (!nonEmpty(stop.id) || !nonEmpty(stop.name) || !Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude) || this.stops.has(stop.id)) throw new TypeError(`Invalid or duplicate transit stop: ${stop.id}.`);
      this.stops.set(stop.id, clone(stop));
    }
    for (const route of options.routes) {
      const windows = [...route.headways].sort((a, b) => a.startMinute - b.startMinute);
      if (!nonEmpty(route.id) || !nonEmpty(route.name) || !nonEmpty(route.color) || route.stopIds.length < 2 || route.stopIds.some((id) => !this.stops.has(id)) || route.operatingStartMinute < 0 || route.operatingEndMinute > 1440 || route.operatingEndMinute <= route.operatingStartMinute || !integer(route.vehicleCapacity, 1) || !integer(route.fareCents) || route.headways.length === 0 || route.headways.some((window) => !validateHeadway(window)) || windows.some((window, index) => index > 0 && window.startMinute < windows[index - 1].endMinute) || this.routes.has(route.id)) throw new TypeError(`Invalid transit route: ${route.id}.`);
      this.routes.set(route.id, clone(route));
    }
    this.now = options.now ?? Date.now;
  }

  static fromSnapshot(options: TransitServiceOptions, snapshot: TransitSnapshot): TransitResult<TransitService> {
    const service = new TransitService(options);
    const restored = service.reloadSnapshot(snapshot);
    return restored.ok ? ok(service) : restored;
  }

  listStops(): readonly DeterministicTransitStop[] { return [...this.stops.values()].map(clone); }
  listRoutes(): readonly DeterministicTransitRoute[] { return [...this.routes.values()].map(clone); }
  listPasses(holderId?: string): readonly TransitPass[] { return [...this.passes.values()].filter((pass) => !holderId || pass.holderId === holderId).map(clone); }
  listJourneys(riderId?: string): readonly Journey[] { return [...this.journeys.values()].filter((journey) => !riderId || journey.riderId === riderId).map(clone); }

  registerPass(pass: TransitPass): TransitResult<TransitPass> {
    if (!nonEmpty(pass.id) || !nonEmpty(pass.holderId) || pass.validUntilEpochMs <= pass.validFromEpochMs || pass.allowedModes.length === 0 || this.passes.has(pass.id)) return fail('fare-invalid', 'A pass needs a unique holder, valid dates, and at least one mode.');
    this.passes.set(pass.id, clone(pass));
    return ok(clone(pass));
  }

  validateFare(request: FareValidationRequest, clock: ServiceClock): TransitResult<FareValidation> {
    if (!validateClock(clock)) return fail('clock-invalid', 'The service clock is outside the supported range.');
    const route = this.routes.get(request.routeId);
    if (!route) return fail('route-not-found', 'The requested route is not registered.', { routeId: request.routeId });
    if (!this.stops.has(request.stopId)) return fail('stop-not-found', 'The boarding stop is not registered.', { stopId: request.stopId });
    if (!nonEmpty(request.riderId)) return fail('fare-invalid', 'A rider identifier is required.');
    if (request.passId) {
      const pass = this.passes.get(request.passId);
      if (pass && pass.holderId === request.riderId && pass.allowedModes.includes(route.mode) && clock.epochMs >= pass.validFromEpochMs && clock.epochMs <= pass.validUntilEpochMs) return ok({ accepted: true, fareCents: 0, method: 'pass', reason: null });
      return ok({ accepted: false, fareCents: route.fareCents, method: 'rejected', reason: 'The supplied pass is missing, expired, for another rider, or not valid on this mode.' });
    }
    if (request.paymentCents !== undefined && integer(request.paymentCents) && request.paymentCents >= route.fareCents) return ok({ accepted: true, fareCents: route.fareCents, method: 'cash', reason: null });
    return ok({ accepted: false, fareCents: route.fareCents, method: 'rejected', reason: 'A valid pass or sufficient fare is required.' });
  }

  addDisruption(disruption: Disruption): TransitResult<Disruption> {
    if (!nonEmpty(disruption.id) || !this.routes.has(disruption.routeId) || (disruption.stopId !== undefined && !this.stops.has(disruption.stopId)) || !nonEmpty(disruption.reason) || !Number.isFinite(disruption.startsAtEpochMs) || (disruption.endsAtEpochMs !== null && disruption.endsAtEpochMs <= disruption.startsAtEpochMs) || this.disruptions.has(disruption.id)) return fail('disruption-invalid', 'A disruption needs a unique route, valid times, and a reason.');
    this.disruptions.set(disruption.id, clone(disruption));
    return ok(clone(disruption));
  }

  getStatus(routeId: string, clock: ServiceClock): TransitResult<TransitStatusSnapshot> {
    if (!validateClock(clock)) return fail('clock-invalid', 'The service clock is outside the supported range.');
    const route = this.routes.get(routeId);
    if (!route) return fail('route-not-found', 'The requested route is not registered.', { routeId });
    const activeDisruptions = [...this.disruptions.values()].filter((item) => item.routeId === routeId && item.startsAtEpochMs <= clock.epochMs && (item.endsAtEpochMs === null || item.endsAtEpochMs >= clock.epochMs));
    const activeTrips = [...this.trips.values()].filter((trip) => trip.routeId === routeId && trip.state !== 'ended');
    const nextDepartureMinute = this.nextDeparture(route, clock.minuteOfDay);
    const state: TransitStatusSnapshot['state'] = activeDisruptions.some((item) => item.severity === 'closed') ? 'disrupted' : activeDisruptions.length > 0 ? 'delayed' : nextDepartureMinute === null ? 'ended' : 'scheduled';
    return ok({ routeId, state, nextDepartureMinute, activeDisruptions: clone(activeDisruptions), activeTrips: clone(activeTrips), clock: clone(clock) });
  }

  dispatchTrip(routeId: string, clock: ServiceClock): TransitResult<VehicleTrip> {
    const route = this.routes.get(routeId);
    if (!route) return fail('route-not-found', 'The requested route is not registered.', { routeId });
    if (!validateClock(clock)) return fail('clock-invalid', 'The service clock is outside the supported range.');
    const departureMinute = this.nextDeparture(route, clock.minuteOfDay);
    if (departureMinute === null) return fail('no-service', 'The route has no scheduled departure at this service time.', { routeId, minuteOfDay: clock.minuteOfDay });
    const id = `${routeId}-${clock.localDate}-${departureMinute}`;
    if (this.trips.has(id)) return fail('duplicate-trip', 'This scheduled vehicle trip has already been dispatched.', { tripId: id });
    const trip: VehicleTrip = { id, routeId, departureMinute, currentStopIndex: 0, onboardPassengerIds: [], state: 'scheduled', delayMinutes: 0 };
    this.trips.set(id, trip);
    return ok(clone(trip));
  }

  board(request: FareValidationRequest & { readonly tripId: string; readonly destinationStopId: string }, clock: ServiceClock): TransitResult<Journey> {
    const trip = this.trips.get(request.tripId);
    if (!trip) return fail('trip-not-found', 'The requested vehicle trip does not exist.', { tripId: request.tripId });
    const route = this.routes.get(trip.routeId)!;
    const originIndex = route.stopIds.indexOf(request.stopId);
    const destinationIndex = route.stopIds.indexOf(request.destinationStopId);
    if (originIndex < 0) return fail('stop-not-found', 'The boarding stop is not on this route.', { stopId: request.stopId });
    if (destinationIndex < 0 || destinationIndex === originIndex || (route.oneWay && destinationIndex < originIndex)) return fail('destination-invalid', 'The destination must be another stop on this route.');
    if (trip.currentStopIndex !== originIndex || trip.state === 'ended' || trip.state === 'disrupted') return fail('trip-not-boardable', 'The vehicle is not boardable at the requested stop.', { currentStopIndex: trip.currentStopIndex, originIndex });
    if (trip.onboardPassengerIds.includes(request.riderId)) return fail('rider-already-boarded', 'This rider is already on the trip.', { riderId: request.riderId });
    if (trip.onboardPassengerIds.length >= route.vehicleCapacity) return fail('no-capacity', 'The vehicle has reached its safe passenger capacity.', { capacity: route.vehicleCapacity });
    const fare = this.validateFare(request, clock);
    if (!fare.ok) return fare;
    if (!fare.value.accepted) return fail('fare-required', fare.value.reason ?? 'A valid fare is required.', { fare: fare.value });
    const journey: Journey = { riderId: request.riderId, tripId: request.tripId, boardedAtStopId: request.stopId, destinationStopId: request.destinationStopId, boardedAtEpochMs: clock.epochMs, alightedAtEpochMs: null, transferCount: 0 };
    this.journeys.set(`${request.riderId}:${request.tripId}`, journey);
    this.trips.set(trip.id, { ...trip, state: 'scheduled', onboardPassengerIds: [...trip.onboardPassengerIds, request.riderId] });
    return ok(clone(journey));
  }

  advanceTrip(tripId: string, clock: ServiceClock): TransitResult<VehicleTrip> {
    const trip = this.trips.get(tripId);
    if (!trip) return fail('trip-not-found', 'The requested vehicle trip does not exist.', { tripId });
    const route = this.routes.get(trip.routeId)!;
    if (!validateClock(clock)) return fail('clock-invalid', 'The service clock is outside the supported range.');
    if (trip.currentStopIndex >= route.stopIds.length - 1) {
      const ended: VehicleTrip = { ...trip, state: 'ended' };
      this.trips.set(tripId, ended);
      return ok(clone(ended));
    }
    const nextIndex = trip.currentStopIndex + 1;
    const disruption = [...this.disruptions.values()].find((item) => item.routeId === route.id && item.stopId === route.stopIds[nextIndex] && item.startsAtEpochMs <= clock.epochMs && (item.endsAtEpochMs === null || item.endsAtEpochMs >= clock.epochMs));
    const next: VehicleTrip = { ...trip, currentStopIndex: nextIndex, state: disruption?.severity === 'closed' ? 'disrupted' : disruption ? 'delayed' : 'scheduled', delayMinutes: trip.delayMinutes + (disruption?.severity === 'major' ? 10 : disruption ? 3 : 0) };
    this.trips.set(tripId, next);
    for (const journey of this.journeys.values()) if (journey.tripId === tripId && journey.destinationStopId === route.stopIds[nextIndex] && journey.alightedAtEpochMs === null) this.journeys.set(`${journey.riderId}:${tripId}`, { ...journey, alightedAtEpochMs: clock.epochMs });
    return ok(clone(next));
  }

  transfer(riderId: string, fromTripId: string, toTripId: string): TransitResult<Journey> {
    const journey = this.journeys.get(`${riderId}:${fromTripId}`);
    if (!journey) return fail('journey-not-found', 'The rider has no journey on the source trip.', { riderId, fromTripId });
    const target = [...this.journeys.values()].find((item) => item.riderId === riderId && item.tripId === toTripId);
    if (target) return ok(clone({ ...target, transferCount: journey.transferCount + 1 }));
    return fail('journey-not-found', 'The rider must board the connecting trip before recording a transfer.', { riderId, toTripId });
  }

  saveSnapshot(): TransitSnapshot { return { schemaVersion: 1, savedAtEpochMs: this.now(), trips: clone([...this.trips.values()]), journeys: clone([...this.journeys.values()]), passes: clone([...this.passes.values()]), disruptions: clone([...this.disruptions.values()]) }; }
  reloadSnapshot(snapshot: TransitSnapshot): TransitResult<TransitSnapshot> {
    if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.trips) || !Array.isArray(snapshot.journeys) || !Array.isArray(snapshot.passes) || !Array.isArray(snapshot.disruptions)) return fail('snapshot-invalid', 'The transit snapshot has an unsupported shape.');
    const tripIds = new Set<string>();
    for (const trip of snapshot.trips) { const route = this.routes.get(trip.routeId); if (!route || !nonEmpty(trip.id) || trip.currentStopIndex < 0 || trip.currentStopIndex >= route.stopIds.length || trip.onboardPassengerIds.length > route.vehicleCapacity || tripIds.has(trip.id)) return fail('snapshot-invalid', 'The transit snapshot contains an invalid trip.'); tripIds.add(trip.id); }
    const passIds = new Set<string>();
    for (const pass of snapshot.passes) { if (!nonEmpty(pass.id) || !nonEmpty(pass.holderId) || pass.validUntilEpochMs <= pass.validFromEpochMs || passIds.has(pass.id)) return fail('snapshot-invalid', 'The transit snapshot contains an invalid pass.'); passIds.add(pass.id); }
    this.trips = new Map(snapshot.trips.map((trip) => [trip.id, clone(trip)]));
    this.journeys = new Map(snapshot.journeys.map((journey) => [`${journey.riderId}:${journey.tripId}`, clone(journey)]));
    this.passes = new Map(snapshot.passes.map((pass) => [pass.id, clone(pass)]));
    this.disruptions = new Map(snapshot.disruptions.map((item) => [item.id, clone(item)]));
    return ok(this.saveSnapshot());
  }
  serializeSnapshot(): string { return JSON.stringify(this.saveSnapshot()); }
  parseSnapshot(serialized: string): TransitResult<TransitSnapshot> { try { return this.reloadSnapshot(JSON.parse(serialized) as TransitSnapshot); } catch { return fail('snapshot-invalid', 'The transit snapshot is not valid JSON.'); } }

  private nextDeparture(route: DeterministicTransitRoute, minute: number): number | null {
    if (minute < route.operatingStartMinute || minute >= route.operatingEndMinute) return null;
    const window = route.headways.find((candidate) => minute >= candidate.startMinute && minute < candidate.endMinute);
    if (!window) return null;
    const offset = minute - window.startMinute;
    return window.startMinute + Math.ceil(offset / window.headwayMinutes) * window.headwayMinutes < window.endMinute ? window.startMinute + Math.ceil(offset / window.headwayMinutes) * window.headwayMinutes : null;
  }
}
