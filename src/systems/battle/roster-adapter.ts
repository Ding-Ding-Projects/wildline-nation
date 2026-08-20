import type { BattleRosterProjection } from '../creatures';
import { BattleDomainError, type BattleCatalog, type BattleTeamFromRosterOptions, type BattleTeamSeed } from './types';

const conditionModifiers = {
  healthy: { vitality: 1, power: 1, resilience: 1, speed: 1 },
  tired: { vitality: 0.85, power: 0.9, resilience: 0.9, speed: 0.8 },
  startled: { vitality: 0.9, power: 0.85, resilience: 0.85, speed: 1.05 },
  recovering: { vitality: 0.9, power: 0.9, resilience: 1, speed: 0.9 },
} as const;

export function createBattleTeamFromRoster(
  catalog: BattleCatalog,
  projections: readonly BattleRosterProjection[],
  options: BattleTeamFromRosterOptions = {},
): BattleTeamSeed {
  if (projections.length < 1 || projections.length > 4) {
    throw new BattleDomainError('INVALID_TEAM', 'A battle team must contain from one through four roster members.');
  }
  const seenMemberIds = new Set<string>();
  const ordered = [...projections].sort((left, right) => {
    const leftPosition = left.teamPosition ?? Number.MAX_SAFE_INTEGER;
    const rightPosition = right.teamPosition ?? Number.MAX_SAFE_INTEGER;
    return leftPosition - rightPosition || left.rosterMemberId.localeCompare(right.rosterMemberId);
  });
  const members = ordered.map((projection) => {
    if (seenMemberIds.has(projection.rosterMemberId)) {
      throw new BattleDomainError('INVALID_TEAM', `Duplicate roster member: ${projection.rosterMemberId}`);
    }
    seenMemberIds.add(projection.rosterMemberId);
    const profile = catalog.fighterProfiles.find((candidate) => candidate.speciesId === projection.speciesId);
    if (!profile) {
      throw new BattleDomainError('INVALID_TEAM', `No battle profile exists for species ${projection.speciesId}.`);
    }
    const modifier = conditionModifiers[projection.condition];
    return {
      id: `fighter-${projection.rosterMemberId}`,
      rosterMemberId: projection.rosterMemberId,
      name: options.displayNames?.[projection.rosterMemberId] ?? projection.speciesId,
      speciesId: projection.speciesId,
      maxVitality: Math.max(1, Math.round(profile.maxVitality * modifier.vitality)),
      power: Math.max(1, Math.round(profile.power * modifier.power)),
      resilience: Math.max(1, Math.round(profile.resilience * modifier.resilience)),
      speed: Math.max(1, Math.round(profile.speed * modifier.speed)),
      comboTags: [...projection.comboTags],
      techniqueIds: [...profile.techniqueIds],
    };
  });
  return {
    id: options.teamId ?? 'player-team',
    name: options.teamName ?? 'Player team',
    side: 'player',
    members,
  };
}
