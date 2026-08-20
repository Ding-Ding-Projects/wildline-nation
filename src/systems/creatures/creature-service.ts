import { CreatureDomainError } from './errors';
import type { DeterministicCatchBallInventory, CatchBallType, CaptureAttempt, DeterministicCaptureOutcome, CreatureInstance, CreatureResult, CreatureSnapshot, DeterministicCreatureSpecies, CreatureServiceOptions, Encounter } from './types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const ok = <T>(value: T): CreatureResult<T> => ({ ok: true, value });
const fail = <T>(code: ConstructorParameters<typeof CreatureDomainError>[0], message: string, details: Record<string, unknown> = {}): CreatureResult<T> => ({ ok: false, error: new CreatureDomainError(code, message, details) });
const integer = (value: number, min = 0): boolean => Number.isSafeInteger(value) && value >= min;

function validateSpecies(species: DeterministicCreatureSpecies): boolean { return Boolean(species.id.trim() && species.name.trim() && integer(species.basePower, 1) && integer(species.baseResilience, 1) && species.captureDifficulty >= 0 && species.captureDifficulty <= 1 && species.habitatIds.length > 0); }

export const DEFAULT_SPECIES: readonly DeterministicCreatureSpecies[] = [
  { id: 'brineling', name: 'Brineling', element: 'tide', basePower: 24, baseResilience: 34, captureDifficulty: 0.28, habitatIds: ['tideglass-habitat', 'harbour-courtyard'] },
  { id: 'fallowisp', name: 'Fallowisp', element: 'grove', basePower: 29, baseResilience: 25, captureDifficulty: 0.42, habitatIds: ['old-quay', 'tideglass-habitat'] },
  { id: 'cinderfinch', name: 'Cinderfinch', element: 'ember', basePower: 31, baseResilience: 20, captureDifficulty: 0.54, habitatIds: ['civic-steps'] },
];

export const DEFAULT_BALL_TYPES: readonly CatchBallType[] = [
  { id: 'catch-ball', displayName: 'Catch Ball', captureBonus: 0, maxStack: 999 },
  { id: 'tide-ball', displayName: 'Tide Ball', captureBonus: 0.18, maxStack: 999 },
  { id: 'steady-ball', displayName: 'Steady Ball', captureBonus: 0.3, maxStack: 999 },
];

export class CreatureService {
  private readonly species = new Map<string, DeterministicCreatureSpecies>();
  private readonly ballTypes = new Map<string, CatchBallType>();
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly idFactory: (prefix: string) => string;
  private encounters = new Map<string, Encounter>();
  private creatures = new Map<string, CreatureInstance>();
  private inventories = new Map<string, DeterministicCatchBallInventory>();

  constructor(options: Partial<CreatureServiceOptions> = {}) {
    const species = options.species ?? DEFAULT_SPECIES;
    const balls = options.ballTypes ?? DEFAULT_BALL_TYPES;
    if (species.length === 0 || balls.length === 0) throw new TypeError('CreatureService requires a catalogue and Catch Ball types.');
    for (const entry of species) { if (!validateSpecies(entry) || this.species.has(entry.id)) throw new TypeError(`Invalid or duplicate creature species: ${entry.id}.`); this.species.set(entry.id, clone(entry)); }
    for (const ball of balls) { if (!ball.id.trim() || !ball.displayName.trim() || ball.captureBonus < 0 || ball.captureBonus > 1 || !integer(ball.maxStack, 1) || this.ballTypes.has(ball.id)) throw new TypeError(`Invalid or duplicate Catch Ball type: ${ball.id}.`); this.ballTypes.set(ball.id, clone(ball)); }
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}-${this.now()}-${Math.floor(this.random() * 1_000_000)}`);
  }

  static fromSnapshot(options: CreatureServiceOptions, snapshot: CreatureSnapshot): CreatureResult<CreatureService> { const service = new CreatureService(options); const restored = service.reloadSnapshot(snapshot); return restored.ok ? ok(service) : restored; }
  listSpecies(): readonly DeterministicCreatureSpecies[] { return [...this.species.values()].map(clone); }
  listBallTypes(): readonly CatchBallType[] { return [...this.ballTypes.values()].map(clone); }
  listCreatures(ownerId: string): readonly CreatureInstance[] { return [...this.creatures.values()].filter((creature) => creature.ownerId === ownerId).map(clone); }
  getEncounter(encounterId: string): CreatureResult<Encounter> { const encounter = this.encounters.get(encounterId); return encounter ? ok(clone(encounter)) : fail('encounter-not-found', 'The requested encounter does not exist.', { encounterId }); }

  grantBalls(ownerId: string, ballTypeId: string, quantity: number): CreatureResult<DeterministicCatchBallInventory> {
    const ball = this.ballTypes.get(ballTypeId);
    if (!ownerId.trim()) return fail('owner-invalid', 'An owner identifier is required.');
    if (!ball) return fail('ball-not-found', 'The requested Catch Ball type does not exist.', { ballTypeId });
    if (!integer(quantity, 1)) return fail('ball-invalid', 'Catch Ball quantity must be a positive integer.');
    const current = this.inventories.get(ownerId) ?? { ownerId, quantities: {}, revision: 0 };
    const nextQuantity = (current.quantities[ballTypeId] ?? 0) + quantity;
    if (nextQuantity > ball.maxStack) return fail('ball-invalid', 'The Catch Ball stack would exceed its bounded maximum.', { maxStack: ball.maxStack });
    const inventory: DeterministicCatchBallInventory = { ownerId, quantities: { ...current.quantities, [ballTypeId]: nextQuantity }, revision: current.revision + 1 };
    this.inventories.set(ownerId, inventory);
    return ok(clone(inventory));
  }

  getInventory(ownerId: string): CreatureResult<DeterministicCatchBallInventory> { if (!ownerId.trim()) return fail('owner-invalid', 'An owner identifier is required.'); return ok(clone(this.inventories.get(ownerId) ?? { ownerId, quantities: {}, revision: 0 })); }

  createEncounter(ownerId: string, speciesId: string, habitatId: string): CreatureResult<Encounter> {
    const species = this.species.get(speciesId);
    if (!ownerId.trim()) return fail('owner-invalid', 'An owner identifier is required.');
    if (!species) return fail('species-not-found', 'The requested creature species is not in the catalogue.', { speciesId });
    if (!species.habitatIds.includes(habitatId)) return fail('habitat-invalid', 'This species is not found in the supplied habitat.', { speciesId, habitatId });
    const encounter: Encounter = { encounterId: this.idFactory('encounter'), ownerId, speciesId, habitatId, state: 'observed', stability: 1, attempts: 0, createdAtEpochMs: this.now() };
    this.encounters.set(encounter.encounterId, encounter);
    return ok(clone(encounter));
  }

  observe(encounterId: string, ownerId: string): CreatureResult<Encounter> {
    const encounter = this.encounters.get(encounterId);
    if (!encounter) return fail('encounter-not-found', 'The requested encounter does not exist.', { encounterId });
    if (encounter.ownerId !== ownerId) return fail('encounter-owner-mismatch', 'Only the encounter owner may observe it.');
    if (encounter.state === 'fled' || encounter.state === 'captured') return fail('capture-complete', 'This encounter has already ended.', { state: encounter.state });
    const next: Encounter = { ...encounter, state: 'calm', stability: Math.min(1, encounter.stability + 0.08) };
    this.encounters.set(encounterId, next);
    return ok(clone(next));
  }

  capture(attempt: CaptureAttempt): CreatureResult<DeterministicCaptureOutcome> {
    const encounter = this.encounters.get(attempt.encounterId);
    const ball = this.ballTypes.get(attempt.ballTypeId);
    if (!encounter) return fail('encounter-not-found', 'The requested encounter does not exist.', { encounterId: attempt.encounterId });
    if (encounter.ownerId !== attempt.ownerId) return fail('encounter-owner-mismatch', 'Only the encounter owner may attempt capture.');
    if (!ball) return fail('ball-not-found', 'The requested Catch Ball type does not exist.', { ballTypeId: attempt.ballTypeId });
    if (encounter.state === 'fled' || encounter.state === 'captured') return fail('capture-complete', 'This encounter has already ended.', { state: encounter.state });
    const inventory = this.inventories.get(attempt.ownerId) ?? { ownerId: attempt.ownerId, quantities: {}, revision: 0 };
    const quantity = inventory.quantities[attempt.ballTypeId] ?? 0;
    if (quantity < 1) return fail('not-enough-balls', 'The owner has no Catch Balls of the requested type.');
    const species = this.species.get(encounter.speciesId)!;
    const probability = Math.max(0.05, Math.min(0.95, (1 - species.captureDifficulty) * (0.55 + encounter.stability * 0.45) + ball.captureBonus));
    const roll = Number.isFinite(attempt.roll) ? Math.max(0, Math.min(0.999999, attempt.roll)) : this.random();
    const captured = roll < probability;
    const instanceId = captured ? this.idFactory(`creature-${species.id}`) : null;
    if (instanceId && this.creatures.has(instanceId)) return fail('duplicate-creature', 'The generated creature instance identifier already exists.');
    const nextInventory: DeterministicCatchBallInventory = { ...inventory, quantities: { ...inventory.quantities, [attempt.ballTypeId]: quantity - 1 }, revision: inventory.revision + 1 };
    this.inventories.set(attempt.ownerId, nextInventory);
    const nextEncounter: Encounter = { ...encounter, attempts: encounter.attempts + 1, stability: Math.max(0, encounter.stability - 0.12), state: captured ? 'captured' : encounter.attempts + 1 >= 5 ? 'fled' : encounter.attempts % 2 === 0 ? 'calm' : 'agitated' };
    this.encounters.set(encounter.encounterId, nextEncounter);
    let creature: CreatureInstance | null = null;
    if (instanceId) { creature = { instanceId, speciesId: species.id, ownerId: attempt.ownerId, nickname: null, level: 1, experience: 0, capturedAtEpochMs: this.now() }; this.creatures.set(instanceId, creature); }
    return ok({ captured, encounter: clone(nextEncounter), creature: clone(creature), remainingBalls: quantity - 1, probability });
  }

  saveSnapshot(): CreatureSnapshot { return { schemaVersion: 1, savedAtEpochMs: this.now(), encounters: clone([...this.encounters.values()]), creatures: clone([...this.creatures.values()]), inventories: clone([...this.inventories.values()]) }; }
  reloadSnapshot(snapshot: CreatureSnapshot): CreatureResult<CreatureSnapshot> {
    if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.encounters) || !Array.isArray(snapshot.creatures) || !Array.isArray(snapshot.inventories)) return fail('snapshot-invalid', 'The creature snapshot has an unsupported shape.');
    const ids = new Set<string>();
    for (const creature of snapshot.creatures) { if (!this.species.has(creature.speciesId) || !creature.ownerId || !creature.instanceId || ids.has(creature.instanceId)) return fail('snapshot-invalid', 'The creature snapshot contains an invalid or duplicate owned instance.'); ids.add(creature.instanceId); }
    for (const inventory of snapshot.inventories) { if (!inventory.ownerId || !integer(inventory.revision) || Object.entries(inventory.quantities).some(([id, quantity]) => !this.ballTypes.has(id) || !integer(quantity))) return fail('inventory-invalid', 'The creature snapshot contains an invalid Catch Ball inventory.'); }
    this.encounters = new Map(snapshot.encounters.map((encounter) => [encounter.encounterId, clone(encounter)]));
    this.creatures = new Map(snapshot.creatures.map((creature) => [creature.instanceId, clone(creature)]));
    this.inventories = new Map(snapshot.inventories.map((inventory) => [inventory.ownerId, clone(inventory)]));
    return ok(this.saveSnapshot());
  }
  serializeSnapshot(): string { return JSON.stringify(this.saveSnapshot()); }
  parseSnapshot(serialized: string): CreatureResult<CreatureSnapshot> { try { return this.reloadSnapshot(JSON.parse(serialized) as CreatureSnapshot); } catch { return fail('snapshot-invalid', 'The creature snapshot is not valid JSON.'); } }
}
