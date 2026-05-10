# 远方智设 — MVP 项目宪法 V5.0

## 0. 项目目标

做一个给远方文学各校区老师使用的 AI 品牌图片生成工具。

第一阶段只验证一件事：

老师是否愿意持续用它生成朋友圈、家长群、课堂展示图片。

第一版只追求：

1. 能登录
2. 能选择场景
3. 能上传图片或填写信息
4. 能生成品牌图
5. 能下载
6. 能记录生成历史
7. 能扣余额

## 1. MVP 功能范围

第一版只做两个模式：

### A. 优化模式基础版

用户上传照片，系统自动：

1. 调整亮度、对比度、锐化
2. 叠加远方 logo
3. 叠加校区信息
4. 输出 JPEG 图片

这个模式不调用 AI。

### B. 标准模式模板版

用户选择主题词、风格词、填写校区信息、可上传二维码。

系统根据模板生成 prompt，调用 AI 生图，再用 Sharp 叠加文字、logo、二维码。

## 2. 暂缓功能

第一版不做：

1. 高级模式
2. 对话式生图
3. 微信支付
4. 自动短信验证码
5. 微信小程序
6. AI 视频
7. 模板市场
8. 复杂后台统计

## 3. 技术栈

不可更改：

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL / Supabase
- Sharp
- Cloudflare R2
- Vercel
- OpenAI Image API

## 4. 目录结构

必须使用：

src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── campus/
│   │   ├── users/
│   │   ├── generate/
│   │   ├── history/
│   │   └── recommendation/
│   └── (routes)/
│       ├── login/
│       ├── dashboard/
│       ├── standard/
│       ├── optimize/
│       ├── history/
│       └── admin/
├── models/
├── services/
├── use-cases/
├── ui/
│   ├── components/
│   └── layouts/
├── config/
└── utils/

templates/
├── standard/
├── optimize/
├── _base.json
└── _brand-rules.json

assets/
├── logo/
├── mascot/
└── fonts/

prisma/
└── schema.prisma

## 5. 分层规则

页面层只负责展示和交互。

API 层只做：

接收请求 → 调 use-case → 返回结果

Use Case 层负责组织流程，可以调用多个 Service。

Service 层只做自己的事。

Service 之间不要互相 import。

## 6. 命名规则

- Service 文件：xxx.service.ts
- Use Case 文件：xxx.use-case.ts
- API 文件：src/app/api/xxx/route.ts
- 页面文件：src/app/(routes)/xxx/page.tsx
- 组件文件：src/ui/components/XxxComponent.tsx
- 配置文件：src/config/xxx.ts
- 类型文件：src/models/xxx.ts

## 7. 禁止事项

AI 工具必须遵守：

1. 禁止 API 层写业务逻辑
2. 禁止 Service 之间互相 import
3. 禁止硬编码价格、模型、色号、路径
4. 禁止一次修改多个无关文件
5. 禁止单文件超过 200 行
6. 禁止没有 TypeScript 类型
7. 禁止顺手加功能
8. 禁止改我没要求改的文件
9. 不确定就停下来问

## 8. MVP 用户角色

第一版只做三个角色：

- PLATFORM_ADMIN
- CAMPUS_ADMIN
- USER

## 9. MVP 计费规则

第一版用余额扣费，不接微信支付。

平台管理员手动给校区充值。

金额单位统一为“分”。

- standard: 200
- optimize_basic: 50
- hd_surcharge: 200

## 10. 失败扣费规则

必须严格执行：

1. 生成成功才扣费
2. AI 失败不扣费
3. 图片合成失败不扣费
4. 上传 R2 失败不扣费
5. 余额不足不允许生成
6. 重复点击不能重复扣费
7. 每次生成都记录状态：PENDING / SUCCESS / FAILED

## 11. 图片输出规则

第一版统一输出：

- 格式：JPEG
- 宽度：1080px
- 质量：78

不输出 PNG。

中文文字、logo、二维码全部由 Sharp 叠加。

AI prompt 里明确要求：

- 不要生成文字
- 不要生成 logo
- 不要生成二维码

## 12. 当前施工原则

一次只做一个步骤。

每一步完成后必须：

1. npm run build
2. git status
3. git add .
4. git commit
5. git push

如果 Codex 修改了未要求修改的文件，必须回退。
