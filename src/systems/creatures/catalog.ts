import type {
  CreatureHabitat,
  CreatureSpecies,
  CreatureSpeciesId,
  HabitatId,
  ObservationApproach,
} from './types';

const species: readonly CreatureSpecies[] = [
  {
    id: 'brineling',
    name: 'Brineling',
    description: 'A tidepool glider that watches a patient visitor before drifting close.',
    habitats: ['tideglass-pools'],
    traits: ['tide-glider', 'quiet-listener', 'patient', 'watchful'],
    temperament: { boldness: 38, curiosity: 72, patience: 64, sociability: 46, startleResponse: 42 },
    captureDifficulty: 34,
  },
  {
    id: 'reedhorn',
    name: 'Reedhorn',
    description: 'A broad-shouldered marsh grazer that answers gentle footsteps with a low hum.',
    habitats: ['reedfen-marsh'],
    traits: ['reed-runner', 'echo-caller', 'social', 'watchful'],
    temperament: { boldness: 61, curiosity: 48, patience: 52, sociability: 70, startleResponse: 36 },
    captureDifficulty: 46,
  },
  {
    id: 'duskwisp',
    name: 'Duskwisp',
    description: 'A lantern-tailed dusk wanderer that prefers a quiet edge and unhurried company.',
    habitats: ['moonlit-terrace'],
    traits: ['night-bloom', 'quiet-listener', 'patient', 'territorial'],
    temperament: { boldness: 27, curiosity: 66, patience: 78, sociability: 29, startleResponse: 58 },
    captureDifficulty: 58,
  },
] as const;

const habitats: readonly CreatureHabitat[] = [
  {
    id: 'tideglass-pools',
    name: 'Tideglass Pools',
    description: 'Shallow harbour pools where reflected light gives a calm creature room to circle.',
    species: ['brineling'],
    baseStability: 76,
    preferredApproaches: ['quiet', 'patient', 'steady'],
  },
  {
    id: 'reedfen-marsh',
    name: 'Reedfen Marsh',
    description: 'A sheltered wetland of tall reeds, soft mud, and distant answering calls.',
    species: ['reedhorn'],
    baseStability: 68,
    preferredApproaches: ['steady', 'patient'],
  },
  {
    id: 'moonlit-terrace',
    name: 'Moonlit Terrace',
    description: 'A quiet overlook where low lamps leave a wide, undisturbed route through the grass.',
    species: ['duskwisp'],
    baseStability: 61,
    preferredApproaches: ['patient', 'quiet'],
  },
] as const;

const speciesById: ReadonlyMap<CreatureSpeciesId, CreatureSpecies> = new Map(species.map((entry) => [entry.id, entry]));
const habitatById: ReadonlyMap<HabitatId, CreatureHabitat> = new Map(habitats.map((entry) => [entry.id, entry]));

export const CREATURE_SPECIES: readonly CreatureSpecies[] = species;
export const CREATURE_HABITATS: readonly CreatureHabitat[] = habitats;

export function getCreatureSpecies(id: CreatureSpeciesId): CreatureSpecies | undefined {
  return speciesById.get(id);
}

export function getCreatureHabitat(id: HabitatId): CreatureHabitat | undefined {
  return habitatById.get(id);
}

export function requireCreatureSpecies(id: CreatureSpeciesId): CreatureSpecies {
  const entry = getCreatureSpecies(id);
  if (!entry) throw new Error(`Unknown creature species: ${id}`);
  return entry;
}

export function requireCreatureHabitat(id: HabitatId): CreatureHabitat {
  const entry = getCreatureHabitat(id);
  if (!entry) throw new Error(`Unknown creature habitat: ${id}`);
  return entry;
}

export function isSpeciesAtHabitat(speciesId: CreatureSpeciesId, habitatId: HabitatId): boolean {
  return requireCreatureHabitat(habitatId).species.includes(speciesId);
}

export function isObservationApproach(value: string): value is ObservationApproach {
  return value === 'quiet' || value === 'steady' || value === 'patient' || value === 'rushed';
}

