# 远方智设标题设计引擎 v1

## 标题系统目标升级

远方智设标准模式的标题层，不再定义为“字体排版”或“标题放置”，而是：

Reference-driven Multi-candidate Vector Title Composer

参考驱动的多候选向量标题设计系统。

旧方向包括：

- 字体库
- `titleArtStyle`
- `titleDirector`
- 横排 / 竖排 / 斜排
- Sharp 文字合成

这些只是技术底座，不是最终产品目标。标题不是普通文字叠加，而是视觉资产。最终目标是让标题接近专业设计师做过的主视觉标题，而不是“背景图上放几个中文字”。

当前判断：

- 背景层已经基本可用，目标约 75-80 分。
- 当前标题层只有约 15 分，不能继续凑合。
- v1.0 的目标不是先做 50 分可用版，而是冲 85 分。

系统边界：

- AI 不能直接生成中文标题图片。
- AI 只能输出结构化标题设计方案。
- 中文标题文字必须由系统使用真实字体 / glyph path / SVG / Sharp 稳定渲染。
- 所有标题字组拼接后必须等于原始 `mainTitle`，不能增字、漏字、改字。
- 标题方案必须受品牌 VI 控制，不能只追求炫技。

## v1.0 质量目标

- 背景层目标：75-80 分
- 标题层目标：85 分
- 不接受 50 分过渡方案
- 不以“能跑通”为完成标准
- 以“显著接近专业设计师标题主视觉”为完成标准

v1.0 的验收重点不是“是否能把字放上去”，而是标题是否像被设计过：有主次、有节奏、有形体、有装饰逻辑、有背景融合、有品牌一致性，并且中文内容 100% 准确。

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

标题首先服从背景空间结构，然后才使用标题参考语法。Reference Pattern 是可组合、可变形的设计语法，不是覆盖背景判断的模板。

如果背景中间是竖向长方体 / 聚光柱 / 中央通道，标题候选应优先沿竖向空间组织，而不是机械横排。

如果背景有斜向动线，标题可以顺着斜向动线，或者形成反向张力。

如果背景是水平横幅留白，标题才优先横向展开。

## 标题系统核心架构

1. Background Layout Intelligence

   分析 `safeZones`、`forbiddenZones`、`negativeSpaceShape`、`dominantFlow`、`textAnchors`。

2. Content & Intent Parser

   解析标题语义、活动目标、传播场景和视觉重点词。

3. Spatial Strategy Planner

   把背景空间、标题语义和参考模式合成标题空间策略。

4. Title Reference Pattern Library

   提供可组合、可变形的标题设计语法，不是模板。

5. Title Candidate Generator

   基于 spatial strategy + reference patterns 生成 6 个候选。每个 candidate 必须绑定 `spatialAnchorId` 或说明使用了哪个 `textAnchor`。

6. Candidate Preview Renderer

   输出低保真候选图，用于比较结构。

7. Candidate Scorer

   结合规则评分和 AI 视觉评分，判断哪个候选最接近专业标题设计。

8. Candidate Refiner

   根据评分反馈修正候选，让候选从 60-70 分继续逼近 85 分。

9. Vector Glyph Renderer

   使用真实字体 / glyph path / SVG path 渲染可控中文标题。

10. Final Composer

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

## Title Reference Pattern Library

Title Reference Pattern Library 从历史设计和优秀案例中抽象标题结构。参考模式记录标题重心、字组拆分、装饰位置、主副层级、留白关系、适用场景和禁用场景。

它提供设计语法，但不能替代背景空间判断。每个 pattern 都必须能被 Spatial Strategy Planner 禁用、变形或降权。

## Title Candidate Generator

Title Candidate Generator 一次生成 6 个标题候选，而不是单次决策。

候选必须满足：

- 基于 Spatial Strategy Planner 的空间策略
- 使用允许的 reference patterns
- 绑定 `spatialAnchorId` 或明确说明使用了哪个 `textAnchor`
- 在方向、重心、字组节奏、装饰策略或背景融合方式上有真实差异
- 所有字组拼接后严格等于原始 `mainTitle`

## Candidate Preview Renderer

Candidate Preview Renderer 先渲染低保真候选图，不直接进入最终成图。预览图用于快速比较标题可读性、视觉重心、背景融合、空间服从度和品牌气质。

## Candidate Scorer

Candidate Scorer 不是终点。它结合规则评分和 AI 视觉评分，判断哪个候选最接近专业标题设计。

评分必须覆盖：

- 文字准确性
- 可读性
- 对比度
- 品牌 VI
- 是否避开 `forbiddenZones`
- 是否合理使用 `safeZones`
- 是否服从 `dominantFlow` 或形成有效张力
- 是否绑定合理 `textAnchors`
- 是否像专业标题主视觉

## Candidate Refiner 必须存在

Candidate Scorer 不是终点。如果最高分候选没有达到质量阈值，系统必须进入 Candidate Refiner，而不是直接出图。

v1.0 目标是 85 分，所以不能接受“从 6 个低质量候选中选一个最不差的”。

Refiner 的职责是：

- 根据 scorer feedback 修正字组位置
- 调整标题方向
- 调整主次比例
- 更换 `textAnchor`
- 增强可读性
- 减少模板感
- 让标题更服从背景留白和动线

修正例子：

- 标题太横 -> 改成顺着竖向留白
- 主次不明显 -> 放大 main unit
- 压主体 -> 换 `safeZone`
- 太像模板 -> 调整 unit rhythm
- 与背景造型脱节 -> 重新选择 `textAnchor`

## Vector Glyph Renderer

Vector Glyph Renderer 使用真实字体转 glyph path / SVG path，使中文字成为可控向量图形资产。系统可以对字形做描边、阴影、渐变、装饰和组合，但不能让 AI 直接画中文。

## Final Composer

Final Composer 将通过 preview / scoring / refinement 的最佳标题方案高清合成到背景图上。最终合成需要保留文字准确性、品牌 VI、背景可读性和输出稳定性。

## 标题设计约束

标题设计必须包含：

- 背景空间智能
- 内容与意图解析
- 空间策略规划
- 参考模式库
- 多候选生成
- 预览渲染
- 自动评分
- 反向修正
- 向量字形渲染
- 背景融合
- 品牌 VI 控制

任何标题候选都必须通过文字完整性校验：

- 不能增字
- 不能漏字
- 不能改字
- 不能重排到改变语义
- `lead + main + accent + support` 等字组拼接后必须等于原始 `mainTitle`

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

## 施工顺序

新的施工顺序：

1. 更新 L2 目标文件
2. 建 Background Layout Intelligence
3. 建 Content & Intent Parser
4. 建 Spatial Strategy Planner
5. 调整 Title Candidate Generator，使 candidate 绑定 `textAnchor` / `spatialAnchorId`
6. 使用 Candidate Preview Renderer 生成候选图
7. 建 Candidate Scorer
8. 建 Candidate Refiner
9. 建 Vector Glyph Renderer
10. 接入 Final Composer
11. 最后再做前端产品化

当前下一步不应该直接做 Candidate Scorer。当前下一步应该先建立 Background Layout Intelligence。否则 Candidate Generator 仍然会是主题语法驱动，而不是背景空间驱动。

特别强调：

- 不要先继续改 `image-compose`
- 不要先继续扩 `title-director` 的单次 decision
- 不要先继续调字体大小、坐标、横竖斜

这些都不是当前阶段主线。当前主线是把标题系统升级为“背景空间智能 + 多候选评分 + 反向修正闭环”的设计系统。

## 产品目标

远方智设要达到：

- 背景有主题差异
- 标题像视觉资产
- 中文文字准确
- 品牌 VI 统一
- 老师无需懂设计
- 输出可直接发朋友圈、家长群、小红书、公众号、活动现场物料
- 用较低软件成本替代校区重复设计工作

最终状态不是“老师会调字体”，而是老师只填写设计需求，系统自动生成一张品牌统一、标题有设计感、信息准确、可以直接传播的成品图。
