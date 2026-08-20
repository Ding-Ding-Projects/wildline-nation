import type { CatchBallAttempt, CatchBallInventory } from './types';

function quantity(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative integer`);
  return value;
}

export function createCatchBallInventory(available = 0, thrown = 0): CatchBallInventory {
  return Object.freeze({ available: quantity(available, 'available'), thrown: quantity(thrown, 'thrown') });
}

export function addCatchBalls(inventory: CatchBallInventory, amount: number): CatchBallInventory {
  return createCatchBallInventory(inventory.available + quantity(amount, 'amount'), inventory.thrown);
}

export function canThrowCatchBall(inventory: CatchBallInventory): boolean {
  return inventory.available > 0;
}

export function createCatchBallAttempt(attemptId: string, startedAtMs: number): CatchBallAttempt {
  if (!attemptId.trim() || attemptId.length > 128) throw new RangeError('attemptId must be non-empty and at most 128 characters');
  if (!Number.isFinite(startedAtMs) || startedAtMs < 0) throw new RangeError('startedAtMs must be finite and non-negative');
  return Object.freeze({ attemptId, startedAtMs: Math.floor(startedAtMs), ballType: 'standard' as const });
}

export function consumeCatchBall(inventory: CatchBallInventory): CatchBallInventory {
  if (!canThrowCatchBall(inventory)) throw new RangeError('No Catch Balls are available');
  return createCatchBallInventory(inventory.available - 1, inventory.thrown + 1);
}

export function returnCatchBall(inventory: CatchBallInventory): CatchBallInventory {
  if (inventory.thrown < 1) throw new RangeError('No thrown Catch Ball can be returned');
  return createCatchBallInventory(inventory.available + 1, inventory.thrown - 1);
}
