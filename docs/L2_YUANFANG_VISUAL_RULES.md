# L2 Yuanfang Visual Rules

## Purpose

This is the L2 programmatic brand and visual design rule layer for Yuanfang standard mode. It is derived from the user's benchmark thumbnails of existing Yuanfang materials.

This layer is not image generation logic, not prompt builder wiring, not API behavior, and not frontend behavior.

Layer boundary:

- L2 defines visual rules, benchmark families, layout grammar, safe-zone expectations, title expectations, and negative rules.
- L3 background generation should later consume these rules.
- L4 spatial strategy should later consume title-safe, logo-safe, and composition intent.
- L5 primaryMessage should later consume family-specific hook rules.
- L6 title candidate should later consume title dominance, layout grammar, and lockup expectations.

This does not mean production readiness. It only establishes a reusable rule constitution.

## Benchmark Interpretation

Yuanfang benchmark materials are not empty backgrounds and not finished illustrations. They usually contain a title-led campaign base: clear thematic area, brand color, motion, graphic elements, background texture, safe composition, and controlled visual focus that lets the later title lockup become the hero.

The expected direction is not:

- left/right decorative elements with an empty center
- bottom thumbnails with a small center title
- generic AI illustration or wallpaper
- small ordinary title text
- blank title board

The expected direction is:

- designed campaign key visual
- strong title asset
- title-ready background hierarchy
- varied composition
- family-specific visual grammar
- stable Yuanfang VI feeling
- usable poster output for teachers and campuses

Direct benchmark calibration adds one important correction: Yuanfang is not default guofeng. Real thumbnails span modernBrandCampaign, techDarkEducationKV, boldEnrollmentPromo, kidsLiteraryCharacterEvent, freshReadingCourse, campusHonorCompetition, modernGuofengLiterature, and lifestyleLiteraryScene. Guofeng is only for explicit poetry, traditional culture, festival literature, or classical-culture briefs.

Title-ready calibration adds another correction: L3 should produce a campaign base where background primary subject is roughly 30-45%, future title dominance remains 35-50%, and high-detail clusters stay around subject groups or edges rather than completing the visual climax.

## Programmatic Sources

- `src/models/yuanfang-visual-rules.ts`
- `src/config/yuanfang-visual-benchmark.ts`
- `src/config/yuanfang-visual-grammar.ts`
- `src/config/yuanfang-design-rules.ts`
- `scripts/test-yuanfang-visual-rules.ts`

## Visual Benchmark Families

Required family keys:

- `companyActivity`
- `brandEvent`
- `openClass`
- `enrollment`
- `literaryActivity`
- `campusActivity`
- `teachingCompetition`
- `guofengLiterature`
- `poetryFestival`
- `achievementShowcase`

Family expectations:

- company / brand event: strong brand colors, launch-stage energy, light, motion, KV impact, strict logo-safe.
- open class / enrollment / literary activity: theme visible at a glance, course value, family-share friendly, warm but not cheap.
- campus activity / teaching competition: formal but friendly, education achievement, honor, stage or campus context.
- guofeng / poetry: modern traditional culture, scroll, mountain, book, silhouette, not old-fashioned or red-gold cheap.
- achievement showcase: stage, works wall, spotlight, growth path, ceremony, parent witness feeling.

## Rule Dimensions

Required dimension keys:

- `themeClarity`
- `visualDensity`
- `brandFeeling`
- `titleDominance`
- `layoutDiversity`
- `titleSafeZone`
- `logoSafeZone`
- `mascotRole`
- `backgroundComplexity`
- `textPollutionRisk`
- `aiGenericRisk`
- `customerUsability`

Each dimension has target, acceptance standards, failure signals, applicable families, stable rule key, and L3/L4/L5/L6 consumers.

## Layout Grammar

Required layout grammar keys:

- `topHeroTitle`
- `leftTitleRightVisual`
- `rightTitleLeftVisual`
- `centerHeroLockup`
- `diagonalCampaignFlow`
- `verticalSealTitle`
- `bottomInformationPanel`
- `stageShowcase`
- `splitColorBlock`
- `frameContainer`

Each layout defines suitable families, title placement, visual subject placement, logo-safe zone, title-safe zone, canvas suitability, and forbidden situations.

## Design Diversity Axes

L2 also defines three diversity axes for L3 prompt consumption:

- Logo strategy: `colorFullLockup`, `whiteLockup`, `deepBlueLockup`, `repositionPreferred`, `minimalProtectionPatch`.
- Canvas intent: `verticalPoster`, `horizontalKeyVisual`, `squareSocial`.
- Style treatment: `brandKineticKV`, `boldEnrollmentCampaign`, `literaryEditorialCollage`, `modernGuofengInk`, `warmAchievementStage`, `campusHonorFormal`, `techBlueLearning`, `premiumMinimalNotice`.

These are prompt and diagnostics hints only. They do not switch real logo assets, change frontend canvas, or change Final Composer behavior.

## Title Rules

L2 title expectations:

- title must be visual asset
- title cannot be small center text
- mainTitle should have dominance
- subtitle or hook should remain visible when it carries primaryMessage
- title lockup should vary by family
- title area should be designed, not blank
- title should coordinate with background, not float disconnected

These rules do not modify the title pipeline in this step.

## Background Rules

L2 background expectations:

- background is not empty
- background is not generic AI wallpaper
- background is not only lower decorative elements
- background is not a blank center board
- density is rich but controlled
- motif is family-specific
- theme is immediately visible
- background supports title lockup
- background does not overpower future title lockup
- background avoids finished illustration focal climax
- background protects logo
- generated text, fake characters, fake logo, QR, mascot, and campus contact are forbidden

## Negative Rules

Required negative rules include:

- no readable generated text
- no fake Chinese characters
- no fake logo
- no generated mascot
- no QR
- no campus phone, campus address, or campus name
- no cheap promo style
- no generic AI art
- no stock illustration look
- no empty placeholder gradient
- no overblank title zone
- no over-crowded title zone
- no text-like patterns near title/logo zones

## Future Consumer Mapping

L3 background prompt builder should consume benchmark family, visual density, layout grammar, visual family, subject plan, and negative rules. It should generate a title-ready campaign background / event poster base, not a visible title-safe container or finished illustration scene.

L4 spatial strategy should consume natural lower-complexity regions, logo-safe zone, and composition intent.

L5 primaryMessage should consume family-specific hook rules.

L6 title candidate should consume title dominance, layout grammar, title lockup expectation, and hook/subtitle priority.

## Current Non-Goals

This step does not:

- generate images
- call OpenAI
- change API routes
- change frontend
- change API routes, frontend, title pipeline, or Final Composer behavior
- change title pipeline
- change Final Composer
- connect persistence or storage layers
- restore raw campus fields
