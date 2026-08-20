import type { CommerceClock, EstablishmentDefinition, StoreHoursWindow } from './types';

export function isValidCommerceClock(clock: CommerceClock): boolean {
  return (
    Number.isFinite(clock.epochMs) &&
    Number.isInteger(clock.dayOfWeek) &&
    clock.dayOfWeek >= 0 &&
    clock.dayOfWeek <= 6 &&
    Number.isInteger(clock.minuteOfDay) &&
    clock.minuteOfDay >= 0 &&
    clock.minuteOfDay < 24 * 60 &&
    /^\d{4}-\d{2}-\d{2}$/.test(clock.localDate)
  );
}

export function isValidHoursWindow(window: StoreHoursWindow): boolean {
  return (
    Number.isInteger(window.dayOfWeek) &&
    window.dayOfWeek >= 0 &&
    window.dayOfWeek <= 6 &&
    Number.isInteger(window.opensMinute) &&
    window.opensMinute >= 0 &&
    window.opensMinute < 24 * 60 &&
    Number.isInteger(window.closesMinute) &&
    window.closesMinute >= 0 &&
    window.closesMinute < 24 * 60 &&
    window.opensMinute !== window.closesMinute
  );
}

/**
 * Evaluates weekly local opening hours. An end time earlier than the start time
 * is an overnight window and remains open on the following local day.
 */
export function isEstablishmentOpen(
  establishment: Pick<EstablishmentDefinition, 'hours'>,
  clock: CommerceClock,
): boolean {
  if (!isValidCommerceClock(clock)) return false;

  return establishment.hours.some((window) => {
    if (!isValidHoursWindow(window)) return false;

    if (window.opensMinute < window.closesMinute) {
      return (
        window.dayOfWeek === clock.dayOfWeek &&
        clock.minuteOfDay >= window.opensMinute &&
        clock.minuteOfDay < window.closesMinute
      );
    }

    const followingDay = ((window.dayOfWeek + 1) % 7) as CommerceClock['dayOfWeek'];
    return (
      (window.dayOfWeek === clock.dayOfWeek && clock.minuteOfDay >= window.opensMinute) ||
      (followingDay === clock.dayOfWeek && clock.minuteOfDay < window.closesMinute)
    );
  });
}

