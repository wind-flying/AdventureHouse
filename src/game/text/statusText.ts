import type {
  AdventurerDiscoveryLevel,
  IntelKind,
  IntelStatus,
  QuestNature,
  QuestResultReasonTag,
  QuestResultOutcome,
  ResultInsightLevel,
  QuestRisk,
  QuestStatus
} from "../core/types";

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

export function getQuestResultReasonTagText(tag: QuestResultReasonTag): string {
  switch (tag) {
    case "danger":
      return "这次更像是被明显的危险压住了手脚。";
    case "challenge":
      return "委托本身的门槛比表面看上去更高。";
    case "durationPressure":
      return "路上的消耗和拖延比预想更磨人。";
    case "uncertainty":
      return "路上的变数太多，很多判断难以及时落定。";
    case "investigationComplexity":
      return "这类线索需要更熟悉门道的人来拆解。";
    case "reportDifficulty":
      return "就算带回了东西，也不容易整理成稳定回报。";
    case "stability":
      return "事情的发展没有按常规路数推进。";
    case "intel":
      return "先前掌握的信息这次确实帮上了忙。";
    case "item":
      return "随身带着的补给在关键时候改变了结果。";
    case "capability":
      return "这次的人选和委托性质是否贴合，影响很大。";
    case "personality":
      return "执行时的判断和作风，明显左右了结果。";
    case "resource":
    case "lead":
    case "discovery":
    case "failure":
    default:
      return "这次的结果背后还有一些没完全看清的因素。";
  }
}

export function getQuestResultVisibleReasonLimit(level: ResultInsightLevel): number {
  switch (level) {
    case "aware":
      return 1;
    case "trained":
      return 2;
    case "expert":
      return 3;
    case "basic":
    default:
      return 0;
  }
}
