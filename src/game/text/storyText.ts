import introductionTextData from "../../../config/text/adventurer-introductions.json";
import type {StoryEntry, StoryEntryTone} from "../core/types";

type StoryEventKey =
  | "opening_day"
  | "task_created"
  | "daily_income"
  | "daily_retail_income"
  | "bailout_accepted"
  | "inn_retail_sale"
  | "item_received"
  | "adventurer_introduced_at_inn"
  | "adventurer_referred_for_quest"
  | "task_started"
  | "task_progress"
  | "task_completed"
  | "task_failed"
  | "task_lead_found"
  | "task_discovery_made"
  | "follow_up_unlocked"
  | "quiet_day"
  | "daily_food_met"
  | "daily_food_shortfall"
  | "daily_food_stockpile"
  | "trail_ration_purchase"
  | "trail_ration_fallback"
  | "trail_ration_shortfall"
  | "anchor_food_deficit"
  | "quest_provision_transferred";

type StoryTemplateMap = {
  opening_day: {
    day: number;
  };
  task_created: {
    day: number;
    targetText: string;
    publishModeText: string;
    reward: number;
  };
  daily_income: {
    day: number;
    income: number;
  };
  daily_retail_income: {
    day: number;
    income: number;
  };
  bailout_accepted: {
    day: number;
    adventurerName: string;
    amount: number;
  };
  inn_retail_sale: {
    day: number;
    adventurerName: string;
    itemName: string;
    price: number;
  };
  item_received: {
    day: number;
    quantity: number;
    itemName: string;
  };
  adventurer_introduced_at_inn: {
    day: number;
    adventurerName: string;
    adventurerTitle: string;
  };
  adventurer_referred_for_quest: {
    day: number;
    adventurerName: string;
    adventurerTitle: string;
    questDisplayId: string;
    questTitle: string;
  };
  task_started: {
    day: number;
    questDisplayId: string;
    questTitle: string;
    adventurerName: string;
    targetText: string;
  };
  task_progress: {
    day: number;
    questDisplayId: string;
    questTitle: string;
    daysRemaining: number;
  };
  task_completed: {
    day: number;
    questDisplayId: string;
    questTitle: string;
    quantity: number;
    resourceLabel: string;
  };
  task_failed: {
    day: number;
    questDisplayId: string;
    questTitle: string;
    failureText: string;
  };
  task_lead_found: {
    day: number;
    questDisplayId: string;
    questTitle: string;
    leadText: string;
  };
  task_discovery_made: {
    day: number;
    questDisplayId: string;
    questTitle: string;
    discoveryText: string;
  };
  follow_up_unlocked: {
    day: number;
    sourceQuestDisplayId: string;
    sourceQuestTitle: string;
    unlockedTitle: string;
  };
  quiet_day: {
    day: number;
  };
  daily_food_met: {
    day: number;
    adventurerName: string;
    sourceText: string;
    itemName: string;
    nutrition: number;
  };
  daily_food_shortfall: {
    day: number;
    adventurerName: string;
    shortfall: number;
    dailyNeed: number;
  };
  daily_food_stockpile: {
    day: number;
    adventurerName: string;
    nutrition: number;
  };
  trail_ration_purchase: {
    day: number;
    adventurerName: string;
    itemName: string;
    quantity: number;
    sourceText: string;
  };
  trail_ration_fallback: {
    day: number;
    adventurerName: string;
    questDisplayId: string;
    itemName: string;
    quantity: number;
  };
  trail_ration_shortfall: {
    day: number;
    adventurerName: string;
    questDisplayId: string;
    shortfall: number;
  };
  anchor_food_deficit: {
    day: number;
    adventurerName: string;
  };
  quest_provision_transferred: {
    day: number;
    adventurerName: string;
    questDisplayId: string;
    itemName: string;
    quantity: number;
  };
};

const storyText: Record<StoryEventKey, string[]> = {
  opening_day: [
    "第 {day} 天：村里的小店今天正式开门。你能靠委托补货，也能靠日常营业维持现金流。",
    "第 {day} 天：招牌刚挂起来，村里来往的人已经开始注意到这间新开的店。",
    "第 {day} 天：据点终于有了火光。接下来你得想办法让它真正转起来。 "
  ],
  task_created: [
    "第 {day} 天：你发布了一份{publishModeText}，愿付 {reward} 钱，重点关注 {targetText}。",
    "第 {day} 天：公告板上多了一张新委托，你愿意用 {reward} 钱换回与 {targetText} 有关的成果。",
    "第 {day} 天：你把一份新委托钉上木板，希望有人替你处理 {targetText}。"
  ],
  daily_income: [
    "第 {day} 天：店铺完成日常营业，获得 {income} 钱。",
    "第 {day} 天：靠着今天的零散买卖，据点进账 {income} 钱。",
    "第 {day} 天：虽然没什么大事发生，但日常经营还是带来了 {income} 钱收入。"
  ],
  daily_retail_income: [
    "第 {day} 天：饭店零售合计进账 {income} 钱。",
    "第 {day} 天：来店冒险者买走了一些菜品，今天零售收入 {income} 钱。",
    "第 {day} 天：菜单上的定价今天换来了 {income} 钱零售收入。"
  ],
  bailout_accepted: [
    "第 {day} 天：{adventurerName} 把 {amount} 钱按在柜台上，让你先渡过这段难捱的日子。",
    "第 {day} 天：你收下了 {adventurerName} 递来的 {amount} 钱，店里总算还能再撑一阵。",
    "第 {day} 天：{adventurerName} 没有多说什么，只留下 {amount} 钱和一句「先把店撑下去」。"
  ],
  inn_retail_sale: [
    "第 {day} 天：{adventurerName} 在店里买走了 {itemName}，付了 {price} 钱。",
    "第 {day} 天：{adventurerName} 点了一份 {itemName}，收进 {price} 钱。",
    "第 {day} 天：饭店今天卖出一道 {itemName}，{adventurerName} 付了 {price} 钱。"
  ],
  item_received: [
    "第 {day} 天：店里新到了 {quantity} 个 {itemName}。",
    "第 {day} 天：委托回流之外，你还收到了 {quantity} 个 {itemName}。",
    "第 {day} 天：库存里多了 {quantity} 个 {itemName}。"
  ],
  adventurer_introduced_at_inn: introductionTextData.introductionTexts.adventurer_introduced_at_inn,
  adventurer_referred_for_quest: introductionTextData.introductionTexts.adventurer_referred_for_quest,
  task_started: [
    "第 {day} 天：{adventurerName} 接下了任务 {questDisplayId} · {questTitle}，目标转向了 {targetText}。",
    "第 {day} 天：{adventurerName} 撕下了任务 {questDisplayId} · {questTitle}，看样子愿意替你去处理 {targetText}。",
    "第 {day} 天：公告板上的任务 {questDisplayId} · {questTitle} 不见了，{adventurerName} 应该已经带着目的出发。 "
  ],
  task_progress: [
    "第 {day} 天：任务 {questDisplayId} · {questTitle} 继续进行中，预计还需 {daysRemaining} 天。",
    "第 {day} 天：关于任务 {questDisplayId} · {questTitle} 还没有结果传回，按估计还要 {daysRemaining} 天。",
    "第 {day} 天：外出的人还没回来，任务 {questDisplayId} · {questTitle} 大概还要再拖上 {daysRemaining} 天。"
  ],
  task_completed: [
    "第 {day} 天：任务 {questDisplayId} · {questTitle} 完成，你的库存增加了 {quantity} 个 {resourceLabel}。",
    "第 {day} 天：任务 {questDisplayId} · {questTitle} 顺利收尾，{quantity} 个 {resourceLabel} 已经送到店里。",
    "第 {day} 天：外出的人带着成果回来了，任务 {questDisplayId} · {questTitle} 为你补回了 {quantity} 个 {resourceLabel}。"
  ],
  task_failed: [
    "第 {day} 天：任务 {questDisplayId} · {questTitle} 没有带回完整成果，只留下了一条回报：{failureText}。",
    "第 {day} 天：关于任务 {questDisplayId} · {questTitle}，你只得到了一段不算成功的回传：{failureText}。",
    "第 {day} 天：任务 {questDisplayId} · {questTitle} 这次没能顺利收尾，留下的只有后续需要确认的信息：{failureText}。"
  ],
  task_lead_found: [
    "第 {day} 天：任务 {questDisplayId} · {questTitle} 没带回多少实物，但留下了一条线索：{leadText}。",
    "第 {day} 天：关于任务 {questDisplayId} · {questTitle}，有人带回了新的调查方向：{leadText}。",
    "第 {day} 天：任务 {questDisplayId} · {questTitle} 的回报更多是一段情报，而不是货物：{leadText}。"
  ],
  task_discovery_made: [
    "第 {day} 天：任务 {questDisplayId} · {questTitle} 带回了一项异常发现：{discoveryText}。",
    "第 {day} 天：外出的人没有只带回物件，还记录下一项发现：{discoveryText}。",
    "第 {day} 天：关于任务 {questDisplayId} · {questTitle}，你得到了一条值得记下的发现：{discoveryText}。"
  ],
  follow_up_unlocked: [
    "第 {day} 天：由于任务 {sourceQuestDisplayId} · {sourceQuestTitle} 的结果，你现在可以发布新的后续委托：{unlockedTitle}。",
    "第 {day} 天：任务 {sourceQuestDisplayId} · {sourceQuestTitle} 改变了公告板上的选择，一份新委托已经出现：{unlockedTitle}。",
    "第 {day} 天：随着任务 {sourceQuestDisplayId} · {sourceQuestTitle} 带回结果，后续调查 {unlockedTitle} 已可挂出。"
  ],
  quiet_day: [
    "第 {day} 天：今天没有新的委托变化，店里主要靠常规营业维持运转。",
    "第 {day} 天：村里风平浪静，公告板上没有新的波澜，只剩日常生意在缓慢推进。",
    "第 {day} 天：没有人带回特别的消息，这一天更多只是平稳地过去了。"
  ],
  daily_food_met: [
    "第 {day} 天：{adventurerName} 用{sourceText}的 {itemName} 凑够了今日伙食（+{nutrition} 营养）。",
    "第 {day} 天：{adventurerName} 今天在{sourceText}解决了吃饭问题，吃了 {itemName}。",
    "第 {day} 天：{adventurerName} 靠 {itemName} 填饱了肚子，来源是{sourceText}。"
  ],
  daily_food_shortfall: [
    "第 {day} 天：{adventurerName} 今天没凑满伙食，还差 {shortfall}/{dailyNeed} 营养点。",
    "第 {day} 天：{adventurerName} 囊中羞涩，今日食物仍缺 {shortfall} 营养点。",
    "第 {day} 天：{adventurerName} 没能吃够，缺口 {shortfall} 营养点还在累积。"
  ],
  daily_food_stockpile: [
    "第 {day} 天：{adventurerName} 顺手又囤了些路粮（约 {nutrition} 营养点）。",
    "第 {day} 天：{adventurerName} 觉得该多备点吃的，又买了一些备用口粮。",
    "第 {day} 天：手头宽裕的 {adventurerName} 今天额外囤了约 {nutrition} 营养点的食物。"
  ],
  trail_ration_purchase: [
    "第 {day} 天：{adventurerName} 从{sourceText}购入 {quantity} 份 {itemName} 作路粮。",
    "第 {day} 天：{adventurerName} 为外出任务备了 {quantity} 份 {itemName}。",
    "第 {day} 天：{adventurerName} 在{sourceText}买了 {quantity} 份 {itemName}，塞进背包。"
  ],
  trail_ration_fallback: [
    "第 {day} 天：{adventurerName} 接任务 {questDisplayId} 时口粮不足，系统补发了 {quantity} 份 {itemName}。",
    "第 {day} 天：任务 {questDisplayId} 出发前，{adventurerName} 靠备用干粮补齐了 {quantity} 份 {itemName}。",
    "第 {day} 天：{adventurerName} 没能买齐路粮，只好带上 {quantity} 份 {itemName} 再出发。"
  ],
  trail_ration_shortfall: [
    "第 {day} 天：{adventurerName} 接下任务 {questDisplayId}，但路粮仍差一截，只能硬着头皮出发。",
    "第 {day} 天：任务 {questDisplayId} 出发前，{adventurerName} 没能凑齐足够口粮。",
    "第 {day} 天：{adventurerName} 背包里的食物不够撑完整趟任务 {questDisplayId}。"
  ],
  anchor_food_deficit: [
    "第 {day} 天：{adventurerName} 抿了抿嘴，低声说：「今天又没能吃饱……再这样下去，我可没力气帮你撑场面了。」",
    "第 {day} 天：{adventurerName} 看着空盘子叹气：「店主，这日子过得有点紧，能不能想想办法？」",
    "第 {day} 天：{adventurerName} 揉了揉肚子：「我不是贪嘴，只是这几天总差那么一口。」"
  ],
  quest_provision_transferred: [
    "第 {day} 天：你事先准备的 {quantity} 份 {itemName} 交给了 {adventurerName}（任务 {questDisplayId}）。",
    "第 {day} 天：{adventurerName} 接下任务 {questDisplayId} 时，收下了你供的 {quantity} 份 {itemName}。",
    "第 {day} 天：店主供粮到位：{quantity} 份 {itemName} 已转入 {adventurerName} 的背包。"
  ]
};

const storyEntryMeta: Record<StoryEventKey, {tone: StoryEntryTone; badge: string | null}> = {
  opening_day: {tone: "quest", badge: "开端"},
  task_created: {tone: "quest", badge: "委托"},
  daily_income: {tone: "reward", badge: "收益"},
  daily_retail_income: {tone: "reward", badge: "收益"},
  bailout_accepted: {tone: "reward", badge: "资助"},
  inn_retail_sale: {tone: "reward", badge: "零售"},
  item_received: {tone: "reward", badge: "入库"},
  adventurer_introduced_at_inn: {tone: "quest", badge: "新面孔"},
  adventurer_referred_for_quest: {tone: "quest", badge: "引介"},
  task_started: {tone: "quest", badge: "出发"},
  task_progress: {tone: "quest", badge: "推进"},
  task_completed: {tone: "reward", badge: "完成"},
  task_failed: {tone: "quest", badge: "失手"},
  task_lead_found: {tone: "quest", badge: "线索"},
  task_discovery_made: {tone: "reward", badge: "发现"},
  follow_up_unlocked: {tone: "quest", badge: "后续"},
  quiet_day: {tone: "neutral", badge: null},
  daily_food_met: {tone: "neutral", badge: "进食"},
  daily_food_shortfall: {tone: "quest", badge: "缺粮"},
  daily_food_stockpile: {tone: "neutral", badge: "囤货"},
  trail_ration_purchase: {tone: "neutral", badge: "路粮"},
  trail_ration_fallback: {tone: "quest", badge: "路粮"},
  trail_ration_shortfall: {tone: "quest", badge: "路粮"},
  anchor_food_deficit: {tone: "quest", badge: "缺粮"},
  quest_provision_transferred: {tone: "reward", badge: "供粮"}
};

export function createStoryEntry<TKey extends StoryEventKey>(
  key: TKey,
  variables: StoryTemplateMap[TKey]
): StoryEntry {
  const template = pickTemplate(key, variables);
  const text = template.replace(/\{(\w+)\}/g, (_, variableName: string) => {
    const value = variables[variableName as keyof StoryTemplateMap[TKey]];
    return String(value ?? "");
  });

  return {
    day: variables.day,
    text,
    tone: storyEntryMeta[key].tone,
    badge: storyEntryMeta[key].badge
  };
}

function pickTemplate<TKey extends StoryEventKey>(
  key: TKey,
  _variables: StoryTemplateMap[TKey]
): string {
  const templates = storyText[key];
  if (templates.length === 1) {
    return templates[0];
  }

  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

export {storyText};
