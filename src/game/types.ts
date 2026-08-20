export type CityId = 'harbourlight' | 'gullhaven' | 'asterfield';
export type TransportMode = 'bus' | 'subway' | 'streetcar' | 'ferry' | 'flight';
export type PlaceKind = 'hub' | 'store' | 'restaurant' | 'salon' | 'builder' | 'battle' | 'minigame' | 'transit';

export interface PlaceDefinition {
  id: string;
  cityId: CityId;
  name: string;
  subtitle: string;
  color: number;
  kind: PlaceKind;
  x: number;
  z: number;
  routeIds?: readonly string[];
}

export interface CityDefinition {
  id: CityId;
  name: string;
  tagline: string;
  creature: { id: string; name: string; descriptor: string; color: number; habitat: string };
  minigame: { name: string; description: string };
  battle: { opponent: string; creature: string; payout: number };
  build: { template: string; office: string; crew: string; cost: number };
  places: readonly PlaceDefinition[];
}

export interface TransitRoute {
  id: string;
  publicName: string;
  code: string;
  mode: TransportMode;
  originCityId: CityId;
  destinationCityId: CityId;
  originBuildingId: string;
  destinationBuildingId: string;
  stops: readonly string[];
  loop: boolean;
  durationMs: number;
  fare: number;
  ticketRequired: boolean;
}

export interface TransitTicket {
  id: string;
  routeId: string;
  mode: 'ferry' | 'flight';
  originCityId: CityId;
  destinationCityId: CityId;
  farePaid: number;
  purchasedAt: string;
}

export interface PendingJourney {
  routeId: string;
  originCityId: CityId;
  destinationCityId: CityId;
  startedAt: string;
  durationMs: number;
}

export interface ConstructionProgress {
  phase: number;
  hired: boolean;
  startedAt?: string;
}

export interface CityProgress {
  construction: ConstructionProgress;
  minigameBest: number;
}

export interface SaveStateV2 {
  version: 2;
  currentCity: CityId;
  money: number;
  catchBalls: number;
  activeBuilding?: string;
  activeFloor?: string;
  capturedCreatures: string[];
  tickets: TransitTicket[];
  cityProgress: Record<CityId, CityProgress>;
  pendingJourney?: PendingJourney;
  lastSavedAt?: string;
}
