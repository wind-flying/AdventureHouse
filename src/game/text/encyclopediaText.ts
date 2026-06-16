export interface EncyclopediaEntryText {
  title: string;
  paragraphs: string[];
}

export const encyclopediaText = {
  triggerLabel: "打开百科",
  title: "冒险屋百科",
  close: "关闭",
  newEntryHint: "有新的百科条目",
  emptyTitle: "百科尚未收录内容",
  emptyDescription: "在冒险屋中开始行动后，新的说明会逐步出现在这里。",
  categories: {
    quests: "任务"
  },
  entries: {
    questKinds: {
      title: "日常任务与非日常任务",
      paragraphs: [
        "日常任务是冒险屋经常会遇到的常规委托，例如收集、补货或处理反复出现的需求。它们通常不会因为完成一次就永远消失。",
        "非日常任务更接近一次特别的调查、探索或事件。它们往往与某条线索或某段经历有关，是否还能再次发布，要看事情本身是否仍有继续处理的必要。"
      ]
    },
    questCompletion: {
      title: "任务如何完成",
      paragraphs: [
        "任务发布后，需要先等合适的冒险者接取。有人接下委托后，会离开冒险屋去处理任务，并在经过一段时间后带回结果。",
        "任务成功时，冒险屋会收到委托约定的成果，或得到新的线索与发现。任务所需的时间和冒险者是否愿意接取，都可能因委托内容而不同。"
      ]
    },
    questFailure: {
      title: "为什么任务会失败",
      paragraphs: [
        "冒险者并不总能顺利完成委托。危险的环境、困难的目标、紧迫的时间，以及冒险者自身是否适合这份工作，都会影响最后的结果。",
        "失败不一定意味着毫无收获。有些冒险者仍可能带回见闻，让你更了解任务遇到了什么问题，并为之后的选择提供参考。"
      ]
    },
    questRepeatability: {
      title: "为什么有些任务可以循环",
      paragraphs: [
        "镇上的一些需求会不断出现。只要居民仍需要物资、道路仍需维护，或某类麻烦再次发生，同类日常任务就可能继续发布。",
        "另一些任务只在特定事情尚未解决时存在。它们可能需要等待当前委托返回，或随着新的线索出现而变化，因此不会像日常任务一样随时重复。"
      ]
    }
  } satisfies Record<string, EncyclopediaEntryText>
};
