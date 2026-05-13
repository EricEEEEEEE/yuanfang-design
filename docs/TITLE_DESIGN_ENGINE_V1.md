# 远方智设标题设计引擎 v1

## 标题系统目标升级

远方智设标准模式的标题层，不再定义为“字体排版”或“标题放置”，而是：

Reference-driven Multi-candidate Vector Title Composer

参考驱动的多候选向量标题设计系统。

标题不是普通文字叠加，而是视觉资产。v1.0 目标是 85 分，不接受 50 分过渡方案，不以“能跑通”为完成标准，而以“显著接近专业设计师标题主视觉”为完成标准。

系统边界：

- AI 不能直接生成中文标题图片。
- AI 只能输出结构化标题设计方案。
- 中文标题文字必须由系统使用真实字体 / glyph path / SVG / Sharp 稳定渲染。
- 所有标题字组拼接后必须等于原始 `mainTitle`，不能增字、漏字、改字。
- 标题方案必须受品牌 VI 控制。

## 背景空间优先原则

标题设计第一约束不是活动主题，也不是 reference pattern，而是背景空间结构。

标题必须优先识别：

- 大面积留白区域
- 留白形状
- 视觉主轴
- 视觉动线
- 高复杂度禁区
- Logo / 吉祥物 / 主体元素避让区
- 文字可以嵌入的空间锚点
- 标题应该顺着背景造型走，还是与背景造型形成张力

如果背景中间是竖向长方体 / 聚光柱 / 中央通道，标题候选应优先沿竖向空间组织，而不是机械横排。

如果背景有斜向动线，标题可以顺着斜向动线，或者形成反向张力。

如果背景是水平横幅留白，标题才优先横向展开。

## 标题系统核心架构

1. Background Layout Intelligence

   输出 `safeZones`、`forbiddenZones`、`negativeSpaceShape`、`dominantFlow`、`textAnchors`、`recommendedTitleFlow`。

2. Content & Intent Parser

   解析标题语义、活动目标、传播场景和视觉重点词。

3. Spatial Strategy Planner

   把背景空间、标题语义和参考模式合成标题空间策略。

4. Spatial Anchor Contract

   把 `textAnchor` 转成标题组合体必须遵守的空间契约。

5. Semantic Title Splitter

   基于中文语义生成可设计的字组切分，不让 AI 随机切字。

6. Title Reference Pattern Library

   提供可组合、可变形的主题设计语法，不是固定模板。

7. Title Composition Grammar

   提供标题组合结构语法，决定 lockup 如何生长。

8. Title Candidate Generator

   输出 Title Lockup Blueprint，而不是 `titleUnits` 点坐标列表。

9. Candidate Preview Renderer

   输出低保真候选图，用于比较结构。

10. Candidate Scorer

    结合规则评分和 AI 视觉评分，判断哪个候选最接近专业标题设计。

11. Candidate Refiner

    根据评分反馈修正候选，让候选从 60-70 分继续逼近 85 分。

12. Vector Glyph Renderer

    使用真实字体 / glyph path / SVG path 渲染可控中文标题。

13. Final Composer

    将最佳标题方案高清合成到背景图。

## Background Layout Intelligence

Background Layout Intelligence 的职责是输出背景空间智能，而不只是简单背景分析。

它应该输出：

- `safeZones`：适合标题进入的区域
- `forbiddenZones`：不能压住的区域
- `negativeSpaceShape`：留白形状
- `dominantFlow`：画面主视觉动线
- `textAnchors`：多个候选文字锚点，每个锚点有位置、尺寸、方向、置信度
- `recommendedTitleFlow`：标题建议顺着造型、反向形成张力，还是中心锁定
- `compositionReason`：为什么这些区域适合标题

Background Layout Intelligence 不直接生成标题。它只给后面的标题候选生成器提供空间约束。

如果背景已有文字，Background Layout Intelligence 应输出 `textConflict` forbiddenZone。正式背景层禁止生成文字。

## Content & Intent Parser

Content & Intent Parser 的职责是：

- 解析 `mainTitle` 的语义
- 判断活动类型
- 判断传播目标
- 判断家长期待感
- 判断标题中哪些词应成为视觉重点

例子：

成长汇报课：

- 成果展示
- 舞台仪式感
- 家长信任
- 孩子表达力

春季新班招生：

- 转化
- 报名行动
- 强识别

国学少年说：

- 文化感
- 题签感
- 留白气质

## Spatial Strategy Planner

Spatial Strategy Planner 的职责是将以下三类信息合成标题空间策略：

1. 背景空间结构
2. 内容语义与传播目标
3. Title Reference Pattern Library

输出：

- 应该选哪些 `textAnchors`
- 标题更适合 `followShape` / `contrastShape` / `centerLockup`
- 哪些 reference patterns 可以用
- 哪些 reference patterns 应该禁用
- 标题应该是竖向、横向、斜向、错落，还是徽章式组合
- 为什么这个策略符合背景空间

Reference Pattern 不得压过背景空间判断。如果 pattern 和背景空间冲突，应优先服从背景空间。

## Spatial Anchor Contract

Spatial Anchor Contract 把 Background Layout Intelligence 输出的 `textAnchor` 变成标题设计硬约束。

它至少包含：

- `anchorId`
- `anchorBox`
- `negativeSpaceShape`
- `flowAxis`
- `recommendedTitleFlow`
- `forbiddenZones`
- `allowedOverflow`
- `usagePolicy`

标题不是只要落在 anchor box 里就可以。标题组合体必须服从 anchor 的形状、主轴、动线和禁区关系。

如果 anchor 是 `verticalColumn`，标题组合体应沿竖向空间组织。但这不等于每个字都逐字竖排。

## Semantic Title Splitter

标题不能让 AI 随机切字。必须先根据中文语义生成 semantic splits。

成长汇报课：

1. `leadHero`
   - 成长：`lead`
   - 汇报课：`hero`

2. `fullHero`
   - 成长汇报课：`hero`

3. `threeStep`
   - 成长：`lead`
   - 汇报：`hero`
   - 课：`accent`

春季新班招生：

1. `seasonHero`
   - 春季：`lead`
   - 新班招生：`hero`

2. `actionHero`
   - 春季新班：`lead`
   - 招生：`hero`

国学少年说：

1. `culturalHero`
   - 国学：`lead`
   - 少年说：`hero`

语义切分的目标不是平均切字，而是让标题具有设计层级。

禁止无意义切分，例如：

- 成长汇 / 报课
- 春季新 / 班招生
- 国学少 / 年说

## Title Composition Grammar

Reference Pattern 是主题设计语法。Title Composition Grammar 是标题组合结构语法。

`compositionMode` 包括：

- `verticalHeroStack`
- `splitLeadHero`
- `staggeredColumn`
- `stageMonument`
- `badgeHeroLockup`
- `centerStageLockup`
- `platformCaption`

`verticalHeroStack`：

标题整体沿竖向空间生长，但每个字组可以横排，不等于逐字竖排。

`splitLeadHero`：

小引导词 + 大主标题，主标题成为视觉核心。

`staggeredColumn`：

多个字组在竖向空间中错落排列，有节奏，不是直线堆叠。

`stageMonument`：

像舞台中心纪念碑一样，主标题厚重、居中、稳定。

`badgeHeroLockup`：

标题和奖章/荣誉线条形成组合，但不固定贴奖章。

`centerStageLockup`：

稳定居中主视觉，适合发布会/成果展示。

`platformCaption`：

舞台平台区只适合副标题或辅助说明，不宜作为主标题主锚点。

## Title Lockup Blueprint

Title Candidate 不再只是 `titleUnits` 点坐标列表，而是一个 Title Lockup Blueprint。

Title Lockup Blueprint 是标题组合体的设计蓝图，描述标题如何在背景空间中组织、生长和形成主视觉。

它至少包含：

- `spatialAnchorId`
- `spatialContract`
- `semanticSplitId`
- `compositionMode`
- `flowAxis`
- `lockupBox`
- `titleUnits`
- `subtitleLockup`
- `collisionPolicy`
- `forbiddenZonePolicy`
- `readingOrder`
- `reason`

标题不应该被理解为几个字坐标点，而应该被理解为一个在背景空间中生长的标题组合体。标题不是“字怎么摆”，而是“一个标题组合体如何在背景空间里生长”。

## Lockup Candidate 数据结构目标

目标结构示例：

```ts
{
  candidateId: "c1",
  spatialAnchorId: "anchorCenterLightColumnMain",
  compositionMode: "verticalHeroStack",
  flowAxis: "vertical",
  semanticSplitId: "leadHero",
  lockupBox: {
    x: 350,
    y: 150,
    width: 300,
    height: 400,
  },
  titleUnits: [
    {
      text: "成长",
      semanticRole: "lead",
      visualRole: "lead",
      unitBox: { x: 390, y: 170, width: 220, height: 80 },
      direction: "horizontal",
      visualWeight: 0.75,
      alignment: "center",
      readingOrder: 1,
    },
    {
      text: "汇报课",
      semanticRole: "hero",
      visualRole: "hero",
      unitBox: { x: 360, y: 270, width: 280, height: 150 },
      direction: "horizontal",
      visualWeight: 1,
      alignment: "center",
      readingOrder: 2,
    },
  ],
  subtitleLockup: {
    text: "看见孩子的表达力量",
    placementPolicy: "belowMainLockup",
    unitBox: { x: 360, y: 450, width: 280, height: 48 },
  },
}
```

`titleUnits` 不再只是点坐标。每个 unit 是一个设计单元，有 `unitBox`、`visualWeight`、`alignment`、`readingOrder`。

## 关键约束

1. `lockupBox` 必须在 spatialAnchor box 内。
2. `titleUnits` 必须在 `lockupBox` 内。
3. `titleUnits` 不得互相碰撞。
4. hero unit 的 `visualWeight` 必须高于 lead / accent。
5. `readingOrder` 必须清楚。
6. `subtitleLockup` 不能插入 hero units 中间。
7. subtitle 只能使用：
   - `belowMainLockup`
   - `sideOfMainLockup`
   - `secondaryAnchor`
   - `hidden`
8. 禁止 subtitle `insideHeroUnits`。
9. secondary anchor 默认只允许 subtitle / auxiliary，不允许主标题，除非 strategy 明确允许。
10. `verticalFirst` 表示 lockup 整体沿竖向空间组织，不等于所有文字必须逐字竖排。
11. horizontal text units 可以沿 vertical flow 形成上下节奏。
12. pattern 不得压过 spatial strategy。
13. reference pattern 只能提供风格语法，不能决定最终位置。
14. fallback candidates 不可作为正式产品输出。
15. 如果背景已有文字，Background Layout Intelligence 应输出 `textConflict` forbiddenZone。

## 解决当前五个问题

### 1. verticalFirst 被误解为逐字竖排

解决：

`verticalFirst` 改为 `flowAxis` / `lockupBox` 约束。标题组合体沿竖向空间组织，但每个字组可以横排。

### 2. 没有字组设计，只是点坐标

解决：

`x` / `y` / `scale` 升级为 `unitBox` / `visualWeight` / `alignment` / `readingOrder`。

### 3. 副标题夹在主标题中间

解决：

`subtitleLockup` 必须有 `placementPolicy`。subtitle 不能 `insideHeroUnits`，也不能 `betweenLeadAndHero`。

### 4. secondary anchor 被拿来做主标题

解决：

引入 anchor usage policy。当前成长汇报课中，`centerLightColumn` 是主标题锚点，`stagePlatform` 更适合副标题或辅助信息。

### 5. 背景已有旧标题污染判断

解决：

正式背景层禁止生成文字。如果背景已有文字，Background Layout Intelligence 必须将其识别为 `textConflict` forbiddenZone。

## Candidate Preview / Scoring / Refinement

Candidate Preview Renderer 必须支持 `lockupBox` / `unitBox` 调试显示，先看结构，再看精修。

Candidate Scorer 不是终点。如果最高分候选没有达到质量阈值，系统必须进入 Candidate Refiner，而不是直接出图。

v1.0 目标是 85 分，所以不能接受“从 6 个低质量候选中选一个最不差的”。

Refiner 的职责是：

- 根据 scorer feedback 修正字组位置
- 调整标题方向
- 调整主次比例
- 更换 `textAnchor`
- 调整 `lockupBox`
- 调整 `unitBox`
- 增强可读性
- 减少模板感
- 让标题更服从背景留白和动线

## 禁止路线

- 不把标题层降级为普通 SVG text 排版
- 不继续围绕固定坐标调参
- 不把横排 / 竖排 / 斜排当成标题设计本身
- 不让 AI 直接生成中文标题图片
- 不允许 AI 改写标题文字
- 不允许增字、漏字、错字
- 不用来源不明字体合集
- 不把字体文件提交到 GitHub
- 不允许只根据 `designFamily` 决定横排 / 竖排 / 斜排
- 不允许忽略背景留白形状
- 不允许把标题强行放在固定中心点
- 不允许为了变化而变化
- 不允许候选标题与背景造型脱节
- 不允许 reference pattern 压过背景空间判断
- 不允许 Candidate Scorer 后直接低质量出图
- 不允许把 fallback candidates 用作正式产品输出
- 不允许在未通过 preview / scoring / refinement 前进入 final compose
- 不允许把 Title Candidate 简化成 `{ text, x, y, scale, direction }`
- 不允许 subtitle insideHeroUnits

## 施工顺序

后续施工顺序：

1. 更新 L2 文档，写入 Title Lockup Blueprint。
2. 新增 Title Composition Grammar 配置。
3. 新增 Semantic Title Splitter。
4. 修改 Title Candidate Generator，输出 Title Lockup Blueprint。
5. 修改 Candidate Preview Renderer，支持 `lockupBox` / `unitBox` 调试显示。
6. 再做 Candidate Scorer。
7. 再做 Candidate Refiner。
8. 再做 Vector Glyph Renderer。
9. 最后接入 Final Composer。

当前下一步不应该做 Candidate Scorer。当前下一步应该先定义 Title Composition Grammar 和 Lockup Candidate Schema。否则 Scorer 只能在低质量候选中挑一个不太差的结果。

## 产品目标

远方智设要达到：

- 背景有主题差异
- 标题像视觉资产
- 中文文字准确
- 品牌 VI 统一
- 老师无需懂设计
- 输出可直接发朋友圈、家长群、小红书、公众号、活动现场物料

最终状态不是“老师会调字体”，而是老师只填写设计需求，系统自动生成一张品牌统一、标题有设计感、信息准确、可以直接传播的成品图。
