import type {Adventurer, AdventurerPersonalityAxis} from "../types";

// 临时展示参数：控制玩家多早能看出人格，以及一次显示多少个标签。
// 阈值越低，人物会更容易被贴上明显标签；阈值越高，只有非常突出的性格才会显露出来。
const PERSONALITY_TEXT_TUNING = {
  revealThreshold: 0.35,
  defaultTagLimit: 3
} as const;

const positiveLabels: Record<AdventurerPersonalityAxis, string> = {
  diligence: "做事认真",
  courage: "敢接冒险活",
  greed: "看重报酬",
  sociability: "待人热络",
  caution: "更偏稳妥",
  curiosity: "爱追新鲜事",
  discipline: "守约可靠",
  resilience: "很能扛挫折"
};

const negativeLabels: Record<AdventurerPersonalityAxis, string> = {
  diligence: "做事随性",
  courage: "不爱冒险",
  greed: "不太计较报酬",
  sociability: "不太好接近",
  caution: "容易贸然行动",
  curiosity: "不爱管闲事",
  discipline: "合作不太稳定",
  resilience: "受挫后会退缩"
};

export function getPersonalityTags(
  adventurer: Adventurer,
  limit: number = PERSONALITY_TEXT_TUNING.defaultTagLimit
): string[] {
  return Object.entries(adventurer.personality)
    .filter(([, value]) => Math.abs(value) >= PERSONALITY_TEXT_TUNING.revealThreshold)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, limit)
    .map(([axis, value]) => {
      const key = axis as AdventurerPersonalityAxis;
      return value >= 0 ? positiveLabels[key] : negativeLabels[key];
    });
}
