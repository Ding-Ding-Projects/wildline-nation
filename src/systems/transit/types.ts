export type TransitMode = 'bus' | 'subway';

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
