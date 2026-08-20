import { BUILDING_BLUEPRINTS, CITY_SEEDS, CREATURE_SEEDS, MINIGAME_SEEDS } from "./seeds";
import {
  CATALOG_VERSION,
  type BuildingCategory,
  type BuildingRecord,
  type CityRecord,
  type Climate,
  type CreatureRecord,
  type MinigameRecord,
  type Region,
} from "./types";

const DISTRICT_WORDS = ["Old Quays", "Signal Ward", "Cedar Steps", "Foundry Row", "Garden Belt"] as const;
const PLAZA_LANDMARKS = ["weather bell", "glass tide marker", "sun dial", "wind harp", "stone compass"] as const;
const ELEMENTS = ["ember", "tide", "bloom", "gale", "stone", "glow", "shade", "spark"] as const;
const TRAITS = ["patient", "curious", "sturdy", "nimble", "keen-scented", "echo-minded", "night-active", "social"] as const;
const HABITATS = ["canal edge", "terrace garden", "rail embankment", "reed marsh", "orchard trail", "cinder flats"] as const;
const TAXONOMY = ["aeriform", "rootbound", "mineral", "luminal", "rippled", "wispborne"] as const;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function hash(text: string): number {
  let result = 2166136261;
  for (const character of text) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

function pick<T>(values: readonly T[], seed: string, offset = 0): T {
  return values[(hash(seed) + offset) % values.length];
}

function cityId(slug: string): string { return `city-${slug}`; }
function restStopId(slug: string): string { return `${cityId(slug)}-rest-stop`; }
function minigameCentreId(slug: string): string { return `${cityId(slug)}-minigame-centre`; }

function createCities(): readonly CityRecord[] {
  return deepFreeze(CITY_SEEDS.map((seed, index) => {
    const [slug, name, region, climate] = seed;
    const id = cityId(slug);
    return {
      id,
      name,
      region,
      climate,
      districts: DISTRICT_WORDS.slice(0, 3 + (index % 3)).map((word) => `${name} ${word}`),
      plaza: {
        id: `${id}-plaza`,
        name: `${name} Central Plaza`,
        landmark: `${name} ${pick(PLAZA_LANDMARKS, slug)}`,
      },
      restStopBuildingId: restStopId(slug),
      minigameCentreBuildingId: minigameCentreId(slug),
      transit: {
        bus: true,
        subway: index % 2 === 0,
        ferry: climate === "coastal" || index % 11 === 0,
        airport: index % 3 === 0,
      },
    } satisfies CityRecord;
  }));
}

function hours(index: number): BuildingRecord["openingHours"] {
  return {
    weekdays: index % 4 === 0 ? "07:00-23:00" : "09:00-20:00",
    weekends: index % 3 === 0 ? "08:00-23:00" : "10:00-18:00",
  };
}

function createRestStop(city: CityRecord, index: number): BuildingRecord {
  return {
    id: city.restStopBuildingId,
    cityId: city.id,
    name: `${city.name} Central Rest Stop`,
    enterable: true,
    category: "rest-stop",
    exterior: { footprint: [34, 28], shape: "atrium" },
    interior: {
      mapId: `${city.id}-rest-stop-interior-v1`,
      featureAreas: [
        "central plaza connection", "basement feature area", "second-floor shops",
        "restaurant", "public washroom", "universal washroom", "elevators", "stairs", "escalators",
      ],
    },
    floors: 3,
    openingHours: { weekdays: "06:00-00:00", weekends: "06:00-01:00" },
    publicWashroom: true,
    universalWashroom: true,
    verticalAccess: { elevators: true, stairs: true, escalators: true },
    services: ["wayfinding desk", "water refill", "lost-and-found", "local transit information"],
    tenants: [`${city.name} second-floor shop arcade`, `${city.name} rest café`],
    transitProximity: ["central bus interchange", ...(city.transit.subway ? ["subway concourse"] : []), ...(city.transit.ferry ? ["ferry pier shuttle"] : [])],
    physicalPurchaseContext: "Purchases are completed at the staffed on-site counter inside the Rest Stop.",
  };
}

function createMinigameCentre(city: CityRecord): BuildingRecord {
  return {
    id: city.minigameCentreBuildingId,
    cityId: city.id,
    name: `${city.name} Minigame Centre`,
    enterable: true,
    category: "recreation",
    exterior: { footprint: [30, 24], shape: "hall" },
    interior: {
      mapId: `${city.id}-minigame-centre-interior-v1`,
      featureAreas: ["ten minigame bays", "restaurant", "public washroom", "universal washroom", "spectator balcony"],
    },
    floors: 3,
    openingHours: { weekdays: "09:00-23:00", weekends: "09:00-01:00" },
    publicWashroom: true,
    universalWashroom: true,
    verticalAccess: { elevators: true, stairs: true, escalators: true },
    services: ["minigame registration", "score ledger", "equipment lending", "accessibility desk"],
    tenants: [`${city.name} game kitchen`, `${city.name} prize counter`],
    transitProximity: ["central plaza footpath", "Rest Stop covered walkway"],
    physicalPurchaseContext: "Rewards and food are claimed at the staffed on-site counters inside the centre.",
  };
}

function createBuildings(cities: readonly CityRecord[]): readonly BuildingRecord[] {
  const buildings: BuildingRecord[] = [];
  for (const [cityIndex, city] of cities.entries()) {
    buildings.push(createRestStop(city, cityIndex), createMinigameCentre(city));
    for (let localIndex = 2; localIndex < 100; localIndex += 1) {
      const blueprint = BUILDING_BLUEPRINTS[(localIndex + cityIndex) % BUILDING_BLUEPRINTS.length];
      const [category, label, shape] = blueprint;
      const id = `${city.id}-building-${String(localIndex + 1).padStart(3, "0")}`;
      const floorCount = 1 + ((localIndex + cityIndex) % 5);
      const publicWashroom = localIndex % 4 === 0;
      buildings.push({
        id,
        cityId: city.id,
        name: `${city.name} ${label} ${localIndex - 1}`,
        enterable: true,
        category: category as BuildingCategory,
        exterior: {
          footprint: [18 + ((localIndex * 3) % 17), 14 + ((cityIndex + localIndex) % 13)],
          shape,
        },
        interior: {
          mapId: `${id}-interior-v1`,
          featureAreas: [`${label.toLowerCase()} lobby`, `${label.toLowerCase()} service floor`],
        },
        floors: floorCount,
        openingHours: hours(localIndex + cityIndex),
        publicWashroom,
        universalWashroom: publicWashroom && localIndex % 2 === 0,
        verticalAccess: {
          elevators: floorCount > 1,
          stairs: true,
          escalators: floorCount > 2 && localIndex % 3 === 0,
        },
        services: [pick(["information desk", "repair counter", "booking desk", "community noticeboard"], id)],
        tenants: [`${city.name} ${label} tenant ${localIndex}`],
        transitProximity: [city.transit.bus ? "bus stop within one block" : "neighbourhood footpath", ...(city.transit.subway && localIndex % 2 === 0 ? ["subway entrance nearby"] : [])],
        physicalPurchaseContext: "Any purchase is completed in person at the staffed counter inside this building.",
      });
    }
  }
  return deepFreeze(buildings);
}

function createMinigames(cities: readonly CityRecord[]): readonly MinigameRecord[] {
  const records: MinigameRecord[] = [];
  for (const [cityIndex, city] of cities.entries()) {
    MINIGAME_SEEDS.forEach((seedName, gameIndex) => {
      const id = `${city.id}-minigame-${String(gameIndex + 1).padStart(2, "0")}`;
      records.push({
        id,
        cityId: city.id,
        name: `${city.name} ${seedName}`,
        venueBuildingId: city.minigameCentreBuildingId,
        venueFloor: 2,
        rules: [
          `Complete ${3 + (gameIndex % 4)} rounds before the timer ends.`,
          `Score a ${gameIndex % 2 === 0 ? "precision" : "streak"} bonus by following the on-screen pattern.`,
          "The round ends safely when the timer reaches zero; partial scores remain visible.",
        ],
        durationSeconds: 45 + gameIndex * 10 + (cityIndex % 3) * 5,
        accessibilityProfile: {
          seatedPlay: true,
          reducedMotion: true,
          highContrast: true,
          remappableInputs: true,
          audioDescription: gameIndex % 3 !== 1,
        },
        inputProfile: gameIndex % 3 === 0 ? ["keyboard", "controller"] : gameIndex % 3 === 1 ? ["mouse", "touch"] : ["keyboard", "mouse", "controller"],
        rewardModel: {
          currency: 12 + gameIndex * 3,
          itemPool: [`${city.name} token`, `${seedName} badge`, "rest-stop voucher"],
          reputation: 2 + (gameIndex % 4),
        },
        configuration: {
          seed: `${CATALOG_VERSION}:${city.id}:${id}`,
          rounds: 3 + (gameIndex % 4),
          targetScore: 100 + gameIndex * 25,
          modifiers: [gameIndex % 2 === 0 ? "steady-tempo" : "pattern-shift", city.climate],
        },
      });
    });
  }
  return deepFreeze(records);
}

function createCreatures(): readonly CreatureRecord[] {
  const records: CreatureRecord[] = [];
  CREATURE_SEEDS.forEach(([slug, rootName], index) => {
    const sproutId = `creature-${slug}-sprout`;
    const crestId = `creature-${slug}-crest`;
    const primary = pick(ELEMENTS, slug);
    const secondary = pick(ELEMENTS, slug, 3);
    const habitat = pick(HABITATS, slug);
    const stats = (stage: number) => ({
      vitality: 35 + index % 19 + stage * 28,
      force: 24 + (index * 3) % 23 + stage * 24,
      guard: 22 + (index * 5) % 21 + stage * 25,
      agility: 26 + (index * 7) % 22 + stage * 21,
      focus: 30 + (index * 11) % 18 + stage * 27,
    });
    const base = {
      taxonomy: {
        kingdom: "wildline",
        phylum: pick(TAXONOMY, slug),
        className: `${pick(TAXONOMY, slug, 2)}-form`,
        order: `${pick(TAXONOMY, slug, 4)}-order`,
        family: `${slug}-family`,
      },
      elements: [primary, secondary].filter((element, position, list) => list.indexOf(element) === position),
      traits: [pick(TRAITS, slug), pick(TRAITS, slug, 2)],
      habitats: [habitat, pick(HABITATS, slug, 5)],
    };
    records.push({
      id: sproutId,
      name: `${rootName} Sprig`,
      form: "sprout",
      ...base,
      stats: stats(0),
      captureDifficulty: (1 + (index % 4)) as CreatureRecord["captureDifficulty"],
      relationships: { evolvesTo: crestId },
    });
    records.push({
      id: crestId,
      name: `${rootName} Crest`,
      form: "crest",
      ...base,
      stats: stats(1),
      captureDifficulty: (2 + (index % 4)) as CreatureRecord["captureDifficulty"],
      relationships: { evolvesFrom: sproutId, ...(index % 5 === 0 ? { variantOf: sproutId } : {}) },
    });
  });
  return deepFreeze(records);
}

export interface CatalogueInvariantReport {
  readonly version: typeof CATALOG_VERSION;
  readonly cityCount: number;
  readonly buildingCount: number;
  readonly minigameCount: number;
  readonly creatureCount: number;
  readonly buildingsPerCity: number;
  readonly minigamesPerCity: number;
  readonly uniqueIds: boolean;
  readonly uniqueNames: boolean;
  readonly crossReferences: boolean;
  readonly restStopsComplete: boolean;
}

const cities = createCities();
const buildings = createBuildings(cities);
const minigames = createMinigames(cities);
const creatures = createCreatures();

function unique(values: readonly string[]): boolean { return new Set(values).size === values.length; }

function buildIndex<T extends { readonly id: string }>(records: readonly T[]): Readonly<Record<string, T>> {
  return Object.freeze(Object.fromEntries(records.map((record) => [record.id, record])));
}

function buildCityIndex<T extends { readonly cityId: string }>(records: readonly T[]): Readonly<Record<string, readonly T[]>> {
  const grouped: Record<string, T[]> = {};
  for (const record of records) (grouped[record.cityId] ??= []).push(record);
  return Object.freeze(Object.fromEntries(Object.entries(grouped).map(([id, values]) => [id, Object.freeze(values)])));
}

export const CITIES = cities;
export const BUILDINGS = buildings;
export const MINIGAMES = minigames;
export const CREATURES = creatures;
export const CITY_INDEX = buildIndex(cities);
export const BUILDING_INDEX = buildIndex(buildings);
export const MINIGAME_INDEX = buildIndex(minigames);
export const CREATURE_INDEX = buildIndex(creatures);
export const BUILDINGS_BY_CITY = buildCityIndex(buildings);
export const MINIGAMES_BY_CITY = buildCityIndex(minigames);

function calculateInvariantReport(): CatalogueInvariantReport {
  const buildingCityCounts = cities.map((city) => (BUILDINGS_BY_CITY[city.id] ?? []).length);
  const minigameCityCounts = cities.map((city) => (MINIGAMES_BY_CITY[city.id] ?? []).length);
  const allRecords = [...cities, ...buildings, ...minigames, ...creatures];
  const allIds = allRecords.map(({ id }) => id);
  const allNames = allRecords.map(({ name }) => name);
  const crossReferences = cities.every((city) => {
    const stop = BUILDING_INDEX[city.restStopBuildingId];
    const centre = BUILDING_INDEX[city.minigameCentreBuildingId];
    const games = MINIGAMES_BY_CITY[city.id] ?? [];
    return stop?.cityId === city.id && centre?.cityId === city.id && games.length === 10 && games.every((game) => game.venueBuildingId === centre.id);
  });
  const restStopsComplete = cities.every((city) => {
    const stop = BUILDING_INDEX[city.restStopBuildingId];
    return stop?.enterable === true && stop.category === "rest-stop" && stop.publicWashroom && stop.universalWashroom && stop.verticalAccess.elevators && stop.verticalAccess.stairs && stop.verticalAccess.escalators && stop.interior.featureAreas.includes("basement feature area") && stop.interior.featureAreas.includes("second-floor shops");
  });
  return {
    version: CATALOG_VERSION,
    cityCount: cities.length,
    buildingCount: buildings.length,
    minigameCount: minigames.length,
    creatureCount: creatures.length,
    buildingsPerCity: buildingCityCounts.every((count) => count === 100) ? 100 : Math.min(...buildingCityCounts),
    minigamesPerCity: minigameCityCounts.every((count) => count === 10) ? 10 : Math.min(...minigameCityCounts),
    uniqueIds: unique(allIds),
    uniqueNames: unique(allNames),
    crossReferences,
    restStopsComplete,
  };
}

export const CATALOGUE_INVARIANTS = deepFreeze(calculateInvariantReport());

export function assertCatalogueInvariants(): void {
  const report = CATALOGUE_INVARIANTS;
  if (report.cityCount !== 50 || report.buildingCount !== 5000 || report.minigameCount !== 500 || report.creatureCount !== 100) throw new Error(`Catalogue count invariant failed for version ${CATALOG_VERSION}.`);
  if (report.buildingsPerCity !== 100 || report.minigamesPerCity !== 10) throw new Error("Catalogue per-city cardinality invariant failed.");
  if (!report.uniqueIds || !report.uniqueNames || !report.crossReferences || !report.restStopsComplete) throw new Error("Catalogue relationship invariant failed.");
}

assertCatalogueInvariants();

export function getCity(id: string): CityRecord | undefined { return CITY_INDEX[id]; }
export function getBuilding(id: string): BuildingRecord | undefined { return BUILDING_INDEX[id]; }
export function getMinigamesForCity(id: string): readonly MinigameRecord[] { return MINIGAMES_BY_CITY[id] ?? []; }
export function getBuildingsForCity(id: string): readonly BuildingRecord[] { return BUILDINGS_BY_CITY[id] ?? []; }
export function getCreature(id: string): CreatureRecord | undefined { return CREATURE_INDEX[id]; }
export function getCreaturesByHabitat(habitat: string): readonly CreatureRecord[] { return CREATURES.filter((creature) => creature.habitats.includes(habitat)); }

export const CATALOGUE = deepFreeze({
  version: CATALOG_VERSION,
  cities: CITIES,
  buildings: BUILDINGS,
  minigames: MINIGAMES,
  creatures: CREATURES,
  invariants: CATALOGUE_INVARIANTS,
});
