export type Difficulty = "easy" | "medium" | "hard";
export type QuestStatus = "pending" | "active" | "completed";
export type TabId = "overview" | "quests" | "adventurers" | "intel" | "stock" | "log";
export type NotificationType = "info" | "success" | "error";
export type QuestCategory = "daily" | "main";
export type QuestTimingMode = "byDifficulty" | "fixed";
export type QuestPublicationMode = "repeatable" | "uniqueWhileOpen";
export type QuestResolutionVisibility = "stay" | "hide";
export type QuestRisk = "safe" | "risky" | "dangerous";
export type QuestNature = "routine" | "supply" | "investigation" | "mysterious";
export type QuestResultMode = "resource" | "lead" | "discovery";
export type QuestResultOutcome = "success" | "failure";
export type QuestTestOutcomeMode = "normal" | "success" | "failure";
export type QuestPublishMode = "stock" | "intel";
export type ResultInsightLevel = "basic" | "aware" | "trained" | "expert";
export type QuestResultReasonTag =
  | "resource"
  | "lead"
  | "discovery"
  | "failure"
  | "danger"
  | "challenge"
  | "durationPressure"
  | "uncertainty"
  | "investigationComplexity"
  | "reportDifficulty"
  | "stability"
  | "intel"
  | "capability"
  | "personality";
export type IntelKind = "lead" | "discovery";
export type IntelStatus = "recorded" | "followable" | "triggered";
export type QuestUnlockMode = "all" | "any";
export type ContentStageTag = "test";
export type FollowUpStageTag = "test-chain";
export type AdventurerDiscoveryLevel = "heard" | "seen" | "acquainted" | "familiar" | "trusted";
export type AdventurerStatusFilter = "all" | "idle" | "away";
export type AdventurerPinnedFilter = "all" | "pinned" | "unpinned";
export type StoryEntryTone = "neutral" | "quest" | "reward";
export type AdventurerPersonalityAxis =
  | "diligence"
  | "courage"
  | "greed"
  | "sociability"
  | "caution"
  | "curiosity"
  | "discipline"
  | "resilience";
export type AdventurerCapabilityAxis = "physique" | "survival" | "exploration" | "observation" | "combat";
export type QuestFeatureAxis =
  | "danger"
  | "challenge"
  | "durationPressure"
  | "uncertainty"
  | "investigationComplexity"
  | "reportDifficulty"
  | "stability";

export type AdventurerPersonality = Record<AdventurerPersonalityAxis, number>;
export type AdventurerCapabilities = Record<AdventurerCapabilityAxis, number>;
export type QuestFeatures = Record<QuestFeatureAxis, number>;

export interface ResourceDefinition {
  id: string;
  name: string;
  icon: string;
}

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  focusText?: string;
  lineId?: string;
  lineTitle?: string;
  entryPoint?: boolean;
  contentStageTag?: ContentStageTag;
  designerNote?: string;
  forcedAdventurerId?: string;
  disabledForCurrentTesting?: boolean;
  unlockedByDefault?: boolean;
  unlockMode?: QuestUnlockMode;
  unlockConditions?: QuestUnlockCondition[];
  followUpStageTag?: FollowUpStageTag;
  testOutcomeMode?: QuestTestOutcomeMode;
  resultIntelId?: string;
  resultIntelPoolIds?: string[];
  failureIntelId?: string;
  resolutionVisibility?: QuestResolutionVisibility;
  prerequisiteTemplateId?: string;
  prerequisiteOutcome?: QuestResultOutcome;
  failureIntelSummary?: string;
  resultMode: QuestResultMode;
  publicationMode: QuestPublicationMode;
  publishMode?: QuestPublishMode;
  features?: Partial<QuestFeatures>;
  risk: QuestRisk;
  nature: QuestNature;
  resource?: string;
  minReward: number;
  maxReward: number;
  difficulty: Difficulty;
  timingMode: QuestTimingMode;
  fixedDurationDays?: number;
}

export type QuestUnlockCondition =
  | {
    type: "default";
  }
  | {
    type: "questResult";
    templateId: string;
    outcome?: QuestResultOutcome;
  }
  | {
    type: "intelReceived";
    kind?: IntelKind;
    intelId?: string;
    sourceTemplateId?: string;
  };

export interface Quest {
  id: number;
  category: QuestCategory;
  templateId: string;
  title: string;
  description: string;
  contentStageTag?: ContentStageTag;
  designerNote?: string;
  followUpStageTag?: FollowUpStageTag;
  risk: QuestRisk;
  nature: QuestNature;
  displayId: string;
  resource: string | null;
  focusText: string | null;
  reward: number;
  quantity: number;
  status: QuestStatus;
  createdDay: number;
  acceptedDay: number | null;
  completedDay: number | null;
  totalDays: number;
  daysRemaining: number;
  adventurerId: string | null;
  adventurerName: string | null;
  result: QuestResult | null;
}

export interface QuestResult {
  type: QuestResultMode;
  outcome: QuestResultOutcome;
  // 兼容当前展示层保留的摘要字段。长期应优先从结果事实重建，而不是把它视为唯一真相。
  summary: string;
  details: {
    resourceId: string | null;
    quantity: number | null;
    intelKind: IntelKind | null;
    intelId: string | null;
    matchingIntelCount: number | null;
    successChance: number | null;
    rolledChance: number | null;
    visibleReasonTags: QuestResultReasonTag[];
    reasonTags: QuestResultReasonTag[];
    display: {
      intelTitleOverride: string | null;
      intelSummaryOverride: string | null;
    };
  };
}

export interface SavedQuestResult {
  type: QuestResultMode;
  outcome: QuestResultOutcome;
  details: {
    resourceId: string | null;
    quantity: number | null;
    intelKind: IntelKind | null;
    intelId: string | null;
    matchingIntelCount: number | null;
    successChance: number | null;
    rolledChance: number | null;
    reasonTags: QuestResultReasonTag[];
  };
}

export interface IntelRecord {
  id: string;
  kind: IntelKind;
  title: string;
  day: number;
  summary: string;
  lineId: string | null;
  lineTitle: string | null;
  sourceQuestDisplayId: string;
  sourceQuestTitle: string;
  sourceTemplateId: string;
  sourceOutcome: QuestResultOutcome;
}

export interface IntelDefinition {
  id: string;
  kind: IntelKind;
  title: string;
  content: string;
  lineId?: string;
  lineTitle?: string;
  contentStageTag?: ContentStageTag;
  designerNote?: string;
}

export interface Adventurer {
  id: string;
  name: string;
  title: string;
  motive: string;
  contentStageTag?: ContentStageTag;
  designerNote?: string;
  knownByDefault: boolean;
  discoveryLevel: AdventurerDiscoveryLevel;
  preferences: string[];
  personality: AdventurerPersonality;
  capabilities: AdventurerCapabilities;
  impression: string;
  rumor: string;
  knownLevel: AdventurerDiscoveryLevel;
  acquaintancePoints: number;
  lastSeenDay: number | null;
  currentQuestId: number | null;
}

export interface GameData {
  day: number;
  activeTab: TabId;
  questFilters: {
    status: "all" | QuestStatus;
    nature: "all" | QuestNature;
  };
  adventurerFilters: {
    level: "all" | AdventurerDiscoveryLevel;
    status: AdventurerStatusFilter;
    pinned: AdventurerPinnedFilter;
  };
  pinnedAdventurerIds: string[];
  player: {
    money: number;
    resultInsightLevel: ResultInsightLevel;
    quests: Quest[];
    stock: Record<string, number>;
    leads: IntelRecord[];
    discoveries: IntelRecord[];
  };
  questIdCounter: number;
  dailyShopIncome: number;
  resources: ResourceDefinition[];
  questTemplates: QuestTemplate[];
  intelDefinitions: IntelDefinition[];
  adventurers: Adventurer[];
  dayLog: StoryEntry[];
}

export interface SavedQuest {
  id: number;
  category: QuestCategory;
  templateId: string;
  title: string;
  description: string;
  contentStageTag?: ContentStageTag;
  designerNote?: string;
  followUpStageTag?: FollowUpStageTag;
  risk: QuestRisk;
  nature: QuestNature;
  displayId: string;
  resource: string | null;
  focusText: string | null;
  reward: number;
  quantity: number;
  status: QuestStatus;
  createdDay: number;
  acceptedDay: number | null;
  completedDay: number | null;
  totalDays: number;
  daysRemaining: number;
  adventurerId: string | null;
  adventurerName: string | null;
  result: SavedQuestResult | null;
}

export interface SavedAdventurerState {
  id: string;
  acquaintancePoints: number;
  lastSeenDay: number | null;
  currentQuestId: number | null;
}

export interface SaveDataV1 {
  version: 1;
  game: {
    day: number;
    questIdCounter: number;
    pinnedAdventurerIds: string[];
    player: {
      money: number;
      resultInsightLevel: ResultInsightLevel;
      quests: SavedQuest[];
      stock: Partial<Record<string, number>>;
      leads: IntelRecord[];
      discoveries: IntelRecord[];
    };
    adventurers: SavedAdventurerState[];
    dayLog: StoryEntry[];
  };
}

export interface Elements {
  container: HTMLDivElement | null;
  dayDisplay: HTMLSpanElement | null;
  moneyDisplay: HTMLSpanElement | null;
  activeQuestDisplay: HTMLSpanElement | null;
  stockSummaryDisplay: HTMLSpanElement | null;
  knownAdventurerDisplay: HTMLSpanElement | null;
  exportSaveBtn: HTMLButtonElement | null;
  importSaveBtn: HTMLButtonElement | null;
  importSaveInput: HTMLInputElement | null;
  templateSelect: HTMLSelectElement | null;
  questStatusFilterSelect: HTMLSelectElement | null;
  questNatureFilterSelect: HTMLSelectElement | null;
  adventurerLevelFilterSelect: HTMLSelectElement | null;
  adventurerStatusFilterSelect: HTMLSelectElement | null;
  adventurerPinnedFilterSelect: HTMLSelectElement | null;
  rewardInput: HTMLInputElement | null;
  quantityInput: HTMLInputElement | null;
  templateDescription: HTMLParagraphElement | null;
  durationHint: HTMLParagraphElement | null;
  createQuestBtn: HTMLButtonElement | null;
  nextDayBtn: HTMLButtonElement | null;
  tabButtons: HTMLButtonElement[];
  overviewQuestList: HTMLDivElement | null;
  storyRailList: HTMLDivElement | null;
  questList: HTMLDivElement | null;
  adventurerList: HTMLDivElement | null;
  intelList: HTMLDivElement | null;
  stockList: HTMLDivElement | null;
  logList: HTMLDivElement | null;
}

export interface CreateQuestInput {
  templateId: string;
  reward: number;
  quantity: number;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  type: NotificationType;
}

export interface StoryEntry {
  day: number;
  text: string;
  tone: StoryEntryTone;
  badge: string | null;
}
