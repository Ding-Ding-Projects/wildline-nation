export type CreatureElement = 'tide' | 'ember' | 'grove' | 'gale' | 'stone' | 'lumen';
export type EncounterState = 'observed' | 'calm' | 'agitated' | 'fled' | 'captured';

export interface CreatureSpecies {
  readonly id: string;
  readonly name: string;
  readonly element: CreatureElement;
  readonly basePower: number;
  readonly baseResilience: number;
  readonly captureDifficulty: number;
  readonly habitatIds: readonly string[];
}

export interface CreatureInstance {
  readonly instanceId: string;
  readonly speciesId: string;
  readonly ownerId: string;
  readonly nickname: string | null;
  readonly level: number;
  readonly experience: number;
  readonly capturedAtEpochMs: number;
}

export interface CatchBallType {
  readonly id: string;
  readonly displayName: string;
  readonly captureBonus: number;
  readonly maxStack: number;
}

export interface CatchBallInventory {
  readonly ownerId: string;
  readonly quantities: Readonly<Record<string, number>>;
  readonly revision: number;
}

export interface Encounter {
  readonly encounterId: string;
  readonly ownerId: string;
  readonly speciesId: string;
  readonly habitatId: string;
  readonly state: EncounterState;
  readonly stability: number;
  readonly attempts: number;
  readonly createdAtEpochMs: number;
}

export interface CaptureAttempt {
  readonly encounterId: string;
  readonly ownerId: string;
  readonly ballTypeId: string;
  readonly roll: number;
}

export interface CaptureOutcome {
  readonly captured: boolean;
  readonly encounter: Encounter;
  readonly creature: CreatureInstance | null;
  readonly remainingBalls: number;
  readonly probability: number;
}

export interface CreatureSnapshot {
  readonly schemaVersion: 1;
  readonly savedAtEpochMs: number;
  readonly encounters: readonly Encounter[];
  readonly creatures: readonly CreatureInstance[];
  readonly inventories: readonly CatchBallInventory[];
}

export interface CreatureServiceOptions {
  readonly species: readonly CreatureSpecies[];
  readonly ballTypes: readonly CatchBallType[];
  readonly now?: () => number;
  readonly random?: () => number;
  readonly idFactory?: (prefix: string) => string;
}

export type CreatureResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: import('./errors').CreatureDomainError };
