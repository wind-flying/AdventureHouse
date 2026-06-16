import type {AdventurerCapabilityAxis, ItemEffectDefinition, QuestFeatureAxis} from "../core/types";

type EffectTier = "light" | "medium" | "strong";

const CAPABILITY_FLAVOR: Record<
  AdventurerCapabilityAxis,
  {light: string; medium: string; strong: string}
> = {
  physique: {
    light: "用起来比看起来更称手，像是多了一点实打实的力气。",
    medium: "真正发力时，会比预想中更稳、更顶得住。",
    strong: "一旦需要硬扛或硬顶，它几乎不会先掉链子。"
  },
  survival: {
    light: "在野外多撑一会儿，似乎不算太难。",
    medium: "遇到风餐露宿或磕碰擦伤时，能明显少受点罪。",
    strong: "就算环境开始刁钻，人也还能把局面稳住。"
  },
  exploration: {
    light: "认路、找路时，会比裸奔多几分把握。",
    medium: "复杂地形里不容易走岔，也更敢往深处探。",
    strong: "哪怕路标模糊，也像是多了一双不会迷路的脚。"
  },
  observation: {
    light: "细枝末节里，偶尔能多看出一两处不对劲。",
    medium: "线索堆在一起时不至于眼花，细节更容易被串起来。",
    strong: "许多被忽略的痕迹，落到眼里时会格外清楚。"
  },
  combat: {
    light: "真动手时，会比空着手多一分底气。",
    medium: "近身交锋里，反应和出手都更跟得上节奏。",
    strong: "一旦冲突升级，它像是会主动站到前面去。"
  }
};

const QUEST_FEATURE_FLAVOR: Partial<
  Record<QuestFeatureAxis, {light: string; medium: string; strong: string}>
> = {
  danger: {
    light: "面对危险时，心里会稍微踏实一点。",
    medium: "真遇到险情，不至于第一时间乱了阵脚。",
    strong: "就算场面突然变坏，也还留得出应对的余地。"
  },
  challenge: {
    light: "对付麻烦事时，不至于一上手就露怯。",
    medium: "硬任务里多了一点把局面撑住的把握。",
    strong: "越是刁钻的目标，越像是专门留着它来扛。"
  },
  stability: {
    light: "整体节奏更稳，不太容易出岔子。",
    medium: "过程里少些意外波动，结果更可控。",
    strong: "就算周围开始失控，它也能把节奏拽回来。"
  }
};

export function getEquipmentEffectFlavorLines(effects: ItemEffectDefinition[]): string[] {
  return effects
    .map((effect) => getEquipmentEffectFlavorLine(effect))
    .filter((line): line is string => Boolean(line));
}

function getEquipmentEffectFlavorLine(effect: ItemEffectDefinition): string | null {
  const magnitude = Math.abs(effect.value);
  const tier = getEffectTier(magnitude);
  const positive = effect.value >= 0;

  if (effect.type === "capability" && isCapabilityTarget(effect.target)) {
    const pool = CAPABILITY_FLAVOR[effect.target];
    return positive ? pool[tier] : `在${getCapabilityLabel(effect.target)}方面，似乎反而有些拖后腿。`;
  }

  if (effect.type === "questFeature" && isQuestFeatureTarget(effect.target)) {
    const pool = QUEST_FEATURE_FLAVOR[effect.target];
    if (!pool) {
      return null;
    }

    return positive ? pool[tier] : "某些局面下，它反而会让事情变得更难收拾。";
  }

  return null;
}

function getEffectTier(magnitude: number): EffectTier {
  if (magnitude >= 5) {
    return "strong";
  }

  if (magnitude >= 3) {
    return "medium";
  }

  return "light";
}

function isCapabilityTarget(target: string): target is AdventurerCapabilityAxis {
  return target === "physique"
    || target === "survival"
    || target === "exploration"
    || target === "observation"
    || target === "combat";
}

function isQuestFeatureTarget(target: string): target is QuestFeatureAxis {
  return target !== "risk";
}

function getCapabilityLabel(target: AdventurerCapabilityAxis): string {
  switch (target) {
    case "physique":
      return "体魄";
    case "survival":
      return "生存";
    case "exploration":
      return "探索";
    case "observation":
      return "观察";
    case "combat":
      return "战斗";
  }
}
