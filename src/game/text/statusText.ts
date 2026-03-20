import type {
  AdventurerDiscoveryLevel,
  IntelKind,
  IntelStatus,
  QuestNature,
  QuestResultOutcome,
  QuestRisk,
  QuestStatus
} from "../types";

export function getQuestStatusText(status: QuestStatus): string {
  switch (status) {
    case "pending":
      return "等待接取";
    case "active":
      return "进行中";
    case "completed":
      return "已完成";
    default:
      return status;
  }
}

export function getDiscoveryLevelText(level: AdventurerDiscoveryLevel): string {
  switch (level) {
    case "heard":
      return "听闻";
    case "seen":
      return "见过";
    case "acquainted":
      return "打过交道";
    case "familiar":
      return "熟客";
    case "trusted":
      return "信赖";
    default:
      return level;
  }
}

export function getQuestRiskText(risk: QuestRisk): string {
  switch (risk) {
    case "safe":
      return "稳妥";
    case "risky":
      return "有风险";
    case "dangerous":
      return "高危";
    default:
      return risk;
  }
}

export function getQuestNatureText(nature: QuestNature): string {
  switch (nature) {
    case "routine":
      return "日常";
    case "supply":
      return "补货";
    case "investigation":
      return "调查";
    case "mysterious":
      return "异常";
    default:
      return nature;
  }
}

export function getIntelKindText(kind: IntelKind): string {
  switch (kind) {
    case "lead":
      return "线索";
    case "discovery":
      return "发现";
    default:
      return kind;
  }
}

export function getIntelStatusText(status: IntelStatus): string {
  switch (status) {
    case "recorded":
      return "仅记录";
    case "followable":
      return "可继续跟进";
    case "triggered":
      return "已触发后续";
    default:
      return status;
  }
}

export function getIntelSourceOutcomeText(outcome: QuestResultOutcome): string {
  switch (outcome) {
    case "failure":
      return "任务失败回报";
    case "success":
    default:
      return "任务成功回报";
  }
}
