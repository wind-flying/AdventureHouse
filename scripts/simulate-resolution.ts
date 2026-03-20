import adventurersData from "../config/adventurers.json" with {type: "json"};
import resolutionQuestData from "../config/quests/resolution.json" with {type: "json"};
import {
  QUEST_RESOLUTION_TUNING,
  getEffectiveCapabilityValue,
  getQuestCapabilityWeights,
  getQuestFeatures,
  getQuestSuccessBreakdown,
  normalizeQuestFeatures
} from "../src/game/systems/taskResolution.js";
import type {Adventurer, QuestTemplate} from "../src/game/types.js";

// 用法：
// npm run simulate:resolution
// npm run simulate:resolution -- --full
// npm run simulate:resolution -- --runs 5000 --intel-count 2
//
// 参数说明：
// --runs
//   运行多少次随机模拟。值越大，统计结果越稳定，但运行会更慢。
// --intel-count
//   模拟“同主题已掌握线索数量”。不会改存档，只是临时带入公式看线索加成。
// --quest
//   只看某条结算测试任务。可重复传入多次，用于横向对比指定样例。
// --full
//   输出逐任务完整拆解；默认只输出 v0.9 收口需要的最小验证摘要。

const DEFAULT_RUNS = 1000;
const DEFAULT_INTEL_COUNT = 0;
const DEFAULT_INTEL_SERIES = [0, 1, 2, 3];
const BASELINE_TARGETS = {
  "resolution-standard-advantage": QUEST_RESOLUTION_TUNING.standardAdvantagedTargetChance,
  "resolution-standard-challenge": QUEST_RESOLUTION_TUNING.standardChallengedTargetChance
} as const;

const args = parseArgs(process.argv.slice(2));
const runs = Number.isFinite(args.runs) ? args.runs : DEFAULT_RUNS;
const intelCount = Number.isFinite(args.intelCount) ? args.intelCount : DEFAULT_INTEL_COUNT;

const questTemplates = resolutionQuestData.questTemplates as QuestTemplate[];
const adventurers = adventurersData.adventurers as Adventurer[];

const selectedQuests = args.questIds.length > 0
  ? questTemplates.filter((quest) => args.questIds.includes(quest.id))
  : questTemplates;

if (selectedQuests.length === 0) {
  console.error("没有找到匹配的结算测试任务。可用任务：");
  questTemplates.forEach((quest) => {
    console.error(`- ${quest.id}`);
  });
  process.exit(1);
}

console.log("结算模拟报告");
console.log(`样本次数：${runs}`);
console.log(`默认线索数量：${intelCount}`);
console.log(`输出模式：${args.full ? "完整拆解" : "最小验证"}`);
if (args.questIds.length > 0) {
  console.log(`筛选任务：${args.questIds.join(", ")}`);
}
console.log("");

printValidationSummary(questTemplates, adventurers, intelCount);

if (!args.full) {
  process.exit(0);
}

selectedQuests.forEach((template) => {
  const adventurer = adventurers.find((item) => item.id === template.forcedAdventurerId);
  if (!adventurer) {
    console.log(`任务 ${template.id} 缺失 forcedAdventurerId 对应角色，跳过。`);
    console.log("");
    return;
  }

  const breakdown = getQuestSuccessBreakdown(
    {
      features: getQuestFeatures(template),
      risk: template.risk,
      nature: template.nature,
      totalDays: getTotalDays(template),
      difficulty: template.difficulty
    },
    adventurer,
    intelCount
  );
  const simulation = simulateRuns(breakdown.finalChance, runs);

  console.log(`任务：${template.title}`);
  console.log(`id：${template.id}`);
  console.log(`接取者：${adventurer.name} (${adventurer.id})`);
  console.log(`参数：risk=${template.risk} / difficulty=${template.difficulty} / nature=${template.nature} / days=${getTotalDays(template)}`);
  const rawFeatures = getQuestFeatures(template);
  const normalizedFeatures = normalizeQuestFeatures(rawFeatures);
  const capabilityWeights = getQuestCapabilityWeights({
    features: normalizedFeatures,
    risk: template.risk,
    nature: template.nature,
    totalDays: getTotalDays(template),
    difficulty: template.difficulty
  });
  console.log(`隐藏特征(原始)：danger=${formatRaw(rawFeatures.danger)} / challenge=${formatRaw(rawFeatures.challenge)} / durationPressure=${formatRaw(rawFeatures.durationPressure)} / uncertainty=${formatRaw(rawFeatures.uncertainty)} / investigationComplexity=${formatRaw(rawFeatures.investigationComplexity)} / reportDifficulty=${formatRaw(rawFeatures.reportDifficulty)} / stability=${formatRaw(rawFeatures.stability)}`);
  console.log(`隐藏特征(有效)：danger=${formatUnit(normalizedFeatures.danger)} / challenge=${formatUnit(normalizedFeatures.challenge)} / durationPressure=${formatUnit(normalizedFeatures.durationPressure)} / uncertainty=${formatUnit(normalizedFeatures.uncertainty)} / investigationComplexity=${formatUnit(normalizedFeatures.investigationComplexity)} / reportDifficulty=${formatUnit(normalizedFeatures.reportDifficulty)} / stability=${formatUnit(normalizedFeatures.stability)}`);
  console.log(`能力(原始)：physique=${formatRaw(adventurer.capabilities.physique)} / survival=${formatRaw(adventurer.capabilities.survival)} / exploration=${formatRaw(adventurer.capabilities.exploration)} / observation=${formatRaw(adventurer.capabilities.observation)} / combat=${formatRaw(adventurer.capabilities.combat)}`);
  console.log(`能力(有效)：physique=${formatUnit(getEffectiveCapabilityValue(adventurer.capabilities.physique))} / survival=${formatUnit(getEffectiveCapabilityValue(adventurer.capabilities.survival))} / exploration=${formatUnit(getEffectiveCapabilityValue(adventurer.capabilities.exploration))} / observation=${formatUnit(getEffectiveCapabilityValue(adventurer.capabilities.observation))} / combat=${formatUnit(getEffectiveCapabilityValue(adventurer.capabilities.combat))}`);
  console.log(`能力权重：physique=${formatUnit(capabilityWeights.physique)} / survival=${formatUnit(capabilityWeights.survival)} / exploration=${formatUnit(capabilityWeights.exploration)} / observation=${formatUnit(capabilityWeights.observation)} / combat=${formatUnit(capabilityWeights.combat)}`);
  console.log(`默认线索数量 ${intelCount} 时：`);
  console.log(`  基础成功率：${formatPercent(breakdown.baseChance)}`);
  console.log(`  危险性惩罚：${formatSigned(breakdown.dangerPenalty)}`);
  console.log(`  难度惩罚：${formatSigned(breakdown.challengePenalty)}`);
  console.log(`  耗时压力惩罚：${formatSigned(breakdown.durationPressurePenalty)}`);
  console.log(`  未知度惩罚：${formatSigned(breakdown.uncertaintyPenalty)}`);
  console.log(`  回传难度惩罚：${formatSigned(breakdown.reportDifficultyPenalty)}`);
  console.log(`  稳定性修正：${formatSigned(breakdown.stabilityBonus)}`);
  console.log(`  线索修正：${formatSigned(breakdown.intelBonus)}`);
  console.log(`  能力修正：${formatSigned(breakdown.capabilityBonus)}`);
  console.log(`  人格修正：${formatSigned(breakdown.personalityBonus)}`);
  console.log(`  未截断成功率：${formatPercent(breakdown.rawFinalChance)}`);
  console.log(`  最终成功率：${formatPercent(breakdown.finalChance)}`);
  if (breakdown.wasClamped) {
    console.log(`  截断状态：已按边界收敛到 ${formatPercent(breakdown.finalChance)}`);
  }
  const baselineTarget = BASELINE_TARGETS[template.id as keyof typeof BASELINE_TARGETS];
  if (baselineTarget !== undefined) {
    const min = baselineTarget - QUEST_RESOLUTION_TUNING.standardChanceTolerance;
    const max = baselineTarget + QUEST_RESOLUTION_TUNING.standardChanceTolerance;
    const withinTarget = breakdown.finalChance >= min && breakdown.finalChance <= max;
    console.log(`  基准目标：${formatPercent(baselineTarget)} ± ${formatPercent(QUEST_RESOLUTION_TUNING.standardChanceTolerance)} (${formatPercent(min)} ~ ${formatPercent(max)})`);
    console.log(`  是否命中：${withinTarget ? "是" : "否"}`);
  }
  console.log(`  模拟结果：成功 ${simulation.successes} / 失败 ${simulation.failures} / 成功率 ${formatPercent(simulation.successRate)}`);
  console.log("  线索数量对照：");
  DEFAULT_INTEL_SERIES.forEach((count) => {
    const chance = getQuestSuccessBreakdown(
      {
        features: getQuestFeatures(template),
        risk: template.risk,
        nature: template.nature,
        totalDays: getTotalDays(template),
        difficulty: template.difficulty
      },
      adventurer,
      count
    ).finalChance;
    console.log(`    ${count} 条线索 -> ${formatPercent(chance)}`);
  });
  console.log("");
});

function parseArgs(argv: string[]) {
  const result = {
    runs: DEFAULT_RUNS,
    intelCount: DEFAULT_INTEL_COUNT,
    questIds: [] as string[],
    full: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--runs") {
      result.runs = Number.parseInt(argv[index + 1] ?? "", 10);
      index += 1;
      continue;
    }

    if (token === "--intel-count") {
      result.intelCount = Number.parseInt(argv[index + 1] ?? "", 10);
      index += 1;
      continue;
    }

    if (token === "--quest") {
      const questId = argv[index + 1];
      if (questId) {
        result.questIds.push(questId);
      }
      index += 1;
      continue;
    }

    if (token === "--full") {
      result.full = true;
    }
  }

  return result;
}

function printValidationSummary(
  templates: QuestTemplate[],
  adventurers: Adventurer[],
  intelCount: number
) {
  const adventurerMap = new Map(adventurers.map((adventurer) => [adventurer.id, adventurer]));
  const validations = [
    printStandardBaselineValidation(templates, adventurerMap, intelCount),
    printMainArenaValidation(templates, adventurerMap, intelCount),
    printUpperBoundValidation(templates, adventurerMap, intelCount)
  ];

  console.log("最小验证摘要");
  validations.forEach((lines) => {
    lines.forEach((line) => {
      console.log(line);
    });
  });
  console.log("");
}

function printStandardBaselineValidation(
  templates: QuestTemplate[],
  adventurerMap: Map<string, Adventurer>,
  intelCount: number
) {
  const lines = ["[标准基准]"];

  Object.entries(BASELINE_TARGETS).forEach(([questId, targetChance]) => {
    const template = templates.find((item) => item.id === questId);
    const adventurer = template?.forcedAdventurerId ? adventurerMap.get(template.forcedAdventurerId) : undefined;
    if (!template || !adventurer) {
      lines.push(`- ${questId}: 缺失任务或角色配置`);
      return;
    }

    const breakdown = getBreakdown(template, adventurer, intelCount);
    const min = targetChance - QUEST_RESOLUTION_TUNING.standardChanceTolerance;
    const max = targetChance + QUEST_RESOLUTION_TUNING.standardChanceTolerance;
    lines.push(
      `- ${questId}: ${formatPercent(breakdown.finalChance)}，目标 ${formatPercent(min)} ~ ${formatPercent(max)}，${breakdown.finalChance >= min && breakdown.finalChance <= max ? "命中" : "未命中"}`
    );
  });

  return lines;
}

function printMainArenaValidation(
  templates: QuestTemplate[],
  adventurerMap: Map<string, Adventurer>,
  intelCount: number
) {
  const lines = ["[能力主场]"];
  const expectedTopAxisByQuestId = {
    "resolution-physique-strong": "physique",
    "resolution-survival-strong": "survival",
    "resolution-exploration-strong": "exploration",
    "resolution-observation-strong": "observation",
    "resolution-combat-strong": "combat"
  } as const;

  Object.entries(expectedTopAxisByQuestId).forEach(([questId, expectedAxis]) => {
    const template = templates.find((item) => item.id === questId);
    const strongAdventurerId = template?.forcedAdventurerId;
    const strongAdventurer = strongAdventurerId ? adventurerMap.get(strongAdventurerId) : undefined;
    const weakAdventurer = strongAdventurerId
      ? adventurerMap.get(strongAdventurerId.replace("-strong", "-weak"))
      : undefined;

    if (!template || !strongAdventurer || !weakAdventurer) {
      lines.push(`- ${questId}: 缺失任务或强弱模板`);
      return;
    }

    const normalizedFeatures = normalizeQuestFeatures(getQuestFeatures(template));
    const weights = getQuestCapabilityWeights({
      features: normalizedFeatures,
      risk: template.risk,
      nature: template.nature,
      totalDays: getTotalDays(template),
      difficulty: template.difficulty
    });
    const sortedWeights = Object.entries(weights).sort((left, right) => right[1] - left[1]);
    const topAxis = sortedWeights[0]?.[0] ?? "unknown";
    const strongChance = getBreakdown(template, strongAdventurer, intelCount).finalChance;
    const weakChance = getBreakdown(template, weakAdventurer, intelCount).finalChance;
    lines.push(
      `- ${questId}: 主权重 ${topAxis}=${formatUnit(sortedWeights[0]?.[1] ?? 0)}，预期 ${expectedAxis}，${topAxis === expectedAxis ? "成立" : "偏移"}；strong/weak ${formatPercent(strongChance)} / ${formatPercent(weakChance)}，差 ${formatPercent(strongChance - weakChance)}`
    );
  });

  return lines;
}

function printUpperBoundValidation(
  templates: QuestTemplate[],
  adventurerMap: Map<string, Adventurer>,
  intelCount: number
) {
  const lines = ["[上界语义]"];
  const template = templates.find((item) => item.id === "resolution-all-max");
  const adventurer = template?.forcedAdventurerId ? adventurerMap.get(template.forcedAdventurerId) : undefined;

  if (!template || !adventurer) {
    lines.push("- resolution-all-max: 缺失任务或角色配置");
    return lines;
  }

  const breakdown = getBreakdown(template, adventurer, intelCount);
  lines.push(
    `- resolution-all-max: 未截断 ${formatPercent(breakdown.rawFinalChance)} -> 最终 ${formatPercent(breakdown.finalChance)}，${breakdown.wasClamped ? "已正确截断" : "未触发截断"}`
  );

  return lines;
}

function getBreakdown(template: QuestTemplate, adventurer: Adventurer, intelCount: number) {
  return getQuestSuccessBreakdown(
    {
      features: getQuestFeatures(template),
      risk: template.risk,
      nature: template.nature,
      totalDays: getTotalDays(template),
      difficulty: template.difficulty
    },
    adventurer,
    intelCount
  );
}

function getTotalDays(template: {timingMode: string; fixedDurationDays?: number}) {
  if (template.timingMode === "fixed") {
    return Math.max(1, template.fixedDurationDays ?? 1);
  }

  return 1;
}

function simulateRuns(successChance: number, runs: number) {
  let successes = 0;
  for (let index = 0; index < runs; index += 1) {
    if (Math.random() < successChance) {
      successes += 1;
    }
  }

  return {
    successes,
    failures: runs - successes,
    successRate: successes / runs
  };
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSigned(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}

function formatUnit(value: number) {
  return value.toFixed(2);
}

function formatRaw(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}
