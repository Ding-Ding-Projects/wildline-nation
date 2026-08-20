export type BattleErrorCode =
  | 'actor-not-in-contract'
  | 'battle-complete'
  | 'battle-not-found'
  | 'contract-expired'
  | 'contract-invalid'
  | 'duplicate-settlement'
  | 'empty-team'
  | 'invalid-action'
  | 'invalid-team'
  | 'snapshot-invalid'
  | 'target-not-found'
  | 'turn-order-invalid'
  | 'unit-not-available';

export class BattleDomainError extends Error {
  readonly code: BattleErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: BattleErrorCode, message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = 'BattleDomainError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
