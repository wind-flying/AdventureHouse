# 任务文件编写指南

> 当前状态：本文包含早期测试主题的历史写法。当前正式任务内容已集中到 `config/quests/prologue.json`，旧主题路径仅供追溯，不应照搬为当前文件清单。

## 文档用途

这份文档的目标是：

- 后续新增一个任务主题文件时，不需要去翻别的代码文件
- 只看这份文档，就能按当前项目标准写出一个新的任务文件
- 明确哪些字段已经正式可用，哪些字段只是测试阶段会用到

当前任务配置已按主题拆分在：

- `config/quests/base.json`
- `config/quests/forest.json`
- `config/quests/mine.json`
- `config/quests/river.json`
- `config/quests/town.json`
- `config/quests/validation.json`

当前线索 / 发现配置已按主题拆分在：

- `config/intel/forest.json`
- `config/intel/town.json`
- `config/intel/river.json`

线索库的具体写法，建议同时参考：

- [intel-authoring-guide.zh-CN.md](/home/windflying/Code/AdventureHouse/docs/notes/intel-authoring-guide.zh-CN.md)

从 `v0.9` 开始，任务模板除了公开给玩家看的：

- `risk`
- `difficulty`
- `timingMode`

还可以逐步补一层给公式使用的隐藏特征：

- `features`

这一层主要服务于：

- 任务结算公式
- 后续更细的任务差异化

不会直接把所有内部数值都展示给玩家。

后续如果要新增一条新的主题线，推荐直接新建：

- `config/quests/<你的主题名>.json`

例如：

- `config/quests/mine.json`
- `config/quests/church.json`
- `config/quests/north-road.json`

如果你要写的是“边界/异常样例”，而不是正式主题线，推荐新建或继续补：

- `config/quests/validation.json`

这个文件的用途是：

- 放故意不完整的内容样例
- 验证兜底文本、回退逻辑、解锁条件边界
- 不与正式主题线混在一起

系统会自动加载 `config/quests/` 目录下的任务文件。

## 当前任务线归属写法

如果某条任务明确属于某一条主题线，当前推荐在任务模板里补：

```json
{
  "id": "forest-trace",
  "lineId": "forest-anomaly",
  "lineTitle": "森林异动线"
}
```

含义：

- `lineId`：程序使用的任务线标识
- `lineTitle`：给玩家显示的任务线名称

这层目前还是轻量归属信息，不是完整任务树。
它当前主要用于：

- 让线索板能显示“所属线”
- 让后续任务和线索更容易按主题整理

## 最小可用例子

下面是一个可以直接作为参考的最小任务模板：

```json
{
  "questTemplates": [
    {
      "id": "mine-stone-restock",
      "title": "矿区石料补充",
      "description": "去旧矿区附近收回常用石料，适合日常补货。",
      "unlockConditions": [
        {
          "type": "default"
        }
      ],
      "resultMode": "resource",
      "publicationMode": "repeatable",
      "publishMode": "stock",
      "risk": "safe",
      "nature": "supply",
      "resource": "stone",
      "minReward": 2,
      "maxReward": 5,
      "difficulty": "easy",
      "timingMode": "byDifficulty"
    }
  ]
}
```

这条模板表示：

- 这是一条默认可见的补货任务
- 会产出资源
- 可以重复发布
- 发布时属于“补货委托”表单
- 风险较低
- 耗时按当前难度规则估算

## 带后续的例子

下面是一个带后续条件的调查任务例子：

```json
{
  "questTemplates": [
    {
      "id": "forest-trace",
      "title": "林间异动追踪",
      "description": "沿林边踪迹调查异常动静。",
      "unlockConditions": [
        {
          "type": "default"
        }
      ],
      "resultMode": "lead",
      "publicationMode": "uniqueWhileOpen",
      "publishMode": "intel",
      "focusText": "林边异动与延伸足迹",
      "risk": "risky",
      "nature": "investigation",
      "minReward": 4,
      "maxReward": 7,
      "difficulty": "medium",
      "timingMode": "fixed",
      "fixedDurationDays": 3
    },
    {
      "id": "forest-deeper-trace",
      "title": "沿足迹继续深入",
      "description": "根据先前带回的线索，继续沿林间足迹深入调查。",
      "unlockConditions": [
        {
          "type": "intelReceived",
          "intelId": "forest-trace-lead"
        }
      ],
      "resultMode": "lead",
      "publicationMode": "uniqueWhileOpen",
      "publishMode": "intel",
      "focusText": "更深处的林间足迹",
      "risk": "risky",
      "nature": "investigation",
      "minReward": 6,
      "maxReward": 10,
      "difficulty": "medium",
      "timingMode": "fixed",
      "fixedDurationDays": 3
    }
  ]
}
```

这表示：

- 第一条任务默认可见
- 第二条任务默认不显示
- 只有当前一条任务带回指定线索后，后一条任务才会出现

## 字段说明

### `id`

- 类型：字符串
- 作用：任务模板的唯一标识
- 要求：必须全项目唯一

推荐写法：

- 用英文短词
- 用中划线分段
- 尽量包含主题名

例如：

- `forest-trace`
- `river-watch`
- `mine-stone-restock`

不建议：

- `task1`
- `abc`
- `newQuest`

### 如何检查 `id` 是否重复

当前最直接的做法是全局搜索：

```bash
rg '"id":' config/quests
```

如果你只想检查某个 id 是否已存在：

```bash
rg 'forest-trace' config/quests
```

当前项目还没有专门的“重复 id 校验器”，所以新增任务前最好手动查一下。

后续如果任务和线索文件继续增多，建议补一个专门的内容校验工具，统一检查：

- 任务 id 是否重复
- 引用的线索是否存在
- 开启条件是否引用了不存在的目标

## 显示与说明字段

### `title`

- 玩家看到的任务标题
- 应该尽量像任务名，而不是内部备注

### `description`

- 玩家看到的任务简述
- 用来说明这条任务的大致意图

### `designerNote`

- 研发备注
- 当前测试阶段可以写
- 正式内容里应逐步减少直接暴露

### `features`

- 类型：可选对象
- 当前用途：
  - 给任务补“隐藏特征输入”
  - 让公式不再长期只靠粗粒度的 `risk / difficulty / duration`
- 当前已支持的字段：
  - `danger`
  - `challenge`
  - `durationPressure`
  - `uncertainty`
  - `investigationComplexity`
  - `reportDifficulty`
  - `stability`

示例：

```json
"features": {
  "danger": 0.58,
  "challenge": 0.56,
  "durationPressure": 0.32,
  "uncertainty": 0.54,
  "investigationComplexity": 0.62,
  "reportDifficulty": 0.46,
  "stability": 0.55
}
```

当前约定：

- 长期建议直接写 `0 ~ 100` 的原始值
- 当前代码会兼容旧的 `0 ~ 1` 写法，但后续新内容不建议继续沿用
- 如果不写，系统会先根据公开字段自动生成回退值
- 但正式进入 `v0.9` 结算测试的任务，建议明确写出这组字段

## 开启条件字段

### `unlockConditions`

- 类型：数组
- 作用：定义这条任务在什么条件下可见

这是后续主线与碎片叙事开启的正式骨架。

当前已支持的条件写法如下。

### 1. 默认可见

```json
"unlockConditions": [
  {
    "type": "default"
  }
]
```

### 2. 某任务结果触发

```json
"unlockConditions": [
  {
    "type": "questResult",
    "templateId": "forest-trace",
    "outcome": "success"
  }
]
```

可选值：

- `outcome: "success"`
- `outcome: "failure"`

如果以后逻辑扩展，也可以支持更复杂的条件组合。

### 3. 线索触发

当前已经支持这种写法。

可以写成：

```json
"unlockConditions": [
  {
    "type": "intelReceived",
    "intelId": "forest-trace-lead"
  }
]
```

含义：

- 当玩家已经获得指定线索
- 这个任务就会出现

当前更推荐优先使用 `intelId`，而不是只靠宽泛的 `kind` 或 `sourceTemplateId`。

### `unlockMode`

- 可选
- 用于控制多条件的组合方式

当前可写：

- `"all"`：全部条件满足才出现
- `"any"`：满足任意一个条件就出现

如果不写，默认按 `"all"` 处理。

当前已经可以用它来表达：

- 集齐多条线索才开启一条任务
- 任意一条线索出现就开启一条任务

例如“任意一条都能开启”的写法：

```json
"unlockConditions": [
  {"type": "intelReceived", "intelId": "forest-trace-lead"},
  {"type": "intelReceived", "intelId": "forest-deeper-trace-lead"},
  {"type": "intelReceived", "intelId": "forest-echo-source-lead"}
],
"unlockMode": "any"
```

## 结果相关字段

### `resultMode`

当前可选：

- `"resource"`：给资源
- `"lead"`：给线索
- `"discovery"`：给发现

选择建议：

- 补货 / 日常：优先 `resource`
- 调查：优先 `lead`
- 异常：优先 `discovery`

### `resultIntelPoolIds`

- 可选
- 作用：任务成功后，不固定给一条线索，而是从线索池里随机抽一条

例如：

```json
"resultIntelPoolIds": [
  "town-rumor-cart-lead",
  "town-rumor-lantern-lead",
  "town-rumor-bundle-lead"
]
```

当前规则：

- 如果写了 `resultIntelPoolIds`
- 系统会优先从池里随机抽一条
- 如果随机池为空，再回退到 `resultIntelId`

## 发布方式字段

### `publicationMode`

当前可选：

- `"repeatable"`：可重复发布
- `"uniqueWhileOpen"`：只要同模板还有未接/进行中的任务，就不能重复发布

建议：

- 补货 / 日常：通常用 `repeatable`
- 调查 / 异常：很多更适合 `uniqueWhileOpen`

### `successVisibility` / `failureVisibility`

- 可选
- 分别控制成功或失败后，模板是否继续保留在可发布列表
- `"stay"`：对应结果后仍可再次发布
- `"hide"`：对应结果后从可发布列表退出

可以这样理解：

- `publicationMode` 控制“进行中时能不能重复发”
- `successVisibility / failureVisibility` 控制“做完后还会不会再出现”

### `publishMode`

当前可选：

- `"stock"`：补货委托
- `"intel"`：调查委托

影响：

- 表单展示方式
- 奖励文案
- 数量输入是否显示
- 任务卡目标描述

建议：

- 补货 / 日常：`stock`
- 调查 / 异常：`intel`

## 任务性质字段

### `risk`

当前可选：

- `"safe"`
- `"risky"`
- `"dangerous"`

### `nature`

当前可选：

- `"routine"`
- `"supply"`
- `"investigation"`
- `"mysterious"`

### `resource`

- 当前用于补货 / 日常任务
- 作用：
  - 资源回报
  - 库存增加
  - 冒险者资源偏好匹配

建议：

- `publishMode: "stock"` 时写 `resource`
- `publishMode: "intel"` 时通常不要再写 `resource`

### `focusText`

- 当前主要用于调查 / 异常任务
- 作用：
  - 声明这条委托实际关注的调查主题
  - 用于发布表单、任务卡、日志与今日动态显示

例如：

```json
"focusText": "河谷营地动静与夜间往返"
```

建议：

- `publishMode: "intel"` 时优先写 `focusText`
- 不要再把调查任务硬挂在某个经济资源上
- 只有确实是补货/采集目标时，才继续使用 `resource`

## 报酬与耗时字段

### `minReward` / `maxReward`

- 用于给表单推荐值提供范围
- 当前不是最终经济系统，只是当前原型的推荐预算区间

### `difficulty`

当前可选：

- `"easy"`
- `"medium"`
- `"hard"`

### `timingMode`

当前可选：

- `"byDifficulty"`：按当前难度规则估算
- `"fixed"`：使用固定天数

### `fixedDurationDays`

- 只有 `timingMode: "fixed"` 时才需要

## 目前哪些字段是正式骨架，哪些是测试字段

### 建议长期保留的正式骨架

- `id`
- `title`
- `description`
- `unlockConditions`
- `unlockMode`
- `resultMode`
- `publicationMode`
- `publishMode`
- `risk`
- `nature`
- `resource`
- `focusText`
- `minReward`
- `maxReward`
- `difficulty`
- `timingMode`
- `fixedDurationDays`

### 设计备注字段

- `designerNote`

## 编写新主线文件的推荐步骤

1. 先想清楚这条线属于哪个主题  
   例如森林、河谷、矿道、教堂。

2. 新建一个主题文件  
   例如 `config/quests/forest.json`。

3. 先写一条默认可见的起始任务  
   不要一开始就把整条线都铺太深。

4. 再写一条后续任务  
   用 `unlockConditions` 连接前一条任务结果。

5. 如有必要，用 `designerNote` 记录设计目的。

6. 最后检查 `id` 是否重复。

## 当前建议

如果你现在只是想验证一条新的主线，不要一口气写很多层。

更适合的节奏是：

- 先写 1 条起始任务
- 再写 1 条后续任务
- 确认链路成立
- 再继续扩

这样最稳，也最容易排查问题。

## 线索库写法（概览）

如果任务结果不是单纯给资源，而是要带回一条可沉淀的线索或发现，推荐写到 `config/intel/<主题名>.json`。

这里先只保留任务侧最需要知道的部分，线索字段的详细解释请看单独的线索库指南。

最小例子：

```json
{
  "intelDefinitions": [
    {
      "id": "forest-trace-lead",
      "kind": "lead",
      "title": "林间足迹延伸",
      "content": "林边留下的痕迹并没有在入口处消失，而是继续向更深处延伸。"
    }
  ]
}
```

字段说明：

当前线索对象至少有：

- `id`
- `kind`
- `title`
- `content`

## 任务如何引用线索

### `resultIntelId`

- 任务成功后引用哪条线索 / 发现

### `failureIntelId`

- 任务失败后引用哪条线索 / 发现

例如：

```json
{
  "id": "forest-trace",
  "title": "林间异动追踪",
  "resultMode": "lead",
  "resultIntelId": "forest-trace-lead"
}
```

这表示：

- 任务成功后
- 不再临时拼一段线索文本
- 而是直接引用线索库中的 `forest-trace-lead`

## 当前推荐做法

如果你在新增一条调查任务，比较推荐这样配：

1. 先在 `config/intel/<主题名>.json` 写好线索
2. 再在 `config/quests/<主题名>.json` 中用 `resultIntelId` 或 `failureIntelId` 引用
3. 如果后续需要用线索开启任务，再在 `unlockConditions` 里逐步接入线索条件

## 当前已实现 vs 后续规划

为了避免把“已经能用”和“以后准备支持”混在一起，这里做一个短区分。

### 当前已实现

- 任务成功后用 `resultIntelId` 引用线索
- 任务失败后用 `failureIntelId` 引用线索
- 线索文件按主题拆分并自动加载
- `resultIntelPoolIds` 随机线索池
- `successVisibility / failureVisibility` 结果后可见性控制

### 后续规划，当前不要自己先写

- 用多条线索组合解锁新任务

这些方向都合理，但当前还没有正式接口，不建议现在自己提前在配置里发明字段。
