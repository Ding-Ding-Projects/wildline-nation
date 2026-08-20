import { isObservationApproach, isSpeciesAtHabitat, requireCreatureHabitat, requireCreatureSpecies } from './catalog';
import type { CreatureSpeciesId, HabitatId, Observation, ObservationApproach, TemperamentState } from './types';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function validTime(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${label} must be a finite, non-negative millisecond value`);
  return Math.floor(value);
}

export interface ObservationRequest {
  readonly speciesId: CreatureSpeciesId;
  readonly habitatId: HabitatId;
  readonly observedAtMs: number;
  readonly approach: ObservationApproach;
}

export function observeCreature(request: ObservationRequest): Observation {
  const observedAtMs = validTime(request.observedAtMs, 'observedAtMs');
  if (!isObservationApproach(request.approach)) throw new RangeError(`Unknown observation approach: ${String(request.approach)}`);
  const species = requireCreatureSpecies(request.speciesId);
  const habitat = requireCreatureHabitat(request.habitatId);
  if (!isSpeciesAtHabitat(request.speciesId, request.habitatId)) {
    throw new RangeError(`${species.name} cannot be observed in ${habitat.name}`);
  }

  const temperament = species.temperament;
  const approachEffect: Record<ObservationApproach, number> = { quiet: 12, steady: 7, patient: 16, rushed: -24 };
  const preferred = habitat.preferredApproaches.includes(request.approach) ? 7 : 0;
  const confidence = clamp(52 + temperament.patience * 0.18 + approachEffect[request.approach] + preferred - temperament.startleResponse * (request.approach === 'rushed' ? 0.35 : 0.08), 0, 100);
  const stabilityBonus = clamp((confidence - 50) * 0.32 + temperament.sociability * 0.08, -20, 25);
  let state: TemperamentState;
  if (request.approach === 'rushed') state = temperament.startleResponse >= 50 ? 'fleeing' : 'startled';
  else if (confidence >= 78 && temperament.curiosity >= 55) state = 'curious';
  else if (confidence >= 61) state = 'calm';
  else state = 'wary';

  return Object.freeze({
    speciesId: request.speciesId,
    habitatId: request.habitatId,
    observedAtMs,
    approach: request.approach,
    state,
    confidence: Math.round(confidence * 100) / 100,
    stabilityBonus: Math.round(stabilityBonus * 100) / 100,
    tags: Object.freeze([...species.traits]),
  });
}
