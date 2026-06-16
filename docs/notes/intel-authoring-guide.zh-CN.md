# 线索库编写指南

## 文档用途

这份文档专门说明：

- `config/intel/*.json` 里的线索 / 发现文件怎么写
- 任务如何引用线索库
- 哪些能力已经支持
- 哪些只是后续规划，还没有实装

目标是让你以后新增线索时，不需要翻代码，只看这份文档就能写。

## 当前目录结构

当前已存在：

- `config/intel/forest.json`
- `config/intel/river.json`
- `config/intel/town.json`

后续如果要给新主题补线索，推荐直接新建：

- `config/intel/<主题名>.json`

例如：

- `config/intel/mine.json`
- `config/intel/church.json`

系统会自动加载 `config/intel/` 目录下的内容。

## 最小可用例子

```json
{
  "intelDefinitions": [
    {
      "id": "forest-trace-lead",
      "kind": "lead",
      "lineId": "forest-anomaly",
      "lineTitle": "林边异动",
      "title": "林间足迹延伸",
      "content": "林边留下的痕迹并没有在入口处消失，而是继续向更深处延伸。"
    }
  ]
}
```

## 字段说明

### `id`

- 类型：字符串
- 作用：线索或发现的唯一 id
- 要求：全项目唯一

推荐写法：

- `forest-trace-lead`
- `river-watch-failure`
- `mine-deep-echo-discovery`

### `kind`

当前可选：

- `"lead"`
- `"discovery"`

含义：

- `lead`：更偏“后续可继续调查的方向”
- `discovery`：更偏“异常记录、阶段性发现”

### `lineId`

- 可选
- 作用：声明这条线索属于哪条主题线
- 便于消息板按主题整理

推荐写法：

- `forest-anomaly`
- `river-night-route`

### `lineTitle`

- 可选
- 作用：给玩家显示的主题名称
- 例如：
  - `林边异动`
  - `河谷夜路`

### `title`

- 消息板上显示的标题
- 应尽量短一些，便于列表浏览

### `content`

- 消息板上显示的正文
- 当前版本先用单条文本

## 当前已支持的写法

### 1. 任务成功后引用固定线索

```json
{
  "id": "forest-trace",
  "resultMode": "lead",
  "resultIntelId": "forest-trace-lead"
}
```

含义：

- 任务成功后
- 不再临时拼一段线索文本
- 而是直接使用线索库中的 `forest-trace-lead`

### 2. 任务失败后引用固定线索

```json
{
  "id": "river-watch",
  "resultMode": "lead",
  "failureIntelId": "river-watch-failure"
}
```

含义：

- 任务失败后
- 会引用 `river-watch-failure`
- 用它来写消息板和失败反馈

### 3. 任务成功后从线索池随机抽取

```json
{
  "id": "town-rumor-gathering",
  "resultMode": "lead",
  "resultIntelPoolIds": [
    "town-rumor-cart-lead",
    "town-rumor-lantern-lead",
    "town-rumor-bundle-lead"
  ]
}
```

含义：

- 任务成功后
- 不固定给某一条线索
- 而是从线索池里随机抽一条

注意：

- 这类任务后续更推荐在任务模板里写 `focusText`
- 不再强行绑定某个经济资源 id
- 也就是说，调查任务引用线索库时，目标应更像“调查主题”，而不是“去收某种货物”

当前规则：

- 如果写了 `resultIntelPoolIds`
- 系统会优先从池里随机抽一条
- 如果随机池为空，再回退到 `resultIntelId`

### 4. 线索触发任务

```json
{
  "id": "forest-deeper-trace",
  "title": "沿足迹继续深入",
  "unlockConditions": [
    {
      "type": "intelReceived",
      "intelId": "forest-trace-lead"
    }
  ]
}
```

含义：

- 当玩家已经获得 `forest-trace-lead`
- 这个任务才会出现在可发布列表里

### 5. 任意一条线索即可开启后续任务

```json
"unlockConditions": [
  {"type": "intelReceived", "intelId": "forest-trace-lead"},
  {"type": "intelReceived", "intelId": "forest-deeper-trace-lead"},
  {"type": "intelReceived", "intelId": "forest-echo-source-lead"}
],
"unlockMode": "any"
```

含义：

- 以上三条线索只要拿到任意一条
- 这条任务就会出现

## 当前已支持的可重复刷线索方向

你前面提到过这种结构：

- 任务完成一次或失败一次后
- 未来仍然可以再次发布
- 不是“做完一次就永久退出”

当前已经可以通过任务侧的正式字段去表达：

- `publicationMode`
- `successVisibility`
- `failureVisibility`

其中：

- `publicationMode: "uniqueWhileOpen"` 控制“进行中时不能重复发布”
- `successVisibility: "stay"` 控制“成功后仍可再次发布”
- `failureVisibility: "stay"` 控制“失败后仍可再次发布”

## 当前还未完整实装，但已经明确是后续方向

### 1. 多线索组合解锁任务

例如：

- 玩家同时拥有线索 1、2、3
- 才能解锁一个新任务

后续更适合通过：

- `unlockConditions`
- `unlockMode: "all"`

来表达。

### 2. 随机线索的重复策略

当前随机线索池还是“纯随机”，所以同一条线索有可能连续重复出现。

后续更合理的方向不是简单改成“绝对不重复”，而是让每条线索逐步支持：

- 多条正文文本
- 重复获得时的追加语
- 最大出现次数

例如：

- 第一次获得：显示基础正文
- 第二次获得：在正文后追加“但你记得这消息在更早的时候也听过”
- 达到最大出现次数后：
  - 不再进入随机池
  - 或大幅降低权重

这样更适合区分：

- 传闻类线索：允许重复，但重复时要有“旧闻再提”的感觉
- 重要线索：更适合优先未获得，重复次数较少
- 发现类记录：通常更偏唯一，不宜长期重复

### 3. 线索数量影响任务参数

后续线索不一定只负责“开门”，还可以影响：

- 任务认知
- 风险判断
- 结算稳定性
- 结果公式

### 4. 线索在完成阶段用途后归档/隐藏

后续线索不一定要永远停留在“活跃消息”状态。

更合理的方向是：

- 某条线索在开启后续任务后，仍然保留记录
- 但当相关任务完成后，可以标记为：
  - 已处理
  - 已归档
  - 已隐藏

## 当前建议

如果你现在只是想新增线索内容，请优先按这条规则：

1. 在 `config/intel/<主题>.json` 写线索
2. 在 `config/quests/<主题>.json` 用 `resultIntelId / failureIntelId / resultIntelPoolIds` 引用
3. 如果后续需要用线索开启任务，再在 `unlockConditions` 里接入线索条件
4. 暂时不要自己发明“线索数量影响公式”这类字段，等正式接口出来后再写
