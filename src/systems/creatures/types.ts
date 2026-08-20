export type CreatureElement = 'tide' | 'ember' | 'grove' | 'gale' | 'stone' | 'lumen';
export type EncounterState = 'observed' | 'calm' | 'agitated' | 'fled' | 'captured';

/** Deterministic service API species shape retained from the integrated service family. */
export interface DeterministicCreatureSpecies {
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

/** Deterministic service API inventory shape retained from the integrated service family. */
export interface DeterministicCatchBallInventory {
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

/** Deterministic service API capture result retained from the integrated service family. */
export interface DeterministicCaptureOutcome {
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
  readonly inventories: readonly DeterministicCatchBallInventory[];
}

export interface CreatureServiceOptions {
  readonly species: readonly DeterministicCreatureSpecies[];
  readonly ballTypes: readonly CatchBallType[];
  readonly now?: () => number;
  readonly random?: () => number;
  readonly idFactory?: (prefix: string) => string;
}

export type CreatureResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: import('./errors').CreatureDomainError };
/** Public domain types for the original creature encounter and roster systems. */

export type CreatureSpeciesId = 'brineling' | 'reedhorn' | 'duskwisp';
export type HabitatId = 'tideglass-pools' | 'reedfen-marsh' | 'moonlit-terrace';

export type CreatureTrait =
  | 'tide-glider'
  | 'shell-backed'
  | 'quiet-listener'
  | 'reed-runner'
  | 'echo-caller'
  | 'night-bloom'
  | 'patient'
  | 'watchful'
  | 'social'
  | 'territorial';

export type CreatureCondition = 'healthy' | 'tired' | 'startled' | 'recovering';
export type TemperamentState = 'unobserved' | 'calm' | 'curious' | 'wary' | 'startled' | 'fleeing';
export type ObservationApproach = 'quiet' | 'steady' | 'patient' | 'rushed';

export interface TemperamentProfile {
  readonly boldness: number;
  readonly curiosity: number;
  readonly patience: number;
  readonly sociability: number;
  readonly startleResponse: number;
}

export interface CreatureSpecies {
  readonly id: CreatureSpeciesId;
  readonly name: string;
  readonly description: string;
  readonly habitats: readonly HabitatId[];
  readonly traits: readonly CreatureTrait[];
  readonly temperament: TemperamentProfile;
  readonly captureDifficulty: number;
}

export interface CreatureHabitat {
  readonly id: HabitatId;
  readonly name: string;
  readonly description: string;
  readonly species: readonly CreatureSpeciesId[];
  readonly baseStability: number;
  readonly preferredApproaches: readonly ObservationApproach[];
}

export interface Observation {
  readonly speciesId: CreatureSpeciesId;
  readonly habitatId: HabitatId;
  readonly observedAtMs: number;
  readonly approach: ObservationApproach;
  readonly state: TemperamentState;
  readonly confidence: number;
  readonly stabilityBonus: number;
  readonly tags: readonly CreatureTrait[];
}

export interface StabilityWindow {
  readonly openedAtMs: number;
  readonly durationMs: number;
  readonly seed: string;
  readonly baseline: number;
  readonly drift: number;
}

export interface StabilityReading {
  readonly atMs: number;
  readonly active: boolean;
  readonly expired: boolean;
  readonly elapsedMs: number;
  readonly remainingMs: number;
  readonly percent: number;
}

export interface CatchBallInventory {
  readonly available: number;
  readonly thrown: number;
}

export interface CatchBallAttempt {
  readonly attemptId: string;
  readonly startedAtMs: number;
  readonly ballType: 'standard';
}

export type CaptureOutcome = 'captured' | 'missed' | 'window-closed' | 'no-catch-ball' | 'invalid-observation';

export interface CaptureRequest {
  readonly speciesId: CreatureSpeciesId;
  readonly habitatId: HabitatId;
  readonly observation: Observation;
  /** The domain derives the current reading from this window and nowMs. */
  readonly stabilityWindow: StabilityWindow;
  readonly inventory: CatchBallInventory;
  readonly attempt: CatchBallAttempt;
  readonly nowMs: number;
}

export interface CaptureResult {
  readonly outcome: CaptureOutcome;
  readonly score: number;
  readonly threshold: number;
  readonly inventory: CatchBallInventory;
  readonly speciesId: CreatureSpeciesId;
  readonly habitatId: HabitatId;
  readonly memberId?: string;
}

export interface RosterMember {
  readonly memberId: string;
  readonly speciesId: CreatureSpeciesId;
  readonly habitatId: HabitatId;
  readonly traits: readonly CreatureTrait[];
  readonly tags: readonly string[];
  readonly condition: CreatureCondition;
  readonly teamPosition: number | null;
  readonly capturedAtMs: number;
}

export interface RosterState {
  readonly schemaVersion: 1;
  readonly revision: number;
  readonly members: readonly RosterMember[];
}

export interface RosterSnapshot {
  readonly schemaVersion: 1;
  readonly revision: number;
  readonly members: readonly RosterMember[];
}

export interface RosterMemberPatch {
  readonly condition?: CreatureCondition;
  readonly tags?: readonly string[];
  readonly teamPosition?: number | null;
}

/** Minimal, JSON-safe roster shape consumed by the later battle subsystem. */
export interface BattleRosterProjection {
  readonly rosterMemberId: string;
  readonly speciesId: CreatureSpeciesId;
  readonly condition: CreatureCondition;
  readonly teamPosition: number | null;
  readonly comboTags: readonly string[];
}
