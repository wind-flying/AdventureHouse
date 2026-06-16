# 百科内容编写与接入指南

## 文件职责

- `config/encyclopedia.json`
  - 定义分类、条目、文本引用和解锁条件。
  - 不直接写玩家可见正文。
- `src/game/text/encyclopediaText.ts`
  - 集中保存百科标题、分类名、条目标题和正文。
  - 不写解锁判断或界面逻辑。
- `src/game/ui/encyclopedia.ts`
  - 负责解锁判断、渲染、已读记录和新条目提示。
- `src/game/core/types.ts`
  - 定义允许使用的解锁条件类型。

配置、文本和判断逻辑必须保持分离。

## 新增分类和条目

百科左侧只显示分类，不显示每个条目。玩家点选一个分类后，右侧会把该分类下所有已解锁条目按小标题分段展示。

先在文本文件中增加分类名和条目正文：

```ts
categories: {
  quests: "任务",
  growth: "冒险者养成"
},
entries: {
  giftBasics: {
    title: "赠送物品",
    paragraphs: [
      "你可以把合适的物品送给已经认识的冒险者。",
      "不同的人会用自己的方式回应这份心意。"
    ]
  }
}
```

再在 `config/encyclopedia.json` 中引用文本：

```json
{
  "id": "gift-basics",
  "categoryId": "growth",
  "textId": "giftBasics",
  "unlockConditions": [
    {
      "type": "firstAdventurerItemGifted"
    }
  ]
}
```

字段要求：

- `id`：稳定且唯一，发布后不要随意修改；已读记录使用该值。
- `categoryId`：必须引用现有分类。
- `textId`：必须对应 `encyclopediaText.entries` 中的键。
- `unlockConditions`：全部满足后条目才显示。

同一分类下可以有多个条目，用于把一个主题拆成多个分段；不要为了每个小问题新增分类。

## 当前解锁阶段

- `firstQuestPublished`
  - 玩家至少发布过一次任务后满足。
- `firstAdventurerItemGifted`
  - 玩家首次向具体冒险者赠送物品后满足。
  - 当前已预留条件类型；赠礼系统落地时，需要把对应玩家行为事实接入百科判断。

不要用天数代替实际行为，也不要为了未来规划提前写入无用途的存档字段。

## 新增解锁条件

新增条件时同步修改：

1. `src/game/core/types.ts`
   - 扩展 `EncyclopediaUnlockCondition`。
2. `src/game/ui/encyclopedia.ts`
   - 在 `EncyclopediaFacts` 增加玩家行为事实。
   - 在 `getEncyclopediaFacts` 中从游戏状态取得事实。
   - 在 `isUnlockConditionMet` 中处理新条件。
3. `config/encyclopedia.json`
   - 在需要的条目上使用新条件。

解锁判断应集中在百科模块，不要散落到按钮事件或各业务页面。

## 玩家可见文案

百科只解释玩家在游戏世界中能够理解的规则与现象。

禁止写入：

- 公式、概率权重和随机数范围
- 内部字段名、配置键和代码模块名
- 调参值、阈值和存档结构
- 尚未实现但被描述成已经可用的能力

推荐写法：

- 标题控制在 4 至 12 个汉字。
- 每个条目使用 1 至 4 段。
- 每段集中回答一个问题，通常不超过 100 字。
- 先说明玩家能做什么，再说明可能发生什么。
- 失败原因使用世界内语言，例如环境危险、准备不足或人选不合适。

## 新条目提示

条目首次满足条件后，右上角 `?` 按钮会显示提示动画。

- 打开百科时，当前已解锁条目会被标记为已读。
- 已读状态保存在独立的浏览器本地记录中，不进入游戏存档格式。
- 修改已经发布的条目 `id` 会使它被视为新条目，应避免无意义改名。

## 示例

任务条目：

```json
{
  "id": "quest-completion",
  "categoryId": "quests",
  "textId": "questCompletion",
  "unlockConditions": [
    {
      "type": "firstQuestPublished"
    }
  ]
}
```

未来养成条目：

```json
{
  "id": "growth-gifting",
  "categoryId": "growth",
  "textId": "giftBasics",
  "unlockConditions": [
    {
      "type": "firstAdventurerItemGifted"
    }
  ]
}
```

## 验收清单

- 分类、条目和文本引用均存在且唯一。
- 未满足条件时条目不可见。
- 满足条件后条目出现，`?` 按钮产生新内容提示。
- 打开百科后提示停止。
- 正文不包含内部实现信息。
- 遮罩、关闭按钮和 `Escape` 均可关闭百科。
- 窄屏下分类导航和正文仍可访问。
