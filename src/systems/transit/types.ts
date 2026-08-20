export type TransitMode = 'bus' | 'subway';
export type TransitServiceState = 'scheduled' | 'delayed' | 'disrupted' | 'ended';

export interface ServiceClock {
  readonly epochMs: number;
  readonly localDate: string;
  readonly minuteOfDay: number;
}

/** Deterministic service API stop shape retained from the integrated service family. */
export interface DeterministicTransitStop {
  readonly id: string;
  readonly name: string;
  readonly accessible: boolean;
  readonly latitude: number;
  readonly longitude: number;
}

export interface HeadwayWindow {
  readonly startMinute: number;
  readonly endMinute: number;
  readonly headwayMinutes: number;
}

/** Deterministic service API route shape retained from the integrated service family. */
export interface DeterministicTransitRoute {
  readonly id: string;
  readonly mode: TransitMode;
  readonly name: string;
  readonly color: string;
  readonly stopIds: readonly string[];
  readonly oneWay: boolean;
  readonly operatingStartMinute: number;
  readonly operatingEndMinute: number;
  readonly headways: readonly HeadwayWindow[];
  readonly vehicleCapacity: number;
  readonly fareCents: number;
}

export interface VehicleTrip {
  readonly id: string;
  readonly routeId: string;
  readonly departureMinute: number;
  readonly currentStopIndex: number;
  readonly onboardPassengerIds: readonly string[];
  readonly state: TransitServiceState;
  readonly delayMinutes: number;
}

export interface TransitPass {
  readonly id: string;
  readonly holderId: string;
  readonly validFromEpochMs: number;
  readonly validUntilEpochMs: number;
  readonly allowedModes: readonly TransitMode[];
  readonly zones: readonly string[];
}

export interface FareValidationRequest {
  readonly riderId: string;
  readonly routeId: string;
  readonly stopId: string;
  readonly passId?: string;
  readonly paymentCents?: number;
}

export interface FareValidation {
  readonly accepted: boolean;
  readonly fareCents: number;
  readonly method: 'pass' | 'cash' | 'rejected';
  readonly reason: string | null;
}

export interface PassengerJourney {
  readonly riderId: string;
  readonly tripId: string;
  readonly boardedAtStopId: string;
  readonly destinationStopId: string;
  readonly boardedAtEpochMs: number;
  readonly alightedAtEpochMs: number | null;
  readonly transferCount: number;
}

export interface Disruption {
  readonly id: string;
  readonly routeId: string;
  readonly stopId?: string;
  readonly reason: string;
  readonly startsAtEpochMs: number;
  readonly endsAtEpochMs: number | null;
  readonly severity: 'minor' | 'major' | 'closed';
}

export interface TransitStatusSnapshot {
  readonly routeId: string;
  readonly state: TransitServiceState;
  readonly nextDepartureMinute: number | null;
  readonly activeDisruptions: readonly Disruption[];
  readonly activeTrips: readonly VehicleTrip[];
  readonly clock: ServiceClock;
}

export interface TransitSnapshot {
  readonly schemaVersion: 1;
  readonly savedAtEpochMs: number;
  readonly trips: readonly VehicleTrip[];
  readonly journeys: readonly PassengerJourney[];
  readonly passes: readonly TransitPass[];
  readonly disruptions: readonly Disruption[];
}

export interface TransitServiceOptions {
  readonly stops: readonly DeterministicTransitStop[];
  readonly routes: readonly DeterministicTransitRoute[];
  readonly now?: () => number;
}

export type TransitResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: import('./errors').TransitDomainError };

export type TransitVehiclePhase =
  | 'out-of-service'
  | 'boarding'
  | 'dwelling'
  | 'in-transit';

export type TransitTripStatus =
  | 'boarded'
  | 'riding'
  | 'ready-to-alight'
  | 'completed'
  | 'completed-early'
  | 'cancelled';

export interface TransitServiceTime {
  /** Day of week on which the service day starts. Sunday is 0. */
  serviceDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Minutes from the start of the service day. Values above 1,440 cross midnight. */
  serviceMinute: number;
}

export interface TransitStop {
  id: string;
  name: string;
  accessible: boolean;
  district: string;
  transferRouteIds: readonly string[];
}

export interface TransitRoute {
  id: string;
  publicName: string;
  mode: TransitMode;
  headsign: string;
  loop: boolean;
  stopIds: readonly string[];
  /** Travel time from each stop to the following stop. Loop routes include the return segment. */
  segmentTravelMinutes: readonly number[];
  /** Minimum dwell at each stop before the next departure. */
  dwellMinutes: readonly number[];
}

export interface TransitServiceWindow {
  startMinute: number;
  endMinute: number;
  headwayMinutes: number;
}

export interface TransitSchedule {
  id: string;
  routeId: string;
  timezone: string;
  serviceDays: readonly TransitServiceTime['serviceDay'][];
  windows: readonly TransitServiceWindow[];
}

export interface TransitVehicleSeed {
  id: string;
  routeId: string;
  capacity: number;
  initialStopId: string;
  initialPhase?: Exclude<TransitVehiclePhase, 'in-transit'>;
}

export interface TransitCatalog {
  stops: readonly TransitStop[];
  routes: readonly TransitRoute[];
  schedules: readonly TransitSchedule[];
  vehicles: readonly TransitVehicleSeed[];
}

export interface TransitVehicleState {
  id: string;
  routeId: string;
  capacity: number;
  passengerCount: number;
  currentStopIndex: number;
  phase: TransitVehiclePhase;
  serviceDay: TransitServiceTime['serviceDay'];
  serviceMinute: number;
  delayMinutes: number;
  nextArrivalServiceMinute?: number;
  lastUpdatedAt: string;
}

export interface TransitTripState {
  id: string;
  riderId: string;
  routeId: string;
  vehicleId: string;
  boardingStopId: string;
  intendedDestinationStopId?: string;
  currentStopId: string;
  nextStopId?: string;
  visitedStopIds: string[];
  status: TransitTripStatus;
  boardedAt: string;
  completedAt?: string;
}

export interface TransitSystemState {
  version: 1;
  nextTripSequence: number;
  vehicles: TransitVehicleState[];
  trips: TransitTripState[];
}

export interface TransitDeparture {
  routeId: string;
  routeName: string;
  mode: TransitMode;
  stopId: string;
  serviceDay: TransitServiceTime['serviceDay'];
  scheduledServiceMinute: number;
  headsign: string;
}

export interface BoardTransitRequest extends TransitServiceTime {
  riderId: string;
  vehicleId: string;
  stopId: string;
  intendedDestinationStopId?: string;
  occurredAt: string;
}

export interface TransitVehicleUpdate extends TransitServiceTime {
  vehicleId: string;
  occurredAt: string;
  phase?: Exclude<TransitVehiclePhase, 'in-transit'>;
  delayMinutes?: number;
  capacity?: number;
}

export interface TransitStopEvent extends TransitServiceTime {
  vehicleId: string;
  occurredAt: string;
}

export interface TransitAlightRequest {
  tripId: string;
  occurredAt: string;
}

export type TransitDomainErrorCode =
  | 'INVALID_CATALOG'
  | 'INVALID_STATE'
  | 'UNKNOWN_ROUTE'
  | 'UNKNOWN_STOP'
  | 'UNKNOWN_VEHICLE'
  | 'UNKNOWN_TRIP'
  | 'INVALID_TIME'
  | 'INVALID_TRANSITION'
  | 'VEHICLE_NOT_BOARDING'
  | 'VEHICLE_FULL'
  | 'STOP_MISMATCH'
  | 'DESTINATION_MISMATCH'
  | 'RIDER_ALREADY_TRAVELLING'
  | 'TOO_EARLY'
  | 'TRIP_NOT_ALIGHTABLE';

export class TransitDomainError extends Error {
  readonly code: TransitDomainErrorCode;

  constructor(code: TransitDomainErrorCode, message: string) {
    super(message);
    this.name = 'TransitDomainError';
    this.code = code;
  }
}
