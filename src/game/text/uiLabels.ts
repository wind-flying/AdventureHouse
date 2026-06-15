export const uiLabels = {
  summary: {
    day: "日期",
    money: "资金",
    activeQuests: "进行中任务",
    stockTotal: "库存总量",
    knownAdventurers: "已知冒险者"
  },
  saveControls: {
    export: "导出存档",
    import: "导入存档",
    reset: "清空存档"
  },
  navigation: {
    overview: "总览",
    quests: "任务",
    adventurers: "冒险者",
    intel: "消息板",
    stock: "库存",
    log: "日志",
    save: "存档"
  },
  panels: {
    overviewTitle: "总览",
    overviewDescription: "看摘要、看最近任务、决定下一步节奏。",
    todaySummaryTitle: "今天概况",
    todaySummaryDescription: "当前版本先把核心状态集中到这里，后续可接冒险者和建筑摘要。",
    recentQuestsTitle: "最近任务",
    recentQuestsDescription: "这里只显示最近几项，完整列表和发布入口在任务页查看。",
    questsTitle: "任务",
    questsDescription: "这里同时负责发布任务和查看当前委托状态。",
    publishQuestTitle: "发布任务",
    publishQuestDescription: "当前保留资源委托模型，并显示预估耗时。",
    questListTitle: "任务列表",
    questListDescription: "查看当前所有委托及其推进状态。",
    adventurersTitle: "冒险者",
    adventurersDescription: "这里只显示你真正接触或听闻过的人，而不是完整名单。",
    intelTitle: "消息板",
    intelDescription: "自动收录已得到的线索与发现，让这些结果从日志里独立出来。",
    stockTitle: "库存",
    stockDescription: "当前先集中显示据点已有资源，后续可扩展为加工与出售界面。",
    logTitle: "日志",
    logDescription: "完整记录最近一段时间的每日结果，方便回溯。",
    latestStoriesTitle: "今日动态",
    saveTitle: "存档",
    saveDescription: "管理当前进度的导出、导入与清空。"
  },
  overviewNotes: {
    income: "营业收入",
    pace: "玩法节奏",
    focus: "当前重点",
    incomeValueSuffix: "钱 / 天",
    paceValue: "手动进入下一天",
    focusValue: "通过委托补货并观察回流结果"
  },
  form: {
    templateType: "任务类型",
    publishMode: "委托形式",
    statusFilter: "状态筛选",
    natureFilter: "性质筛选",
    adventurerLevelFilter: "认知筛选",
    adventurerStatusFilter: "人物状态",
    adventurerPinnedFilter: "置顶分组",
    reward: "奖励金额",
    stockReward: "采购预算",
    intelReward: "悬赏金额",
    quantity: "需求数量",
    quantityLocked: "调查委托不按数量结算",
    createQuest: "发布任务",
    nextDay: "进入下一天"
  },
  questCard: {
    prefix: "任务",
    collect: "目标",
    investigate: "关注",
    result: "结果",
    resultReason: "原因",
    risk: "风险",
    nature: "性质",
    reward: "悬赏",
    estimatedDuration: "预计总耗时",
    createdDay: "发布于第",
    daySuffix: "天"
  },
  adventurerCard: {
    impression: "印象",
    preference: "倾向",
    personality: "性格",
    currentStatus: "近况",
    lastCompleted: "上次完成",
    motive: "动机",
    pin: "置顶",
    unpin: "取消置顶",
    pinnedSection: "置顶人物",
    othersSection: "其他人物"
  },
  intelBoard: {
    leadsTitle: "线索",
    discoveriesTitle: "发现",
    leadsDescription: "调查类任务带回的后续方向与可追踪信息。",
    discoveriesDescription: "异常任务留下的发现记录，后续可接更具体的结果系统。",
    line: "相关主题",
    source: "来源",
    method: "获得方式",
    status: "状态",
    emptyLeads: "还没有整理出新的线索。",
    emptyDiscoveries: "还没有记录到新的发现。"
  }
} as const;
