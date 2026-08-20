import { isSpeciesAtHabitat, requireCreatureSpecies } from './catalog';
import { consumeCatchBall } from './catch-ball';
import { readStabilityWindow } from './stability';
import type { CaptureRequest, CaptureResult, CreatureSpeciesId } from './types';

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0) / 0xffffffff;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function stableMemberId(speciesId: CreatureSpeciesId, habitatId: string, attemptId: string): string {
  return `${speciesId}-${habitatId}-${attemptId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

export function resolveCapture(request: CaptureRequest): CaptureResult {
  const species = requireCreatureSpecies(request.speciesId);
  if (!isSpeciesAtHabitat(request.speciesId, request.habitatId)) {
    return { outcome: 'invalid-observation', score: 0, threshold: 0, inventory: request.inventory, speciesId: request.speciesId, habitatId: request.habitatId };
  }
  if (request.observation.speciesId !== request.speciesId || request.observation.habitatId !== request.habitatId) {
    return { outcome: 'invalid-observation', score: 0, threshold: 0, inventory: request.inventory, speciesId: request.speciesId, habitatId: request.habitatId };
  }
  if (
    !Number.isFinite(request.nowMs) ||
    request.nowMs < request.attempt.startedAtMs ||
    request.attempt.startedAtMs < request.stabilityWindow.openedAtMs ||
    request.observation.observedAtMs > request.attempt.startedAtMs
  ) {
    return { outcome: 'invalid-observation', score: 0, threshold: 0, inventory: request.inventory, speciesId: request.speciesId, habitatId: request.habitatId };
  }
  if (request.inventory.available < 1) {
    return { outcome: 'no-catch-ball', score: 0, threshold: 0, inventory: request.inventory, speciesId: request.speciesId, habitatId: request.habitatId };
  }
  const stability = readStabilityWindow(request.stabilityWindow, request.nowMs);
  if (!stability.active) {
    return { outcome: 'window-closed', score: 0, threshold: species.captureDifficulty, inventory: request.inventory, speciesId: request.speciesId, habitatId: request.habitatId };
  }

  const score = clamp(stability.percent + request.observation.confidence * 0.42 + request.observation.stabilityBonus - species.captureDifficulty, 0, 100);
  const threshold = clamp(42 + species.captureDifficulty * 0.34, 0, 100);
  const roll = hash(`${request.attempt.attemptId}:${request.speciesId}:${request.habitatId}:${stability.atMs}`) * 100;
  const inventory = consumeCatchBall(request.inventory);
  const captured = score >= threshold && roll <= score;
  return {
    outcome: captured ? 'captured' : 'missed',
    score: Math.round(score * 100) / 100,
    threshold: Math.round(threshold * 100) / 100,
    inventory,
    speciesId: request.speciesId,
    habitatId: request.habitatId,
    ...(captured ? { memberId: stableMemberId(request.speciesId, request.habitatId, request.attempt.attemptId) } : {}),
  };
}
