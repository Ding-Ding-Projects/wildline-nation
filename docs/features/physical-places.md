# Physical places and purchases

The `v0.1.0` slice keeps money-making and spending in the world. The map and general GUI never complete a purchase. The player must enter a store, builder office, counter, or service place, then use the place-scoped action while the physical interaction is active.

The slice demonstrates grocery goods, restaurant meals, salon services, Catch Balls, construction contracts, and minigame prizes. Each action checks the player’s money, updates the saved balance, and reports the handover in the status bar.

The full release implementation will move this policy into a hardened main-process transaction service with a validated map, establishment, staff or machine, open-state, stock revision, and proximity context.
