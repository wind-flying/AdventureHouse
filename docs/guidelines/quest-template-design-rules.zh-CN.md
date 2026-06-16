# 任务模板设计守则

## 文档用途

这份文档给设计师和内容编写者使用。

目标是解释：

- `config/quests/` 里每类字段的意义
- 哪些参数是核心内容参数
- 哪些参数只是微调
- 什么时候应该改任务文本
- 什么时候应该改结构、数值或标签

这不是代码说明书，也不是单次版本记录。

## 当前任务内容分层

### 1. 任务结构与参数

放在：

- `config/quests/`

这里负责：

- 任务 `id`
- 任务线归属
- 解锁条件
- 风险 / 性质 / 难度 / 耗时
- 结果类型
- 发布规则
- 对新人承接和人物原型的影响

这里不负责长期正文编写。

### 2. 任务正文文本

放在：

- `config/text/quests/`

这里负责：

- `title`
- `description`
- `lineTitle`
- `focusText`

规则：

- 改任务描述和标题，优先只改这里
- 不要把任务正文写回 `config/quests/`
- 如果一个任务模板可能被多次发布，正文可以写成数组

### 3. 线索 / 失败回报文本

放在：

- `config/intel/`
- `config/text/intel/`

这里负责：

- 成功带回的线索定义
- 失败带回的线索定义
- 线索标题与内容正文

## 任务参数按优先级理解

### 一、任务本体参数

这些定义“这是什么任务”，优先级最高。

#### `risk`

- `safe`
- `risky`
- `dangerous`

作用：

- 玩家感知的危险级别
- 接任务阶段的风险判断
- 任务结果阶段的风险权重

设计建议：

- 先按玩家体感去写，不要先按公式倒推
- `safe` 不等于必成
- `dangerous` 不应被写成普通日常任务

#### `nature`

- `routine`
- `supply`
- `investigation`
- `mysterious`

作用：

- 区分任务气质和主要玩法位置
- 影响接任务偏好
- 影响任务发布界面和玩家理解

设计建议：

- `routine / supply` 更像日常经营支撑
- `investigation / mysterious` 更像主线、线索和异常推进

#### `difficulty`

- `easy`
- `medium`
- `hard`

作用：

- 影响耗时估算
- 影响结算压力
- 影响“这任务到底算不算新手福利”

设计建议：

- `easy` 应该真的比较容易开始
- `hard` 不要只是报酬高，而应明显更挑人或更难稳定完成

#### `timingMode` / `fixedDurationDays`

作用：

- 控制任务耗时

规则：

- `byDifficulty`
  - 让系统按难度和数量估算耗时
- `fixed`
  - 明确写死耗时天数

设计建议：

- 主线调查任务更适合 `fixed`
- 日常补货任务更适合 `byDifficulty`

### 二、结果与可重复性参数

这些定义“做完会发生什么”。

#### `resultMode`

- `resource`
- `lead`
- `discovery`

作用：

- `resource`
  - 带回资源
- `lead`
  - 带回线索
- `discovery`
  - 带回更明确的发现

设计建议：

- 日常任务优先 `resource`
- 主线调查优先 `lead`
- 真正阶段性确认或异常结论才更适合 `discovery`

#### `publicationMode`

- `repeatable`
- `uniqueWhileOpen`

作用：

- 控制同模板任务在“未出结果前”是否允许重复发布

规则：

- `repeatable`
  - 可以连续发布
- `uniqueWhileOpen`
  - 上一单还没出结果前，不能再发同模板

设计建议：

- 日常补货通常用 `repeatable`
- 调查 / 主线通常用 `uniqueWhileOpen`

注意：

- “可重复”不等于“同一时间可无限叠发”
- 如果你希望任务能反复做，但一次只挂一单，就用 `uniqueWhileOpen`

#### `successVisibility` / `failureVisibility`

- `stay`
- `hide`

作用：

- 分别控制任务在成功后、失败后，是否继续留在发布列表里

这是当前很重要的正式能力。

典型用法：

- 新手福利主线：
  - `successVisibility: "hide"`
  - `failureVisibility: "hide"`
  - 结果出来后进入下一阶段
- 循环直到成功的任务：
  - `successVisibility: "hide"`
  - `failureVisibility: "stay"`
- 一直可反复做的任务：
  - `successVisibility: "stay"`
  - `failureVisibility: "stay"`

#### `resultIntelId` / `resultIntelPoolIds`

作用：

- 成功时带回哪条线索

区别：

- `resultIntelId`
  - 固定带回一条
- `resultIntelPoolIds`
  - 从一组线索里随机带回一条

设计建议：

- 如果你想让同任务重复做时回报不完全一样，优先用 `resultIntelPoolIds`

#### `failureIntelId`

作用：

- 失败时带回什么

优先级：

- 有 `failureIntelId` 时，使用失败线索定义和失败正文
- 没有时，程序会给默认失败文本

设计建议：

- 只要失败后仍然有故事价值，就尽量写 `failureIntelId`
- 不要把所有失败都写成“什么都没发生”

### 三、解锁与分支参数

这些定义“后续怎么开”。

#### `unlockConditions`

当前常用：

- `default`
- `questResult`
- `intelReceived`

#### `questResult`

作用：

- 按某个前置任务的成功 / 失败来解锁后续

这是当前做分支任务最清楚的方式。

例如：

- 成功去 `B1`
- 失败去 `B2`

#### `intelReceived`

作用：

- 按已经拿到的线索来解锁

适合：

- 线索驱动推进
- 同线索数量逐渐积累后的后续任务

#### `sourceTemplateId`

作用：

- 限定线索必须来自某个任务模板

适合：

- 你想要“只有这条任务带回的线索，才能开启这条后续”

### 四、人物流通参数

这些定义“什么样的人更可能来接”。

#### `preferredArchetypeTags`

作用：

- 这任务更容易吸引哪类人物原型

它决定的是：

- 更像什么人会被任务带进视野
- 更像哪类新人适合被引出来

它不直接等于结果成功率。

设计建议：

- 优先把它理解成“这个任务像在吸引什么人”
- 不要先把它当成微调公式的按钮

#### `allowGeneratedTaker`

作用：

- 陌生人能不能通过这任务进入承接链

含义：

- `true`
  - 允许陌生人被引入并接这单
- `false`
  - 这单基本只在已认识的人里流转

设计意义：

- 它对应的是“这单是不是会流到街面上”

#### `generatedTakerWeight`

作用：

- 当任务已经允许陌生人承接时，进一步控制“陌生人承接渠道”的开放度

更直白地说：

- 它不是“谁最适合”
- 而是“这任务到底有多像街面任务”

理解建议：

- 值更高：
  - 更容易由陌生人承接
  - 更容易把新人带进玩家视野
- 值更低：
  - 更倾向由熟人消化
  - 陌生人更难被这任务带进来

设计建议：

- 先决定 `allowGeneratedTaker`
- 再决定 `preferredArchetypeTags`
- 最后如果还不够表达，再微调 `generatedTakerWeight`

不要反过来只靠这个参数硬拉结果。

## 街面任务与人脉任务

这是当前值得保留的设计概念。

### 街面任务

特点：

- 更公开
- 更容易流到陌生人那里
- 更容易把新人带进视野

适合：

- 日常补货
- 零碎调查
- 镇上公开张贴的普通委托

### 人脉任务

特点：

- 更依赖已认识的人
- 更像熟人圈内流转
- 更不容易自然吸引新人

适合：

- 对稳定性要求更高的任务
- 带有明显信任门槛的任务
- 玩家已经经营出一定名册之后的委托

### 这个区分的价值

它会影响：

- 熟人 / 新人 / 无人接的比例
- 人物池膨胀速度
- 玩家对“名册”是否有沉淀感
- 世界观可信度

当前它还不是一个独立大系统，但已经是很有价值的任务流通语义。

## 什么该由设计师直接填，什么不该

更适合设计师直接填写的：

- `risk`
- `nature`
- `difficulty`
- `timingMode`
- `publicationMode`
- `successVisibility`
- `failureVisibility`
- `preferredArchetypeTags`
- `allowGeneratedTaker`

更适合最后再微调的：

- `generatedTakerWeight`

当前不建议为每个任务都急着手填更多额外权重。

## 当前最低检查表

每次新增任务模板，至少检查：

1. 这是日常任务还是主线任务
2. 它是街面任务还是更偏人脉任务
3. 它做完后是否应该继续可发
4. 成功和失败是否都应该有内容回报
5. 成功和失败是否会导向不同后续
6. 任务正文应该写在 `config/text/quests/` 还是线索正文应该写在 `config/text/intel/`

## 当前阶段建议

当前更推荐的写法顺序是：

1. 先把任务体验身份写清楚
2. 再写成功 / 失败后的去向
3. 再写吸引什么人
4. 最后才微调 `generatedTakerWeight`

不要一开始就只调参数，而没先决定：

- 这到底是街面任务还是人脉任务
- 它到底是循环任务、一次性推进任务，还是失败保留型任务
