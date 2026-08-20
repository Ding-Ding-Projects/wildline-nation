import {
  BattleDomainError,
  type BattleCatalog,
  type BattleComboDefinition,
  type BattleComboReadiness,
  type BattleContract,
  type BattleFighterState,
  type BattleInstanceState,
  type BattleInterruptIntent,
  type BattlePayoutReceipt,
  type BattleStance,
  type BattleSystemState,
  type BattleTeamSeed,
  type BattleTeamState,
  type BattleTechnique,
  type BattleTurnEvent,
  type BattleTurnIntent,
  type BattleTurnResolution,
  type ResolveBattleTurnRequest,
  type StartBattleRequest,
} from './types';

const stanceInitiative: Readonly<Record<BattleStance, number>> = {
  surge: 2,
  brace: 0,
  drift: 4,
};

const stanceAttack: Readonly<Record<BattleStance, number>> = {
  surge: 1.2,
  brace: 0.85,
  drift: 1,
};

const stanceDefence: Readonly<Record<BattleStance, number>> = {
  surge: 0.9,
  brace: 1.35,
  drift: 1,
};

const stanceMomentum: Readonly<Record<BattleStance, number>> = {
  surge: 4,
  brace: 7,
  drift: 6,
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function wholeNumber(value: unknown, minimum = 0): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum;
}

function boundedNumber(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function clampMomentum(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isBattleStance(value: unknown): value is BattleStance {
  return value === 'surge' || value === 'brace' || value === 'drift';
}

function isBattleSide(value: unknown): value is BattleTeamState['side'] {
  return value === 'player' || value === 'opponent';
}

function isBattleStatus(value: unknown): value is BattleInstanceState['status'] {
  return value === 'active' || value === 'player-won' || value === 'opponent-won' || value === 'draw';
}

function fighterFromSeed(seed: BattleTeamSeed['members'][number]): BattleFighterState {
  return {
    ...clone(seed),
    vitality: seed.maxVitality,
    stance: 'drift',
  };
}

function teamFromSeed(seed: BattleTeamSeed): BattleTeamState {
  return {
    id: seed.id,
    name: seed.name,
    side: seed.side,
    momentum: 0,
    members: seed.members.map(fighterFromSeed),
  };
}

function validateTeamSeed(team: BattleTeamSeed, techniques: ReadonlyMap<string, BattleTechnique>): void {
  if (
    !nonEmpty(team.id) ||
    !nonEmpty(team.name) ||
    !isBattleSide(team.side) ||
    !Array.isArray(team.members) ||
    team.members.length < 1 ||
    team.members.length > 4
  ) {
    throw new BattleDomainError('INVALID_TEAM', 'Battle teams require an id, name and one through four members.');
  }
  const ids = new Set<string>();
  for (const member of team.members) {
    if (
      !nonEmpty(member.id) ||
      ids.has(member.id) ||
      !nonEmpty(member.name) ||
      !nonEmpty(member.speciesId) ||
      !wholeNumber(member.maxVitality, 1) ||
      !wholeNumber(member.power, 1) ||
      !wholeNumber(member.resilience, 1) ||
      !wholeNumber(member.speed, 1) ||
      member.techniqueIds.length < 1 ||
      member.techniqueIds.some((id) => !techniques.has(id)) ||
      member.comboTags.some((tag) => !nonEmpty(tag) || tag.length > 64)
    ) {
      throw new BattleDomainError('INVALID_TEAM', `Invalid battle fighter: ${member.id}`);
    }
    ids.add(member.id);
  }
}

function validateCatalog(catalog: BattleCatalog): void {
  const techniqueIds = new Set<string>();
  const techniques = new Map<string, BattleTechnique>();
  for (const technique of catalog.techniques) {
    if (
      !nonEmpty(technique.id) ||
      techniqueIds.has(technique.id) ||
      !nonEmpty(technique.name) ||
      !wholeNumber(technique.basePower) ||
      !wholeNumber(technique.priority) ||
      !wholeNumber(technique.momentumGain) ||
      !wholeNumber(technique.momentumCost) ||
      technique.momentumCost > 100 ||
      technique.momentumGain > 100 ||
      (technique.kind === 'interrupt' && !technique.interruptTrigger) ||
      (technique.kind !== 'interrupt' && technique.interruptTrigger !== undefined)
    ) {
      throw new BattleDomainError('INVALID_CATALOG', `Invalid battle technique: ${technique.id}`);
    }
    techniqueIds.add(technique.id);
    techniques.set(technique.id, technique);
  }

  const profileIds = new Set<string>();
  for (const profile of catalog.fighterProfiles) {
    if (
      !nonEmpty(profile.speciesId) ||
      profileIds.has(profile.speciesId) ||
      !wholeNumber(profile.maxVitality, 1) ||
      !wholeNumber(profile.power, 1) ||
      !wholeNumber(profile.resilience, 1) ||
      !wholeNumber(profile.speed, 1) ||
      profile.techniqueIds.length < 1 ||
      profile.techniqueIds.some((id) => !techniqueIds.has(id))
    ) {
      throw new BattleDomainError('INVALID_CATALOG', `Invalid fighter profile: ${profile.speciesId}`);
    }
    profileIds.add(profile.speciesId);
  }

  const comboIds = new Set<string>();
  for (const combo of catalog.combos) {
    if (
      !nonEmpty(combo.id) ||
      comboIds.has(combo.id) ||
      !nonEmpty(combo.name) ||
      combo.requiredTags.length < 1 ||
      combo.requiredTags.some((tag) => !nonEmpty(tag)) ||
      !wholeNumber(combo.minimumContributors, 1) ||
      !wholeNumber(combo.momentumCost, 1) ||
      combo.momentumCost > 100 ||
      !boundedNumber(combo.powerMultiplier, 1, 5)
    ) {
      throw new BattleDomainError('INVALID_CATALOG', `Invalid battle combo: ${combo.id}`);
    }
    comboIds.add(combo.id);
  }

  const contractIds = new Set<string>();
  for (const contract of catalog.contracts) {
    if (
      !nonEmpty(contract.id) ||
      contractIds.has(contract.id) ||
      !nonEmpty(contract.name) ||
      !nonEmpty(contract.venueId) ||
      !wholeNumber(contract.payout) ||
      !wholeNumber(contract.maxTurns, 1) ||
      contract.maxTurns > 100 ||
      contract.opponentTeam.side !== 'opponent'
    ) {
      throw new BattleDomainError('INVALID_CATALOG', `Invalid battle contract: ${contract.id}`);
    }
    validateTeamSeed(contract.opponentTeam, techniques);
    contractIds.add(contract.id);
  }
}

interface ResolvedIntent {
  intent: BattleTurnIntent;
  team: BattleTeamState;
  actor: BattleFighterState;
  previousStance: BattleStance;
  targetTeam: BattleTeamState;
  target: BattleFighterState;
  technique: BattleTechnique;
  initiative: number;
}

export class BattleSystem {
  readonly #catalog: BattleCatalog;
  readonly #techniques: Map<string, BattleTechnique>;
  readonly #combos: Map<string, BattleComboDefinition>;
  readonly #contracts: Map<string, BattleContract>;
  #state: BattleSystemState;

  constructor(catalog: BattleCatalog, state?: BattleSystemState) {
    validateCatalog(catalog);
    this.#catalog = clone(catalog);
    this.#techniques = new Map(this.#catalog.techniques.map((technique) => [technique.id, technique]));
    this.#combos = new Map(this.#catalog.combos.map((combo) => [combo.id, combo]));
    this.#contracts = new Map(this.#catalog.contracts.map((contract) => [contract.id, contract]));
    this.#state = state ? this.#validatedState(state) : {
      version: 1,
      nextBattleSequence: 1,
      battles: [],
      payoutReceipts: [],
    };
  }

  snapshot(): BattleSystemState {
    return clone(this.#state);
  }

  listContracts(): readonly BattleContract[] {
    return clone(this.#catalog.contracts);
  }

  getBattle(battleId: string): BattleInstanceState {
    return clone(this.#battle(battleId));
  }

  getPayoutReceipt(receiptId: string): BattlePayoutReceipt {
    const receipt = this.#state.payoutReceipts.find((candidate) => candidate.id === receiptId);
    if (!receipt) throw new BattleDomainError('INVALID_STATE', `Unknown battle payout receipt: ${receiptId}`);
    return clone(receipt);
  }

  startContract(request: StartBattleRequest): BattleInstanceState {
    const contract = this.#contract(request.contractId);
    if (
      request.venue.present !== true ||
      request.venue.venueId !== contract.venueId ||
      !nonEmpty(request.venue.interactionId) ||
      !wholeNumber(request.nowMs) ||
      !wholeNumber(request.venue.expiresAtMs) ||
      request.nowMs >= request.venue.expiresAtMs
    ) {
      throw new BattleDomainError('INVALID_VENUE', `The ${contract.name} contract must start at ${contract.venueId}.`);
    }
    if (!nonEmpty(request.occurredAt) || request.playerTeam.side !== 'player') {
      throw new BattleDomainError('INVALID_TEAM', 'A contract requires a timestamp and one player team.');
    }
    validateTeamSeed(request.playerTeam, this.#techniques);
    if (request.playerTeam.id === contract.opponentTeam.id) {
      throw new BattleDomainError('INVALID_TEAM', 'Battle teams must have distinct ids.');
    }
    if (
      !contract.repeatable &&
      this.#state.battles.some((battle) => battle.contractId === contract.id && battle.status === 'player-won')
    ) {
      throw new BattleDomainError('BATTLE_COMPLETE', `${contract.name} has already been completed.`);
    }

    const sequence = this.#state.nextBattleSequence;
    const battle: BattleInstanceState = {
      id: `battle-${sequence.toString().padStart(6, '0')}`,
      contractId: contract.id,
      status: 'active',
      turn: 1,
      teams: [teamFromSeed(request.playerTeam), teamFromSeed(contract.opponentTeam)],
      startedAt: request.occurredAt,
      turns: [],
    };
    this.#state.nextBattleSequence += 1;
    this.#state.battles.push(battle);
    return clone(battle);
  }

  comboReadiness(battleId: string, teamId: string): readonly BattleComboReadiness[] {
    const battle = this.#battle(battleId);
    const team = this.#team(battle, teamId);
    return this.#catalog.combos.map((combo) => this.#readiness(team, combo));
  }

  resolveTurn(request: ResolveBattleTurnRequest): BattleTurnResolution {
    const stateBeforeTurn = clone(this.#state);
    try {
      return this.#resolveTurnInPlace(request);
    } catch (error) {
      this.#state = stateBeforeTurn;
      throw error;
    }
  }

  #resolveTurnInPlace(request: ResolveBattleTurnRequest): BattleTurnResolution {
    const battle = this.#battle(request.battleId);
    if (battle.status !== 'active') {
      throw new BattleDomainError('BATTLE_COMPLETE', `${battle.id} is already ${battle.status}.`);
    }
    if (!nonEmpty(request.occurredAt) || request.intents.length !== 2) {
      throw new BattleDomainError('INVALID_TURN', 'Each turn requires one timestamp and exactly one intent from each team.');
    }
    const intentIds = new Set<string>();
    const resolved = request.intents.map((intent) => this.#resolveIntent(battle, intent, intentIds));
    if (new Set(resolved.map((item) => item.team.id)).size !== 2) {
      throw new BattleDomainError('INVALID_TURN', 'Each battle team must submit exactly one turn intent.');
    }

    const events: BattleTurnEvent[] = [];
    let eventSequence = 1;
    const appendEvent = (event: Omit<BattleTurnEvent, 'id' | 'turn'>): BattleTurnEvent => {
      const stored: BattleTurnEvent = {
        ...event,
        id: `${battle.id}-turn-${battle.turn}-event-${eventSequence}`,
        turn: battle.turn,
      };
      eventSequence += 1;
      events.push(stored);
      return stored;
    };

    for (const item of resolved) {
      item.actor.stance = item.intent.stance;
      appendEvent({
        kind: 'stance',
        teamId: item.team.id,
        actorId: item.actor.id,
        detail: `${item.actor.name} adopted the ${item.intent.stance} stance.`,
      });
    }

    const interruptIds = new Set<string>();
    const interrupts = (request.interrupts ?? []).map((interrupt) =>
      this.#resolveInterruptIntent(battle, interrupt, resolved, interruptIds),
    );
    const ordered = [...resolved].sort(
      (left, right) => right.initiative - left.initiative || left.intent.id.localeCompare(right.intent.id),
    );

    for (const item of ordered) {
      if (item.actor.vitality <= 0 || battle.status !== 'active') continue;
      const matchingInterrupts = interrupts
        .filter((interrupt) => interrupt.intent.targetIntentId === item.intent.id)
        .sort(
          (left, right) =>
            right.technique.priority + right.actor.speed - (left.technique.priority + left.actor.speed) ||
            left.intent.id.localeCompare(right.intent.id),
        );
      let interrupted = false;
      for (const interrupt of matchingInterrupts) {
        if (interrupt.actor.vitality <= 0) continue;
        this.#applyInterrupt(interrupt, item, appendEvent);
        interrupted = true;
        break;
      }
      if (interrupted) {
        appendEvent({
          kind: 'interrupted',
          teamId: item.team.id,
          actorId: item.actor.id,
          techniqueId: item.technique.id,
          detail: `${item.actor.name}'s ${item.technique.name} was interrupted.`,
        });
        continue;
      }
      this.#applyIntent(item, appendEvent);
    }

    battle.turn += 1;
    const contract = this.#contract(battle.contractId);
    let payout: BattlePayoutReceipt | undefined;
    const playerTeam = battle.teams.find((team) => team.side === 'player')!;
    const opponentTeam = battle.teams.find((team) => team.side === 'opponent')!;
    const playerAlive = playerTeam.members.some((member) => member.vitality > 0);
    const opponentAlive = opponentTeam.members.some((member) => member.vitality > 0);
    if (!playerAlive || !opponentAlive) {
      battle.status = playerAlive === opponentAlive ? 'draw' : playerAlive ? 'player-won' : 'opponent-won';
      battle.completedAt = request.occurredAt;
    } else if (battle.turn > contract.maxTurns) {
      battle.status = 'draw';
      battle.completedAt = request.occurredAt;
      appendEvent({
        kind: 'draw',
        teamId: playerTeam.id,
        detail: `${contract.name} reached its ${contract.maxTurns}-turn limit.`,
      });
    }

    if (battle.status === 'player-won' && !battle.payoutReceiptId) {
      payout = {
        id: `battle-payout-${battle.id}`,
        battleId: battle.id,
        contractId: contract.id,
        amount: contract.payout,
        currency: contract.currency,
        issuedAt: request.occurredAt,
        reason: 'contract-victory',
      };
      battle.payoutReceiptId = payout.id;
      this.#state.payoutReceipts.push(payout);
      appendEvent({
        kind: 'payout',
        teamId: playerTeam.id,
        amount: payout.amount,
        detail: `${contract.name} paid ${payout.currency} ${payout.amount}.`,
      });
    }
    battle.turns.push({ turn: battle.turn - 1, occurredAt: request.occurredAt, events: clone(events) });
    return {
      battle: clone(battle),
      events: clone(events),
      ...(payout ? { payout: clone(payout) } : {}),
      geographyUnlocks: [],
    };
  }

  #applyInterrupt(
    interrupt: ResolvedIntent,
    targetIntent: ResolvedIntent,
    appendEvent: (event: Omit<BattleTurnEvent, 'id' | 'turn'>) => BattleTurnEvent,
  ): void {
    if (interrupt.team.momentum < interrupt.technique.momentumCost) {
      throw new BattleDomainError(
        'INSUFFICIENT_MOMENTUM',
        `${interrupt.team.name} needs ${interrupt.technique.momentumCost} momentum for ${interrupt.technique.name}.`,
      );
    }
    interrupt.team.momentum = clampMomentum(interrupt.team.momentum - interrupt.technique.momentumCost);
    const amount = this.#damage(interrupt.actor, targetIntent.actor, interrupt.technique, 1);
    targetIntent.actor.vitality = Math.max(0, targetIntent.actor.vitality - amount);
    interrupt.team.momentum = clampMomentum(interrupt.team.momentum + interrupt.technique.momentumGain);
    appendEvent({
      kind: 'interrupt',
      teamId: interrupt.team.id,
      actorId: interrupt.actor.id,
      targetId: targetIntent.actor.id,
      techniqueId: interrupt.technique.id,
      amount,
      detail: `${interrupt.actor.name} interrupted ${targetIntent.actor.name} with ${interrupt.technique.name}.`,
    });
    if (targetIntent.actor.vitality === 0) {
      appendEvent({
        kind: 'defeated',
        teamId: targetIntent.team.id,
        actorId: targetIntent.actor.id,
        detail: `${targetIntent.actor.name} could not continue.`,
      });
    }
  }

  #applyIntent(
    item: ResolvedIntent,
    appendEvent: (event: Omit<BattleTurnEvent, 'id' | 'turn'>) => BattleTurnEvent,
  ): void {
    if (item.team.momentum < item.technique.momentumCost) {
      throw new BattleDomainError(
        'INSUFFICIENT_MOMENTUM',
        `${item.team.name} needs ${item.technique.momentumCost} momentum for ${item.technique.name}.`,
      );
    }
    let multiplier = 1;
    if (item.intent.comboId) {
      const combo = this.#combo(item.intent.comboId);
      const readiness = this.#readiness(item.team, combo);
      if (!readiness.ready) {
        throw new BattleDomainError('COMBO_NOT_READY', `${combo.name} is not ready for ${item.team.name}.`);
      }
      multiplier = combo.powerMultiplier;
      item.team.momentum = clampMomentum(item.team.momentum - combo.momentumCost);
    }
    item.team.momentum = clampMomentum(item.team.momentum - item.technique.momentumCost);
    if (item.technique.kind === 'support') {
      const gained = item.technique.momentumGain + stanceMomentum[item.actor.stance];
      item.team.momentum = clampMomentum(item.team.momentum + gained);
      appendEvent({
        kind: 'support',
        teamId: item.team.id,
        actorId: item.actor.id,
        techniqueId: item.technique.id,
        amount: gained,
        detail: `${item.actor.name} used ${item.technique.name} and built momentum.`,
      });
      return;
    }
    const amount = this.#damage(item.actor, item.target, item.technique, multiplier);
    item.target.vitality = Math.max(0, item.target.vitality - amount);
    item.team.momentum = clampMomentum(
      item.team.momentum + item.technique.momentumGain + stanceMomentum[item.actor.stance],
    );
    appendEvent({
      kind: 'strike',
      teamId: item.team.id,
      actorId: item.actor.id,
      targetId: item.target.id,
      techniqueId: item.technique.id,
      amount,
      detail: `${item.actor.name} used ${item.technique.name} on ${item.target.name}.`,
    });
    if (item.target.vitality === 0) {
      appendEvent({
        kind: 'defeated',
        teamId: item.targetTeam.id,
        actorId: item.target.id,
        detail: `${item.target.name} could not continue.`,
      });
    }
  }

  #damage(
    actor: BattleFighterState,
    target: BattleFighterState,
    technique: BattleTechnique,
    multiplier: number,
  ): number {
    const attack = (technique.basePower + actor.power) * stanceAttack[actor.stance] * multiplier;
    const defence = target.resilience * stanceDefence[target.stance] * 0.55;
    return Math.max(1, Math.round(attack - defence));
  }

  #resolveIntent(battle: BattleInstanceState, intent: BattleTurnIntent, ids: Set<string>): ResolvedIntent {
    if (!nonEmpty(intent.id) || ids.has(intent.id)) {
      throw new BattleDomainError('INVALID_INTENT', 'Turn intent ids must be unique and non-empty.');
    }
    ids.add(intent.id);
    if (!isBattleStance(intent.stance)) {
      throw new BattleDomainError('INVALID_INTENT', `Unknown battle stance: ${String(intent.stance)}`);
    }
    const team = this.#team(battle, intent.teamId);
    const actor = this.#fighter(team, intent.actorId);
    if (actor.vitality <= 0) throw new BattleDomainError('INVALID_INTENT', `${actor.name} cannot act.`);
    const targetTeam = battle.teams.find((candidate) => candidate.id !== team.id)!;
    const target = this.#fighter(targetTeam, intent.targetId);
    if (target.vitality <= 0) throw new BattleDomainError('INVALID_INTENT', `${target.name} is already unable to continue.`);
    const technique = this.#technique(intent.techniqueId);
    if (!actor.techniqueIds.includes(technique.id) || technique.kind === 'interrupt') {
      throw new BattleDomainError('INVALID_INTENT', `${actor.name} cannot use ${technique.name} as a normal action.`);
    }
    if (intent.comboId && technique.kind !== 'strike') {
      throw new BattleDomainError('INVALID_INTENT', 'Only a strike may spend a ready team combo.');
    }
    return {
      intent,
      team,
      actor,
      previousStance: actor.stance,
      targetTeam,
      target,
      technique,
      initiative: actor.speed + technique.priority + stanceInitiative[intent.stance],
    };
  }

  #resolveInterruptIntent(
    battle: BattleInstanceState,
    interrupt: BattleInterruptIntent,
    resolved: readonly ResolvedIntent[],
    ids: Set<string>,
  ): ResolvedIntent {
    if (!nonEmpty(interrupt.id) || ids.has(interrupt.id)) {
      throw new BattleDomainError('INVALID_INTERRUPT', 'Interrupt intent ids must be unique and non-empty.');
    }
    ids.add(interrupt.id);
    const targeted = resolved.find((item) => item.intent.id === interrupt.targetIntentId);
    if (!targeted) throw new BattleDomainError('INVALID_INTERRUPT', 'An interrupt must target an intent in this turn.');
    const team = this.#team(battle, interrupt.teamId);
    if (team.id === targeted.team.id) {
      throw new BattleDomainError('INVALID_INTERRUPT', 'A team cannot interrupt its own intent.');
    }
    const actor = this.#fighter(team, interrupt.actorId);
    const technique = this.#technique(interrupt.techniqueId);
    if (actor.vitality <= 0 || !actor.techniqueIds.includes(technique.id) || technique.kind !== 'interrupt') {
      throw new BattleDomainError('INVALID_INTERRUPT', `${actor.name} cannot use ${technique.name} as an interrupt.`);
    }
    const triggerMatches =
      technique.interruptTrigger === 'opponent-strike'
          ? targeted.technique.kind === 'strike'
        : technique.interruptTrigger === 'opponent-combo'
          ? Boolean(targeted.intent.comboId)
          : targeted.previousStance !== targeted.intent.stance;
    if (!triggerMatches) {
      throw new BattleDomainError('INVALID_INTERRUPT', `${technique.name} does not match the targeted action.`);
    }
    return {
      intent: {
        id: interrupt.id,
        teamId: interrupt.teamId,
        actorId: interrupt.actorId,
        targetId: targeted.actor.id,
        techniqueId: interrupt.techniqueId,
        stance: actor.stance,
      },
      team,
      actor,
      previousStance: actor.stance,
      targetTeam: targeted.team,
      target: targeted.actor,
      technique,
      initiative: actor.speed + technique.priority,
    };
  }

  #readiness(team: BattleTeamState, combo: BattleComboDefinition): BattleComboReadiness {
    const livingMembers = team.members.filter((member) => member.vitality > 0);
    const matchedTags = combo.requiredTags.filter((tag) =>
      livingMembers.some((member) => member.comboTags.includes(tag)),
    );
    const contributorIds = livingMembers
      .filter((member) => combo.requiredTags.some((tag) => member.comboTags.includes(tag)))
      .map((member) => member.id);
    return {
      comboId: combo.id,
      name: combo.name,
      ready:
        matchedTags.length === combo.requiredTags.length &&
        contributorIds.length >= combo.minimumContributors &&
        team.momentum >= combo.momentumCost,
      requiredTags: [...combo.requiredTags],
      matchedTags,
      contributorIds,
      minimumContributors: combo.minimumContributors,
      momentum: team.momentum,
      momentumCost: combo.momentumCost,
    };
  }

  #validatedState(candidate: BattleSystemState): BattleSystemState {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      !Array.isArray(candidate.battles) ||
      !Array.isArray(candidate.payoutReceipts)
    ) {
      throw new BattleDomainError('INVALID_STATE', 'Battle state must contain battle and payout arrays.');
    }
    const state = clone(candidate);
    if (state.version !== 1 || !wholeNumber(state.nextBattleSequence, 1)) {
      throw new BattleDomainError('INVALID_STATE', 'Battle state version or sequence is invalid.');
    }
    const battleIds = new Set<string>();
    for (const battle of state.battles) {
      if (!battle || typeof battle !== 'object' || !Array.isArray(battle.teams)) {
        throw new BattleDomainError('INVALID_STATE', 'Battle entries must contain a team array.');
      }
      const contract = this.#contracts.get(battle.contractId);
      if (
        !nonEmpty(battle.id) ||
        battleIds.has(battle.id) ||
        !contract ||
        !isBattleStatus(battle.status) ||
        !wholeNumber(battle.turn, 1) ||
        !nonEmpty(battle.startedAt) ||
        !Array.isArray(battle.turns) ||
        battle.teams.length !== 2 ||
        !battle.teams.some((team) => team.side === 'player') ||
        !battle.teams.some((team) => team.side === 'opponent') ||
        (battle.status === 'active' && battle.completedAt !== undefined) ||
        (battle.status !== 'active' && !nonEmpty(battle.completedAt)) ||
        (battle.payoutReceiptId !== undefined && battle.status !== 'player-won')
      ) {
        throw new BattleDomainError('INVALID_STATE', `Invalid battle state: ${battle.id}`);
      }
      for (const team of battle.teams) {
        validateTeamSeed(team, this.#techniques);
        if (!wholeNumber(team.momentum) || team.momentum > 100) {
          throw new BattleDomainError('INVALID_STATE', `Invalid momentum for ${team.id}.`);
        }
        for (const member of team.members) {
          if (
            !wholeNumber(member.vitality) ||
            member.vitality > member.maxVitality ||
            !isBattleStance(member.stance)
          ) {
            throw new BattleDomainError('INVALID_STATE', `Invalid vitality for ${member.id}.`);
          }
        }
      }
      battleIds.add(battle.id);
    }
    const receiptIds = new Set<string>();
    for (const receipt of state.payoutReceipts) {
      if (!receipt || typeof receipt !== 'object') {
        throw new BattleDomainError('INVALID_STATE', 'Payout receipt entries must be objects.');
      }
      const battle = state.battles.find((candidateBattle) => candidateBattle.id === receipt.battleId);
      if (
        !nonEmpty(receipt.id) ||
        receiptIds.has(receipt.id) ||
        !battle ||
        battle.contractId !== receipt.contractId ||
        battle.status !== 'player-won' ||
        battle.payoutReceiptId !== receipt.id ||
        receipt.amount !== this.#contracts.get(receipt.contractId)?.payout ||
        receipt.currency !== 'CAD' ||
        receipt.reason !== 'contract-victory' ||
        !nonEmpty(receipt.issuedAt)
      ) {
        throw new BattleDomainError('INVALID_STATE', `Invalid payout receipt: ${receipt.id}`);
      }
      receiptIds.add(receipt.id);
    }
    for (const battle of state.battles) {
      if (battle.payoutReceiptId && !receiptIds.has(battle.payoutReceiptId)) {
        throw new BattleDomainError('INVALID_STATE', `Missing payout receipt for ${battle.id}.`);
      }
    }
    return state;
  }

  #battle(battleId: string): BattleInstanceState {
    const battle = this.#state.battles.find((candidate) => candidate.id === battleId);
    if (!battle) throw new BattleDomainError('UNKNOWN_BATTLE', `Unknown battle: ${battleId}`);
    return battle;
  }

  #team(battle: BattleInstanceState, teamId: string): BattleTeamState {
    const team = battle.teams.find((candidate) => candidate.id === teamId);
    if (!team) throw new BattleDomainError('UNKNOWN_TEAM', `Unknown battle team: ${teamId}`);
    return team;
  }

  #fighter(team: BattleTeamState, fighterId: string): BattleFighterState {
    const fighter = team.members.find((candidate) => candidate.id === fighterId);
    if (!fighter) throw new BattleDomainError('UNKNOWN_FIGHTER', `Unknown fighter: ${fighterId}`);
    return fighter;
  }

  #technique(techniqueId: string): BattleTechnique {
    const technique = this.#techniques.get(techniqueId);
    if (!technique) throw new BattleDomainError('UNKNOWN_TECHNIQUE', `Unknown battle technique: ${techniqueId}`);
    return technique;
  }

  #combo(comboId: string): BattleComboDefinition {
    const combo = this.#combos.get(comboId);
    if (!combo) throw new BattleDomainError('UNKNOWN_COMBO', `Unknown battle combo: ${comboId}`);
    return combo;
  }

  #contract(contractId: string): BattleContract {
    const contract = this.#contracts.get(contractId);
    if (!contract) throw new BattleDomainError('UNKNOWN_CONTRACT', `Unknown battle contract: ${contractId}`);
    return contract;
  }
}
