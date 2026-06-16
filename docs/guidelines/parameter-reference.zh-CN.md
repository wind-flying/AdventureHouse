# 参数解释文档

## 文档用途

这份文档不是第一眼给设计师看的入门指南，而是一份配置参数百科。

适合在这些情况下查阅：

- 看到一个字段，不确定它到底控制什么
- 不知道这个字段应该去哪个目录改
- 想确认某个字段和哪些字段一起配才有意义
- 想判断一个字段是核心参数、辅助参数，还是兼容字段

它和其他文档的区别是：

- `adventurer-template-design-rules.zh-CN.md`
  - 讲冒险者模板应怎么设计
- `quest-template-design-rules.zh-CN.md`
  - 讲任务模板应怎么设计
- `text-content-authoring-guide.zh-CN.md`
  - 讲文本应该写到哪里
- 本文
  - 讲字段本身是什么意思

## 配置目录总览

### 结构与数值

- `config/adventurers/`
- `config/quests/`
- `config/intel/`
- `config/names/`

这些目录主要放：

- `id`
- 标签
- 数值
- 区间
- 解锁关系
- 结果关系

### 世界观正文

- `config/text/adventurers/`
- `config/text/quests/`
- `config/text/intel/`
- `config/text/adventurer-introductions.json`

这些目录主要放：

- 名称
- 标题
- 描述
- 动机
- 印象
- 传闻
- 接触事件文本

### 程序层固定句式

- `src/game/text/storyText.ts`

这里主要还是外层日志句式，不是主要世界观正文源。

## 冒险者模板参数

对应目录：

- `config/adventurers/`

对应类型：

- `AdventurerTemplate`

### `id`

作用：

- 模板唯一标识
- 用于结构配置、文本配置、生成逻辑之间对齐

常见关系：

- 常与 `textId` 对应
- 常被任务侧标签或后续特殊逻辑引用

### `textId`

作用：

- 指向 `config/text/adventurers/` 里的正文块

常见关系：

- 没有特殊需求时，通常和 `id` 保持一致

### `roleType`

类型：

- `anchor`
- `adventurer`

作用：

- 区分固定叙事角色和普通冒险者角色

使用建议：

- 开场锚点角色通常用 `anchor`
- 普通可生成人物通常用 `adventurer`

### `spawnMode`

类型：

- `unique`
- `repeatable`

作用：

- 控制同一个模板能否在同一存档中生成多个实例

使用建议：

- 固定叙事角色、一次性特殊角色使用 `unique`
- 普通职业原型和地区人物原型使用 `repeatable`

注意：

- 它控制模板的复用方式，不是人物稀有度
- `repeatable` 生成的每个人都会取得不同 `instanceId`

### `namePoolId`

作用：

- 指向 `config/names/` 中的名字池

使用建议：

- 普通模板优先用名字池
- 固定角色可以不用名字池，直接在文本侧写固定名字

### `archetypeTags`

作用：

- 定义这类人物属于哪些原型类别

当前用途：

- 任务会用它判断“更容易吸引什么人”
- 新人生成时会用它参与模板筛选

常见误解：

- 它不是人物故事简介
- 它也不直接等于成功率加成

### `introductionTags`

作用：

- 定义这个模板更适合通过什么渠道进入玩家视野

当前常见值：

- `inn_introduction`
- `quest_referral`

### `knownByDefault`

作用：

- 是否开局就已进入玩家视野

使用建议：

- 固定角色常为 `true`
- 普通生成模板通常为 `false`

### `discoveryLevel`

类型：

- `heard`
- `seen`
- `acquainted`
- `familiar`
- `trusted`

作用：

- 定义初始认识层级

常见关系：

- 开局已知角色通常高于普通新接触角色

### `preferences`

作用：

- 冒险者偏好的任务/资源倾向描述

当前作用：

- 参与接任务判断和人物风味表达

注意：

- 它是偏好，不是能力

### `personality`

作用：

- 人格基准值

当前轴：

- `diligence`
- `courage`
- `greed`
- `sociability`
- `caution`
- `curiosity`
- `discipline`
- `resilience`

使用建议：

- 这里写的是模板中心值
- 不是某次生成的最终实例值

### `personalityRanges`

作用：

- 人格轴的模板区间

结构：

- `{ min, max }`

当前状态：

- 代码支持
- 但不建议在没有正式设计结论时随手填写

注意：

- 没写时会回落到统一默认振幅
- 写了之后，生成会以 `base/min/max` 为边界做中心集中采样

### `capabilities`

作用：

- 能力基准值

当前轴：

- `physique`
- `survival`
- `exploration`
- `observation`
- `combat`

使用建议：

- 这里是模板原型的正式底子
- 不是实例最终值

### `capabilityRanges`

作用：

- 能力轴的模板区间

结构：

- `{ min, max }`

当前状态：

- 和 `personalityRanges` 一样，属于已支持但需谨慎使用的字段

### `designerNote`

作用：

- 给设计师自己看的备注

注意：

- 不参与正式玩家展示
- 不应承载系统逻辑

## 冒险者正文参数

对应目录：

- `config/text/adventurers/`

### `name`

作用：

- 人物显示名

当前支持：

- 单条字符串
- 字符串数组

注意：

- 普通模板如果依赖名字池，通常这里可以留空
- 固定角色更适合在这里写固定名字

### `title`

作用：

- 称号或职业标题

当前支持：

- 单条字符串
- 字符串数组

### `motive`

作用：

- 人物动机文本

当前支持：

- 单条字符串
- 字符串数组

### `impression`

作用：

- 玩家初见印象文本

当前支持：

- 单条字符串
- 字符串数组

### `rumor`

作用：

- 传闻文本

当前支持：

- 单条字符串
- 字符串数组

注意：

- 普通模板更适合写成数组
- 固定角色可以先写单条

## 名字池参数

对应目录：

- `config/names/`

对应类型：

- `NamePoolDefinition`

### `id`

作用：

- 名字池唯一标识

### `surnames`

作用：

- 可复用姓氏池

### `givenNames`

作用：

- 可复用名字池

说明：

- 当前生成方式是“随机取一个姓 + 一个名”
- 名字池属于复用素材层，不应复制到每个模板里

## 任务模板参数

对应目录：

- `config/quests/`

对应类型：

- `QuestTemplate`

### 身份与文本定位

#### `id`

作用：

- 任务模板唯一标识

#### `textId`

作用：

- 指向 `config/text/quests/` 中的正文块

#### `lineId`

作用：

- 任务线标识

用途：

- 把同一主线或同一组相关任务串起来

#### `lineTitle`

作用：

- 任务线标题

建议：

- 正式正文优先放到文本目录

### 解锁与分支

#### `unlockConditions`

作用：

- 控制任务何时出现在可发布列表

当前常用类型：

- `default`
- `questResult`
- `intelReceived`

#### `unlockMode`

作用：

- 多条件时按 `all` 还是 `any` 判断

当前如果不写，通常按默认逻辑处理。

### 任务体验核心

#### `risk`

类型：

- `safe`
- `risky`
- `dangerous`

作用：

- 玩家感知的风险级别
- 参与接任务和结算判断

#### `nature`

类型：

- `routine`
- `supply`
- `investigation`
- `mysterious`

作用：

- 任务气质
- 任务的系统定位

#### `difficulty`

类型：

- `easy`
- `medium`
- `hard`

作用：

- 任务总体难度级别

#### `timingMode`

类型：

- `byDifficulty`
- `fixed`

作用：

- 决定耗时是按系统估算还是写死

#### `fixedDurationDays`

作用：

- 当 `timingMode = "fixed"` 时的固定天数

#### `minReward` / `maxReward`

作用：

- 任务奖励区间

注意：

- `resource` 任务和 `lead` 任务都可能用到奖励
- 奖励会影响任务是否有吸引力

### 结果与回报

#### `resultMode`

类型：

- `resource`
- `lead`
- `discovery`

作用：

- 定义任务主要回报类型

#### `resource`

作用：

- `resource` 任务回报的资源类型

#### `resultIntelId`

作用：

- 成功时固定带回一条线索或发现

#### `resultIntelPoolIds`

作用：

- 成功时从一组线索或发现里抽一条

#### `failureIntelId`

作用：

- 失败时带回的专属线索或失败信息

### 发布与可见性

#### `publicationMode`

类型：

- `repeatable`
- `uniqueWhileOpen`

作用：

- 控制同模板在未结算前是否允许重复挂单

#### `publishMode`

类型：

- `stock`
- `intel`

作用：

- 表示这任务更偏日常供给，还是更偏线索推进

#### `successVisibility`

类型：

- `stay`
- `hide`

作用：

- 成功后任务模板是否继续保留在发布列表

#### `failureVisibility`

类型：

- `stay`
- `hide`

作用：

- 失败后任务模板是否继续保留在发布列表

典型组合：

- `hide / hide`
  - 出结果后就退场
- `hide / stay`
  - 失败可重试，成功后结束
- `stay / stay`
  - 成功失败都可重复

### 人物流通与新人承接

#### `preferredArchetypeTags`

作用：

- 这任务更容易吸引哪些人物原型

当前用途：

- 影响新人生成时优先选哪些模板

#### `allowGeneratedTaker`

作用：

- 是否允许陌生人通过这任务进入承接链

理解方式：

- `true`
  - 这单可以流到街面上
- `false`
  - 这单更像在已认识名册里消化

#### `generatedTakerWeight`

作用：

- 在允许陌生人承接的前提下，进一步控制“新人承接渠道”的开放度

理解方式：

- 它不是“谁更适合”
- 它更像“这任务有多街面化”

使用建议：

- 优先先定 `allowGeneratedTaker`
- 再定 `preferredArchetypeTags`
- 最后才微调这个值

### 隐藏特征与测试字段

#### `features`

作用：

- 任务隐藏特征轴

当前轴：

- `danger`
- `challenge`
- `durationPressure`
- `uncertainty`
- `investigationComplexity`
- `reportDifficulty`
- `stability`

说明：

- 这是正式系统参数
- 但更偏公式层，不是第一批新手设计参数
- 后续应补单独的特征百科

#### `designerNote`

作用：

- 给设计师自己的备注

## 线索与发现参数

对应目录：

- `config/intel/`
- `config/text/intel/`

对应类型：

- `IntelDefinition`

### `id`

作用：

- 线索或发现的唯一标识

### `textId`

作用：

- 指向 `config/text/intel/` 里的正文块

### `kind`

类型：

- `lead`
- `discovery`

作用：

- 区分这是可跟进线索，还是更明确的发现

### `lineId`

作用：

- 所属线索链 / 任务线

### `lineTitle`

作用：

- 该线的标题文本

### `title`

### `content`

说明：

- 正式正文优先放在文本目录
- 当前支持单条字符串或数组

### `designerNote`

作用：

- 设计师备注

## 接触来源文本参数

对应目录：

- `config/text/adventurer-introductions.json`

当前示例：

- `adventurer_introduced_at_inn`
- `adventurer_referred_for_quest`

作用：

- 控制新人进入玩家视野时的外层文案

说明：

- 这是“接触事件文本池”
- 不是冒险者模板正文

## 程序运行与存档相关字段

这类字段通常不是设计师高频手配参数，但查阅时经常会碰到。

### `instanceId`

位置：

- 运行时冒险者实例

作用：

- 区分“这个具体的人”

### `templateId`

位置：

- 运行时冒险者实例

作用：

- 表明实例来源于哪个模板

### `originType`

类型：

- `handcrafted`
- `generated`

作用：

- 区分是手作实例还是生成实例

### `knownLevel`

作用：

- 当前认识层级

### `currentQuestId`

作用：

- 当前是否正在执行某个任务

### `adventurerIdCounter`

位置：

- 游戏运行状态与存档

作用：

- 分配下一个生成冒险者的稳定实例 id
- 防止同模板重复生成时发生身份冲突

注意：

- 这是持久化基础设施字段，不由内容设计师手工配置
- 读档时会根据现有实例再次校正，避免计数器倒退

### `resultInsightLevel`

位置：

- 玩家存档

作用：

- 控制玩家能看到多少条正式结果原因

注意：

- 它属于长期状态事实
- 不属于展示层临时文本

## 文本数组支持总表

当前支持数组随机的主要字段：

- 冒险者正文
  - `name`
  - `title`
  - `motive`
  - `impression`
  - `rumor`
- 任务正文
  - `title`
  - `description`
  - `lineTitle`
  - `focusText`
- 线索正文
  - `title`
  - `content`
  - `lineTitle`
- 接触来源文案
  - 直接写成数组

## 当前不建议误用的字段

### 不要把正文写回结构配置

例如：

- 不要把大量任务正文重新塞回 `config/quests/`
- 不要把大量人物正文重新塞回 `config/adventurers/`

### 不要把 `designerNote` 当逻辑字段

它只是备注，不应被系统读取为正式规则。

### 不要把 `generatedTakerWeight` 当主设计抓手

它是微调字段，不是第一决策字段。

### 不要在没有结论时乱填区间参数

`personalityRanges` / `capabilityRanges` 已经支持，但不是“先写上再说”的字段。

## 当前仍不完整的部分

这份百科已经覆盖当前主线配置的大部分常用字段，但仍有后续可补空间：

- `features` 的单独详细解释
- 结果标签与解释层的完整参数百科
- 更细的 UI / 筛选辅助字段百科

当前这份文档的目标是先覆盖：

- 主创作参数
- 主文本参数
- 主流通参数
- 主结果参数
