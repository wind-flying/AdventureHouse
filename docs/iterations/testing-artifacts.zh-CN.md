# 测试专用项登记

> 当前状态：历史归档。本文保留过去各迭代曾使用的测试字段、测试主题和旧文件路径，不代表这些文件当前仍存在。自 `v0.13` 收口后，不再维护与正式内容并行的技术测试矩阵或模拟脚本；公式问题优先直接审查正式公式、参数和边界。

## 文档用途

这份文档用于集中记录当前项目中“只为了原型验证、测试方便、临时区分内容”而引入的字段、标签、备注和行为控制项。

目的不是阻止使用测试字段，而是防止它们散落在代码里，后续被误认为正式设定的一部分。

每次新增测试专用项时，默认都应在这里登记，至少写清楚：

- 名称
- 类型
- 当前用途
- 出现位置
- 后续处理方向

## 使用原则

- 测试专用项只应用于一个明确目的：
  - 绕过大量前置流程，直接验证当前模块
- 如果不引入它，也不会显著浪费时间在搭建前置条件上，就不应新增测试字段、测试模式或测试内容
- 不应为了“以后也许会用”先行增加额外模式
- 测试内容的价值在于缩短验证路径，而不是扩充一套与正式系统并行的临时机制

## 历史登记项

### 1. `contentStageTag: "test"`

- 类型：配置字段
- 当前用途：
  - 标记当前任务模板、冒险者模板属于功能验证内容
  - 帮助区分“正式世界观内容”和“当前仅用于测试的内容”
- 出现位置：
  - [base.json](/home/windflying/Code/AdventureHouse/config/quests/base.json)
  - [forest.json](/home/windflying/Code/AdventureHouse/config/quests/forest.json)
  - [river.json](/home/windflying/Code/AdventureHouse/config/quests/river.json)
  - [adventurers.json](/home/windflying/Code/AdventureHouse/config/adventurers.json)
  - [types.ts](/home/windflying/Code/AdventureHouse/src/game/types.ts)
- 后续处理方向：
  - 正式内容逐步补齐后，可继续保留为内部阶段标记
  - 但不应长期作为玩家界面的主要展示信息

### 2. `designerNote`

- 类型：配置字段
- 当前用途：
  - 说明当前模板的测试目的
  - 帮助快速对照“这个任务/角色是拿来验证什么的”
- 出现位置：
  - [base.json](/home/windflying/Code/AdventureHouse/config/quests/base.json)
  - [forest.json](/home/windflying/Code/AdventureHouse/config/quests/forest.json)
  - [river.json](/home/windflying/Code/AdventureHouse/config/quests/river.json)
  - [adventurers.json](/home/windflying/Code/AdventureHouse/config/adventurers.json)
  - [types.ts](/home/windflying/Code/AdventureHouse/src/game/types.ts)
- 后续处理方向：
  - 正式世界观内容补齐后，应逐步减少在玩家界面中的直接暴露
  - 可以保留为内部研发备注

### 3. 原型化冒险者命名

- 类型：测试内容策略
- 当前用途：
  - 当前冒险者使用“稳妥补给型 / 异常调查型 / 高报酬偏好型”等原型命名
  - 目的是验证人格与任务行为，而不是确立正式人物设定
- 出现位置：
  - [adventurers.json](/home/windflying/Code/AdventureHouse/config/adventurers.json)
- 后续处理方向：
  - 正式人物设定阶段再替换为世界观内命名
  - 替换前应保留一份旧命名与测试目标的对照说明，避免失去验证语义

### 4. 测试任务模板文本

- 类型：测试内容策略
- 当前用途：
  - 当前任务模板包含“测试模板：用于验证……”这类描述
  - 用于明确这些任务是功能验证骨架，不代表正式世界观文案
- 出现位置：
  - [base.json](/home/windflying/Code/AdventureHouse/config/quests/base.json)
  - [forest.json](/home/windflying/Code/AdventureHouse/config/quests/forest.json)
  - [river.json](/home/windflying/Code/AdventureHouse/config/quests/river.json)
- 后续处理方向：
  - 正式任务线建立后逐步替换
  - 替换时应保留模板职责说明，避免丢失“这个任务原本验证什么”的历史信息

### 5. `followUpStageTag: "test-chain"`

- 类型：配置字段
- 当前用途：
  - 标记当前任务模板属于“带后续链的测试任务”
  - 便于在界面和文档中区分普通测试任务与链式测试任务
- 出现位置：
  - [forest.json](/home/windflying/Code/AdventureHouse/config/quests/forest.json)
  - [river.json](/home/windflying/Code/AdventureHouse/config/quests/river.json)
  - [types.ts](/home/windflying/Code/AdventureHouse/src/game/types.ts)
- 后续处理方向：
  - 正式任务链系统建立后，可转为内部阶段字段或被正式任务阶段系统替代

### 6. `testOutcomeMode`

- 类型：配置字段
- 当前用途：
  - 控制测试任务在当前原型中稳定走成功或失败结果
  - 避免链式任务测试完全依赖概率，便于复现和验收
- 出现位置：
  - [forest.json](/home/windflying/Code/AdventureHouse/config/quests/forest.json)
  - [river.json](/home/windflying/Code/AdventureHouse/config/quests/river.json)
  - [types.ts](/home/windflying/Code/AdventureHouse/src/game/types.ts)
- 后续处理方向：
  - 真正引入失败概率、属性结算和回传机制后，应逐步缩减为测试模式专用字段或移除

### 6.1 当前测试线索文本

- 类型：测试内容策略
- 当前用途：
  - `config/intel/forest.json` 和 `config/intel/river.json` 里的线索内容，目前仍服务于原型验证
  - 用于验证“任务引用线索库”这条结构本身是否成立
- 出现位置：
  - [forest.json](/home/windflying/Code/AdventureHouse/config/intel/forest.json)
  - [river.json](/home/windflying/Code/AdventureHouse/config/intel/river.json)
- 后续处理方向：
  - 正式世界观补齐后，逐步替换成真正的线索与发现内容
  - 线索库结构本身可以长期保留

### 6.2 `unlockMode: "any"` 测试链

- 类型：测试内容策略
- 当前用途：
  - 用森林线新增一条“任意拿到一条线索即可开启”的后续任务
  - 验证多候选线索开启并不只存在于文档说明中
- 出现位置：
  - [forest.json](/home/windflying/Code/AdventureHouse/config/quests/forest.json)
  - [forest.json](/home/windflying/Code/AdventureHouse/config/intel/forest.json)
- 后续处理方向：
  - 结构本身属于正式能力
  - 当前具体任务和线索内容仍属于测试样例，后续可替换为正式世界观内容

### 6.3 随机线索池与可重复刷线索测试链

- 类型：测试内容策略
- 当前用途：
  - 用一条镇口传闻调查任务验证“完成后随机给线索”
  - 同时验证“进行中不可重复发，但完成后可再次发布”
- 出现位置：
  - [town.json](/home/windflying/Code/AdventureHouse/config/quests/town.json)
  - [town.json](/home/windflying/Code/AdventureHouse/config/intel/town.json)
- 后续处理方向：
  - `resultIntelPoolIds` 与 `resolutionVisibility` 属于正式能力
  - 当前镇口传闻这组任务与线索内容仍属于测试样例，后续可替换成正式主题内容

### 6.4 `validation` 边界样例主题

- 类型：测试内容策略
- 当前用途：
  - 单独承载“故意不写全字段”的边界样例
  - 用于验证任务结果、失败回报、兜底标题和默认文本是否正常工作
  - 避免把这类内容混进正常主题线，影响后续内容维护
- 出现位置：
  - [validation.json](/home/windflying/Code/AdventureHouse/config/quests/validation.json)
- 当前样例：
  - `validation-missing-lead-reference`
    - `resultMode = "lead"`，但不提供 `resultIntelId / resultIntelPoolIds`
  - `validation-missing-failure-reference`
    - 稳定失败，但不提供 `failureIntelId / failureIntelSummary`
- 后续处理方向：
  - 后续可以继续往这个主题里补“不可达解锁条件”“引用缺失”“文本回退”等边界样例
  - 这类内容属于内部测试资源，不应直接视为正式任务线

### 6.5 `forcedAdventurerId`

- 类型：配置字段
- 当前用途：
  - 测试时直接指定某条任务由哪位冒险者接取
  - 便于验证能力、人格、结算公式和结果表现，而不必反复等待自然竞争
- 出现位置：
  - [types.ts](/home/windflying/Code/AdventureHouse/src/game/types.ts)
- 后续处理方向：
  - 这是测试专用控制项，不应默认进入正式任务内容
  - 后续若仍保留，应继续限制在测试任务或验证样例中使用

### 6.6 `disabledForCurrentTesting`

- 类型：配置字段
- 当前用途：
  - 在某一轮测试中，临时把旧测试任务整体收起
  - 避免多条旧任务线与当前版本的新测试任务混在一起，干扰验收
- 出现位置：
  - [base.json](/home/windflying/Code/AdventureHouse/config/quests/base.json)
  - [forest.json](/home/windflying/Code/AdventureHouse/config/quests/forest.json)
  - [river.json](/home/windflying/Code/AdventureHouse/config/quests/river.json)
  - [town.json](/home/windflying/Code/AdventureHouse/config/quests/town.json)
  - [mine.json](/home/windflying/Code/AdventureHouse/config/quests/mine.json)
  - [validation.json](/home/windflying/Code/AdventureHouse/config/quests/validation.json)
  - [types.ts](/home/windflying/Code/AdventureHouse/src/game/types.ts)
- 后续处理方向：
  - 这是测试阶段的内容切换控制项，不应进入正式内容运营逻辑
  - 后续应随着测试轮次切换及时清理或替换

### 6.7 `resolution` 结算对照测试主题

- 类型：测试内容策略
- 当前用途：
  - 单独承载 `v0.9` 的任务结算技术覆盖样例
  - 任务和角色优先按正式属性主场设计，不再按世界观题材和风格化角色分类
- 出现位置：
  - [resolution.json](/home/windflying/Code/AdventureHouse/config/quests/resolution.json)
  - [resolution.json](/home/windflying/Code/AdventureHouse/config/intel/resolution.json)
  - [adventurers.json](/home/windflying/Code/AdventureHouse/config/adventurers.json)
- 当前覆盖：
  - 标准任务基准：
    - `standard / advantage`
    - `standard / challenge`
  - 五项正式能力主场：
    - `physique / strong / weak`
    - `survival / strong / weak`
    - `exploration / strong / weak`
    - `observation / strong / weak`
    - `combat / strong / weak`
  - 理论上界：
    - `all-max / standard`
  - 线索修正：
    - `intel / seed`
    - `intel / followup`
- 后续处理方向：
  - 结构本身属于正式能力验证手段
  - 当前具体任务与线索内容仍属于测试样例，后续可替换或删除

### 7. `unlockConditions`

- 类型：配置字段
- 当前用途：
  - 作为统一开启条件骨架，承载“默认可见”“任务成功后出现”“任务失败后出现”等条件
  - 为后续主线按主题拆文件、按条件驱动开启预留正式接口
- 出现位置：
  - [base.json](/home/windflying/Code/AdventureHouse/config/quests/base.json)
  - [forest.json](/home/windflying/Code/AdventureHouse/config/quests/forest.json)
  - [river.json](/home/windflying/Code/AdventureHouse/config/quests/river.json)
  - [types.ts](/home/windflying/Code/AdventureHouse/src/game/types.ts)
- 后续处理方向：
  - 这是正式骨架，不属于临时测试字段
  - 后续应在这套接口上继续扩展线索、发现、建筑、人物认知等开启条件，而不是再加新的临时解锁写法

## 后续登记规则

- 新增测试专用字段时，应优先考虑是否真的需要进入数据结构
- 如果进入了代码或配置层，就应在本表登记
- 如果只是一次性讨论中的想法，不需要登记
- 后续若加入：
  - `testOutcomeMode`
  - `followUpStageTag`
  - `hasFollowUp`
  - 临时 UI 测试标签
  这类字段，也应第一时间补入本表

### 8. 赠礼测试内容包（`gift-test` / `test-novice`）

- 类型：配置内容与少量程序字段
- 状态：**已删除**（回归正式序章内容后不再保留并行测试包）
- 曾用于：
  - 验证赠送物品、携带出任务与能力增益
  - 提供 `test-novice` 与五条限定接取测试任务
- 已移除文件：
  - `config/adventurers/test-subjects.json`
  - `config/quests/gift-test.json`
  - `config/items/gift-test-boosters.json`
  - 对应 `config/text/` 文本文件
  - `config/equipment/basic.json` 中的 `demo-*` 演示装备
- 保留的程序字段：
  - `exclusiveTakerTemplateId`、`startsInRoster`、`starterStack`、`contentStageTag` 仍可作为正式配置能力使用

## 清理原则

- 正式功能成熟后，应定期检查本表中的测试专用项是否还能删除、转内部、或正式化
- 不允许长期保留“没人知道为什么存在”的测试字段
- 若某项决定长期保留，也应在“后续处理方向”中改写为正式说明
