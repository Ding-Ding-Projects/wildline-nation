import type { CityId, CityProgress, SaveStateV2, TransitTicket } from './types';
import { cities, placeById, routeById } from './world';

const cityIds = Object.keys(cities) as CityId[];
const emptyProgress = (): CityProgress => ({ construction: { phase: 0, hired: false }, minigameBest: 0 });

export function createDefaultSave(): SaveStateV2 {
  return {
    version: 2,
    currentCity: 'harbourlight',
    money: 240,
    catchBalls: 2,
    capturedCreatures: [],
    tickets: [],
    cityProgress: { harbourlight: emptyProgress(), gullhaven: emptyProgress(), asterfield: emptyProgress() },
  };
}

function finiteNumber(value: unknown, fallback: number) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function isCityId(value: unknown): value is CityId { return cityIds.includes(value as CityId); }
function construction(value: unknown): CityProgress['construction'] {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { phase: Math.max(0, Math.min(10, Math.trunc(finiteNumber(source.phase, 0)))), hired: source.hired === true, ...(typeof source.startedAt === 'string' ? { startedAt: source.startedAt } : {}) };
}
function validTicket(value: unknown): value is TransitTicket {
  if (!value || typeof value !== 'object') return false;
  const ticket = value as TransitTicket;
  const route = routeById.get(ticket.routeId);
  return typeof ticket.id === 'string' && ticket.id.length > 0 && !!route && route.ticketRequired && ticket.mode === route.mode && ticket.originCityId === route.originCityId && ticket.destinationCityId === route.destinationCityId && Number.isFinite(ticket.farePaid) && typeof ticket.purchasedAt === 'string';
}

const legacyBuildingIds: Record<string, string> = {
  'rest-stop': 'harbourlight-rest-stop', grocer: 'harbourlight-grocer', restaurant: 'harbourlight-restaurant', salon: 'harbourlight-salon', builder: 'harbourlight-builder', battle: 'harbourlight-battle', minigames: 'harbourlight-minigame', subway: 'harbourlight-subway', bus: 'harbourlight-bus',
};

export function migrateSave(value: unknown): SaveStateV2 {
  const defaults = createDefaultSave();
  if (!value || typeof value !== 'object') return defaults;
  const source = value as Record<string, unknown>;
  if (source.version === 1) {
    const activeBuilding = typeof source.activeBuilding === 'string' ? legacyBuildingIds[source.activeBuilding] : undefined;
    return {
      ...defaults,
      money: Math.max(0, finiteNumber(source.money, defaults.money)),
      catchBalls: Math.max(0, Math.trunc(finiteNumber(source.catchBalls, defaults.catchBalls))),
      capturedCreatures: Array.isArray(source.capturedCreatures) ? [...new Set(source.capturedCreatures.filter((item): item is string => typeof item === 'string'))] : [],
      cityProgress: {
        ...defaults.cityProgress,
        harbourlight: { construction: construction(source.construction), minigameBest: Math.max(0, Math.trunc(finiteNumber(source.minigameBest, 0))) },
      },
      ...(activeBuilding ? { activeBuilding } : {}),
      ...(typeof source.activeFloor === 'string' ? { activeFloor: source.activeFloor } : {}),
      ...(typeof source.lastSavedAt === 'string' ? { lastSavedAt: source.lastSavedAt } : {}),
    };
  }
  if (source.version !== 2) return defaults;
  const currentCity = isCityId(source.currentCity) ? source.currentCity : 'harbourlight';
  const rawProgress = source.cityProgress && typeof source.cityProgress === 'object' ? source.cityProgress as Record<string, unknown> : {};
  const cityProgress = Object.fromEntries(cityIds.map((cityId) => {
    const raw = rawProgress[cityId] && typeof rawProgress[cityId] === 'object' ? rawProgress[cityId] as Record<string, unknown> : {};
    return [cityId, { construction: construction(raw.construction), minigameBest: Math.max(0, Math.trunc(finiteNumber(raw.minigameBest, 0))) }];
  })) as Record<CityId, CityProgress>;
  const ticketIds = new Set<string>();
  const tickets = (Array.isArray(source.tickets) ? source.tickets : []).filter(validTicket).filter((ticket) => !ticketIds.has(ticket.id) && ticketIds.add(ticket.id));
  const activeBuilding = typeof source.activeBuilding === 'string' && placeById.get(source.activeBuilding)?.cityId === currentCity ? source.activeBuilding : undefined;
  const pending = source.pendingJourney && typeof source.pendingJourney === 'object' ? source.pendingJourney as Record<string, unknown> : undefined;
  const pendingRoute = pending && typeof pending.routeId === 'string' ? routeById.get(pending.routeId) : undefined;
  const pendingJourney = pending && pendingRoute && pendingRoute.ticketRequired && pending.originCityId === pendingRoute.originCityId && pending.destinationCityId === pendingRoute.destinationCityId && typeof pending.startedAt === 'string' && finiteNumber(pending.durationMs, 0) > 0
    ? { routeId: pendingRoute.id, originCityId: pendingRoute.originCityId, destinationCityId: pendingRoute.destinationCityId, startedAt: pending.startedAt, durationMs: finiteNumber(pending.durationMs, pendingRoute.durationMs) }
    : undefined;
  return {
    version: 2,
    currentCity,
    money: Math.max(0, finiteNumber(source.money, defaults.money)),
    catchBalls: Math.max(0, Math.trunc(finiteNumber(source.catchBalls, defaults.catchBalls))),
    capturedCreatures: Array.isArray(source.capturedCreatures) ? [...new Set(source.capturedCreatures.filter((item): item is string => typeof item === 'string'))] : [],
    tickets,
    cityProgress,
    ...(activeBuilding ? { activeBuilding } : {}),
    ...(typeof source.activeFloor === 'string' ? { activeFloor: source.activeFloor } : {}),
    ...(pendingJourney ? { pendingJourney } : {}),
    ...(typeof source.lastSavedAt === 'string' ? { lastSavedAt: source.lastSavedAt } : {}),
  };
}
