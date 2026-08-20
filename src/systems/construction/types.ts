export type ConstructionStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'delayed'
  | 'inspection-ready'
  | 'completed'
  | 'cancelled';

export type ConstructionPhaseId =
  | 'survey-fencing'
  | 'foundation'
  | 'frame'
  | 'roof-enclosure'
  | 'windows-doors'
  | 'utility-rough-in'
  | 'insulation'
  | 'interior-finish'
  | 'exterior-finish'
  | 'inspection-handover';

export type WorkerRole = 'foreperson' | 'carpenter' | 'electrician' | 'plumber' | 'finisher';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleWindow {
  readonly start: string;
  readonly end: string;
}

export type WeeklySchedule = Readonly<Record<Weekday, readonly ScheduleWindow[]>>;

export interface WorkerSchedule {
  readonly timezone: string;
  readonly weekly: WeeklySchedule;
  readonly unavailableDates?: readonly string[];
}

export interface ConstructionWorker {
  readonly id: string;
  readonly name: string;
  readonly role: WorkerRole;
  readonly schedule: WorkerSchedule;
}

export interface WorkerAssignment {
  readonly workerId: string;
  readonly name: string;
  readonly role: WorkerRole;
  readonly schedule: WorkerSchedule;
}

export type ConstructionContext =
  | BuilderOfficeContext
  | ConstructionSiteContext
  | RemoteGuiContext
  | MapContext;

export interface BuilderOfficeContext {
  readonly kind: 'builder-office';
  readonly officeId: string;
  readonly interactionId: string;
  readonly actorId: string;
  readonly observedAt: string;
  readonly expiresAt: string;
}

export interface ConstructionSiteContext {
  readonly kind: 'construction-site';
  readonly lotId: string;
  readonly interactionId: string;
  readonly actorId: string;
  readonly observedAt: string;
  readonly expiresAt: string;
}

export interface RemoteGuiContext {
  readonly kind: 'remote-gui';
  readonly actorId?: string;
  readonly requestedAt?: string;
}

export interface MapContext {
  readonly kind: 'map';
  readonly actorId?: string;
}

export interface LotInput {
  readonly lotId: string;
  readonly x: number;
  readonly y: number;
  readonly widthMeters: number;
  readonly depthMeters: number;
  readonly areaSqm: number;
  readonly slopePercent: number;
  readonly zoning: 'residential' | 'mixed-use' | 'commercial' | 'protected';
  readonly roadAccess: boolean;
  readonly utilities: Readonly<{
    readonly water: boolean;
    readonly power: boolean;
    readonly sewer: boolean;
  }>;
  readonly occupied: boolean;
  readonly easementConflict?: boolean;
}

export interface LotValidationIssue {
  readonly code:
    | 'missing-lot-id'
    | 'invalid-coordinates'
    | 'invalid-dimensions'
    | 'area-too-small'
    | 'area-too-large'
    | 'slope-too-steep'
    | 'zoning-not-allowed'
    | 'no-road-access'
    | 'missing-utility'
    | 'occupied'
    | 'easement-conflict';
  readonly message: string;
}

export interface LotValidationResult {
  readonly valid: boolean;
  readonly lot: LotInput;
  readonly issues: readonly LotValidationIssue[];
}

export interface ConstructionTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly allowedZoning: readonly ('residential' | 'mixed-use')[];
  readonly minLotAreaSqm: number;
  readonly footprintWidthMeters: number;
  readonly footprintDepthMeters: number;
  readonly requiredUtilities: readonly ('water' | 'power' | 'sewer')[];
  readonly crewSize: number;
  readonly quoteCents: number;
}

export interface ConstructionPhaseDefinition {
  readonly index: number;
  readonly id: ConstructionPhaseId;
  readonly name: string;
  readonly durationWorkdays: number;
}

export type ConstructionPhaseState = 'pending' | 'active' | 'complete';

export interface VisibleConstructionPhase extends ConstructionPhaseDefinition {
  readonly state: ConstructionPhaseState;
  readonly progress: number;
}

export interface ConstructionDelay {
  readonly id: string;
  readonly reason: string;
  readonly source: 'weather' | 'schedule' | 'inspection' | 'user' | 'other';
  readonly workdays: number;
  readonly remainingWorkdays: number;
  readonly createdAt: string;
}

export interface InspectionCheck {
  readonly id: 'lot' | 'structure' | 'utilities' | 'accessibility' | 'crew-records';
  readonly label: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface InspectionReport {
  readonly inspectedAt: string;
  readonly passed: boolean;
  readonly checks: readonly InspectionCheck[];
}

export interface HandoverRecord {
  readonly handedOverAt: string;
  readonly recipientId: string;
  readonly lotId: string;
  readonly templateId: string;
  readonly phaseCount: 10;
}

export interface ConstructionState {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly status: ConstructionStatus;
  readonly lot: LotInput;
  readonly lotValidation: LotValidationResult;
  readonly templateId: string | null;
  readonly hiredCrew: readonly WorkerAssignment[];
  readonly phaseIndex: number;
  readonly phaseProgress: number;
  readonly elapsedWorkdays: number;
  readonly calendarDate: string;
  readonly pendingDelayWorkdays: number;
  readonly delays: readonly ConstructionDelay[];
  readonly inspection: InspectionReport | null;
  readonly handover: HandoverRecord | null;
  readonly cancellationReason: string | null;
}

export interface ConstructionSnapshot {
  readonly schemaVersion: 1;
  readonly savedAt: string;
  readonly state: ConstructionState;
}

export interface WorkdayReport {
  readonly date: string;
  readonly advanced: boolean;
  readonly delayed: boolean;
  readonly reason: string | null;
  readonly completedPhase: ConstructionPhaseId | null;
  readonly state: ConstructionState;
  readonly phases: readonly VisibleConstructionPhase[];
}

export interface ConstructionServiceOptions {
  readonly templates?: readonly ConstructionTemplate[];
  readonly workers?: readonly ConstructionWorker[];
  readonly allowedOfficeIds?: readonly string[];
  readonly now?: () => string;
  readonly idFactory?: (prefix: string) => string;
}

export interface Result<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E> {
  readonly ok: false;
  readonly error: E;
}

export type ServiceResult<T, E> = Result<T> | Failure<E>;

