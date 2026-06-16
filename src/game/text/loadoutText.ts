import type {AdventurerPersonalityAxis} from "../core/types";

export interface LoadoutDialogueTemplate {
  id: string;
  personality: AdventurerPersonalityAxis | "balanced";
  text: string;
}

export const loadoutDialogueTemplates: LoadoutDialogueTemplate[] = [
  {
    id: "diligence-prepared",
    personality: "diligence",
    text: "我把东西按顺序收好了。{itemClause}{equipmentClause}{moneyClause}期限我也记着，不会随便浪费。"
  },
  {
    id: "courage-direct",
    personality: "courage",
    text: "要看行装？行。{equipmentClause}{itemClause}{moneyClause}真碰到麻烦我会用。"
  },
  {
    id: "caution-counting",
    personality: "caution",
    text: "我确认过一遍。{itemClause}{equipmentClause}{moneyClause}有期限的东西，我不会随便浪费次数。"
  },
  {
    id: "curiosity-observant",
    personality: "curiosity",
    text: "你问得正好，我也正想说说这些。{itemClause}{equipmentClause}{moneyClause}看起来每件都有自己的用处。"
  },
  {
    id: "greed-valuing",
    personality: "greed",
    text: "这些可都是有价值的东西。{itemClause}{equipmentClause}{moneyClause}别弄丢了。"
  },
  {
    id: "sociability-chatty",
    personality: "sociability",
    text: "你问我带了什么？当然可以。{itemClause}{equipmentClause}{moneyClause}我会好好带回消息的。"
  },
  {
    id: "discipline-briefing",
    personality: "discipline",
    text: "行装汇报如下。{itemClause}{equipmentClause}{moneyClause}剩余期限和次数我会按任务消耗记录。"
  },
  {
    id: "resilience-steady",
    personality: "resilience",
    text: "放心，我撑得住。{itemClause}{equipmentClause}{moneyClause}难办的时候我会留到该用的时候。"
  },
  {
    id: "physique-balanced",
    personality: "balanced",
    text: "{itemClause}{equipmentClause}{moneyClause}要是任务里真的需要，我会自己判断什么时候用。"
  }
];
