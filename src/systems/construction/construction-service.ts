import { ConstructionDomainError } from './errors';
import {
  BuilderOfficeContext,
  ConstructionContext,
  ConstructionDelay,
  ConstructionPhaseDefinition,
  ConstructionPhaseId,
  ConstructionServiceOptions,
  ConstructionSiteContext,
  ConstructionSnapshot,
  ConstructionState,
  ConstructionStatus,
  ConstructionTemplate,
  ConstructionWorker,
  HandoverRecord,
  InspectionCheck,
  InspectionReport,
  LotInput,
  LotValidationIssue,
  LotValidationResult,
  MapContext,
  RemoteGuiContext,
  Result,
  ServiceResult,
  VisibleConstructionPhase,
  Weekday,
  WorkerAssignment,
  WorkdayReport,
} from './types';

export const CONSTRUCTION_PHASES: readonly ConstructionPhaseDefinition[] = [
  { index: 0, id: 'survey-fencing', name: 'Survey & fencing', durationWorkdays: 1 },
  { index: 1, id: 'foundation', name: 'Foundation', durationWorkdays: 2 },
  { index: 2, id: 'frame', name: 'Frame', durationWorkdays: 2 },
  { index: 3, id: 'roof-enclosure', name: 'Roof & enclosure', durationWorkdays: 2 },
  { index: 4, id: 'windows-doors', name: 'Windows & doors', durationWorkdays: 1 },
  { index: 5, id: 'utility-rough-in', name: 'Utility rough-in', durationWorkdays: 2 },
  { index: 6, id: 'insulation', name: 'Insulation', durationWorkdays: 1 },
  { index: 7, id: 'interior-finish', name: 'Interior finish', durationWorkdays: 2 },
  { index: 8, id: 'exterior-finish', name: 'Exterior finish', durationWorkdays: 2 },
  { index: 9, id: 'inspection-handover', name: 'Inspection & handover', durationWorkdays: 1 },
] as const;

export const DEFAULT_TEMPLATES: readonly ConstructionTemplate[] = [
  {
    id: 'harbour-courtyard-01',
    name: 'Harbour Courtyard 01',
    description: 'A two-floor courtyard home with a barrier-free ground route.',
    allowedZoning: ['residential', 'mixed-use'],
    minLotAreaSqm: 120,
    footprintWidthMeters: 8,
    footprintDepthMeters: 10,
    requiredUtilities: ['water', 'power', 'sewer'],
    crewSize: 3,
    quoteCents: 16000,
  },
];

const weekdays: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

function weekdaySchedule(days: readonly Weekday[]): ConstructionWorker['schedule'] {
  const selected = new Set(days);
  return {
    timezone: 'UTC',
    weekly: Object.fromEntries(weekdays.map((day) => [day, selected.has(day) ? [{ start: '08:00', end: '17:00' }] : []])) as ConstructionWorker['schedule']['weekly'],
  };
}

export const DEFAULT_WORKERS: readonly ConstructionWorker[] = [
  { id: 'jo', name: 'Jo', role: 'foreperson', schedule: weekdaySchedule([1, 2, 3, 4, 5]) },
  { id: 'ren', name: 'Ren', role: 'carpenter', schedule: weekdaySchedule([1, 2, 3, 4, 5]) },
  { id: 'akiko', name: 'Akiko', role: 'electrician', schedule: weekdaySchedule([1, 2, 3, 4, 5]) },
  { id: 'mara', name: 'Mara', role: 'finisher', schedule: weekdaySchedule([2, 3, 4, 5, 6]) },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

function failure<T>(error: ConstructionDomainError): ServiceResult<T, ConstructionDomainError> {
  return { ok: false, error };
}

function validIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekDay(value: string): Weekday {
  return new Date(`${value}T00:00:00.000Z`).getUTCDay() as Weekday;
}

function contextExpiry(context: BuilderOfficeContext | ConstructionSiteContext): number {
  return Date.parse(context.expiresAt);
}

export function isBuilderOfficeContext(context: ConstructionContext): context is BuilderOfficeContext {
  return context.kind === 'builder-office';
}

export function isRemoteGuiContext(context: ConstructionContext): context is RemoteGuiContext {
  return context.kind === 'remote-gui';
}

export function isMapContext(context: ConstructionContext): context is MapContext {
  return context.kind === 'map';
}

export function validateLot(lot: LotInput, template?: ConstructionTemplate): LotValidationResult {
  const issues: LotValidationIssue[] = [];
  if (!lot.lotId.trim()) issues.push({ code: 'missing-lot-id', message: 'A lot identifier is required.' });
  if (!Number.isFinite(lot.x) || !Number.isFinite(lot.y)) issues.push({ code: 'invalid-coordinates', message: 'Lot coordinates must be finite.' });
  if (!Number.isFinite(lot.widthMeters) || !Number.isFinite(lot.depthMeters) || lot.widthMeters <= 0 || lot.depthMeters <= 0) issues.push({ code: 'invalid-dimensions', message: 'Lot width and depth must be greater than zero.' });
  if (!Number.isFinite(lot.areaSqm) || lot.areaSqm < 80 || (template ? lot.areaSqm < template.minLotAreaSqm : false)) issues.push({ code: 'area-too-small', message: `Lot area must be at least ${template?.minLotAreaSqm ?? 80} square metres.` });
  if (lot.areaSqm > 5000) issues.push({ code: 'area-too-large', message: 'Lot area exceeds the supported 5,000 square metre limit.' });
  if (!Number.isFinite(lot.slopePercent) || lot.slopePercent < 0 || lot.slopePercent > 12) issues.push({ code: 'slope-too-steep', message: 'Lot slope must be between 0% and 12%.' });
  if (template && !template.allowedZoning.includes(lot.zoning as 'residential' | 'mixed-use')) issues.push({ code: 'zoning-not-allowed', message: `The ${template.name} template cannot be built in ${lot.zoning} zoning.` });
  if (!lot.roadAccess) issues.push({ code: 'no-road-access', message: 'A connected road or accessible public route is required.' });
  for (const utility of template?.requiredUtilities ?? ['water', 'power', 'sewer']) {
    if (!lot.utilities[utility]) issues.push({ code: 'missing-utility', message: `The lot is missing the required ${utility} utility.` });
  }
  if (lot.occupied) issues.push({ code: 'occupied', message: 'The lot is already occupied.' });
  if (lot.easementConflict) issues.push({ code: 'easement-conflict', message: 'An easement conflict prevents this footprint.' });
  if (template && (lot.widthMeters < template.footprintWidthMeters || lot.depthMeters < template.footprintDepthMeters)) issues.push({ code: 'invalid-dimensions', message: `The lot must fit a ${template.footprintWidthMeters}m by ${template.footprintDepthMeters}m footprint.` });
  return { valid: issues.length === 0, lot: clone(lot), issues };
}

export class ConstructionService {
  private readonly templates: readonly ConstructionTemplate[];
  private readonly workers: readonly ConstructionWorker[];
  private readonly allowedOfficeIds: ReadonlySet<string>;
  private readonly now: () => string;
  private readonly idFactory: (prefix: string) => string;
  private state: ConstructionState | null = null;

  constructor(options: ConstructionServiceOptions = {}) {
    this.templates = clone(options.templates ?? DEFAULT_TEMPLATES);
    this.workers = clone(options.workers ?? DEFAULT_WORKERS);
    this.allowedOfficeIds = new Set(options.allowedOfficeIds ?? ['northline-builders']);
    this.now = options.now ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}-${this.now().replace(/[^0-9]/g, '')}`);
  }

  listTemplates(): readonly ConstructionTemplate[] { return clone(this.templates); }

  listWorkers(): readonly ConstructionWorker[] { return clone(this.workers); }

  getState(): ConstructionState | null { return this.state ? clone(this.state) : null; }

  getVisiblePhases(): readonly VisibleConstructionPhase[] {
    const activeIndex = this.state?.phaseIndex ?? -1;
    const progress = this.state?.phaseProgress ?? 0;
    return CONSTRUCTION_PHASES.map((phase) => ({
      ...phase,
      state: phase.index < activeIndex || (phase.index === activeIndex && progress >= 1) ? 'complete' : phase.index === activeIndex ? 'active' : 'pending',
      progress: phase.index < activeIndex ? 1 : phase.index === activeIndex ? Math.max(0, Math.min(1, progress)) : 0,
    }));
  }

  validateLot(lot: LotInput, templateId?: string): LotValidationResult {
    const template = templateId ? this.templates.find((candidate) => candidate.id === templateId) : undefined;
    return validateLot(lot, template);
  }

  beginProject(projectId: string, lot: LotInput, context: ConstructionContext): ServiceResult<ConstructionState, ConstructionDomainError> {
    const office = this.requireOffice(context);
    if (!office.ok) return office;
    if (!projectId.trim()) return failure(new ConstructionDomainError('invalid-input', 'A project identifier is required.'));
    if (this.state) return failure(new ConstructionDomainError('project-exists', 'A construction project is already open for this service.', { projectId: this.state.projectId }));
    const lotValidation = validateLot(lot);
    if (!lotValidation.valid) return failure(new ConstructionDomainError('lot-invalid', 'The proposed lot failed validation.', { issues: lotValidation.issues }));
    this.state = {
      schemaVersion: 1,
      projectId,
      status: 'draft',
      lot: clone(lot),
      lotValidation,
      templateId: null,
      hiredCrew: [],
      phaseIndex: 0,
      phaseProgress: 0,
      elapsedWorkdays: 0,
      calendarDate: office.value.observedAt.slice(0, 10),
      pendingDelayWorkdays: 0,
      delays: [],
      inspection: null,
      handover: null,
      cancellationReason: null,
    };
    return success(this.getState()!);
  }

  selectTemplate(templateId: string, context: ConstructionContext): ServiceResult<ConstructionState, ConstructionDomainError> {
    const office = this.requireOffice(context);
    if (!office.ok) return office;
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status !== 'draft') return failure(new ConstructionDomainError('invalid-state', 'A template can only be selected before the contract starts.', { status: state.value.status }));
    const template = this.templates.find((candidate) => candidate.id === templateId);
    if (!template) return failure(new ConstructionDomainError('template-not-found', `Unknown construction template: ${templateId}.`, { templateId }));
    const lotValidation = validateLot(state.value.lot, template);
    if (!lotValidation.valid) return failure(new ConstructionDomainError('template-incompatible', 'The selected template does not fit the validated lot.', { issues: lotValidation.issues }));
    this.state = { ...state.value, templateId, lotValidation };
    return success(this.getState()!);
  }

  hireCrew(workerIds: readonly string[], context: ConstructionContext): ServiceResult<ConstructionState, ConstructionDomainError> {
    const office = this.requireOffice(context);
    if (!office.ok) return office;
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status !== 'draft') return failure(new ConstructionDomainError('invalid-state', 'Crew can only be hired before work starts.', { status: state.value.status }));
    if (!state.value.templateId) return failure(new ConstructionDomainError('template-not-selected', 'Select a compatible template before hiring a crew.'));
    const template = this.templates.find((candidate) => candidate.id === state.value.templateId)!;
    const uniqueIds = [...new Set(workerIds)];
    if (uniqueIds.length !== workerIds.length) return failure(new ConstructionDomainError('crew-invalid', 'A worker may only appear once in a crew.', { workerIds }));
    if (uniqueIds.length !== template.crewSize) return failure(new ConstructionDomainError('crew-size-mismatch', `This template requires exactly ${template.crewSize} named workers.`, { expected: template.crewSize, received: uniqueIds.length }));
    const selected = uniqueIds.map((id) => this.workers.find((worker) => worker.id === id));
    if (selected.some((worker) => !worker)) return failure(new ConstructionDomainError('crew-invalid', 'Every hired worker must be registered at the builder office.', { workerIds }));
    const hiredCrew = selected.map((worker) => ({ workerId: worker!.id, name: worker!.name, role: worker!.role, schedule: clone(worker!.schedule) })) as WorkerAssignment[];
    this.state = { ...state.value, status: 'active', hiredCrew, phaseIndex: 0, phaseProgress: 0 };
    return success(this.getState()!);
  }

  addDelay(reason: string, workdays: number, source: ConstructionDelay['source'] = 'other'): ServiceResult<ConstructionState, ConstructionDomainError> {
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status !== 'active' && state.value.status !== 'delayed') return failure(new ConstructionDomainError('invalid-state', 'Only active construction can receive a delay.', { status: state.value.status }));
    if (!reason.trim() || !Number.isInteger(workdays) || workdays < 1 || workdays > 365) return failure(new ConstructionDomainError('delay-invalid', 'A delay needs a non-empty reason and between 1 and 365 workdays.'));
    const delay: ConstructionDelay = { id: this.idFactory('delay'), reason: reason.trim(), source, workdays, remainingWorkdays: workdays, createdAt: this.now() };
    this.state = { ...state.value, status: 'delayed', pendingDelayWorkdays: state.value.pendingDelayWorkdays + workdays, delays: [...state.value.delays, delay] };
    return success(this.getState()!);
  }

  pause(): ServiceResult<ConstructionState, ConstructionDomainError> {
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status !== 'active' && state.value.status !== 'delayed') return failure(new ConstructionDomainError('invalid-state', 'Only active or delayed construction can be paused.', { status: state.value.status }));
    this.state = { ...state.value, status: 'paused' };
    return success(this.getState()!);
  }

  resume(): ServiceResult<ConstructionState, ConstructionDomainError> {
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status !== 'paused') return failure(new ConstructionDomainError('invalid-state', 'Only paused construction can resume.', { status: state.value.status }));
    this.state = { ...state.value, status: state.value.pendingDelayWorkdays > 0 ? 'delayed' : 'active' };
    return success(this.getState()!);
  }

  advanceWorkday(date?: string): ServiceResult<WorkdayReport, ConstructionDomainError> {
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status === 'paused') return failure(new ConstructionDomainError('paused', 'Construction is paused; resume it before advancing a workday.'));
    if (state.value.status === 'cancelled') return failure(new ConstructionDomainError('cancelled', 'Cancelled construction cannot advance.'));
    if (state.value.status !== 'active' && state.value.status !== 'delayed') return failure(new ConstructionDomainError('invalid-state', 'Construction is not in a working state.', { status: state.value.status }));
    const nextDate = date ?? addDays(state.value.calendarDate, 1);
    if (!validIsoDate(nextDate) || nextDate <= state.value.calendarDate) return failure(new ConstructionDomainError('invalid-input', 'The next workday must be a valid date after the current calendar date.', { current: state.value.calendarDate, received: nextDate }));
    if (state.value.pendingDelayWorkdays > 0) {
      const remaining = state.value.pendingDelayWorkdays - 1;
      const delays = state.value.delays.map((delay) => delay.remainingWorkdays > 0 && remaining >= 0 ? { ...delay, remainingWorkdays: Math.max(0, delay.remainingWorkdays - 1) } : delay);
      this.state = { ...state.value, status: remaining > 0 ? 'delayed' : 'active', calendarDate: nextDate, elapsedWorkdays: state.value.elapsedWorkdays + 1, pendingDelayWorkdays: remaining, delays };
      return success({ date: nextDate, advanced: false, delayed: true, reason: 'A recorded delay consumed this workday.', completedPhase: null, state: this.getState()!, phases: this.getVisiblePhases() });
    }
    const unavailable = state.value.hiredCrew.filter((worker) => !this.workerScheduled(worker, nextDate));
    if (unavailable.length > 0) {
      const delay: ConstructionDelay = { id: this.idFactory('schedule-delay'), reason: `Crew schedule unavailable: ${unavailable.map((worker) => worker.name).join(', ')}.`, source: 'schedule', workdays: 1, remainingWorkdays: 0, createdAt: this.now() };
      this.state = { ...state.value, status: 'active', calendarDate: nextDate, elapsedWorkdays: state.value.elapsedWorkdays + 1, delays: [...state.value.delays, delay] };
      return success({ date: nextDate, advanced: false, delayed: true, reason: delay.reason, completedPhase: null, state: this.getState()!, phases: this.getVisiblePhases() });
    }
    const phase = CONSTRUCTION_PHASES[state.value.phaseIndex];
    const nextProgress = Math.min(1, state.value.phaseProgress + 1 / phase.durationWorkdays);
    const completedPhase: ConstructionPhaseId | null = nextProgress >= 1 ? phase.id : null;
    const nextIndex = nextProgress >= 1 ? state.value.phaseIndex + 1 : state.value.phaseIndex;
    const complete = nextIndex >= CONSTRUCTION_PHASES.length;
    this.state = { ...state.value, status: complete ? 'inspection-ready' : 'active', calendarDate: nextDate, elapsedWorkdays: state.value.elapsedWorkdays + 1, phaseIndex: complete ? CONSTRUCTION_PHASES.length - 1 : nextIndex, phaseProgress: complete ? 1 : nextProgress, inspection: null };
    return success({ date: nextDate, advanced: true, delayed: false, reason: null, completedPhase, state: this.getState()!, phases: this.getVisiblePhases() });
  }

  inspect(context: ConstructionContext): ServiceResult<InspectionReport, ConstructionDomainError> {
    const site = this.requireSite(context);
    if (!site.ok) return site;
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status === 'cancelled') return failure(new ConstructionDomainError('cancelled', 'Cancelled construction cannot be inspected.'));
    if (state.value.phaseIndex !== CONSTRUCTION_PHASES.length - 1 || state.value.phaseProgress < 1) return failure(new ConstructionDomainError('inspection-required', 'All ten construction phases must be visible as complete before inspection.', { phaseCount: CONSTRUCTION_PHASES.length, phaseIndex: state.value.phaseIndex, phaseProgress: state.value.phaseProgress }));
    const checks: InspectionCheck[] = [
      { id: 'lot', label: 'Validated lot', passed: state.value.lotValidation.valid, detail: state.value.lotValidation.valid ? 'Lot dimensions, access, zoning, and services remain valid.' : 'Lot validation is no longer valid.' },
      { id: 'structure', label: 'Ten-phase structure', passed: true, detail: 'All ten recorded phases reached completion.' },
      { id: 'utilities', label: 'Utilities connected', passed: state.value.lot.utilities.water && state.value.lot.utilities.power && state.value.lot.utilities.sewer, detail: 'Water, power, and sewer connections are present.' },
      { id: 'accessibility', label: 'Accessible route', passed: state.value.lot.roadAccess, detail: 'The lot has a connected public route.' },
      { id: 'crew-records', label: 'Named crew records', passed: state.value.hiredCrew.length > 0 && state.value.hiredCrew.every((worker) => Boolean(worker.name && worker.schedule)), detail: 'Every worker assignment retains a name, role, and weekly schedule.' },
    ];
    const report: InspectionReport = { inspectedAt: this.now(), passed: checks.every((check) => check.passed), checks };
    this.state = { ...state.value, status: report.passed ? 'inspection-ready' : 'active', inspection: report };
    return success(clone(report));
  }

  handover(recipientId: string, context: ConstructionContext): ServiceResult<HandoverRecord, ConstructionDomainError> {
    const site = this.requireSite(context);
    if (!site.ok) return site;
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status === 'completed') return failure(new ConstructionDomainError('handover-complete', 'This construction project has already been handed over.'));
    if (!state.value.inspection?.passed) return failure(new ConstructionDomainError('inspection-failed', 'A passing inspection is required before handover.', { inspection: state.value.inspection }));
    if (!recipientId.trim()) return failure(new ConstructionDomainError('invalid-input', 'A handover recipient identifier is required.'));
    const record: HandoverRecord = { handedOverAt: this.now(), recipientId: recipientId.trim(), lotId: state.value.lot.lotId, templateId: state.value.templateId!, phaseCount: 10 };
    this.state = { ...state.value, status: 'completed', handover: record };
    return success(clone(record));
  }

  cancel(reason: string): ServiceResult<ConstructionState, ConstructionDomainError> {
    const state = this.requireState();
    if (!state.ok) return state;
    if (state.value.status === 'completed') return failure(new ConstructionDomainError('handover-complete', 'A handed-over project cannot be cancelled.'));
    if (!reason.trim()) return failure(new ConstructionDomainError('invalid-input', 'Cancellation requires a reason.'));
    this.state = { ...state.value, status: 'cancelled', cancellationReason: reason.trim() };
    return success(this.getState()!);
  }

  saveSnapshot(): ServiceResult<ConstructionSnapshot, ConstructionDomainError> {
    const state = this.requireState();
    if (!state.ok) return state;
    return success({ schemaVersion: 1, savedAt: this.now(), state: this.getState()! });
  }

  reloadSnapshot(snapshot: ConstructionSnapshot): ServiceResult<ConstructionState, ConstructionDomainError> {
    if (!snapshot || snapshot.schemaVersion !== 1 || !snapshot.state || snapshot.state.schemaVersion !== 1 || !validIsoDate(snapshot.state.calendarDate)) return failure(new ConstructionDomainError('snapshot-invalid', 'The construction snapshot is missing a supported schema or calendar date.'));
    if (snapshot.state.phaseIndex < 0 || snapshot.state.phaseIndex >= CONSTRUCTION_PHASES.length || snapshot.state.phaseProgress < 0 || snapshot.state.phaseProgress > 1) return failure(new ConstructionDomainError('snapshot-invalid', 'The snapshot phase cursor is outside the ten-phase construction range.'));
    if (!snapshot.state.projectId || !snapshot.state.lot?.lotId || !Array.isArray(snapshot.state.hiredCrew) || !Array.isArray(snapshot.state.delays)) return failure(new ConstructionDomainError('snapshot-invalid', 'The construction snapshot is missing required project records.'));
    this.state = clone(snapshot.state);
    return success(this.getState()!);
  }

  serializeSnapshot(snapshot: ConstructionSnapshot): string { return JSON.stringify(snapshot); }

  parseSnapshot(serialized: string): ServiceResult<ConstructionState, ConstructionDomainError> {
    try { return this.reloadSnapshot(JSON.parse(serialized) as ConstructionSnapshot); }
    catch (error) { return failure(new ConstructionDomainError('snapshot-invalid', 'The construction snapshot is not valid JSON.', { cause: error instanceof Error ? error.message : String(error) })); }
  }

  private requireState(): ServiceResult<ConstructionState, ConstructionDomainError> {
    return this.state ? success(this.state) : failure(new ConstructionDomainError('project-missing', 'No construction project is open.'));
  }

  private requireOffice(context: ConstructionContext): ServiceResult<BuilderOfficeContext, ConstructionDomainError> {
    if (context.kind === 'remote-gui' || context.kind === 'map') return failure(new ConstructionDomainError('builder-office-required', 'This construction action must be completed in person at the builder office; remote GUI and map contexts cannot select templates or hire workers.', { receivedContext: context.kind }));
    if (!isBuilderOfficeContext(context) || !this.allowedOfficeIds.has(context.officeId)) return failure(new ConstructionDomainError('builder-office-required', 'A valid builder-office context is required for this action.'));
    if (!validIsoDate(context.observedAt.slice(0, 10)) || !Number.isFinite(contextExpiry(context)) || contextExpiry(context) < Date.parse(context.observedAt)) return failure(new ConstructionDomainError('invalid-input', 'The builder-office context has invalid observation or expiry timestamps.'));
    if (contextExpiry(context) < Date.parse(this.now())) return failure(new ConstructionDomainError('context-expired', 'The builder-office interaction has expired; return to the office to continue.'));
    if (!context.interactionId.trim() || !context.actorId.trim()) return failure(new ConstructionDomainError('invalid-input', 'A builder-office interaction and actor identifier are required.'));
    return success(context);
  }

  private requireSite(context: ConstructionContext): ServiceResult<ConstructionSiteContext, ConstructionDomainError> {
    if (!context || context.kind !== 'construction-site') return failure(new ConstructionDomainError('construction-site-required', 'Inspection and handover require an in-person construction-site context.'));
    if (!validIsoDate(context.observedAt.slice(0, 10)) || !Number.isFinite(contextExpiry(context)) || contextExpiry(context) < Date.parse(this.now())) return failure(new ConstructionDomainError('context-expired', 'The construction-site interaction has expired; return to the lot to continue.'));
    if (!context.interactionId.trim() || !context.actorId.trim() || !context.lotId.trim()) return failure(new ConstructionDomainError('invalid-input', 'A construction-site interaction, actor, and lot identifier are required.'));
    if (this.state && context.lotId !== this.state.lot.lotId) return failure(new ConstructionDomainError('invalid-input', 'The construction-site context does not match this project lot.', { expected: this.state.lot.lotId, received: context.lotId }));
    return success(context);
  }

  private workerScheduled(worker: WorkerAssignment, date: string): boolean {
    if (worker.schedule.unavailableDates?.includes(date)) return false;
    return (worker.schedule.weekly[weekDay(date)] ?? []).length > 0;
  }
}
