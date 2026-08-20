import type { Climate, Region } from "./types";

export type CitySeed = readonly [slug: string, name: string, region: Region, climate: Climate];

export const CITY_SEEDS: readonly CitySeed[] = [
  ["aurora-weir", "Aurora Weir", "north", "alpine"],
  ["brineglass", "Brineglass", "east", "coastal"],
  ["copper-finch", "Copper Finch", "central", "temperate"],
  ["dusk-mere", "Duskmere", "west", "temperate"],
  ["emberstep", "Emberstep", "south", "arid"],
  ["fallow-arc", "Fallow Arc", "north", "temperate"],
  ["glimmer-quay", "Glimmer Quay", "east", "coastal"],
  ["hushvale", "Hushvale", "west", "rainforest"],
  ["ironbloom", "Ironbloom", "central", "temperate"],
  ["juniper-span", "Juniper Span", "north", "alpine"],
  ["kestrel-row", "Kestrel Row", "south", "arid"],
  ["lumenreach", "Lumenreach", "east", "coastal"],
  ["mossline", "Mossline", "west", "rainforest"],
  ["northstar-hollow", "Northstar Hollow", "north", "alpine"],
  ["opal-junction", "Opal Junction", "central", "temperate"],
  ["pineglass", "Pineglass", "west", "temperate"],
  ["quartzford", "Quartzford", "south", "arid"],
  ["rivercoil", "Rivercoil", "east", "coastal"],
  ["sable-terrace", "Sable Terrace", "central", "temperate"],
  ["tidewell", "Tidewell", "east", "coastal"],
  ["umberfield", "Umberfield", "south", "arid"],
  ["valecrest", "Valecrest", "north", "alpine"],
  ["wicker-bay", "Wicker Bay", "east", "coastal"],
  ["xenith-grove", "Xenith Grove", "west", "rainforest"],
  ["yarrow-gate", "Yarrow Gate", "central", "temperate"],
  ["zephyr-crossing", "Zephyr Crossing", "south", "arid"],
  ["asterfall", "Asterfall", "north", "alpine"],
  ["bellwether", "Bellwether", "central", "temperate"],
  ["cloudrest", "Cloudrest", "west", "rainforest"],
  ["driftbarrow", "Driftbarrow", "east", "coastal"],
  ["echosill", "Echosill", "south", "arid"],
  ["flintgarden", "Flintgarden", "central", "temperate"],
  ["galehaven", "Galehaven", "east", "coastal"],
  ["hearthmere", "Hearthmere", "north", "alpine"],
  ["isletown", "Isletown", "east", "coastal"],
  ["jasper-bend", "Jasper Bend", "south", "arid"],
  ["kindred-point", "Kindred Point", "west", "rainforest"],
  ["lanternwash", "Lanternwash", "central", "temperate"],
  ["marrowick", "Marrowick", "north", "alpine"],
  ["nacre-rise", "Nacre Rise", "east", "coastal"],
  ["oxbow-lantern", "Oxbow Lantern", "west", "rainforest"],
  ["pollenreach", "Pollenreach", "south", "arid"],
  ["quillharbor", "Quillharbor", "east", "coastal"],
  ["reedspire", "Reedspire", "central", "temperate"],
  ["sunward-basin", "Sunward Basin", "south", "arid"],
  ["thimblewick", "Thimblewick", "north", "alpine"],
  ["underleaf", "Underleaf", "west", "rainforest"],
  ["vesper-dock", "Vesper Dock", "east", "coastal"],
  ["willowrun", "Willowrun", "central", "temperate"],
  ["yonderfell", "Yonderfell", "north", "alpine"],
] as readonly CitySeed[];

export type CreatureSeed = readonly [slug: string, rootName: string];

export const CREATURE_SEEDS: readonly CreatureSeed[] = [
  ["aeralume", "Aeralume"], ["bramblet", "Bramblet"], ["cinderel", "Cinderel"], ["dewknot", "Dewknot"],
  ["emberlyn", "Emberlyn"], ["ferrivane", "Ferrivane"], ["glowmoss", "Glowmoss"], ["hushfin", "Hushfin"],
  ["ivorune", "Ivorune"], ["jadelark", "Jadelark"], ["koralith", "Koralith"], ["lumenox", "Lumenox"],
  ["mirewhisp", "Mirewhisp"], ["nimbuska", "Nimbuska"], ["opalune", "Opalune"], ["plumetail", "Plumetail"],
  ["quartzle", "Quartzle"], ["rillwisp", "Rillwisp"], ["sundrake", "Sundrake"], ["thornelle", "Thornelle"],
  ["umbrafawn", "Umbrafawn"], ["velvetide", "Velvetide"], ["wildrune", "Wildrune"], ["xylobit", "Xylobit"],
  ["yonderling", "Yonderling"], ["zephryx", "Zephryx"], ["ashpetal", "Ashpetal"], ["borealyn", "Borealyn"],
  ["cloverick", "Cloverick"], ["dapplehorn", "Dapplehorn"], ["evercoil", "Evercoil"], ["flintwing", "Flintwing"],
  ["gossameru", "Gossameru"], ["hollowisp", "Hollowisp"], ["inkroot", "Inkroot"], ["juncturell", "Juncturell"],
  ["kettlefin", "Kettlefin"], ["leaflume", "Leaflume"], ["moonbrack", "Moonbrack"], ["nacrelyn", "Nacrelyn"],
  ["ochrevolt", "Ochrevolt"], ["puddleorn", "Puddleorn"], ["quillune", "Quillune"], ["rainspark", "Rainspark"],
  ["silvershade", "Silvershade"], ["tanglewyrm", "Tanglewyrm"], ["uplume", "Uplume"], ["virelia", "Virelia"],
  ["wispfern", "Wispfern"], ["xanthrell", "Xanthrell"],
] as readonly CreatureSeed[];

export const MINIGAME_SEEDS = [
  "Lantern Loop", "Harbor Hurdle", "Rooftop Relay", "Mosaic Memory", "Windmill Waltz",
  "Market Measure", "Echo Echo", "Bridge Bloom", "Parcel Pivot", "Rainline Rhythm",
] as const;

export const BUILDING_BLUEPRINTS = [
  ["market", "Open-air market", "courtyard"], ["civic", "Civic archive", "hall"],
  ["residential", "Courtyard homes", "courtyard"], ["workshop", "Maker workshop", "row"],
  ["hospitality", "Guesthouse", "atrium"], ["culture", "Story gallery", "pavilion"],
  ["transit", "Transit exchange", "hall"], ["education", "Learning studio", "tower"],
  ["recreation", "Recreation hall", "pavilion"], ["market", "Provision arcade", "row"],
] as const;
