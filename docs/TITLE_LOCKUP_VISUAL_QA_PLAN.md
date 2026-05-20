# Title Lockup Visual QA Plan

## Scope

L6 measures title lockup visual quality before changing generator, scorer, refiner, renderer, or Final Composer behavior.

This harness is diagnostic only:

- no OpenAI call by default
- no generated background by default
- no title generation behavior change
- no production scoring/refinement/rendering change
- no Logo, R2, history, DB, frontend, or API route change

## Outputs

The default script writes to `/tmp/yuanfang-title-visual-quality-qa/`:

- `title-visual-summary.json`
- `title-visual-review.md`
- `diagnostics/*.json`

Each sample reports:

- selected title candidate
- lockup box area ratio
- actual/proxy title visible bbox ratio
- main title and subtitle area ratios
- subtitle visibility
- dominance, hierarchy, subtitle support, readability, contrast, and background integration scores
- WARN/FAIL diagnostic codes
- overlay metadata JSON

## Provisional Thresholds

- `titleAssetVisibleAreaRatio < 0.035`: `titleTooSmall` WARN
- `titleAssetVisibleAreaRatio < 0.025`: `titleTooSmall` FAIL
- `lockupBoxAreaRatio < 0.06`: `lockupTooSmall` WARN
- subtitle expected but hidden: `subtitleHidden` WARN
- centered small title: `pastedTextRisk` WARN
- dominance score `< 60`: `dominanceWeak` WARN
- dominance score `< 45`: `dominanceWeak` FAIL

## L6 Refiner Minimum Scale Evidence

Real generated poster QA showed 6/6 lockups below `0.06`:

- observed title/lockup ratio range: `0.0029` to `0.0495`
- first remediation layer: refiner minimum lockup scale
- v1 target: `targetLockupAreaRatio = 0.08`
- v1 minimum acceptable: `minAcceptableLockupAreaRatio = 0.06`
- Final Composer is not the first suspect because it preserves the measured title asset bounds.

## Review Rule

Do not improve title visuals until this harness identifies the layer likely responsible:

- generator blueprint structure
- scorer title dominance reward
- refiner minimum scale/subtitle retention
- title asset render style
- Final Composer placement policy
