# Catalogue schema and generation

## Purpose and versioning

The source of truth is `src/content/catalog/`. `CATALOG_VERSION` is currently `1.0.0`. A catalogue version changes when a schema, seed table, identifier rule, or generated content contract changes. Generated records are deterministic for a fixed version and seed table: no wall clock, network response, or random draw participates in generation.

The exported `CATALOGUE` value contains the version, immutable record collections, and the computed invariant report. Consumers can use the focused query functions instead of copying or mutating catalogue arrays.

## Exact inventory

| Record family | Exact count | Per-city rule |
| --- | ---: | --- |
| Cities | 50 | One stable city record per authored city seed |
| Creature forms | 100 | Two forms for each of 50 authored creature roots |
| Minigames | 500 | Exactly 10 for each city, all hosted by that city's minigame centre |
| Enterable buildings | 5,000 | Exactly 100 for each city, including its Rest Stop and minigame centre |

The generator performs the arithmetic directly: 50 cities × 100 buildings, 50 cities × 10 minigames, and 50 creature roots × 2 forms. `assertCatalogueInvariants()` also checks the resulting runtime arrays and throws if a count, relationship, or Rest Stop contract changes.

## City schema

Each `CityRecord` has a stable `city-<slug>` identifier, original name, region, climate, generated district names, a central plaza and landmark, a Rest Stop building identifier, a minigame-centre building identifier, and bus, subway, ferry, and airport capabilities. City IDs are derived from the ordered seed slug and are never generated from mutable display text.

Every city receives a central Rest Stop with a stable interior map identity and all required areas: a plaza connection, basement feature area, second-floor shops, restaurant, public washroom, universal washroom, elevator, stairs, and escalators. The associated minigame centre has ten game bays, a restaurant, public and universal washrooms, vertical access, an accessibility desk, and staffed reward and food counters.

## Building schema

`BuildingRecord` includes the owning city, original display name, an explicit `enterable` flag, category, exterior footprint and shape, an enterable interior map identity, feature areas, floor count, weekday and weekend opening hours, public and universal washroom availability, elevators, stairs, escalators, services, tenants, transit proximity, and a physical-purchase context. The purchase context explicitly requires an in-person staffed counter; an informational screen cannot complete a transaction.

The first two deterministic building slots are the Rest Stop and minigame centre. The remaining 98 slots are expanded from the reviewed blueprint table, with stable local indexes, bounded footprints, predictable floor counts, and no fake sample documents or remote asset dependencies.

## Minigame schema

Each `MinigameRecord` has a stable city-scoped ID, original name, city, venue building and floor, three plain-language rules, duration, input profile, accessibility profile, reward model, and deterministic configuration. The configuration includes a seed containing the catalogue version, city ID, and minigame ID, plus rounds, target score, and modifiers. This makes replays and saved references addressable without using random data.

## Creature schema

Each `CreatureRecord` has an original stable ID and name, a sprout or crest form, a five-part taxonomy, elements, traits, habitats, five named stats, capture difficulty, and evolution or variant relationships. Each authored root produces a sprout that evolves into its crest. Some crest forms also record a variant relationship to their sprout; the relationship is explicit and never inferred from a name.

## IDs and immutable indexes

IDs are derived from authored slugs and fixed local indexes. The module builds frozen lookup objects for cities, buildings, minigames, and creature forms, as well as frozen city-grouped arrays for buildings and minigames. `getCity`, `getBuilding`, `getMinigamesForCity`, `getBuildingsForCity`, `getCreature`, and `getCreaturesByHabitat` provide read-only access paths. The exported arrays and the aggregate catalogue are deeply frozen so a consumer cannot accidentally alter the shared catalogue in place.

## Invariant and failure behavior

`CATALOGUE_INVARIANTS` reports version, counts, per-city cardinalities, global ID and name uniqueness, cross-reference validity, and Rest Stop completeness. Module initialization calls `assertCatalogueInvariants()`. A malformed seed, duplicate ID or name, missing venue, wrong per-city count, or incomplete Rest Stop fails closed with an `Error` rather than returning partial data. Cross-reference checks require every city to have its own Rest Stop and minigame centre and all ten city minigames to point at that centre.

## Privacy and security boundaries

The catalogue contains only original fictional content and deterministic configuration. It contains no account data, credentials, personal vocabulary, local paths, telemetry, network response, or user-authored content. It makes no network request and does not read arbitrary files. Physical purchase context describes where an in-world transaction must occur; it is not a payment API and does not contain payment details.

## Integration

Systems should consume stable IDs and query functions, not recreate names or assume array positions. A consumer that needs to show a city should resolve its city ID and then follow `restStopBuildingId` or `minigameCentreBuildingId`. A consumer that needs the ten local games should call `getMinigamesForCity(cityId)`. The catalogue is deliberately independent of renderer, persistence, commerce, construction, and transit modules so those systems can integrate at their own boundaries.

## Verification state

This rapid pass ran no unit tests, integration tests, end-to-end tests, lint, type checking, accessibility review, security review, smoke suite, review suite, build, or screenshot capture. The permitted verification for this lane is mechanical source inspection, exact-count reasoning from the generators and invariant code, `git diff --check`, and a scan of the owned public files for private conversation vocabulary. The runtime invariant functions are shipped for the next normal verification pass; their presence is not being presented as a test result here.

## Suggested articles

- [National content category index](README.md)
- [Transit and Rest Stops](../transit-and-rest-stops.md)
- [Commerce and physical purchase context](../physical-places.md)
- [Construction contracts](../commerce-construction/construction.md)
