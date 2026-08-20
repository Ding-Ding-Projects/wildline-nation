export type BattleActionId = 'strike' | 'guard' | 'recover';
export type BattleStatus = 'ready' | 'active' | 'won' | 'lost' | 'draw' | 'settled';
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
  readonly status: BattleStatus;
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
