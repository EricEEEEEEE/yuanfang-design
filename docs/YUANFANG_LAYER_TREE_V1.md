# 远方智设 Layer Tree v1

## 1. 总原则

远方智设是远方文学 / 花开远方品牌的 AI 品牌海报生成系统，当前主线是 Standard Mode 标准模式。

当前目标不是立刻上线，也不是把单层打磨到 90 分，而是让所有关键层先到约 80 分，形成 V1.0 可用闭环，再进入 Eric 连续测试和小范围测试。

推进原则：

1. 每层先到 80 分，不追 90 分。
2. 不在单层无限打磨。
3. 工程链路能跑不等于产品可以测试。
4. 所有关键层 80 分后，才进入真实内测 / 小范围测试。
5. 防止把 L6 标题工程底座完成误判成 L7 字体设计层完成。

Codex prompt 应标明：

```text
所属层级：
发送到：
目标：
红线：
验收：
输出：
```

## 2. 评分标准

| 分数 | 含义 |
| ---: | ---- |
| 0-20 | 只有概念 / 文件骨架，不能进入主链路 |
| 20-40 | 有局部实现，但不可稳定复用 |
| 40-60 | 主链路接上了，但失败率、边界、质量不够 |
| 60-75 | smoke 可跑，有 guard，但还不适合小范围用户 |
| 75-85 | V1 internal / small-batch 可测，失败可控 |
| 85-90 | 接近正式产品体验，质量稳定 |
| 90+ | 可规模化打磨，不是当前阶段目标 |

## 3. 当前层级快照

| 层级 | 名称 | 分数 | 状态 |
| ---- | ---- | :--: | ---- |
| L0 | 项目目标层 | 85 | 方向明确 |
| L1 | 用户输入层 | 70 | Form v2 基本可用，UX 待打磨 |
| L2 | 品牌与设计规则层 | 82 | 阶段通过 |
| L3 | 背景 / 图片设计层 | 78 | 可用于 V1 |
| L4 | Logo 层 | 80 | 首轮 QA 通过 |
| L5 | 空间导演层 | 55 | 不完整，待与 L7 联动 |
| L6 | 标题工程底座层 | 78 | 工程底座通过 |
| L7 | 字体 / 标题设计系统层 | 10-15 | 关键缺口，必须补 |
| L8 | Final Composer 合成层 | 80 | 基础稳定 |
| L9 | Standard API v2 层 | 78 | 工程链路可跑 |
| L10 | 前端产品层 | 68 | 工程闭环，体验待提升 |
| L11 | Usage / Credit / 成本控制层 | 78 | 最小闭环完成 |
| L12 | 历史记录 / 保存层 | 10 | 后置 |
| L13 | 校区信息层 | 5 | 后置 |
| L14 | 吉祥物层 | 20 | 后置 |
| L15 | Uploaded Image / 优化模式层 | 10 | 后置 |

## 4. 层级说明

### L0 项目目标层

Standard Mode 是当前核心产品。V1.0 的目标是能让 Eric 和少量老师真实生成、预览、下载，并通过 usage / credit 控制成本。

### L1 用户输入层

字段包括 `productOutputType`、`eventBrief`、`styleBrief`、`visualDetails`、`title / subtitle / emphasisWords`、`avoidNotes`、`includeLogo / includeMascot / includeCampusInfo`。当前可用，但仍像工程表单。

### L2 品牌与设计规则层

包含远方 VI、Logo 规则、吉祥物规则、视觉基准图、families、layout grammar、prompt rules、negative rules。红线：AI 不生成中文标题、Logo、校区信息。

### L3 背景 / 图片设计层

包含 generated background prompt builder、design decision resolver、visual family / layout family selection、title-ready background、safe zones / forbidden zones。当前约 75-80 分，后续以 batch QA 观察，不继续单层深磨。

### L4 Logo 层

包含 `colorFullLockup`、`whiteLockup`、`deepBlueLockup`，以及 logo placement、safe-zone、readability scoring、`minimalProtectionPatch` fallback。Logo 不能由 AI 生成。

### L5 空间导演层

包含背景空间分析、primary / secondary anchor、forbidden zones / safe zones、title placement candidate、Logo / title / visual subject 空间关系。后续与 L7 联动推进。

### L6 标题工程底座层

包含 Title candidate generation / scorer / refiner、measured title asset、measured gate / retry、render sizing、style-safe fallback、fail-closed。L6 只代表标题能安全渲染和测量，不代表标题已经有设计感。

### L7 字体 / 标题设计系统层

当前关键缺口。子层包括：

- Title Director：标题应该放在哪里。
- Typography Strategy：用什么字体。
- Adaptive Sizing：标题自动调大小。
- Font Shape：字体形状 / 字体气质。
- Lockup Composition：标题摆放形状。
- Hierarchy：主标题 / 副标题 / 强调词层级。
- Scene-based Style：不同场景不同标题风格。
- Reference-driven Title Pattern：参考远方真实缩略图标题。

L7 第一阶段应先做 requirements / architecture planning，明确这些能力如何程序化表达，以及如何与 L5/L6 对接。不要一开始就改 pipeline 或继续单张调参。

### L8 Final Composer 合成层

负责 background + TitleAsset + Logo + optional mascot / campusInfo 合成 JPEG。Final Composer 只合成，不重新设计标题，不生成 Logo，不调用 image-gen。红线：no old image-compose，no raw campus overlay。

### L9 Standard API v2 层

包含 request validation、token gate、generated / debugFixture mode、uploadedImage rejected、error mapping、fail-closed、base64 output、usage / credit gate。工程链路可跑，但还不等于产品体验完成。

### L10 前端产品层

`/standard` 页面已支持 Form v2、submit、loading、preview、download、debug 默认隐藏、user-facing error。仍需提升表单体验、错误恢复和老师填写体验。

### L11 Usage / Credit / 成本控制层

包含 internal token、internal credit user/campus、balance check、reserve、deduct、Generation `PENDING / SUCCESS / FAILED`、Transaction `CONSUME / REFUND`、insufficient credit `402`。已通过 configured generated smoke。

### L12-L15 后置层

- L12 历史记录 / 保存：后续补 generation metadata、history page、R2 persistence、gallery。
- L13 校区信息：未来必须以 campusInfoAsset 方式进入，禁止 raw text overlay。
- L14 吉祥物：optional display，不强承诺展示。
- L15 Uploaded Image / 优化模式：不属于当前 Standard V1 主线。

## 5. 当前推进顺序

1. Usage / credit 最小闭环已完成并推到 GitHub。
2. 本文档作为当前 Layer Tree 项目规范快照。
3. 下一步进入 L7 字体 / 标题设计系统层。

## 6. 当前禁止事项

- 不继续把 L3/L4/L6 打磨到 90 分。
- 不跳 R2 / history / payment。
- 不提前做 campusInfoAsset。
- 不恢复 raw campus overlay。
- 不把 generated smoke PASS 当成产品完成。
- 不跳过 L7 去做前端 polish。
- 不让 AI 生成中文标题、Logo、校区信息。

