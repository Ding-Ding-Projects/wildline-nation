import { BattleDomainError } from './errors';
import type { BattleActionRecord, BattleActionRequest, BattleResult, BattleServiceOptions, BattleSnapshot, BattleState, BattleTeam, BattleUnitState, PaidBattleContract, RewardSettlement } from './types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const ok = <T>(value: T): BattleResult<T> => ({ ok: true, value });
const fail = <T>(code: ConstructorParameters<typeof BattleDomainError>[0], message: string, details: Record<string, unknown> = {}): BattleResult<T> => ({ ok: false, error: new BattleDomainError(code, message, details) });
const integer = (value: number, min = 0): boolean => Number.isSafeInteger(value) && value >= min;
const nonEmpty = (value: string): boolean => value.trim().length > 0;

function validateTeam(team: BattleTeam): string | null {
  if (!nonEmpty(team.teamId) || !nonEmpty(team.ownerId)) return 'A battle team needs identifiers.';
  if (team.units.length === 0 || team.units.length > 6) return 'A battle team must contain between one and six units.';
  const ids = new Set<string>();
  for (const unit of team.units) {
    if (!nonEmpty(unit.id) || !nonEmpty(unit.creatureInstanceId) || !nonEmpty(unit.name) || !integer(unit.maxHealth, 1) || !integer(unit.attack, 1) || !integer(unit.defense) || unit.moves.length === 0 || ids.has(unit.id)) return `Unit ${unit.id} is invalid or duplicated.`;
    ids.add(unit.id);
    if (unit.moves.some((move) => !nonEmpty(move.id) || !integer(move.power) || move.accuracy < 0 || move.accuracy > 1 || !integer(move.cooldownTurns))) return `Unit ${unit.id} has an invalid move.`;
  }
  return null;
}

function unitsFor(team: BattleTeam): readonly BattleUnitState[] { return team.units.map((unit) => ({ unit: clone(unit), health: unit.maxHealth, status: 'healthy', cooldowns: {} })); }
function defeated(units: readonly BattleUnitState[]): boolean { return units.every((unit) => unit.status === 'fainted'); }
function firstReady(units: readonly BattleUnitState[]): BattleUnitState | undefined { return units.find((unit) => unit.status !== 'fainted'); }

export class BattleService {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly idFactory: (prefix: string) => string;
  private battles = new Map<string, BattleState>();
  private settlements = new Map<string, RewardSettlement>();

  constructor(options: BattleServiceOptions = {}) { this.now = options.now ?? Date.now; this.random = options.random ?? Math.random; this.idFactory = options.idFactory ?? ((prefix) => `${prefix}-${this.now()}-${Math.floor(this.random() * 1_000_000)}`); }
  static fromSnapshot(options: BattleServiceOptions, snapshot: BattleSnapshot): BattleResult<BattleService> { const service = new BattleService(options); const restored = service.reloadSnapshot(snapshot); return restored.ok ? ok(service) : restored; }
  getBattle(battleId: string): BattleResult<BattleState> { const battle = this.battles.get(battleId); return battle ? ok(clone(battle)) : fail('battle-not-found', 'The requested battle does not exist.', { battleId }); }
  getSettlement(contractId: string): BattleResult<RewardSettlement> { const settlement = this.settlements.get(contractId); return settlement ? ok(clone(settlement)) : fail('duplicate-settlement', 'No settlement exists for this contract yet.', { contractId }); }

  createContract(contract: PaidBattleContract, challenger: BattleTeam, opponent: BattleTeam): BattleResult<BattleState> {
    const challengerIssue = validateTeam(challenger);
    const opponentIssue = validateTeam(opponent);
    if (!nonEmpty(contract.contractId) || !nonEmpty(contract.arenaId) || !nonEmpty(contract.challengerId) || !nonEmpty(contract.opponentId) || contract.challengerId !== challenger.ownerId || contract.opponentId !== opponent.ownerId || !integer(contract.rewardCents) || !nonEmpty(contract.currency) || contract.expiresAtEpochMs <= this.now() || contract.mapAccessRequired !== false || challengerIssue || opponentIssue) return fail(challengerIssue || opponentIssue ? 'invalid-team' : 'contract-invalid', challengerIssue || opponentIssue || 'A paid battle contract has invalid identities, reward, expiry, or map-access policy.', { contractId: contract.contractId });
    if (this.battles.has(contract.contractId)) return fail('contract-invalid', 'A battle contract id can only be used once.', { contractId: contract.contractId });
    const state: BattleState = { battleId: this.idFactory('battle'), contract: clone(contract), challenger: unitsFor(challenger), opponent: unitsFor(opponent), turn: 1, activeSide: 'challenger', status: 'active', lastAction: null };
    this.battles.set(state.battleId, state);
    return ok(clone(state));
  }

  act(battleId: string, request: BattleActionRequest): BattleResult<BattleState> {
    const battle = this.battles.get(battleId);
    if (!battle) return fail('battle-not-found', 'The requested battle does not exist.', { battleId });
    if (battle.status !== 'active') return fail('battle-complete', 'A completed battle accepts no further turns.', { status: battle.status });
    const actorSide = request.actorId === battle.contract.challengerId ? 'challenger' : request.actorId === battle.contract.opponentId ? 'opponent' : null;
    if (!actorSide) return fail('actor-not-in-contract', 'Only contract participants may act.');
    if (actorSide !== battle.activeSide) return fail('turn-order-invalid', 'The other participant owns the active turn.', { activeSide: battle.activeSide });
    const actors = actorSide === 'challenger' ? battle.challenger : battle.opponent;
    const targets = actorSide === 'challenger' ? battle.opponent : battle.challenger;
    const actor = actors.find((unit) => unit.unit.id === request.unitId);
    if (!actor || actor.status === 'fainted') return fail('unit-not-available', 'The acting unit is not available.');
    const move = actor.unit.moves.find((candidate) => candidate.id === request.moveId);
    if (!move || (actor.cooldowns[move.id] ?? 0) > 0) return fail('invalid-action', 'The requested move is missing or on cooldown.');
    const target = move.id === 'strike' ? targets.find((unit) => unit.unit.id === (request.targetUnitId ?? firstReady(targets)?.unit.id)) : actor;
    if (!target || target.status === 'fainted') return fail('target-not-found', 'A living target is required for this action.');
    const roll = this.random();
    const hit = move.id === 'guard' || roll <= move.accuracy;
    const damage = hit && move.id === 'strike' ? Math.max(1, actor.unit.attack + move.power - target.unit.defense) : 0;
    const guardedTarget: BattleUnitState = move.id === 'guard'
      ? { ...actor, status: 'guarding', cooldowns: { ...actor.cooldowns, [move.id]: move.cooldownTurns } }
      : move.id === 'recover'
        ? { ...actor, health: Math.min(actor.unit.maxHealth, actor.health + Math.max(1, move.power)), cooldowns: { ...actor.cooldowns, [move.id]: move.cooldownTurns } }
        : { ...actor, cooldowns: { ...actor.cooldowns, [move.id]: move.cooldownTurns } };
    const updatedTarget: BattleUnitState = damage > 0 ? { ...target, health: Math.max(0, target.health - damage), status: target.health - damage <= 0 ? 'fainted' : target.status } : target;
    const updateSide = (units: readonly BattleUnitState[], side: 'actor' | 'target'): readonly BattleUnitState[] => units.map((unit) => unit.unit.id === (side === 'actor' ? actor.unit.id : target.unit.id) ? (side === 'actor' ? guardedTarget : updatedTarget) : { ...unit, cooldowns: Object.fromEntries(Object.entries(unit.cooldowns).map(([id, turns]) => [id, Math.max(0, turns - 1)]) ) });
    const challenger = actorSide === 'challenger' ? updateSide(battle.challenger, 'actor') : updateSide(battle.challenger, 'target');
    const opponent = actorSide === 'opponent' ? updateSide(battle.opponent, 'actor') : updateSide(battle.opponent, 'target');
    const nextStatus: BattleState['status'] = defeated(opponent) ? 'won' : defeated(challenger) ? 'lost' : battle.turn >= 100 ? 'draw' : 'active';
    const record: BattleActionRecord = { turn: battle.turn, actorId: request.actorId, unitId: actor.unit.id, moveId: move.id, targetUnitId: move.id === 'strike' ? target.unit.id : null, hit, damage, roll };
    const next: BattleState = { ...battle, challenger, opponent, turn: battle.turn + 1, activeSide: actorSide === 'challenger' ? 'opponent' : 'challenger', status: nextStatus, lastAction: record };
    this.battles.set(battleId, next);
    return ok(clone(next));
  }

  settle(battleId: string): BattleResult<RewardSettlement> {
    const battle = this.battles.get(battleId);
    if (!battle) return fail('battle-not-found', 'The requested battle does not exist.', { battleId });
    if (battle.status === 'active') return fail('battle-complete', 'Settlement requires a win, loss, or draw.');
    const existing = this.settlements.get(battle.contract.contractId);
    if (existing) return ok(clone(existing));
    const outcome: RewardSettlement['outcome'] = battle.status === 'won' ? 'challenger-win' : battle.status === 'lost' ? 'opponent-win' : 'draw';
    const recipientId = outcome === 'challenger-win' ? battle.contract.challengerId : outcome === 'opponent-win' ? battle.contract.opponentId : null;
    const settlement: RewardSettlement = { settlementId: this.idFactory('settlement'), contractId: battle.contract.contractId, recipientId, amountCents: recipientId ? battle.contract.rewardCents : 0, currency: battle.contract.currency, outcome, settledAtEpochMs: this.now() };
    this.settlements.set(battle.contract.contractId, settlement);
    this.battles.set(battleId, { ...battle, status: 'settled' });
    return ok(clone(settlement));
  }

  saveSnapshot(): BattleSnapshot { return { schemaVersion: 1, savedAtEpochMs: this.now(), battles: clone([...this.battles.values()]), settlements: clone([...this.settlements.values()]) }; }
  reloadSnapshot(snapshot: BattleSnapshot): BattleResult<BattleSnapshot> {
    if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.battles) || !Array.isArray(snapshot.settlements)) return fail('snapshot-invalid', 'The battle snapshot has an unsupported shape.');
    const battleIds = new Set<string>();
    for (const battle of snapshot.battles) { if (!battle.battleId || battleIds.has(battle.battleId) || !battle.contract || battle.contract.mapAccessRequired !== false || battle.turn < 1 || battle.turn > 101 || battle.challenger.length === 0 || battle.opponent.length === 0) return fail('snapshot-invalid', 'The battle snapshot contains an invalid battle.'); battleIds.add(battle.battleId); }
    const settlementIds = new Set<string>();
    for (const settlement of snapshot.settlements) { if (!settlement.settlementId || settlementIds.has(settlement.settlementId) || settlement.amountCents < 0) return fail('snapshot-invalid', 'The battle snapshot contains an invalid settlement.'); settlementIds.add(settlement.settlementId); }
    this.battles = new Map(snapshot.battles.map((battle) => [battle.battleId, clone(battle)]));
    this.settlements = new Map(snapshot.settlements.map((settlement) => [settlement.contractId, clone(settlement)]));
    return ok(this.saveSnapshot());
  }
  serializeSnapshot(): string { return JSON.stringify(this.saveSnapshot()); }
  parseSnapshot(serialized: string): BattleResult<BattleSnapshot> { try { return this.reloadSnapshot(JSON.parse(serialized) as BattleSnapshot); } catch { return fail('snapshot-invalid', 'The battle snapshot is not valid JSON.'); } }
}
