# L7 Title Design System Architecture

## 1. Position In Layer Tree

L7 sits between L5 spatial strategy and L6 title engineering.

```text
L2 visual rules
L3 background
L5 spatial strategy
L7 title design system
L6 title engineering and measurement
L8 final composer
```

L5 tells L7 where title can live. L7 tells L6 what title design should be attempted. L6 proves the attempt is safe to render and compose.

## 2. Main Contract

The main L7 contract is `TitleDesignPlan`.

```text
SpatialStrategy
+ TitleHierarchyContext
+ SemanticSplit candidates
+ TitleReferencePatterns
+ SceneStyleProfiles
+ TypographyStrategy
-> TitleDesignPlan
```

`TitleDesignPlan` must be deterministic and inspectable. AI may provide layout hints downstream, but AI must not become the only source of title design truth.

## 3. TitleDesignPlan Fields

Required fields:

- `planId`
- `sceneStyleProfile`
- `spatialTitleIntent`
- `referencePatternPlan`
- `lockupCompositionPlan`
- `typographyStrategy`
- `fontShapePlan`
- `adaptiveSizingPolicy`
- `hierarchyPlan`
- `rendererStylePlan`
- `designQualityGates`
- `diagnostics`

## 4. Data Flow

### Step A: Resolve Scene Style

Input: `designFamily`, `productOutputType`, `eventBrief`, `mainTitle`, `spatialStrategy.contentIntent`.

Output: title mood, typography intent, decoration density, hierarchy posture, primary reference families, disallowed families.

### Step B: Resolve Spatial Title Intent

Input: primary text anchor, secondary anchors, negative space shape, dominant flow, recommended title flow, forbidden zones.

Output: orientation preference, anchor usage, mode priority, overflow policy, subtitle placement preference.

Spatial intent is binding. Reference pattern may only mutate within this contract.

### Step C: Resolve Reference Pattern Plan

Input: scene profile, spatial strategy pattern pool, existing pattern library.

Output: primary, secondary, exploratory, disallowed pattern keys, plus hybrid and mutation bounds.

### Step D: Resolve Typography Strategy

Input: scene profile, hierarchy posture, font shape rules, registered fonts.

Output: hero, lead, accent, subtitle font intents, acceptable font keys per role, fallback shape, risk notes.

### Step E: Resolve Adaptive Sizing

Input: scene profile, title length, semantic split count, anchor shape, hierarchy context.

Output: target and minimum lockup area ratios, unit fill ratio, hero / lead weight targets, subtitle target height, title length compensation.

### Step F: Build Candidate Plan

Input: semantic split candidates, composition grammar, reference pattern plan, adaptive sizing policy, spatial title intent.

Output: exactly 6 candidate plan items. Each binds semantic split, composition mode, pattern keys, sizing intent, typography intent, and design reason.

AI can only fill relative unit layout hints inside this plan.

### Step G: Score With L7 Design Gates

Existing L6 scorer remains. L7 adds advisory gates for scene, typography, font shape, hierarchy, reference pattern, adaptive sizing, and template-risk fit.

These gates must appear in diagnostics.

## 5. File Map

New or updated files:

- `docs/L7_TITLE_DESIGN_SYSTEM_REQUIREMENTS.md`
- `docs/L7_TITLE_DESIGN_SYSTEM_ARCHITECTURE.md`
- `src/config/title-design-system.ts`
- `src/services/title-design-plan.service.ts`
- `src/services/title-candidate.service.ts`
- `src/services/title-candidate-scorer.service.ts`
- `src/use-cases/generate-scored-refined-title-candidates.use-case.ts`

Do not update:

- R2 storage
- history
- payment
- credit gate
- Final Composer reflow policy
- background prompt generation
- logo composition

## 6. Validation

Build validation:

- `npm run build`

Title system validation:

- `OPENAI_API_KEY= npx tsx scripts/test-title-candidates-standard.ts`
- `OPENAI_API_KEY= npx tsx scripts/test-title-candidate-pipeline-standard.ts`
- `OPENAI_API_KEY= npx tsx scripts/test-title-candidate-scorer-standard.ts`
- `OPENAI_API_KEY= npx tsx scripts/test-title-candidate-refiner-standard.ts`
- `OPENAI_API_KEY= npx tsx scripts/test-title-asset-handoff-standard.ts`
- `OPENAI_API_KEY= npx tsx scripts/test-title-visual-quality-standard.ts`

L7-specific verification:

- diagnostics include `titleDesignPlan`
- final pool candidates reference design plan fields
- scorer includes L7 design gate scores
- scene profile is not `cleanNotice` for achievement / campaign / modernChinese briefs
- disallowed patterns are absent from candidate pattern keys
- typography strategy includes role-level font intents
- all visible title text is original input text
