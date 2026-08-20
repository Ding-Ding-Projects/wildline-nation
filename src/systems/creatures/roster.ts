import { getCreatureHabitat, getCreatureSpecies } from './catalog';
import type {
  CaptureResult,
  BattleRosterProjection,
  CreatureCondition,
  CreatureTrait,
  HabitatId,
  RosterMember,
  RosterMemberPatch,
  RosterSnapshot,
  RosterState,
} from './types';
import type { CreatureSpeciesId } from './types';

export const ROSTER_SCHEMA_VERSION = 1 as const;
export const MAX_ROSTER_MEMBERS = 1_000;

const creatureConditions = new Set<CreatureCondition>(['healthy', 'tired', 'startled', 'recovering']);

function cloneMember(member: RosterMember): RosterMember {
  return Object.freeze({ ...member, traits: Object.freeze([...member.traits]), tags: Object.freeze([...member.tags]) });
}

function cloneRoster(roster: RosterState): RosterState {
  return Object.freeze({ schemaVersion: ROSTER_SCHEMA_VERSION, revision: roster.revision, members: Object.freeze(roster.members.map(cloneMember)) });
}

function validRevision(value: number): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError('Roster revision must be a non-negative integer');
}

function validateMember(member: RosterMember, index: number, ids: Set<string>): void {
  if (!member.memberId || !/^[a-z0-9][a-z0-9-]{2,127}$/.test(member.memberId)) throw new TypeError(`Invalid roster member id at index ${index}`);
  if (ids.has(member.memberId)) throw new TypeError(`Duplicate roster member id: ${member.memberId}`);
  ids.add(member.memberId);
  const species = getCreatureSpecies(member.speciesId);
  const habitat = getCreatureHabitat(member.habitatId);
  if (!species) throw new TypeError(`Unknown species in roster: ${member.speciesId}`);
  if (!habitat || !species.habitats.includes(member.habitatId)) throw new TypeError(`Invalid habitat in roster: ${member.habitatId}`);
  if (!Number.isSafeInteger(member.capturedAtMs) || member.capturedAtMs < 0) throw new TypeError(`Invalid capture time for ${member.memberId}`);
  if (!creatureConditions.has(member.condition)) throw new TypeError(`Invalid condition for ${member.memberId}`);
  if (member.teamPosition !== null && (!Number.isInteger(member.teamPosition) || member.teamPosition < 0)) throw new TypeError(`Invalid team position for ${member.memberId}`);
  if (!Array.isArray(member.traits) || member.traits.some((trait) => !species.traits.includes(trait))) throw new TypeError(`Invalid traits for ${member.memberId}`);
  if (!Array.isArray(member.tags) || member.tags.length > 64 || member.tags.some((tag) => typeof tag !== 'string' || tag.trim().length === 0 || tag.length > 64)) throw new TypeError(`Invalid tags for ${member.memberId}`);
}

export function validateRoster(value: unknown): asserts value is RosterState {
  if (!value || typeof value !== 'object') throw new TypeError('Roster must be an object');
  const roster = value as Partial<RosterState>;
  if (roster.schemaVersion !== ROSTER_SCHEMA_VERSION) throw new TypeError('Unsupported roster schema version');
  validRevision(roster.revision ?? -1);
  if (!Array.isArray(roster.members)) throw new TypeError('Roster members must be an array');
  if (roster.members.length > MAX_ROSTER_MEMBERS) throw new TypeError(`Roster cannot exceed ${MAX_ROSTER_MEMBERS} members`);
  const ids = new Set<string>();
  const positions = new Set<number>();
  roster.members.forEach((member, index) => {
    if (!member || typeof member !== 'object') throw new TypeError(`Invalid roster member at index ${index}`);
    validateMember(member as RosterMember, index, ids);
    if (member.teamPosition !== null) {
      if (positions.has(member.teamPosition)) throw new TypeError(`Duplicate team position: ${member.teamPosition}`);
      positions.add(member.teamPosition);
    }
  });
}

export function createRoster(members: readonly RosterMember[] = [], revision = 0): RosterState {
  const roster = { schemaVersion: ROSTER_SCHEMA_VERSION, revision, members: [...members] } as RosterState;
  validateRoster(roster);
  return cloneRoster(roster);
}

export function snapshotRoster(roster: RosterState): RosterSnapshot {
  validateRoster(roster);
  return cloneRoster(roster);
}

export function restoreRoster(snapshot: unknown): RosterState {
  validateRoster(snapshot);
  return cloneRoster(snapshot);
}

export function addCapturedCreature(roster: RosterState, capture: CaptureResult, capturedAtMs: number, tags: readonly string[] = []): RosterState {
  validateRoster(roster);
  if (capture.outcome !== 'captured' || !capture.memberId) throw new RangeError('Only a captured result can be added to a roster');
  if (!Number.isFinite(capturedAtMs) || capturedAtMs < 0) throw new RangeError('capturedAtMs must be finite and non-negative');
  if (roster.members.some((member) => member.memberId === capture.memberId)) throw new RangeError(`Roster member already exists: ${capture.memberId}`);
  const species = getCreatureSpecies(capture.speciesId);
  if (!species) throw new TypeError(`Unknown species: ${capture.speciesId}`);
  const member: RosterMember = {
    memberId: capture.memberId,
    speciesId: capture.speciesId,
    habitatId: capture.habitatId,
    traits: [...species.traits],
    tags: [...tags],
    condition: 'healthy',
    teamPosition: null,
    capturedAtMs: Math.floor(capturedAtMs),
  };
  return createRoster([...roster.members, member], roster.revision + 1);
}

export function updateRosterMember(roster: RosterState, memberId: string, patch: RosterMemberPatch): RosterState {
  validateRoster(roster);
  const index = roster.members.findIndex((member) => member.memberId === memberId);
  if (index < 0) throw new RangeError(`Unknown roster member: ${memberId}`);
  const next = roster.members.map((member, memberIndex) => memberIndex === index ? {
    ...member,
    ...(patch.condition ? { condition: patch.condition } : {}),
    ...(patch.tags ? { tags: [...patch.tags] } : {}),
    ...(patch.teamPosition !== undefined ? { teamPosition: patch.teamPosition } : {}),
  } : member);
  return createRoster(next, roster.revision + 1);
}

export function setTeamPosition(roster: RosterState, memberId: string, teamPosition: number | null): RosterState {
  return updateRosterMember(roster, memberId, { teamPosition });
}

export function serializeRoster(roster: RosterState): string {
  validateRoster(roster);
  return JSON.stringify(snapshotRoster(roster));
}

export function deserializeRoster(serialized: string): RosterState {
  if (typeof serialized !== 'string' || serialized.length > 2_000_000) throw new TypeError('Serialized roster is missing or exceeds the 2 MB limit');
  let parsed: unknown;
  try { parsed = JSON.parse(serialized) as unknown; } catch (error) { throw new TypeError(`Roster JSON is invalid: ${error instanceof Error ? error.message : 'parse error'}`); }
  return restoreRoster(parsed);
}

export function rosterMemberSummary(member: RosterMember): { readonly memberId: string; readonly speciesId: CreatureSpeciesId; readonly habitatId: HabitatId; readonly condition: CreatureCondition; readonly teamPosition: number | null; readonly traits: readonly CreatureTrait[] } {
  return { memberId: member.memberId, speciesId: member.speciesId, habitatId: member.habitatId, condition: member.condition, teamPosition: member.teamPosition, traits: [...member.traits] };
}

/**
 * Projects a roster member into the stable shape needed by battle setup.
 * Species traits come from the catalog; member tags are layered on afterward
 * and deduplicated without mutating either source.
 */
export function toBattleRosterProjection(member: RosterMember): BattleRosterProjection {
  const species = getCreatureSpecies(member.speciesId);
  if (!species) throw new TypeError(`Unknown species in roster member: ${member.speciesId}`);
  const comboTags = [...new Set([...species.traits, ...member.tags])];
  return Object.freeze({
    rosterMemberId: member.memberId,
    speciesId: member.speciesId,
    condition: member.condition,
    teamPosition: member.teamPosition,
    comboTags: Object.freeze(comboTags),
  });
}
