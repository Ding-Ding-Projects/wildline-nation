import type { SaveStateV2, TransitRoute, TransitTicket } from './types';

export type TicketResult = { ok: true; ticket: TransitTicket } | { ok: false; reason: 'not-ticketed' | 'wrong-city' | 'wrong-building' | 'insufficient-funds' };

export function purchaseTicket(save: SaveStateV2, route: TransitRoute, buildingId: string, ticketId: string, purchasedAt = new Date().toISOString()): TicketResult {
  if (!route.ticketRequired || (route.mode !== 'ferry' && route.mode !== 'flight')) return { ok: false, reason: 'not-ticketed' };
  if (save.currentCity !== route.originCityId) return { ok: false, reason: 'wrong-city' };
  if (buildingId !== route.originBuildingId) return { ok: false, reason: 'wrong-building' };
  if (save.money < route.fare) return { ok: false, reason: 'insufficient-funds' };
  const ticket: TransitTicket = { id: ticketId, routeId: route.id, mode: route.mode, originCityId: route.originCityId, destinationCityId: route.destinationCityId, farePaid: route.fare, purchasedAt };
  save.money -= route.fare;
  save.tickets.push(ticket);
  return { ok: true, ticket };
}

export function consumeRouteTicket(save: SaveStateV2, routeId: string): TransitTicket | undefined {
  const index = save.tickets.findIndex((ticket) => ticket.routeId === routeId);
  if (index < 0) return undefined;
  return save.tickets.splice(index, 1)[0];
}
