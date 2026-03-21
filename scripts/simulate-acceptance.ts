import adventurersData from "../config/adventurers.json" with {type: "json"};
import acceptanceQuestData from "../config/quests/acceptance.json" with {type: "json"};
import {
  getQuestAcceptanceBreakdown,
  getQuestInterestBreakdown
} from "../src/game/systems/taskAcceptance.js";
import type {Adventurer, GameData, Quest, QuestTemplate} from "../src/game/types.js";

const args = parseArgs(process.argv.slice(2));
const questTemplates = acceptanceQuestData.questTemplates as QuestTemplate[];
const adventurers = (adventurersData.adventurers as Adventurer[])
  .filter((adventurer) => !adventurer.id.startsWith("resolution-"));
const selectedQuestTemplates = args.questIds.length > 0
  ? questTemplates.filter((template) => args.questIds.includes(template.id))
  : questTemplates;

if (selectedQuestTemplates.length === 0) {
  console.error("没有找到匹配的接任务测试任务。");
  process.exit(1);
}

const gameData = createSimulationGameData(adventurers, selectedQuestTemplates);

console.log("接任务模拟报告");
console.log(`任务数：${selectedQuestTemplates.length}`);
console.log(`角色数：${adventurers.length}`);
if (args.questIds.length > 0) {
  console.log(`筛选任务：${args.questIds.join(", ")}`);
}
console.log("");

console.log("[按任务看]");
selectedQuestTemplates.forEach((template, index) => {
  const quest = gameData.player.quests[index];
  if (!quest) {
    return;
  }

  const rows = adventurers
    .map((adventurer) => {
      const acceptance = getQuestAcceptanceBreakdown(gameData, quest, template, adventurer, 0);
      const threshold = getQuestInterestBreakdown(gameData, adventurer, quest, template);
      return {
        adventurer,
        acceptance,
        threshold
      };
    })
    .sort((left, right) => right.acceptance.finalScore - left.acceptance.finalScore);

  console.log(`- ${template.id}`);
  rows.forEach((row) => {
    const accepted = row.acceptance.finalScore >= row.threshold.finalThreshold;
    console.log(
      `  ${row.adventurer.id}: score=${formatSigned(row.acceptance.finalScore)} / threshold=${formatSigned(row.threshold.finalThreshold)} / ${accepted ? "会考虑" : "不考虑"}`
    );
  });
});

console.log("");
console.log("[按人物看]");
adventurers.forEach((adventurer) => {
  const rows = selectedQuestTemplates
    .map((template, index) => {
      const quest = gameData.player.quests[index]!;
      const acceptance = getQuestAcceptanceBreakdown(gameData, quest, template, adventurer, 0);
      const threshold = getQuestInterestBreakdown(gameData, adventurer, quest, template);
      return {
        template,
        acceptance,
        threshold
      };
    })
    .sort((left, right) => right.acceptance.finalScore - left.acceptance.finalScore);

  console.log(`- ${adventurer.id}`);
  rows.forEach((row) => {
    const accepted = row.acceptance.finalScore >= row.threshold.finalThreshold;
    console.log(
      `  ${row.template.id}: score=${formatSigned(row.acceptance.finalScore)} / threshold=${formatSigned(row.threshold.finalThreshold)} / ${accepted ? "会考虑" : "不考虑"}`
    );
  });
});

function parseArgs(argv: string[]) {
  const result = {
    questIds: [] as string[]
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--quest") {
      const questId = argv[index + 1];
      if (questId) {
        result.questIds.push(questId);
      }
      index += 1;
    }
  }

  return result;
}

function createSimulationGameData(
  sourceAdventurers: Adventurer[],
  sourceQuestTemplates: QuestTemplate[]
) {
  const adventurerCopies = sourceAdventurers.map((adventurer) => ({
    ...adventurer,
    personality: {...adventurer.personality},
    capabilities: {...adventurer.capabilities},
    preferences: [...adventurer.preferences],
    currentQuestId: null,
    knownLevel: adventurer.discoveryLevel,
    lastSeenDay: 0
  }));
  const questCopies = sourceQuestTemplates.map((template, index) => createQuestFromTemplate(template, index));

  return {
    day: 1,
    questIdCounter: questCopies.length + 1,
    adventurers: adventurerCopies,
    questTemplates: sourceQuestTemplates,
    intelDefinitions: [],
    player: {
      money: 0,
      stock: {},
      quests: questCopies,
      leads: [],
      discoveries: []
    },
    dayLog: []
  } as unknown as GameData;
}

function createQuestFromTemplate(template: QuestTemplate, index: number): Quest {
  const reward = Math.round((template.minReward + template.maxReward) / 2);
  const totalDays = template.timingMode === "fixed"
    ? Math.max(1, template.fixedDurationDays ?? 1)
    : template.difficulty === "hard"
      ? 3
      : template.difficulty === "medium"
        ? 2
        : 1;

  return {
    id: index + 1,
    category: "daily",
    templateId: template.id,
    title: template.title,
    description: template.description,
    contentStageTag: template.contentStageTag,
    designerNote: template.designerNote,
    followUpStageTag: template.followUpStageTag,
    risk: template.risk,
    nature: template.nature,
    displayId: `A${index + 1}`,
    resource: template.resource ?? null,
    focusText: template.focusText ?? null,
    reward,
    quantity: 1,
    status: "pending",
    createdDay: 1,
    acceptedDay: null,
    completedDay: null,
    totalDays,
    daysRemaining: totalDays,
    adventurerId: null,
    adventurerName: null,
    result: null
  };
}

function formatSigned(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}
