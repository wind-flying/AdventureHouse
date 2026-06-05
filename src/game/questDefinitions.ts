import {getQuestNatureText, getQuestStatusText} from "./text/statusText";
import type {QuestNature, QuestStatus} from "./core/types";

export type QuestStatusFilter = "all" | QuestStatus;
export type QuestNatureFilter = "all" | QuestNature;

export interface QuestFilterOption<TValue extends string> {
  value: TValue;
  label: string;
}

const questStatusValues: QuestStatus[] = ["pending", "active", "completed"];
const questNatureValues: QuestNature[] = ["routine", "supply", "investigation", "mysterious"];

export function getQuestStatusFilterOptions(): QuestFilterOption<QuestStatusFilter>[] {
  return [
    {value: "all", label: "全部状态"},
    ...questStatusValues.map((status) => ({
      value: status,
      label: getQuestStatusText(status)
    }))
  ];
}

export function getQuestNatureFilterOptions(): QuestFilterOption<QuestNatureFilter>[] {
  return [
    {value: "all", label: "全部性质"},
    ...questNatureValues.map((nature) => ({
      value: nature,
      label: getQuestNatureText(nature)
    }))
  ];
}
