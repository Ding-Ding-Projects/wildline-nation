export type BattleActionId = 'strike' | 'guard' | 'recover';
/** Deterministic service API status retained from the integrated service family. */
export type DeterministicBattleStatus = 'ready' | 'active' | 'won' | 'lost' | 'draw' | 'settled';
export type BattleUnitStatus = 'healthy' | 'guarding' | 'stunned' | 'fainted';

export interface BattleMove {
  readonly id: BattleActionId;
  readonly displayName: string;
  readonly power: number;
  readonly accuracy: number;
  readonly cooldownTurns: number;
}

export interface BattleUnit {
  readonly id: string;
  readonly creatureInstanceId: string;
  readonly name: string;
  readonly maxHealth: number;
  readonly attack: number;
  readonly defense: number;
  readonly moves: readonly BattleMove[];
}

export interface BattleTeam {
  readonly teamId: string;
  readonly ownerId: string;
  readonly units: readonly BattleUnit[];
}

export interface PaidBattleContract {
  readonly contractId: string;
  readonly arenaId: string;
  readonly challengerId: string;
  readonly opponentId: string;
  readonly rewardCents: number;
  readonly currency: string;
  readonly expiresAtEpochMs: number;
  /** A contract may pay money, but it never controls map or route access. */
  readonly mapAccessRequired: false;
}

export interface BattleUnitState {
  readonly unit: BattleUnit;
  readonly health: number;
  readonly status: BattleUnitStatus;
  readonly cooldowns: Readonly<Record<string, number>>;
}

export interface BattleState {
  readonly battleId: string;
  readonly contract: PaidBattleContract;
  readonly challenger: readonly BattleUnitState[];
  readonly opponent: readonly BattleUnitState[];
  readonly turn: number;
  readonly activeSide: 'challenger' | 'opponent';
  readonly status: DeterministicBattleStatus;
  readonly lastAction: BattleActionRecord | null;
}

export interface BattleActionRequest {
  readonly actorId: string;
  readonly unitId: string;
  readonly moveId: BattleActionId;
  readonly targetUnitId?: string;
}

export interface BattleActionRecord {
  readonly turn: number;
  readonly actorId: string;
  readonly unitId: string;
  readonly moveId: BattleActionId;
  readonly targetUnitId: string | null;
  readonly hit: boolean;
  readonly damage: number;
  readonly roll: number;
}

export interface RewardSettlement {
  readonly settlementId: string;
  readonly contractId: string;
  readonly recipientId: string | null;
  readonly amountCents: number;
  readonly currency: string;
  readonly outcome: 'challenger-win' | 'opponent-win' | 'draw' | 'no-reward';
  readonly settledAtEpochMs: number;
}

export interface BattleSnapshot {
  readonly schemaVersion: 1;
  readonly savedAtEpochMs: number;
  readonly battles: readonly BattleState[];
  readonly settlements: readonly RewardSettlement[];
}

export interface BattleServiceOptions {
  readonly now?: () => number;
  readonly random?: () => number;
  readonly idFactory?: (prefix: string) => string;
}

export type BattleResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: import('./errors').BattleDomainError };
export type BattleStance = 'surge' | 'brace' | 'drift';
export type BattleTeamSide = 'player' | 'opponent';
export type BattleStatus = 'active' | 'player-won' | 'opponent-won' | 'draw';
export type BattleTechniqueKind = 'strike' | 'support' | 'interrupt';
export type BattleInterruptTrigger = 'opponent-strike' | 'opponent-combo' | 'opponent-stance-change';

export interface BattleTechnique {
  id: string;
  name: string;
  kind: BattleTechniqueKind;
  basePower: number;
  priority: number;
  momentumGain: number;
  momentumCost: number;
  comboTags: readonly string[];
  interruptTrigger?: BattleInterruptTrigger;
}

export interface BattleFighterProfile {
  speciesId: string;
  maxVitality: number;
  power: number;
  resilience: number;
  speed: number;
  techniqueIds: readonly string[];
}

export interface BattleFighterSeed {
  id: string;
  rosterMemberId?: string;
  name: string;
  speciesId: string;
  maxVitality: number;
  power: number;
  resilience: number;
  speed: number;
  comboTags: readonly string[];
  techniqueIds: readonly string[];
}

export interface BattleTeamSeed {
  id: string;
  name: string;
  side: BattleTeamSide;
  members: readonly BattleFighterSeed[];
}

export interface BattleComboDefinition {
  id: string;
  name: string;
  requiredTags: readonly string[];
  minimumContributors: number;
  momentumCost: number;
  powerMultiplier: number;
}

export interface BattleContract {
  id: string;
  name: string;
  venueId: string;
  opponentTeam: BattleTeamSeed;
  payout: number;
  currency: 'CAD';
  maxTurns: number;
  repeatable: boolean;
}

export interface BattleCatalog {
  techniques: readonly BattleTechnique[];
  fighterProfiles: readonly BattleFighterProfile[];
  combos: readonly BattleComboDefinition[];
  contracts: readonly BattleContract[];
}

export interface BattleVenueContext {
  venueId: string;
  interactionId: string;
  present: true;
  expiresAtMs: number;
}

export interface BattleFighterState extends BattleFighterSeed {
  vitality: number;
  stance: BattleStance;
}

export interface BattleTeamState {
  id: string;
  name: string;
  side: BattleTeamSide;
  momentum: number;
  members: BattleFighterState[];
}

export interface BattleTurnEvent {
  id: string;
  turn: number;
  kind: 'stance' | 'strike' | 'support' | 'interrupt' | 'interrupted' | 'defeated' | 'payout' | 'draw';
  teamId: string;
  actorId?: string;
  targetId?: string;
  techniqueId?: string;
  amount?: number;
  detail: string;
}

export interface BattleTurnRecord {
  turn: number;
  occurredAt: string;
  events: BattleTurnEvent[];
}

export interface BattleInstanceState {
  id: string;
  contractId: string;
  status: BattleStatus;
  turn: number;
  teams: [BattleTeamState, BattleTeamState];
  startedAt: string;
  completedAt?: string;
  payoutReceiptId?: string;
  turns: BattleTurnRecord[];
}

export interface BattlePayoutReceipt {
  id: string;
  battleId: string;
  contractId: string;
  amount: number;
  currency: 'CAD';
  issuedAt: string;
  reason: 'contract-victory';
}

export interface BattleSystemState {
  version: 1;
  nextBattleSequence: number;
  battles: BattleInstanceState[];
  payoutReceipts: BattlePayoutReceipt[];
}

export interface StartBattleRequest {
  contractId: string;
  playerTeam: BattleTeamSeed;
  venue: BattleVenueContext;
  nowMs: number;
  occurredAt: string;
}

export interface BattleTurnIntent {
  id: string;
  teamId: string;
  actorId: string;
  targetId: string;
  techniqueId: string;
  stance: BattleStance;
  comboId?: string;
}

export interface BattleInterruptIntent {
  id: string;
  teamId: string;
  actorId: string;
  targetIntentId: string;
  techniqueId: string;
}

export interface ResolveBattleTurnRequest {
  battleId: string;
  occurredAt: string;
  intents: readonly BattleTurnIntent[];
  interrupts?: readonly BattleInterruptIntent[];
}

export interface BattleComboReadiness {
  comboId: string;
  name: string;
  ready: boolean;
  requiredTags: readonly string[];
  matchedTags: readonly string[];
  contributorIds: readonly string[];
  minimumContributors: number;
  momentum: number;
  momentumCost: number;
}

export interface BattleTurnResolution {
  battle: BattleInstanceState;
  events: readonly BattleTurnEvent[];
  payout?: BattlePayoutReceipt;
  /** Battles are paid work and never unlock districts, routes, or places. */
  geographyUnlocks: readonly [];
}

export interface BattleTeamFromRosterOptions {
  teamId?: string;
  teamName?: string;
  displayNames?: Readonly<Record<string, string>>;
}

export type BattleDomainErrorCode =
  | 'INVALID_CATALOG'
  | 'INVALID_STATE'
  | 'UNKNOWN_CONTRACT'
  | 'UNKNOWN_BATTLE'
  | 'UNKNOWN_TEAM'
  | 'UNKNOWN_FIGHTER'
  | 'UNKNOWN_TECHNIQUE'
  | 'UNKNOWN_COMBO'
  | 'INVALID_VENUE'
  | 'INVALID_TEAM'
  | 'INVALID_TURN'
  | 'INVALID_INTENT'
  | 'INVALID_INTERRUPT'
  | 'INSUFFICIENT_MOMENTUM'
  | 'COMBO_NOT_READY'
  | 'BATTLE_COMPLETE';

export class BattleDomainError extends Error {
  readonly code: BattleDomainErrorCode;

  constructor(code: BattleDomainErrorCode, message: string) {
    super(message);
    this.name = 'BattleDomainError';
    this.code = code;
  }
}
