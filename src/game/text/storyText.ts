import type {StoryEntry, StoryEntryTone} from "../types";

type StoryEventKey =
  | "opening_day"
  | "task_created"
  | "daily_income"
  | "task_started"
  | "task_progress"
  | "task_completed"
  | "task_failed"
  | "task_lead_found"
  | "task_discovery_made"
  | "follow_up_unlocked"
  | "quiet_day";

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
  ]
};

const storyEntryMeta: Record<StoryEventKey, {tone: StoryEntryTone; badge: string | null}> = {
  opening_day: {tone: "quest", badge: "开端"},
  task_created: {tone: "quest", badge: "委托"},
  daily_income: {tone: "reward", badge: "收益"},
  task_started: {tone: "quest", badge: "出发"},
  task_progress: {tone: "quest", badge: "推进"},
  task_completed: {tone: "reward", badge: "完成"},
  task_failed: {tone: "quest", badge: "失手"},
  task_lead_found: {tone: "quest", badge: "线索"},
  task_discovery_made: {tone: "reward", badge: "发现"},
  follow_up_unlocked: {tone: "quest", badge: "后续"},
  quiet_day: {tone: "neutral", badge: null}
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
