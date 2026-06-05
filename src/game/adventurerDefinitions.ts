import {getDiscoveryLevelText} from "./text/statusText";
import type {AdventurerDiscoveryLevel, AdventurerPinnedFilter, AdventurerStatusFilter} from "./core/types";

export interface AdventurerFilterOption<TValue extends string> {
  value: TValue;
  label: string;
}

const discoveryLevels: AdventurerDiscoveryLevel[] = ["heard", "seen", "acquainted", "familiar", "trusted"];

export function getAdventurerLevelFilterOptions(): AdventurerFilterOption<"all" | AdventurerDiscoveryLevel>[] {
  return [
    {value: "all", label: "全部认知"},
    ...discoveryLevels.map((level) => ({
      value: level,
      label: getDiscoveryLevelText(level)
    }))
  ];
}

export function getAdventurerStatusFilterOptions(): AdventurerFilterOption<AdventurerStatusFilter>[] {
  return [
    {value: "all", label: "全部状态"},
    {value: "idle", label: "在镇上"},
    {value: "away", label: "外出中"}
  ];
}

export function getAdventurerPinnedFilterOptions(): AdventurerFilterOption<AdventurerPinnedFilter>[] {
  return [
    {value: "all", label: "全部人物"},
    {value: "pinned", label: "仅看置顶"},
    {value: "unpinned", label: "仅看未置顶"}
  ];
}
