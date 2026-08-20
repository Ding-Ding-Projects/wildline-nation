export const CATALOG_VERSION = "1.0.0" as const;

export type Region = "north" | "south" | "east" | "west" | "central";
export type Climate = "coastal" | "temperate" | "arid" | "rainforest" | "alpine";
export type BuildingCategory =
  | "rest-stop"
  | "market"
  | "civic"
  | "residential"
  | "workshop"
  | "hospitality"
  | "culture"
  | "transit"
  | "education"
  | "recreation";

export interface TransitCapabilities {
  readonly bus: boolean;
  readonly subway: boolean;
  readonly ferry: boolean;
  readonly airport: boolean;
}

export interface PlazaRecord {
  readonly id: string;
  readonly name: string;
  readonly landmark: string;
}

export interface CityRecord {
  readonly id: string;
  readonly name: string;
  readonly region: Region;
  readonly climate: Climate;
  readonly districts: readonly string[];
  readonly plaza: PlazaRecord;
  readonly restStopBuildingId: string;
  readonly minigameCentreBuildingId: string;
  readonly transit: TransitCapabilities;
}

export interface BuildingRecord {
  readonly id: string;
  readonly cityId: string;
  readonly name: string;
  readonly enterable: boolean;
  readonly category: BuildingCategory;
  readonly exterior: {
    readonly footprint: readonly [number, number];
    readonly shape: "courtyard" | "tower" | "row" | "pavilion" | "atrium" | "hall";
  };
  readonly interior: {
    readonly mapId: string;
    readonly featureAreas: readonly string[];
  };
  readonly floors: number;
  readonly openingHours: {
    readonly weekdays: string;
    readonly weekends: string;
  };
  readonly publicWashroom: boolean;
  readonly universalWashroom: boolean;
  readonly verticalAccess: {
    readonly elevators: boolean;
    readonly stairs: boolean;
    readonly escalators: boolean;
  };
  readonly services: readonly string[];
  readonly tenants: readonly string[];
  readonly transitProximity: readonly string[];
  readonly physicalPurchaseContext: string;
}

export interface AccessibilityProfile {
  readonly seatedPlay: boolean;
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  readonly remappableInputs: boolean;
  readonly audioDescription: boolean;
}

export interface MinigameRecord {
  readonly id: string;
  readonly cityId: string;
  readonly name: string;
  readonly venueBuildingId: string;
  readonly venueFloor: number;
  readonly rules: readonly string[];
  readonly durationSeconds: number;
  readonly accessibilityProfile: AccessibilityProfile;
  readonly inputProfile: readonly ("keyboard" | "mouse" | "controller" | "touch" | "voice")[];
  readonly rewardModel: {
    readonly currency: number;
    readonly itemPool: readonly string[];
    readonly reputation: number;
  };
  readonly configuration: {
    readonly seed: string;
    readonly rounds: number;
    readonly targetScore: number;
    readonly modifiers: readonly string[];
  };
}

export interface CreatureStats {
  readonly vitality: number;
  readonly force: number;
  readonly guard: number;
  readonly agility: number;
  readonly focus: number;
}

export interface CreatureRecord {
  readonly id: string;
  readonly name: string;
  readonly form: "sprout" | "crest";
  readonly taxonomy: {
    readonly kingdom: string;
    readonly phylum: string;
    readonly className: string;
    readonly order: string;
    readonly family: string;
  };
  readonly elements: readonly string[];
  readonly traits: readonly string[];
  readonly habitats: readonly string[];
  readonly stats: CreatureStats;
  readonly captureDifficulty: 1 | 2 | 3 | 4 | 5;
  readonly relationships: {
    readonly evolvesFrom?: string;
    readonly evolvesTo?: string;
    readonly variantOf?: string;
  };
}
