import type { StabilityReading, StabilityWindow } from './types';

export const DEFAULT_STABILITY_WINDOW_MS = 30_000;
export const MAX_STABILITY_WINDOW_MS = 5 * 60_000;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function requireTime(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${label} must be finite and non-negative`);
  return Math.floor(value);
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

export interface StabilityWindowRequest {
  readonly openedAtMs: number;
  readonly seed: string;
  readonly durationMs?: number;
  readonly baseline?: number;
}

export function createStabilityWindow(request: StabilityWindowRequest): StabilityWindow {
  const openedAtMs = requireTime(request.openedAtMs, 'openedAtMs');
  const durationMs = Math.floor(request.durationMs ?? DEFAULT_STABILITY_WINDOW_MS);
  if (!Number.isInteger(durationMs) || durationMs < 1 || durationMs > MAX_STABILITY_WINDOW_MS) {
    throw new RangeError(`durationMs must be an integer from 1 to ${MAX_STABILITY_WINDOW_MS}`);
  }
  if (!request.seed.trim()) throw new RangeError('seed must not be empty');
  const baseline = clamp(request.baseline ?? 70, 0, 100);
  const drift = (hashSeed(request.seed) - 0.5) * 18;
  return Object.freeze({ openedAtMs, durationMs, seed: request.seed, baseline, drift });
}

export function readStabilityWindow(window: StabilityWindow, atMs: number): StabilityReading {
  const at = requireTime(atMs, 'atMs');
  const elapsedMs = Math.max(0, at - window.openedAtMs);
  const notStarted = at < window.openedAtMs;
  const expired = elapsedMs >= window.durationMs;
  const progress = clamp(elapsedMs / window.durationMs, 0, 1);
  const wave = Math.sin(progress * Math.PI * 2) * 4;
  const percent = clamp(window.baseline + window.drift * progress + wave, 0, 100);
  return Object.freeze({
    atMs: at,
    active: !notStarted && !expired,
    expired,
    elapsedMs: Math.min(elapsedMs, window.durationMs),
    remainingMs: Math.max(0, window.durationMs - elapsedMs),
    percent: Math.round(percent * 100) / 100,
  });
}

export function isStabilityWindowOpen(window: StabilityWindow, atMs: number): boolean {
  return readStabilityWindow(window, atMs).active;
}
