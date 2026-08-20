import type { CityDefinition, CityId, PlaceDefinition, TransitRoute } from './types';

const layout = {
  hub: [0, 0], grocer: [-4, -2], restaurant: [4, -2], salon: [-4, 3], builder: [4, 3],
  battle: [0, 5], minigame: [-7, 5], subway: [7, 5], bus: [7, -5], streetcar: [-7, -5],
  intercityWest: [-8, 0], intercityEast: [8, 0],
} as const;

function place(cityId: CityId, suffix: string, name: string, subtitle: string, color: number, kind: PlaceDefinition['kind'], at: readonly [number, number], routeIds?: readonly string[]): PlaceDefinition {
  return { id: `${cityId}-${suffix}`, cityId, name, subtitle, color, kind, x: at[0], z: at[1], routeIds };
}

export const routes: readonly TransitRoute[] = [
  { id: 'harbourlight-bayfront-bus', publicName: 'Route 7 Bayfront Bus Loop', code: '7', mode: 'bus', originCityId: 'harbourlight', destinationCityId: 'harbourlight', originBuildingId: 'harbourlight-bus', destinationBuildingId: 'harbourlight-bus', stops: ['Rest Stop', 'Market Street', 'Civic Steps', 'Bayfront Exchange', 'Old Quay'], loop: true, durationMs: 4250, fare: 0, ticketRequired: false },
  { id: 'harbourlight-blue-subway', publicName: 'Blue Loop Subway', code: 'B', mode: 'subway', originCityId: 'harbourlight', destinationCityId: 'harbourlight', originBuildingId: 'harbourlight-subway', destinationBuildingId: 'harbourlight-subway', stops: ['Rest Stop', 'Old Quay', 'Civic Steps', 'Market Street', 'Tideglass'], loop: true, durationMs: 4000, fare: 0, ticketRequired: false },
  { id: 'harbourlight-gold-quay-streetcar', publicName: 'Gold Quay Streetcar', code: 'G', mode: 'streetcar', originCityId: 'harbourlight', destinationCityId: 'harbourlight', originBuildingId: 'harbourlight-streetcar', destinationBuildingId: 'harbourlight-streetcar', stops: ['Gold Quay', 'Moss Market', 'Lumen Lane', 'Civic Steps', 'Tideglass'], loop: true, durationMs: 4500, fare: 0, ticketRequired: false },
  { id: 'gullhaven-breakwater-bus', publicName: 'Breakwater Bus Loop', code: '4', mode: 'bus', originCityId: 'gullhaven', destinationCityId: 'gullhaven', originBuildingId: 'gullhaven-bus', destinationBuildingId: 'gullhaven-bus', stops: ['Lantern Row', 'Breakwater Works', 'Copper Bell', 'Reed Market', 'Ferry Exchange'], loop: true, durationMs: 4250, fare: 0, ticketRequired: false },
  { id: 'gullhaven-green-subway', publicName: 'Green Current Subway', code: 'C', mode: 'subway', originCityId: 'gullhaven', destinationCityId: 'gullhaven', originBuildingId: 'gullhaven-subway', destinationBuildingId: 'gullhaven-subway', stops: ['Lantern Row', 'Mire Gardens', 'Bell Square', 'Breakwater', 'Exchange'], loop: true, durationMs: 4000, fare: 0, ticketRequired: false },
  { id: 'gullhaven-copper-bell-streetcar', publicName: 'Copper Bell Streetcar', code: 'C', mode: 'streetcar', originCityId: 'gullhaven', destinationCityId: 'gullhaven', originBuildingId: 'gullhaven-streetcar', destinationBuildingId: 'gullhaven-streetcar', stops: ['Copper Bell', 'Lantern Row', 'Mire Gardens', 'Reed Market', 'Breakwater'], loop: true, durationMs: 4500, fare: 0, ticketRequired: false },
  { id: 'asterfield-sunstep-bus', publicName: 'Sunstep Bus Loop', code: '9', mode: 'bus', originCityId: 'asterfield', destinationCityId: 'asterfield', originBuildingId: 'asterfield-bus', destinationBuildingId: 'asterfield-bus', stops: ['Cloudcourt', 'Sunstep', 'Wind Dial', 'Sky Market', 'Skyport'], loop: true, durationMs: 4250, fare: 0, ticketRequired: false },
  { id: 'asterfield-silver-subway', publicName: 'Silver Arc Subway', code: 'S', mode: 'subway', originCityId: 'asterfield', destinationCityId: 'asterfield', originBuildingId: 'asterfield-subway', destinationBuildingId: 'asterfield-subway', stops: ['Cloudcourt', 'Sunstep', 'High Garden', 'Wind Dial', 'Skyport'], loop: true, durationMs: 4000, fare: 0, ticketRequired: false },
  { id: 'asterfield-sunline-streetcar', publicName: 'Sunline Streetcar Loop', code: 'S', mode: 'streetcar', originCityId: 'asterfield', destinationCityId: 'asterfield', originBuildingId: 'asterfield-streetcar', destinationBuildingId: 'asterfield-streetcar', stops: ['Sunline', 'Cloudcourt', 'Sky Market', 'Wind Dial', 'High Garden'], loop: true, durationMs: 4500, fare: 0, ticketRequired: false },
  { id: 'harbourlight-gullhaven-ferry', publicName: 'Harbourlight–Gullhaven Ferry', code: 'F', mode: 'ferry', originCityId: 'harbourlight', destinationCityId: 'gullhaven', originBuildingId: 'harbourlight-ferry-terminal', destinationBuildingId: 'gullhaven-ferry-exchange', stops: ['Harbourlight Ferry Terminal', 'Beacon Reach', 'Gullhaven Ferry Exchange'], loop: false, durationMs: 6500, fare: 18, ticketRequired: true },
  { id: 'gullhaven-harbourlight-ferry', publicName: 'Gullhaven–Harbourlight Ferry', code: 'F', mode: 'ferry', originCityId: 'gullhaven', destinationCityId: 'harbourlight', originBuildingId: 'gullhaven-ferry-exchange', destinationBuildingId: 'harbourlight-ferry-terminal', stops: ['Gullhaven Ferry Exchange', 'Beacon Reach', 'Harbourlight Ferry Terminal'], loop: false, durationMs: 6500, fare: 18, ticketRequired: true },
  { id: 'harbourlight-asterfield-flight', publicName: 'Harbourlight–Asterfield Flight', code: 'A', mode: 'flight', originCityId: 'harbourlight', destinationCityId: 'asterfield', originBuildingId: 'harbourlight-airfield', destinationBuildingId: 'asterfield-skyport', stops: ['Harbourlight Airfield', 'Cloudway', 'Asterfield Skyport'], loop: false, durationMs: 8000, fare: 60, ticketRequired: true },
  { id: 'asterfield-harbourlight-flight', publicName: 'Asterfield–Harbourlight Flight', code: 'A', mode: 'flight', originCityId: 'asterfield', destinationCityId: 'harbourlight', originBuildingId: 'asterfield-skyport', destinationBuildingId: 'harbourlight-airfield', stops: ['Asterfield Skyport', 'Cloudway', 'Harbourlight Airfield'], loop: false, durationMs: 8000, fare: 60, ticketRequired: true },
];

export const cities: Record<CityId, CityDefinition> = {
  harbourlight: {
    id: 'harbourlight', name: 'Harbourlight City', tagline: 'The harbour opens into an entire nation.',
    creature: { id: 'brineling', name: 'Brineling', descriptor: 'a curious tidepool glider', color: 0x7ed3db, habitat: 'Tideglass Habitat' },
    minigame: { name: 'Lantern Current', description: 'Route the harbour lights before the tide reaches the quay.' },
    battle: { opponent: 'Mira', creature: 'Fallowisp', payout: 85 },
    build: { template: 'Harbour Courtyard 01', office: 'Northline Builders', crew: 'Jo, Ren and Akiko', cost: 160 },
    places: [
      place('harbourlight', 'rest-stop', 'Harbourlight Rest Stop', 'The city’s civic heart', 0xe8bc66, 'hub', layout.hub),
      place('harbourlight', 'grocer', 'Moss & Market Grocer', 'Fresh food and home supplies', 0x81c784, 'store', layout.grocer),
      place('harbourlight', 'restaurant', 'Copper Kettle Kitchen', 'Warm meals, cooked to order', 0xe58e74, 'restaurant', layout.restaurant),
      place('harbourlight', 'salon', 'Lumen & Loop Salon', 'Haircuts and harbour styling', 0xd397c3, 'salon', layout.salon),
      place('harbourlight', 'builder', 'Northline Builders', 'Harbour Courtyard contracts', 0x8cb6d9, 'builder', layout.builder),
      place('harbourlight', 'battle', 'Civic Circuit Arena', 'Licensed exhibitions pay the bills', 0xef9b52, 'battle', layout.battle),
      place('harbourlight', 'minigame', 'Lantern Minigame Centre', 'Home of Lantern Current', 0x8bd5ca, 'minigame', layout.minigame),
      place('harbourlight', 'subway', 'Harbourlight Subway', 'Ride the Blue Loop', 0x6082b6, 'transit', layout.subway, ['harbourlight-blue-subway']),
      place('harbourlight', 'bus', 'Bayfront Bus Loop', 'Route 7 boards at the curb', 0x537c65, 'transit', layout.bus, ['harbourlight-bayfront-bus']),
      place('harbourlight', 'streetcar', 'Gold Quay Streetcar Terminus', 'The Gold Quay loop starts here', 0xd59b45, 'transit', layout.streetcar, ['harbourlight-gold-quay-streetcar']),
      place('harbourlight', 'ferry-terminal', 'Harbourlight Ferry Terminal', 'Sail to Gullhaven', 0x4f9cb3, 'transit', layout.intercityWest, ['harbourlight-gullhaven-ferry']),
      place('harbourlight', 'airfield', 'Harbourlight Airfield', 'Fly to Asterfield', 0x8e93cc, 'transit', layout.intercityEast, ['harbourlight-asterfield-flight']),
    ],
  },
  gullhaven: {
    id: 'gullhaven', name: 'Gullhaven City', tagline: 'Copper bells, reed gardens and a working breakwater.',
    creature: { id: 'mirefin', name: 'Mirefin', descriptor: 'a reed-darting marsh swimmer', color: 0x79c99e, habitat: 'Mire Gardens' },
    minigame: { name: 'Bellwake Relay', description: 'Carry a ringing signal through the breakwater towers.' },
    battle: { opponent: 'Orla', creature: 'Brassbill', payout: 92 },
    build: { template: 'Lantern Row House', office: 'Breakwater Works', crew: 'Pia, Moss and Dev', cost: 175 },
    places: [
      place('gullhaven', 'rest-stop', 'Gullhaven Rest Stop', 'Lantern Row’s public service hall', 0xd9b75f, 'hub', layout.hub),
      place('gullhaven', 'grocer', 'Reed & Ration Grocer', 'Marsh produce and pantry goods', 0x6fb682, 'store', layout.grocer),
      place('gullhaven', 'restaurant', 'Bellweather Table', 'Breakwater stew and copper tea', 0xc77e68, 'restaurant', layout.restaurant),
      place('gullhaven', 'salon', 'Tidebraid Salon', 'Cuts, braids and rainproof styling', 0xbc83b0, 'salon', layout.salon),
      place('gullhaven', 'builder', 'Breakwater Works', 'Lantern Row House contracts', 0x75a7c5, 'builder', layout.builder),
      place('gullhaven', 'battle', 'Copper Bell Arena', 'Licensed marsh exhibitions', 0xdf884b, 'battle', layout.battle),
      place('gullhaven', 'minigame', 'Bellwake Minigame Centre', 'Home of Bellwake Relay', 0x75c2b9, 'minigame', layout.minigame),
      place('gullhaven', 'subway', 'Green Current Subway', 'Ride beneath the reed gardens', 0x4b8a68, 'transit', layout.subway, ['gullhaven-green-subway']),
      place('gullhaven', 'bus', 'Breakwater Bus Loop', 'Route 4 circles the harbour wall', 0x587653, 'transit', layout.bus, ['gullhaven-breakwater-bus']),
      place('gullhaven', 'streetcar', 'Copper Bell Streetcar Terminus', 'Five stops around Gullhaven', 0xb8783c, 'transit', layout.streetcar, ['gullhaven-copper-bell-streetcar']),
      place('gullhaven', 'ferry-exchange', 'Gullhaven Ferry Exchange', 'Sail to Harbourlight', 0x438ca7, 'transit', layout.intercityWest, ['gullhaven-harbourlight-ferry']),
    ],
  },
  asterfield: {
    id: 'asterfield', name: 'Asterfield City', tagline: 'High gardens and windworks above the cloud line.',
    creature: { id: 'kiteshade', name: 'Kiteshade', descriptor: 'a soft-winged thermal glider', color: 0x9eb5ec, habitat: 'High Garden Habitat' },
    minigame: { name: 'Wind Dial Array', description: 'Align the sky dials before the next gust crosses Cloudcourt.' },
    battle: { opponent: 'Sana', creature: 'Galesprig', payout: 105 },
    build: { template: 'Cloudcourt Home', office: 'Sunstep Builders', crew: 'Ivo, Lux and Meilin', cost: 190 },
    places: [
      place('asterfield', 'rest-stop', 'Asterfield Rest Stop', 'Cloudcourt’s civic landing', 0xe5bd6b, 'hub', layout.hub),
      place('asterfield', 'grocer', 'Skybasket Grocer', 'High-garden food and home supplies', 0x83bd75, 'store', layout.grocer),
      place('asterfield', 'restaurant', 'Updraft Kitchen', 'Sun bowls and cloudberry tea', 0xe18b78, 'restaurant', layout.restaurant),
      place('asterfield', 'salon', 'Halo & Shear Salon', 'High-altitude cuts and styling', 0xca91c6, 'salon', layout.salon),
      place('asterfield', 'builder', 'Sunstep Builders', 'Cloudcourt Home contracts', 0x8faed9, 'builder', layout.builder),
      place('asterfield', 'battle', 'Skyglass Arena', 'Licensed aerial exhibitions', 0xea9b55, 'battle', layout.battle),
      place('asterfield', 'minigame', 'Wind Dial Minigame Centre', 'Home of Wind Dial Array', 0x83d0c6, 'minigame', layout.minigame),
      place('asterfield', 'subway', 'Silver Arc Subway', 'Ride the sheltered city loop', 0x7686b5, 'transit', layout.subway, ['asterfield-silver-subway']),
      place('asterfield', 'bus', 'Sunstep Bus Loop', 'Route 9 climbs through Cloudcourt', 0x657b58, 'transit', layout.bus, ['asterfield-sunstep-bus']),
      place('asterfield', 'streetcar', 'Sunline Streetcar Terminus', 'The five-stop sky loop', 0xd9a24d, 'transit', layout.streetcar, ['asterfield-sunline-streetcar']),
      place('asterfield', 'skyport', 'Asterfield Skyport', 'Fly to Harbourlight', 0x858bc6, 'transit', layout.intercityEast, ['asterfield-harbourlight-flight']),
    ],
  },
};

export const routeById = new Map(routes.map((route) => [route.id, route]));
export const placeById = new Map(Object.values(cities).flatMap((city) => city.places).map((entry) => [entry.id, entry]));

export function cityPlaces(cityId: CityId) { return cities[cityId].places; }
export function routesForBuilding(buildingId: string) { return routes.filter((route) => route.originBuildingId === buildingId); }
