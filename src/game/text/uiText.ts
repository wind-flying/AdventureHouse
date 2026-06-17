import type {NotificationType, Quest, QuestPublishMode} from "../core/types";

export const uiText: Record<string, string> = {
  emptyOverviewQuests: "最近还没有任务。",
  emptyQuestList: "还没有发布任何任务。",
  emptyAdventurers: "你还没有真正认识镇上的冒险者。",
  emptyLogs: "暂无记录。",
  emptyLatestStories: "今天还没有新的故事碎片。"
};

export function getQuestFormHint(
  estimatedDays: number,
  options?: {stockDurationCapped?: boolean; stockDurationCap?: number}
): string {
  let text = `预估耗时：${estimatedDays} 天。当前版本中，任务会在次日被接取，然后按天推进。`;
  if (options?.stockDurationCapped && options.stockDurationCap) {
    text += `补货委托单趟耗时上限为 ${options.stockDurationCap} 天；数量再多也不继续延长，表示同一批许可劳力在时限内加量采收。`;
  }

  return text;
}

export function getQuestPublishModeText(mode: QuestPublishMode): string {
  if (mode === "intel") {
    return "调查委托";
  }

  return "补货委托";
}

export function getQuantityHint(mode: QuestPublishMode): string {
  if (mode === "intel") {
    return "这类委托更像挂出一次调查或观察，不按数量收货。";
  }

  return "数量指许可收获配额，成功时原料直接入账店内仓库，非市场现货。";
}

export function getQuestTemplateSummary(description: string, riskText: string, natureText: string): string {
  return `${description} 风险：${riskText}；性质：${natureText}。`;
}

export function getBlockedQuestTemplateSummary(baseSummary: string): string {
  return `${baseSummary} 当前已有同类委托在外，需等待结果返回后才能再次发布。`;
}

export function formatDaySummary(day: number): string {
  return `第 ${day} 天`;
}

export function formatMoneySummary(money: number): string {
  return `${money} 钱`;
}

export function formatCountSummary(count: number, unit: string): string {
  return `${count} ${unit}`;
}

export function getQuestProgressText(quest: Quest): string {
  if (quest.status === "pending") {
    return "将在下一天开始尝试被接取";
  }

  if (quest.status === "active") {
    return `剩余 ${quest.daysRemaining} 天`;
  }

  return `已于第 ${quest.completedDay} 天完成`;
}

export function getQuestAdventurerText(adventurerName: string | null): string {
  return adventurerName ? `承接者：${adventurerName}` : "";
}

export function getAdventurerCurrentStatusText(currentQuestDisplayId: string | null, currentQuestTitle: string | null): string {
  if (!currentQuestDisplayId) {
    return "目前在镇上活动";
  }

  return currentQuestTitle
    ? `外出中：任务 ${currentQuestDisplayId} · ${currentQuestTitle}`
    : `外出中：任务 ${currentQuestDisplayId}`;
}

export function getQuestValidationMessage(key: QuestValidationMessageKey): string {
  return questValidationMessages[key];
}

interface QuestActionFeedback {
  type: NotificationType;
  message: string;
}

type QuestValidationMessageKey =
  | "invalidReward"
  | "invalidQuantity"
  | "insufficientMoney"
  | "missingTemplateConfig"
  | "duplicateUniqueQuest"
  | "questCreated";

const questValidationMessages: Record<QuestValidationMessageKey, string> = {
  invalidReward: "奖励必须是大于 0 的数字。",
  invalidQuantity: "需求数量必须是大于 0 的数字。",
  insufficientMoney: "资金不足，无法发布这份任务。",
  missingTemplateConfig: "未找到对应的任务模板。",
  duplicateUniqueQuest: "这类探索委托仍在推进中，得到结果前不能重复发布。",
  questCreated: "任务已发布，等待下一天推进。"
};

export function getQuestActionFeedback(key: QuestValidationMessageKey, type: NotificationType): QuestActionFeedback {
  return {
    type,
    message: getQuestValidationMessage(key)
  };
}
