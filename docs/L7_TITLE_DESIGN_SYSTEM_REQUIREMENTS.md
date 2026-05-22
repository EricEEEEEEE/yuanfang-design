# L7 Title Design System Requirements

## 1. Layer Goal

L7 is the typography and title design system layer.

It must turn Standard Mode title input into a designed title lockup direction:

user title + scene + background space + brand rules + reference patterns
-> title design plan
-> safe candidate blueprints
-> measured title asset

L7 is not L6. L6 proves the title can be generated, measured, rendered, and handed to Final Composer safely. L7 proves the title has a design system: scene-aware typography, hierarchy, sizing, shape, and reference-driven lockup logic.

## 2. Non-Goals

L7 must not:

- generate Chinese title images with AI
- modify Chinese title text
- add, remove, reorder, or rewrite visible title text
- treat a renderable SVG as finished title design
- continue polishing L3 background, L4 logo, or L6 measurement internals
- connect R2, history, payment, or campus info
- make Final Composer reflow or redesign title assets

## 3. Required Capabilities

### Title Director

Title Director v2 must produce a design plan, not fixed production coordinates.

It must read:

- L2 visual rules
- L5 spatial strategy
- title hierarchy context
- semantic split candidates
- scene style profiles
- reference pattern library
- typography and font-shape rules

It must output:

- scene style profile
- typography strategy
- adaptive sizing policy
- hierarchy plan
- lockup composition plan
- reference pattern plan
- renderer style hint
- design quality gates

### Typography Strategy

Typography Strategy must decide font intent by scene and title role:

- hero font candidates
- lead font candidates
- accent font candidates
- subtitle font candidates
- fallback policy
- font risk notes

It must not choose a font because it is available. Availability is a L6 renderer concern. L7 chooses the intended font shape and acceptable fallback range.

### Adaptive Sizing

Adaptive Sizing must define design targets before L6 measurement:

- target lockup area ratio
- minimum acceptable lockup ratio
- hero-to-lead weight ratio
- subtitle priority
- unit fill ratio target
- title length compensation

L6 may enforce measurement safety, but L7 must say what visual scale is desirable.

### Font Shape

Font Shape must describe the typographic personality:

- stable sans
- cultural serif
- literary kai
- campaign display
- playful marker
- rounded friendly

Each shape must define:

- suitable scenes
- avoid scenes
- visual traits
- fallback shape
- risk notes

### Lockup Composition

Lockup Composition must use grammar, not fixed templates:

- verticalHeroStack
- splitLeadHero
- staggeredColumn
- stageMonument
- badgeHeroLockup
- centerStageLockup
- platformCaption only for subtitle or auxiliary usage

The plan must decide allowed modes and candidate mix by scene and spatial strategy.

### Hierarchy

Hierarchy must preserve visible text policy:

- mainTitle is always preserved exactly
- subtitle is preserved exactly when rendered
- primaryMessage may guide rhythm only when it is not visible text
- titleEmphasisWords may only emphasize substrings of mainTitle

Hierarchy must define:

- hero role
- lead role
- accent role
- subtitle role
- hook support priority

### Scene-Based Style

Scene style must map content intent to title behavior:

- achievementShowcase
- businessLaunch
- modernChinese
- campaign
- literary
- ipEvent
- cleanNotice

Each scene must define primary patterns, disallowed patterns, typography intent, decoration density, hierarchy posture, and sizing target.

### Reference-Driven Title Pattern

Reference patterns are design grammar, not templates.

L7 must treat them as:

- pattern families
- suitable scenes
- forbidden scenes
- mutation bounds
- hybrid rules
- template-risk warnings

Reference patterns cannot override spatial strategy. If pattern and background space conflict, background space wins.

## 4. Acceptance Criteria

L7 is minimally acceptable when:

- every generated candidate has a traceable title design plan
- at least 6 candidates are generated from scene + space + semantic splits, not fixed one-off rules
- every candidate joins back to original mainTitle
- fallback candidates never enter final product output
- disallowed reference patterns are excluded
- typography strategy is present in diagnostics
- font shape matches the selected scene
- adaptive sizing policy is present before measurement
- scorer reports L7 design gate scores
- visual QA can distinguish render safety from title design quality

## 5. Failure Signals

L7 is not done if:

- all scenes collapse to cleanBrandCentered
- all titles use the same font shape
- scene only changes decoration, not hierarchy or composition
- title is merely large text with stroke
- subtitle disappears without a safety reason
- verticalFirst becomes per-character vertical layout
- reference patterns are selected but not enforced or diagnosed
- measured-safe title is accepted despite weak scene fit

