export type TransitMode = 'bus' | 'subway';
export type TransitServiceState = 'scheduled' | 'delayed' | 'disrupted' | 'ended';

export interface ServiceClock {
  readonly epochMs: number;
  readonly localDate: string;
  readonly minuteOfDay: number;
}

export interface TransitStop {
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

export interface TransitRoute {
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
  readonly stops: readonly TransitStop[];
  readonly routes: readonly TransitRoute[];
  readonly now?: () => number;
}

export type TransitResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: import('./errors').TransitDomainError };
