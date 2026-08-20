import { describe, expect, it } from 'vitest';
import { cities, placeById, routeById, routes } from '../src/game/world';
import { createDefaultSave, migrateSave } from '../src/game/save';
import { consumeRouteTicket, purchaseTicket } from '../src/game/tickets';

describe('national world catalog', () => {
  it('defines three complete and uniquely identified cities', () => {
    expect(Object.keys(cities)).toEqual(['harbourlight', 'gullhaven', 'asterfield']);
    const allIds = Object.values(cities).flatMap((city) => city.places.map((place) => place.id));
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const city of Object.values(cities)) {
      const kinds = new Set(city.places.map((place) => place.kind));
      expect(kinds).toEqual(new Set(['hub', 'store', 'restaurant', 'salon', 'builder', 'battle', 'minigame', 'transit']));
      const modes = new Set(routes.filter((route) => route.originCityId === city.id && !route.ticketRequired).map((route) => route.mode));
      expect(modes).toEqual(new Set(['bus', 'subway', 'streetcar']));
    }
    expect(placeById.size).toBe(allIds.length);
  });

  it('keeps intercity travel routed through Harbourlight', () => {
    const intercity = routes.filter((route) => route.originCityId !== route.destinationCityId);
    expect(intercity).toHaveLength(4);
    expect(intercity.every((route) => route.originCityId === 'harbourlight' || route.destinationCityId === 'harbourlight')).toBe(true);
    expect(intercity.some((route) => new Set([route.originCityId, route.destinationCityId]).has('gullhaven') && new Set([route.originCityId, route.destinationCityId]).has('asterfield'))).toBe(false);
    expect(routeById.get('harbourlight-gullhaven-ferry')?.fare).toBe(18);
    expect(routeById.get('harbourlight-asterfield-flight')?.fare).toBe(60);
  });
});

describe('save migration and physical tickets', () => {
  it('migrates v1 progress into Harbourlight without losing values', () => {
    const migrated = migrateSave({ version: 1, money: 913, catchBalls: 7, activeBuilding: 'builder', activeFloor: 'ground', capturedCreatures: ['brineling'], construction: { phase: 6, hired: true, startedAt: '2026-08-20T12:00:00.000Z' }, minigameBest: 8, lastSavedAt: '2026-08-20T12:05:00.000Z' });
    expect(migrated.version).toBe(2);
    expect(migrated.currentCity).toBe('harbourlight');
    expect(migrated.money).toBe(913);
    expect(migrated.catchBalls).toBe(7);
    expect(migrated.activeBuilding).toBe('harbourlight-builder');
    expect(migrated.cityProgress.harbourlight.construction.phase).toBe(6);
    expect(migrated.cityProgress.harbourlight.minigameBest).toBe(8);
    expect(migrated.tickets).toEqual([]);
  });

  it('requires the correct physical building and enough money for a ticket', () => {
    const route = routeById.get('harbourlight-gullhaven-ferry')!;
    const wrongBuilding = createDefaultSave();
    expect(purchaseTicket(wrongBuilding, route, 'harbourlight-airfield', 'ticket-1')).toEqual({ ok: false, reason: 'wrong-building' });
    expect(wrongBuilding.money).toBe(240);
    const poor = createDefaultSave(); poor.money = 17;
    expect(purchaseTicket(poor, route, route.originBuildingId, 'ticket-2')).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(poor.tickets).toEqual([]);
  });

  it('creates and consumes only a route-specific ticket', () => {
    const save = createDefaultSave();
    const ferry = routeById.get('harbourlight-gullhaven-ferry')!;
    const flight = routeById.get('harbourlight-asterfield-flight')!;
    const result = purchaseTicket(save, ferry, ferry.originBuildingId, 'ticket-ferry', '2026-08-20T12:00:00.000Z');
    expect(result.ok).toBe(true);
    expect(save.money).toBe(222);
    expect(consumeRouteTicket(save, flight.id)).toBeUndefined();
    expect(save.tickets).toHaveLength(1);
    expect(consumeRouteTicket(save, ferry.id)?.id).toBe('ticket-ferry');
    expect(save.tickets).toHaveLength(0);
  });

  it('repairs malformed v2 tickets and unknown active buildings deterministically', () => {
    const source = createDefaultSave();
    source.tickets = [
      { id: 'same', routeId: 'harbourlight-gullhaven-ferry', mode: 'ferry', originCityId: 'harbourlight', destinationCityId: 'gullhaven', farePaid: 18, purchasedAt: '2026-08-20T12:00:00.000Z' },
      { id: 'same', routeId: 'harbourlight-gullhaven-ferry', mode: 'ferry', originCityId: 'harbourlight', destinationCityId: 'gullhaven', farePaid: 18, purchasedAt: '2026-08-20T12:01:00.000Z' },
    ];
    source.activeBuilding = 'gullhaven-ferry-exchange';
    const migrated = migrateSave(source);
    expect(migrated.tickets).toHaveLength(1);
    expect(migrated.activeBuilding).toBeUndefined();
  });

  it('preserves a valid pending journey and rejects an invalid one on restart', () => {
    const source = createDefaultSave();
    source.pendingJourney = {
      routeId: 'harbourlight-gullhaven-ferry',
      originCityId: 'harbourlight',
      destinationCityId: 'gullhaven',
      startedAt: '2026-08-20T12:00:00.000Z',
      durationMs: 4_000,
    };
    expect(migrateSave(source).pendingJourney).toEqual(source.pendingJourney);

    source.pendingJourney = {
      routeId: 'gullhaven-harbourlight-ferry',
      originCityId: 'harbourlight',
      destinationCityId: 'gullhaven',
      startedAt: '2026-08-20T12:00:00.000Z',
      durationMs: 4_000,
    };
    expect(migrateSave(source).pendingJourney).toBeUndefined();
  });
});
