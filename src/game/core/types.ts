export type Difficulty = "easy" | "medium" | "hard";
export type QuestStatus = "pending" | "active" | "completed";
export type TabId = "workbench" | "relief" | "quests" | "adventurers" | "intel" | "log" | "save";
export type NotificationType = "info" | "success" | "error";
export type QuestCategory = "daily" | "main";
export type QuestTimingMode = "byDifficulty" | "fixed";
export type QuestPublicationMode = "repeatable" | "uniqueWhileOpen";
export type QuestResolutionVisibility = "stay" | "hide";
export type QuestRisk = "safe" | "risky" | "dangerous";
export type QuestNature = "routine" | "supply" | "investigation" | "mysterious";
export type QuestResultMode = "resource" | "lead" | "discovery";
export type QuestResultOutcome = "success" | "failure";
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
  | "personality"
  | "item";
export type IntelKind = "lead" | "discovery";
export type IntelStatus = "recorded" | "followable" | "triggered";
export type QuestUnlockMode = "all" | "any";
export type AdventurerDiscoveryLevel = "heard" | "seen" | "acquainted" | "familiar" | "trusted";
export type AdventurerStatusFilter = "all" | "idle" | "away";
export type AdventurerPinnedFilter = "all" | "pinned" | "unpinned";
export type StoryEntryTone = "neutral" | "quest" | "reward";
export type AdventurerOriginType = "handcrafted" | "generated";
export type AdventurerRoleType = "anchor" | "adventurer";
export type AdventurerSpawnMode = "unique" | "repeatable";
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
export type EncyclopediaUnlockCondition =
  | {
    type: "firstQuestPublished";
  }
  | {
    type: "firstAdventurerItemGifted";
  };

export type AdventurerPersonality = Record<AdventurerPersonalityAxis, number>;
export type AdventurerCapabilities = Record<AdventurerCapabilityAxis, number>;
export type QuestFeatures = Record<QuestFeatureAxis, number>;

export interface AdventurerAxisRange {
  min: number;
  max: number;
}

export type AdventurerPersonalityRanges = Partial<Record<AdventurerPersonalityAxis, AdventurerAxisRange>>;
export type AdventurerCapabilityRanges = Partial<Record<AdventurerCapabilityAxis, AdventurerAxisRange>>;
export type ResourceCategory = "material" | "food" | "product" | "equipment" | "treasure" | "misc";
export type ItemCategory = "food" | "consumable" | "product" | "misc";
export type EquipmentSlot = "weapon" | "shield" | "helmet" | "armor" | "legArmor" | "boots" | "accessory" | "tool";
export type ItemEffectType = "capability" | "questFeature" | "safety";
export type ItemEffectOperation = "add" | "multiply";
export type ItemEffectDuration = "nextQuest" | "instant" | "passive" | "days";
export type ItemEffectTarget = AdventurerCapabilityAxis | QuestFeatureAxis | "risk";
export type EquipmentStatRoll =
  | {
    mode: "fixed";
    effect: ItemEffectDefinition;
  }
  | {
    mode: "randomRange";
    effect: Omit<ItemEffectDefinition, "value">;
    min: number;
    max: number;
    precision?: 0 | 1 | 2;
  };

export interface ResourceDefinition {
  id: string;
  name: string;
  icon: string;
  category?: ResourceCategory;
  sortOrder?: number;
  basePrice?: number;
  rarity?: "common" | "uncommon" | "rare";
  /** 补货委托货值锚点微调；1 为默认。 */
  stockCargoBias?: number;
}

export interface ItemEffectDefinition {
  type: ItemEffectType;
  target: ItemEffectTarget;
  operation: ItemEffectOperation;
  value: number;
  duration: ItemEffectDuration;
  /** 仅 duration === "days" 时有效：增益持续的游戏内天数 */
  durationDays?: number;
}

export type ItemConsumableModel = "food" | "standard";

export interface ItemDefinition {
  id: string;
  name: string;
  icon: string;
  category: ItemCategory;
  sortOrder: number;
  stackable: true;
  starterStack?: number;
  contentStageTag?: string;
  giftValue: number;
  basePrice?: number;
  /** 非食物消耗品：可随行任务数。食物类不设此项。 */
  shelfLifeQuests?: number;
  uses: number;
  /** food：按天增益；standard：按任务随行与次数（默认） */
  consumableModel?: ItemConsumableModel;
  playerDescription: string;
  feedbackText?: string;
  effects: ItemEffectDefinition[];
}

export interface AdventurerActiveBuff {
  buffId: string;
  itemId: string;
  itemName: string;
  appliedDay: number;
  expiresDay: number;
  effects: ItemEffectDefinition[];
}

export interface EquipmentDefinition {
  id: string;
  name: string;
  shortName?: string;
  icon: string;
  slot: EquipmentSlot;
  sortOrder: number;
  playerDescription: string;
  acquisitionType: "fixed" | "random";
  statRolls: EquipmentStatRoll[];
}

export interface EquipmentInstance {
  instanceId: string;
  definitionId: string;
  slot: EquipmentSlot;
  effects: ItemEffectDefinition[];
  acquiredDay: number;
  equippedByAdventurerId: string | null;
  customName: string | null;
}

export interface PlayerInventory {
  itemStacks: Partial<Record<string, number>>;
  equipments: EquipmentInstance[];
}

export interface AdventurerGiftItem {
  giftId: string;
  itemId: string;
  giftedDay: number;
  remainingShelfLife: number;
  remainingUses: number;
}

export interface AdventurerCarriedItem {
  carryId: string;
  itemId: string;
  amount: number;
  remainingShelfLife: number;
  remainingUses: number;
}

export interface NamePoolDefinition {
  id: string;
  surnames: string[];
  givenNames: string[];
}

export interface CraftingInput {
  kind: "resource" | "item";
  refId: string;
  quantity: number;
}

export type CraftingRecipeTier = "simple" | "mid" | "premium";

export interface CraftingRecipe {
  id: string;
  outputItemId: string;
  outputQuantity: number;
  recipeTier?: CraftingRecipeTier;
  inputs: CraftingInput[];
}

export interface EstablishmentDefinition {
  id: string;
  type: string;
  sellableItemCategories: ItemCategory[];
  marketSellableResourceCategories: ResourceCategory[];
  marketSellableItemCategories: ItemCategory[];
  baseFootTrafficIncome: number;
  adventurerDailyLivingCost: number;
}

export interface MarketListing {
  id: string;
  kind: "resource" | "item";
  refId: string;
  buyable: boolean;
  sellable: boolean;
}

export interface QuestTemplate {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  textId?: string;
  focusText?: string;
  lineId?: string;
  lineTitle?: string;
  designerNote?: string;
  unlockMode?: QuestUnlockMode;
  unlockConditions?: QuestUnlockCondition[];
  resultIntelId?: string;
  resultIntelPoolIds?: string[];
  failureIntelId?: string;
  successVisibility?: QuestResolutionVisibility;
  failureVisibility?: QuestResolutionVisibility;
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
  successChanceModifier?: number;
  minSuccessChance?: number;
  preferredArchetypeTags?: string[];
  allowGeneratedTaker?: boolean;
  generatedTakerWeight?: number;
  exclusiveTakerTemplateId?: string;
  contentStageTag?: string;
  resultItems?: {
    itemId: string;
    quantity: number;
  }[];
  /** 补货委托货值锚点微调；1 为默认。 */
  stockCargoBias?: number;
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

export type TrailRationTier = "low" | "mid" | "high";

export interface QuestProvisionRations {
  itemId: string;
  quantity: number;
  tier: TrailRationTier;
}

export interface MarketPricingConfig {
  buyMultiplier: number;
  sellMultiplier: number;
  surplusHintThreshold: number;
}

export interface StockQuestCargoCurve {
  /** 1 天锚点时的合理载货货值（钱）。 */
  referenceCargoValue: number;
  /** 曲线甜蜜点货值（钱）。 */
  sweetSpotCargoValue: number;
  /** 相对市场持平的货值（钱）。 */
  breakEvenCargoValue: number;
  /** 超大批量惩罚参考货值（钱）。 */
  highCargoReference: number;
  /** 锚点有效单价 / 市场买入价，略小于 1 表示略赚。 */
  anchorUnitCostRatio: number;
  /** 甜蜜点有效单价比例（相对买入价，曲线最低点）。 */
  minUnitCostRatio: number;
  /** 极小批量时的有效单价比例上限（固定劳务摊薄不足）。 */
  lowQuantityMaxRatio: number;
  /** 超大批量时的有效单价比例上限（运输/损耗惩罚）。 */
  highQuantityMaxRatio: number;
  /** 超出锚点后，天数随超额数量的指数；>1 表示大批更慢。 */
  daysGamma: number;
  difficultyMod: Partial<Record<Difficulty, number>>;
  riskMod: Partial<Record<QuestRisk, number>>;
}

export interface QuestEconomyConfig {
  trailCostMarginFlat: number;
  trailCostMarginRatio: number;
  netMarginPenaltyCap: number;
  netMarginPenaltyPerCoin: number;
  provisionBrokeMultiplier: number;
  unavailableMarketCostPenalty: number;
  maxDaysPerStockQuest: number;
  stockQuestLaborOnly: boolean;
  stockQuestCargoCurve: StockQuestCargoCurve;
}

export interface PlayerStarterConfig {
  itemStacks: Record<string, number>;
}

export interface AdventurerStarterCarriedItem {
  itemId: string;
  amount: number;
}

export interface AdventurerStarterProfile {
  carriedMoney?: number;
  carriedItems?: AdventurerStarterCarriedItem[];
}

export interface AdventurerStarterConfig {
  defaults: Required<Pick<AdventurerStarterProfile, "carriedMoney" | "carriedItems">>;
  byRole: Partial<Record<AdventurerRoleType, AdventurerStarterProfile>>;
}

export interface DailyNeedsConfig {
  categories: {
    food: {
      dailyNutritionMilli: number;
      deficitAcceptanceBoostPerDay: number;
      deficitNoQuestExtraBoost: number;
      noQuestStreakThresholdDays: number;
    };
  };
  ingredientNutritionMilli: Record<string, number>;
  nutritionByRef: Record<string, number>;
  trailRations: Record<TrailRationTier, string>;
  riskToRationTier: Record<QuestRisk, TrailRationTier>;
  provisionAcceptanceBoost: {
    perNutritionPoint: number;
    tierMultiplier: Record<TrailRationTier, number>;
    cap: number;
  };
  stockpileTuning: {
    maxExtraUnitsPerDay: number;
    baseChance: number;
    cautionWeight: number;
    greedWeight: number;
    moneyComfortThreshold: number;
  };
  rawIngredientScoringPenalty: number;
}

export interface Quest {
  id: number;
  category: QuestCategory;
  templateId: string;
  title: string;
  description: string;
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
  provisionRations: QuestProvisionRations | null;
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
    usedGiftItems: QuestResultUsedItem[];
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
    usedGiftItems?: QuestResultUsedItem[];
  };
}

export interface QuestResultUsedItem {
  giftId: string;
  itemId: string;
  itemName: string;
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
  textId?: string;
  lineId?: string;
  lineTitle?: string;
  designerNote?: string;
}

export interface AdventurerTemplate {
  id: string;
  name: string;
  title: string;
  motive: string;
  textId?: string;
  roleType?: AdventurerRoleType;
  spawnMode?: AdventurerSpawnMode;
  namePoolId?: string;
  archetypeTags?: string[];
  introductionTags?: string[];
  designerNote?: string;
  contentStageTag?: string;
  startsInRoster?: boolean;
  startingMoney?: number;
  startingCarriedItems?: AdventurerCarriedItem[];
  startingEquipmentDefinitionIds?: string[];
  knownByDefault: boolean;
  discoveryLevel: AdventurerDiscoveryLevel;
  preferences: string[];
  personality: AdventurerPersonality;
  personalityRanges?: AdventurerPersonalityRanges;
  capabilities: AdventurerCapabilities;
  capabilityRanges?: AdventurerCapabilityRanges;
  impression: string;
  rumor: string;
}

export interface AdventurerInstance extends AdventurerTemplate {
  instanceId: string;
  templateId: string | null;
  originType: AdventurerOriginType;
  roleType: AdventurerRoleType;
  knownLevel: AdventurerDiscoveryLevel;
  acquaintancePoints: number;
  lastSeenDay: number | null;
  currentQuestId: number | null;
  giftedItems: AdventurerGiftItem[];
  carriedItems: AdventurerCarriedItem[];
  carriedMoney: number;
  activeBuffs: AdventurerActiveBuff[];
  foodDeficitStreak: number;
  daysWithoutQuestWhileDeficit: number;
  dailyFoodTalkNote: string | null;
}

export type Adventurer = AdventurerInstance;

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
    hasGiftedAdventurerItem: boolean;
    shopPrices: Record<string, number>;
    bailoutAccepted: boolean;
    bailoutOfferAmount: number;
    bailoutUnlocked: boolean;
    bailoutPeakMoneySinceDecline: number;
    bailoutDaysBelowThreshold: number;
    pendingBailoutOffer: number | null;
    quests: Quest[];
    stock: Record<string, number>;
    inventory: PlayerInventory;
    leads: IntelRecord[];
    discoveries: IntelRecord[];
  };
  questIdCounter: number;
  adventurerIdCounter: number;
  dailyShopIncome: number;
  establishment: EstablishmentDefinition;
  marketId: string;
  marketListings: MarketListing[];
  marketStock: Record<string, number>;
  marketPricing: MarketPricingConfig;
  questEconomyConfig: QuestEconomyConfig;
  craftingRecipes: CraftingRecipe[];
  resources: ResourceDefinition[];
  itemDefinitions: ItemDefinition[];
  equipmentDefinitions: EquipmentDefinition[];
  namePools: NamePoolDefinition[];
  questTemplates: QuestTemplate[];
  intelDefinitions: IntelDefinition[];
  adventurerTemplates: AdventurerTemplate[];
  adventurers: AdventurerInstance[];
  dailyNeedsConfig: DailyNeedsConfig;
  dayLog: StoryEntry[];
}

export interface SavedQuest {
  id: number;
  category: QuestCategory;
  templateId: string;
  title: string;
  description: string;
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
  provisionRations?: QuestProvisionRations | null;
  result: SavedQuestResult | null;
}

export type SavedAdventurer = AdventurerInstance;

export interface SavedAdventurerStateV1 {
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
    adventurers: SavedAdventurerStateV1[];
    dayLog: StoryEntry[];
  };
}

export interface SaveDataV2 {
  version: 2;
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
    adventurers: SavedAdventurerV2[];
    dayLog: StoryEntry[];
  };
}

export interface SavedAdventurerV2 extends Omit<AdventurerInstance, "instanceId"> {}

export interface SaveDataV3 {
  version: 3;
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
    adventurers: SavedAdventurerV3[];
    dayLog: StoryEntry[];
  };
}

export interface SavedAdventurerV3 extends Omit<AdventurerInstance, "roleType"> {}

export interface SaveDataV4 {
  version: 4;
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
    adventurers: SavedAdventurer[];
    dayLog: StoryEntry[];
  };
}

export interface SaveDataV5 {
  version: 5;
  game: {
    day: number;
    questIdCounter: number;
    adventurerIdCounter: number;
    pinnedAdventurerIds: string[];
    player: {
      money: number;
      resultInsightLevel: ResultInsightLevel;
      quests: SavedQuest[];
      stock: Partial<Record<string, number>>;
      leads: IntelRecord[];
      discoveries: IntelRecord[];
    };
    adventurers: SavedAdventurer[];
    dayLog: StoryEntry[];
  };
}

export interface SaveDataV6 {
  version: 6;
  game: {
    day: number;
    questIdCounter: number;
    adventurerIdCounter: number;
    pinnedAdventurerIds: string[];
    player: {
      money: number;
      resultInsightLevel: ResultInsightLevel;
      quests: SavedQuest[];
      stock: Partial<Record<string, number>>;
      inventory: PlayerInventory;
      leads: IntelRecord[];
      discoveries: IntelRecord[];
    };
    adventurers: SavedAdventurer[];
    dayLog: StoryEntry[];
  };
}

export interface SaveDataV7 {
  version: 7;
  game: {
    day: number;
    questIdCounter: number;
    adventurerIdCounter: number;
    pinnedAdventurerIds: string[];
    player: {
      money: number;
      resultInsightLevel: ResultInsightLevel;
      hasGiftedAdventurerItem?: boolean;
      quests: SavedQuest[];
      stock: Partial<Record<string, number>>;
      inventory: PlayerInventory;
      leads: IntelRecord[];
      discoveries: IntelRecord[];
    };
    adventurers: SavedAdventurer[];
    dayLog: StoryEntry[];
  };
}

export interface SaveDataV8 {
  version: 8;
  game: {
    day: number;
    questIdCounter: number;
    adventurerIdCounter: number;
    pinnedAdventurerIds: string[];
    player: {
      money: number;
      resultInsightLevel: ResultInsightLevel;
      hasGiftedAdventurerItem?: boolean;
      shopPrices?: Record<string, number>;
      quests: SavedQuest[];
      stock: Partial<Record<string, number>>;
      inventory: PlayerInventory;
      leads: IntelRecord[];
      discoveries: IntelRecord[];
    };
    adventurers: SavedAdventurer[];
    dayLog: StoryEntry[];
  };
}

export interface SaveDataV9 {
  version: 9;
  game: {
    day: number;
    questIdCounter: number;
    adventurerIdCounter: number;
    pinnedAdventurerIds: string[];
    player: {
      money: number;
      resultInsightLevel: ResultInsightLevel;
      hasGiftedAdventurerItem?: boolean;
      shopPrices?: Record<string, number>;
      bailoutAccepted?: boolean;
      bailoutOfferAmount?: number;
      bailoutUnlocked?: boolean;
      bailoutPeakMoneySinceDecline?: number;
      bailoutDaysBelowThreshold?: number;
      pendingBailoutOffer?: number | null;
      quests: SavedQuest[];
      stock: Partial<Record<string, number>>;
      inventory: PlayerInventory;
      leads: IntelRecord[];
      discoveries: IntelRecord[];
    };
    adventurers: SavedAdventurer[];
    dayLog: StoryEntry[];
  };
}

export interface SaveDataV10 {
  version: 10;
  game: {
    day: number;
    questIdCounter: number;
    adventurerIdCounter: number;
    pinnedAdventurerIds: string[];
    player: {
      money: number;
      resultInsightLevel: ResultInsightLevel;
      hasGiftedAdventurerItem?: boolean;
      shopPrices?: Record<string, number>;
      bailoutAccepted?: boolean;
      bailoutOfferAmount?: number;
      bailoutUnlocked?: boolean;
      bailoutPeakMoneySinceDecline?: number;
      bailoutDaysBelowThreshold?: number;
      pendingBailoutOffer?: number | null;
      quests: SavedQuest[];
      stock: Partial<Record<string, number>>;
      inventory: PlayerInventory;
      leads: IntelRecord[];
      discoveries: IntelRecord[];
    };
    adventurers: SavedAdventurer[];
    dayLog: StoryEntry[];
  };
}

export interface SaveDataV11 {
  version: 11;
  game: {
    day: number;
    questIdCounter: number;
    adventurerIdCounter: number;
    pinnedAdventurerIds: string[];
    marketId?: string;
    marketStock?: Record<string, number>;
    player: {
      money: number;
      resultInsightLevel: ResultInsightLevel;
      hasGiftedAdventurerItem?: boolean;
      shopPrices?: Record<string, number>;
      bailoutAccepted?: boolean;
      bailoutOfferAmount?: number;
      bailoutUnlocked?: boolean;
      bailoutPeakMoneySinceDecline?: number;
      bailoutDaysBelowThreshold?: number;
      pendingBailoutOffer?: number | null;
      quests: SavedQuest[];
      stock: Partial<Record<string, number>>;
      inventory: PlayerInventory;
      leads: IntelRecord[];
      discoveries: IntelRecord[];
    };
    adventurers: SavedAdventurer[];
    dayLog: StoryEntry[];
  };
}

export interface Elements {
  container: HTMLDivElement | null;
  dayDisplay: HTMLSpanElement | null;
  moneyDisplay: HTMLSpanElement | null;
  activeQuestDisplay: HTMLSpanElement | null;
  knownAdventurerDisplay: HTMLSpanElement | null;
  encyclopediaButton: HTMLButtonElement | null;
  encyclopediaModal: HTMLDivElement | null;
  encyclopediaCloseBtn: HTMLButtonElement | null;
  encyclopediaNavigation: HTMLElement | null;
  encyclopediaContent: HTMLElement | null;
  giftModal: HTMLDivElement | null;
  giftContent: HTMLElement | null;
  giftCloseBtn: HTMLButtonElement | null;
  giftConfirmBtn: HTMLButtonElement | null;
  bailoutModal: HTMLDivElement | null;
  bailoutTitle: HTMLHeadingElement | null;
  bailoutContent: HTMLElement | null;
  bailoutAcceptBtn: HTMLButtonElement | null;
  bailoutDeclineBtn: HTMLButtonElement | null;
  loadoutModal: HTMLDivElement | null;
  loadoutContent: HTMLElement | null;
  loadoutCloseBtn: HTMLButtonElement | null;
  adventurerDetailModal: HTMLDivElement | null;
  adventurerDetailContent: HTMLElement | null;
  adventurerDetailCloseBtn: HTMLButtonElement | null;
  exportSaveBtn: HTMLButtonElement | null;
  importSaveBtn: HTMLButtonElement | null;
  resetSaveBtn: HTMLButtonElement | null;
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
  provisionRationsCheckbox: HTMLInputElement | null;
  rationHint: HTMLParagraphElement | null;
  nextDayBtn: HTMLButtonElement | null;
  tabButtons: HTMLButtonElement[];
  storyRailList: HTMLDivElement | null;
  questList: HTMLDivElement | null;
  adventurerList: HTMLDivElement | null;
  intelList: HTMLDivElement | null;
  stockList: HTMLDivElement | null;
  marketList: HTMLDivElement | null;
  logList: HTMLDivElement | null;
}

export interface CreateQuestInput {
  templateId: string;
  reward: number;
  quantity: number;
  provideRations?: boolean;
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
