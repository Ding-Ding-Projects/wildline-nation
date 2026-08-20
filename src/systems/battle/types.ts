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
