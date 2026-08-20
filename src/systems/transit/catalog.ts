import type { TransitCatalog } from './types';

const everyDay = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * The first production city network. Routes remain open from the start and are
 * modelled as physical, stop-by-stop services instead of instant map jumps.
 */
export const harbourlightTransitCatalog: TransitCatalog = {
  stops: [
    {
      id: 'harbourlight-rest-stop',
      name: 'Harbourlight Rest Stop',
      accessible: true,
      district: 'Harbourlight',
      transferRouteIds: ['route-7-bayfront', 'blue-loop-subway'],
    },
    {
      id: 'market-street',
      name: 'Market Street',
      accessible: true,
      district: 'Market Quarter',
      transferRouteIds: ['route-7-bayfront', 'blue-loop-subway'],
    },
    {
      id: 'civic-steps',
      name: 'Civic Steps',
      accessible: true,
      district: 'Civic Quarter',
      transferRouteIds: ['route-7-bayfront', 'blue-loop-subway'],
    },
    {
      id: 'bayfront-exchange',
      name: 'Bayfront Exchange',
      accessible: true,
      district: 'Bayfront',
      transferRouteIds: ['route-7-bayfront'],
    },
    {
      id: 'old-quay',
      name: 'Old Quay',
      accessible: true,
      district: 'Old Quay',
      transferRouteIds: ['blue-loop-subway'],
    },
  ],
  routes: [
    {
      id: 'route-7-bayfront',
      publicName: 'Route 7 Bayfront Bus Loop',
      mode: 'bus',
      headsign: 'Bayfront loop via Civic Steps',
      loop: true,
      stopIds: [
        'harbourlight-rest-stop',
        'market-street',
        'civic-steps',
        'bayfront-exchange',
      ],
      segmentTravelMinutes: [4, 5, 4, 6],
      dwellMinutes: [1, 1, 1, 2],
    },
    {
      id: 'blue-loop-subway',
      publicName: 'Blue Loop Subway',
      mode: 'subway',
      headsign: 'Blue loop via Old Quay',
      loop: true,
      stopIds: [
        'harbourlight-rest-stop',
        'old-quay',
        'civic-steps',
        'market-street',
      ],
      segmentTravelMinutes: [3, 3, 4, 3],
      dwellMinutes: [1, 1, 1, 1],
    },
  ],
  schedules: [
    {
      id: 'route-7-daily',
      routeId: 'route-7-bayfront',
      timezone: 'America/Toronto',
      serviceDays: everyDay,
      windows: [
        { startMinute: 330, endMinute: 600, headwayMinutes: 8 },
        { startMinute: 600, endMinute: 1_380, headwayMinutes: 12 },
        { startMinute: 1_380, endMinute: 1_560, headwayMinutes: 20 },
      ],
    },
    {
      id: 'blue-loop-daily',
      routeId: 'blue-loop-subway',
      timezone: 'America/Toronto',
      serviceDays: everyDay,
      windows: [
        { startMinute: 330, endMinute: 600, headwayMinutes: 6 },
        { startMinute: 600, endMinute: 1_380, headwayMinutes: 10 },
        { startMinute: 1_380, endMinute: 1_560, headwayMinutes: 15 },
      ],
    },
  ],
  vehicles: [
    {
      id: 'bus-7-01',
      routeId: 'route-7-bayfront',
      capacity: 42,
      initialStopId: 'harbourlight-rest-stop',
      initialPhase: 'boarding',
    },
    {
      id: 'bus-7-02',
      routeId: 'route-7-bayfront',
      capacity: 42,
      initialStopId: 'civic-steps',
      initialPhase: 'dwelling',
    },
    {
      id: 'blue-01',
      routeId: 'blue-loop-subway',
      capacity: 160,
      initialStopId: 'harbourlight-rest-stop',
      initialPhase: 'boarding',
    },
    {
      id: 'blue-02',
      routeId: 'blue-loop-subway',
      capacity: 160,
      initialStopId: 'civic-steps',
      initialPhase: 'dwelling',
    },
  ],
};
