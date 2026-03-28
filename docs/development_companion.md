# Development Companion

This document tracks development progress, flags spec divergences for harmonisation with the Implementation Details doc, and records forward-looking notes for subsequent subtasks.

---

## Project Overview

### What the project is
An interactive, web-based pedagogical tool for teaching conditional probability and Bayes' rule. It uses empirically-backed visualisation formats (icon arrays and frequency trees) with natural frequency framing, constructive interactivity, and scaffolded learning — grounded in the cognitive psychology, risk communication, and educational design literature.

### Tech stack
React + GSAP + SVG + Vite.

### Major components and how they relate

- **Visualisation rendering (Part 1):** Two standalone visual components — icon array and frequency tree — that render given a data package. Support partial-state rendering (for construction sequences), regrouping/cross-branch combination as states, format-switching (frequency ↔ probability display), animation, and multi-scale interaction.
- **Parameter & scenario infrastructure (Part 2):** The computation pipeline (raw parameters → derived counts → data package), scenario data structure and template system, parameter controls, display conventions, and terminology model.
- **Exploration mode (Part 3):** The primary interactive mode. Sidebar + top strip + main visualisation area layout. Users manipulate parameters and see visualisations update live. Initial state: mammography scenario, frequency mode, icon array.
- **Guided & practice modes (Part 4):** Pedagogical layer with construction sequences, scaffolding, and fading. Not yet specified in detail — design deferred.
- **Scenario library (Part 5):** Six fully specified scenarios spanning medical, technical, and workplace domains with varied parameter profiles.

### Build order
Parts 1 and 2 provide the foundation (rendering + data). Part 3 (exploration mode) integrates them into a usable interface. Part 4 (guided/practice modes) layers pedagogy on top. Part 5 (scenario content) is already specified and feeds into Part 2's data structures.

### Current state
Layers 0–3 complete, Layer 4 nearly complete. The exploration mode is a fully working integrated tool: sidebar with parameter controls (Y2 format in frequency mode, KaTeX probability notation in probability mode, Bayesian parentheticals), top strip with scenario selector and display mode toggle, and main area with icon array and frequency tree. Display mode toggle switches all three persistent visibility layers simultaneously with a coordinated cross-fade animation (300ms total, GSAP). Format selector switches between icon array and frequency tree. Regrouping toggle triggers smooth GSAP animation (700ms, power2.inOut) — icons interpolate between by-condition and by-test-result layouts with coordinated label crossfade. Tree displays domain labels above root and first-level nodes, cross-branch combination persistently shown. All six scenarios, both display modes, both formats, and both grouping states verified working across N values 100–1000. Tree construction/combination animation (4.2) deferred to Part 4. Next: Layer 4.4 (animation discipline review), then Layer 5.

---

## Development Log

Development follows a horizontal layering strategy: build all components at each depth level before going deeper, reaching a working integrated exploration mode as early as possible, then deepening with animation and polish. This prioritises early integration because Part 3 has twelve building-phase decisions that can only be resolved by seeing the assembled UI.

Components are built with only the API surface that the current layer's consumers need (Part 3 for exploration mode). Part 4 interaction hooks (icon-level events, node value input, batch colouring for construction, region highlighting for guided mode) are deferred until Part 4 design and development — the architecture should be friendly to later extension but not implement unused capabilities prematurely.

---

### Layer 0 — Scaffolding

**0.1: Project setup and shared foundations** ✓

**What was done:**
- Vite + React + TypeScript project initialized. GSAP and KaTeX installed as dependencies.
- Folder structure: `src/components/`, `src/computation/`, `src/exploration/`, `src/data/`, `src/types/`, `src/constants/`, `src/state/`.
- Shared TypeScript types in `src/types/`: `DataPackage` interface (three regions: A numerical, B textual with both display modes and both grouping states, C metadata), all enums (`IconArrayConstructionState`, `TreeConstructionState`, `GroupingState`, `TreeCombinationState`, `DisplayMode`), `ScenarioDefinition` interface with full vocabulary schema including singular/grammatical forms, `DEFAULT_VOCABULARY` fallback constants.
- State architecture in `src/state/`: `useReducer` with typed actions (`SET_PARAMETER`, `SET_N`, `SET_SCENARIO`, `SET_DISPLAY_MODE`), `AppStateProvider` context distributing parameters and stub data package, `useAppState` hook.
- Colour scheme in `src/constants/colours.ts`: hierarchical warm/cool palette (orange-based TP=#E66100, FN=#F5B041; blue-based TN=#1A5276, FP=#5DADE2; neutral=#9E9E9E). Derived from ColorBrewer/Okabe-Ito palettes. Tree node and icon colour mappings included.
- KaTeX integration via `foreignObject` in SVG: `KaTeXLabel` component in `src/components/KaTeXLabel.tsx`. Renders LaTeX strings inside SVG using KaTeX's HTML output within foreignObject.
- Temporary `FoundationDemo` in App.tsx for verification (state toggle, colour swatches, KaTeX-in-SVG test).

**Spec divergences:**
- KaTeX integration uses `foreignObject` wrapping KaTeX HTML output — this was left open in the spec ("Evaluate foreignObject+KaTeX HTML vs. pre-rendered approaches"). foreignObject chosen because it's simpler and works in all modern browsers; no need for SVG path conversion.

**Forward-looking notes:**
- The stub data package (`createStubDataPackage` in `AppStateContext.tsx`) returns zeroed-out counts. Subtask 1.1 will replace this with the real computation pipeline.
- `src/state/parameterState.ts` handles `SET_SCENARIO` including specificity→FPR conversion.
- **LaTeX string escaping:** LaTeX strings passed to `KaTeXLabel` must contain literal single backslashes (e.g. `\frac`, `\mid`). In JSX, use `String.raw` template literals: `` String.raw`P(D \mid T^+)` ``. Standard JS string escaping (`"\\mid"`) double-escapes. The template system (subtask 1.2) will produce these strings — it should output raw single-backslash LaTeX.
- Node.js v24.14.1 was installed during this subtask (was not previously on the machine). PATH needs `/c/Program Files/nodejs` prepended in the bash shell.

- **Status:** Complete
- **Verify:** `npx tsc --noEmit` passes (zero type errors), `npx vite build` succeeds, dev server runs on `localhost:5173`

---

### Layer 1 — Data Foundation

**1.1: Computation pipeline** ✓

**What was done:**
- Pure function `computeRegionA` in `src/computation/computeRegionA.ts`. Takes `{n, baseRate, sensitivity, fpr}`, returns `DataPackageRegionA`.
- Seven-step pipeline implemented exactly as specified: first-level exact partition, second-level rounded partition (standard rounding via `Math.floor(x + 0.5)`), regrouped counts, posterior (null when N_T+=0), effective rates, joint probabilities, input rates preserved.
- Wired into `AppStateContext.tsx` — `createStubDataPackage` now calls `computeRegionA` for Region A. Region B/C remain stubs.
- Vitest installed and 25 unit tests passing: mammography reference scenario (all fields verified against spec), three additional scenario profiles, edge cases (sensitivity/FPR at 0% and 100%, very small N_D, zero-from-rounding), partition constraint verification, joint probability consistency.

**Spec divergences:**
- First-level partition uses `standardRound(n * baseRate)` defensively, even though N-relative base rate steps should guarantee an integer. This handles any floating-point arithmetic edge cases without changing behaviour for valid inputs. No functional divergence from spec.

**Forward-looking notes:**
- The `ComputationInputs` interface is exported from `computeRegionA.ts` — subtask 1.2 (template system) and any other consumers can import it.
- Vitest is now a dev dependency. Tests live alongside source files (`*.test.ts`). No special test config needed — Vitest picks up the Vite config automatically.
- Effective rates for degenerate cases (N_D=0, N_¬D=0) return 0 rather than NaN/undefined. The base rate range (1/N to (N-1)/N) prevents these in practice, but the function is defensive.

- **Status:** Complete
- **Verify:** `npx vitest run src/computation/computeRegionA.test.ts` (25 tests pass), `npx tsc --noEmit` (zero errors), `npx vite build` (succeeds)

**1.2: Template system (all outputs)** ✓

**What was done:**
- Pure function `computeRegionB` in `src/computation/computeRegionB.ts`. Takes `(DataPackageRegionA, ScenarioDefinition | null, DisplayMode)` → `DataPackageRegionB`.
- All ten output types implemented: problem statement text, question text, parameter display strings (Y2 format + probability notation), derived result strings, icon array compound labels (4 combinations: 2 grouping × 2 display modes), tree node labels (counts + joint probabilities), tree branch labels (effective rates + input rates as LaTeX), cross-branch combination labels (count arithmetic + Bayes' theorem arithmetic), degenerate state messages, glossary entries.
- Three vocabulary layers (domain, structural, Bayesian) with progressive exposure placement as specified. Bayesian parentheticals on base rate "(prior)", sensitivity "(likelihood)", total test-positive rate "(marginal likelihood)". FPR has no Bayesian parenthetical (honest asymmetry per spec).
- Vocabulary resolution with `DEFAULT_VOCABULARY` fallback for null scenarios.
- Number formatting: counts with comma separators (≥1000), percentages for icon array/parameter panel, decimals for probability-mode tree labels, LaTeX notation via `String.raw` for probability mode.
- Key formatting rule: frequency-mode tree branches use **effective rates** (from integer counts); probability-mode tree branches use **input rates** (formal conditional probabilities). Parameter panel uses input rates in both modes.
- Wired into `AppStateContext.tsx` — `createDataPackage` replaces `createStubDataPackage`, calling `computeRegionB` for real Region B output. Region C metadata also improved (pulls name/domain/description from scenario vocabulary).
- 62 unit tests passing covering: mammography reference scenario (all outputs verified against spec examples), spam scenario (vocabulary substitution with "that" pronoun, Detection rate label, domain terms), default vocabulary (null scenario), degenerate case (N_T+ = 0), LaTeX well-formedness, number formatting, active display mode passthrough.

**Spec divergences:**
- `formatDecimal` uses 3 decimal places for values ≥ 0.01 (not 2) to correctly display values like 0.901 (P(¬D ∩ T−) for mammography). This is a formatting precision detail — the spec examples show "0.009", "0.089", "0.098", "0.901" which all need 3 decimal places. Trailing zeros are stripped to minimum 2 characters (so 0.90 stays as "0.90", not "0.900").
- Output 4 degenerate case: the spec shows "Nobody [test_positive_name]" for frequency mode but also notes this is ungrammatical for non-human populations and suggests "No [population_name] [test_positive_name]" instead. Implementation uses the "No [population_name]" form consistently for all scenarios, matching the spec's own resolution.
- Glossary entries (Output 10) and degenerate state messages (Output 9) are exported as separate helper functions (`generateGlossaryEntries`, `generateDegenerateMessages`) rather than embedded in Region B, since Region B's type structure doesn't have fields for them. They are available for any consumer that needs them (glossary component, contextual message display).

**Forward-looking notes:**
- Glossary entries and degenerate messages are not part of `DataPackageRegionB`'s type structure — they're exported as standalone functions. If the glossary component (could-cut) is built, it can call `generateGlossaryEntries` directly with the resolved vocabulary. Similarly, contextual messages can call `generateDegenerateMessages`.
- The `capitalise` function capitalises the first letter of domain vocabulary for display in labels (e.g., "have the disease" → "Have the disease"). This works for all current vocabulary but may need attention if vocabulary terms ever start with special characters.
- `extractShortDomainTerm` handles the "prevalence of the disease" → "prevalence" extraction for probability-mode parameter parentheticals. Other domain terms (e.g., "spam rate") pass through unchanged. If future scenarios use "prevalence of X" patterns, they'll also get shortened.

- **Status:** Complete
- **Verify:** `npx vitest run src/computation/computeRegionB.test.ts` (62 tests pass), `npx tsc --noEmit` (zero errors), `npx vite build` (succeeds)

**1.3: Scenario data** ✓

**What was done:**
- All 6 scenarios coded as `ScenarioDefinition` objects in `src/data/scenarios.ts`: mammography, covid_antigen, blood_donation, spam_filter, factory_inspection, drug_screening.
- All domain vocabulary fields populated (plural forms, singular/grammatical forms, relative pronouns, test action verbs, base rate domain names). Optional fields (`sensitivityDomainName`, `fprDomainName`, `specificity`) included only where specified by the spec.
- Exported individually (named constants), as a `SCENARIOS` array, and with a `getScenarioById` lookup helper.
- 118 unit tests in `src/data/scenarios.test.ts`: collection integrity (6 unique ids/names), all required fields non-empty, numerical parameter validity, specificity/FPR consistency, integer verification for all 6 scenarios via `computeRegionA` (matching spec's integer verification tables exactly), domain-specific optional field checks.

**Spec divergences:** None. All data matches the spec exactly.

**Forward-looking notes:** None — this is a pure data subtask with no architectural implications.

- **Status:** Complete
- **Verify:** `npx vitest run src/data/scenarios.test.ts` (118 tests pass), `npx tsc --noEmit` (zero errors), `npx vitest run` (all 205 tests pass)

---

### Layer 2 — Static Rendering

**2.1: Icon array — core grid and colouring** ✓

**What was done:**
- `IconArray` React component in `src/components/iconArray/IconArray.tsx`. Renders an SVG grid of rounded-square icons coloured by partition group, consuming Region A from the data package.
- Layout algorithm in `src/components/iconArray/layout.ts` as a pure function: `computeLayout(n, width, height, groupingParams) → LayoutResult`. Structured for reuse by subtask 2.3 (same algorithm, different grouping parameters).
- Alternating-axis hierarchical subdivision implemented per spec: first-level splits along the container's shorter dimension; second-level uses row-major fill within each first-level region. Jagged-edge handling for non-integer boundaries.
- Grid dimension calculation minimises empty cells while matching container aspect ratio. Multiple candidate dimensions evaluated and scored.
- Spacing scales continuously with icon size (5% at small icons → 20% at large). Corner radius also scales (more rounding at moderate N for discreteness, less at high N for density).
- First-level boundary has ~3.5× normal spacing as a wider gap for visual prominence.
- Grid is centred within the container.
- Each icon has a stable index (0 to N-1), group assignment, grid position (row, col), and pixel position — designed so subtask 2.3 can add a second position set per icon for regrouping.
- `GroupingParams` interface abstracts the partition structure so the same algorithm works for by-condition and by-test-result layouts (builders: `byConditionGrouping`, `byTestResultGrouping`).
- Wired into `App.tsx` replacing `FoundationDemo`. Demo provides scenario selection and N selector for visual verification. Container is measured via `ResizeObserver` for responsive sizing.
- 24 unit tests covering: grid dimension calculation, spacing scaling, axis assignment, group count correctness (mammography + moderate N + all six scenarios), unique indices, container bounds, first-level gap > normal spacing, axis selection by container shape, region contiguity (flood-fill verification).

**Spec divergences:**
- Grid dimension computation uses a candidate-scoring approach (evaluating floor/ceil combinations of ideal cols/rows, scoring by empty cells and aspect-ratio match) rather than the simpler `s = sqrt((W*H)/N)` formula from the spec. The spec's formula doesn't account for spacing and can produce grids that overflow the container. The scoring approach reliably produces grids that fit while minimising waste. The resulting grids match the spec's intent (R×C ≈ N, C/R ≈ W/H).
- Region-to-cell allocation counts actual occupied cells per grid line rather than assuming all lines are complete. This handles grids where rows×cols > N (incomplete last row/column). Without this, extreme aspect ratios or N values can cause region 1 to receive fewer icons than `firstRegionCount`.

**Forward-looking notes:**
- The `GroupingParams` interface and `byTestResultGrouping` builder are already exported for subtask 2.3. The by-test-result layout can be computed by calling `computeLayout` with `byTestResultGrouping(regionA)`.
- Each icon's `IconData` has `row`, `col`, and `(x, y)` fields. Subtask 2.3 will add a second `(x, y)` pair per icon for the regrouped layout. The `index` and `group` fields are layout-independent — they stay constant across both position sets.
- The `LayoutResult` exposes `iconSize` which can be reported to Parts 3/4 for interaction-mode decisions (per the multi-scale interaction spec).
- The `FoundationDemo` in the previous App.tsx is no longer rendered. The KaTeX verification SVG was part of that demo — KaTeX integration remains available via `KaTeXLabel` component.

- **Status:** Complete
- **Verify:** `npx vitest run src/components/iconArray/layout.test.ts` (28 tests pass), `npx tsc --noEmit` (zero errors), `npx vite build` (succeeds), visual verification at N=1000, N=100, N=200

**Post-completion fix — first-level gap not separating regions at jagged boundary:**
Gap pixel offset in Step 7 of `computeLayout` was applied based on grid column/row position (`icon.col >= boundaryLine`), but the region boundary is jagged when `firstRegionCount` doesn't divide evenly by the cross-axis size. Icons from both R1 and R2 on the boundary line got the same offset, so R2 bled to the wrong side of the gap. Fixed by tracking region membership via `Set<number>` and applying the gap offset based on membership. Added 4 pixel-space gap separation tests (all 6 scenarios, both groupings) — the existing contiguity test used grid coordinates and was structurally blind to pixel-space issues.

**2.2: Icon array — labels and construction states** ✓

**What was done:**
- Construction state colouring implemented via `resolveIconColour` pure function. Progressive colouring sequence: `Unpartitioned` (all neutral grey) → `BaseRatePartitioned` (warm/cool family colours, no shade variation) → `ConditionPositiveSubpartitioned` (warm region shows TP/FN shades, cool region uniform) → `FullyPartitioned` (all four groups distinct).
- Compound first-level label system consuming Region B. Two labels per state, each showing domain label + count as the main line, with optional sub-group composition in parentheses as a secondary line. Labels are assembled from `ByConditionLabels` in the data package.
- Label content adapts per construction state: `Unpartitioned` shows no labels; `BaseRatePartitioned` shows count only (no composition); `ConditionPositiveSubpartitioned` shows full composition for condition-positive, count-only for condition-negative; `FullyPartitioned` shows full composition for both.
- Label prominence scaling: font size (10–14px) and font weight (500–700) scale inversely with icon size — at high N (small icons), labels are larger and bolder as the primary information channel; at moderate N (large icons), labels are smaller and secondary.
- Labels overlay the top of their region with a semi-transparent white background for readability. Overlap avoidance: when both regions share similar top positions (e.g., mammography at N=1000 where the condition-positive region is just one column), the second label is offset below the first.
- Display mode support: component accepts `displayMode` prop and renders the corresponding label set from Region B (frequency or probability). Both modes verified working.
- Props expanded: `regionB: DataPackageRegionB` and `displayMode: DisplayMode` added alongside existing `constructionState` and `groupingState`.
- Demo in `App.tsx` updated with construction state selector and display mode toggle for visual verification across all states and modes.
- 39 unit tests in `src/components/iconArray/iconArrayLabels.test.ts`: construction state colour mapping (all 4 states × 4 groups, progressive distinct-colour-count verification), label content assembly (mammography reference scenario exact strings, per-state visibility rules), probability mode labels, spam scenario vocabulary substitution, font size / weight scaling (range bounds, continuity, inverse relationship).

**Spec divergences:**
- Label positioning uses overlay (inside region bounding box) rather than adjacent/above positioning. The spec says "positioned at the edges of or overlaying the first-level regions" — overlaying was chosen because positioning above fails when regions are at the SVG boundary (as mammography's tiny condition-positive region always is). This matches the spec's "semi-transparent background for readability" design for high-N overlay.
- Label overlap avoidance for extreme proportion cases (e.g., 10/990 split at mammography) is an implementation detail not specified — the spec's "two labels at predictable locations" assumed the two regions would have distinct label positions, which isn't true when both regions start at the same y coordinate. The offset solution maintains readability without adding visual complexity.

**Forward-looking notes:**
- The `resolveIconColour` function is exported and pure — subtask 2.3 can reuse it unchanged (construction state colouring is independent of grouping state).
- `buildLabelContent` currently works only with `ByConditionLabels`. Subtask 2.3 will need an analogous function for `ByTestResultLabels`, or a unified function parameterised by label type.
- The `CompoundLabel` sub-component accepts generic content (`mainLine` + optional `compositionLine`) — it's reusable for by-test-result labels with no changes.
- The overlap avoidance logic checks both y-proximity and x-overlap between region bounding boxes. For by-test-result grouping (subtask 2.3), the regions will have different spatial arrangements, so the overlap detection should still work correctly.

- **Status:** Complete
- **Verify:** `npx vitest run src/components/iconArray/iconArrayLabels.test.ts` (39 tests pass), `npx vitest run` (all 272 tests pass), `npx tsc --noEmit` (zero errors), `npx vite build` (succeeds), visual verification of all 4 construction states at N=1000 mammography, N=200 mammography probability mode, N=200 spam filter frequency mode

**2.3: Icon array — second grouping layout** ✓

**What was done:**
- `DualLayoutIcon` type and `computeDualLayout` function in `layout.ts`. Both by-condition and by-test-result layouts computed upfront via the same `computeLayout` algorithm with different `GroupingParams`. Icons matched across layouts by group + ordinal within group, producing `DualLayoutIcon[]` where each icon stores `byCondition` and `byTestResult` position sets (`IconPosition` type with `row`, `col`, `x`, `y`).
- `buildByTestResultLabelContent` function in `IconArray.tsx`. Consumes `ByTestResultLabels` from Region B, using the pre-formatted `compositionString` fields (e.g. "TP: 9, FP: 89") directly. Supports all construction states: Unpartitioned shows no labels, BaseRatePartitioned shows count only, ConditionPositiveSubpartitioned and FullyPartitioned show full composition.
- `IconArray` component refactored to use `computeDualLayout` instead of single `computeLayout`. The `groupingState` prop (previously accepted but unused) now controls which position set is rendered (hard snap). Labels switch between `byCondition` and `byTestResult` label sets based on grouping state. Region partitioning for label positioning adapts per grouping state (by-condition: R1=TP+FN, R2=FP+TN; by-test-result: R1=TP+FP, R2=FN+TN).
- Demo in `App.tsx` updated with grouping state dropdown.
- 39 unit tests in `dualLayout.test.ts`: dual layout basic properties (N icons, both position sets, valid groups, indices), group count verification (mammography + spam + all 6 scenarios), dual position divergence, consistency with single-layout `computeLayout` (by-condition and by-test-result positions match per group), by-test-result spatial arrangement (region counts, gap separation), `buildByTestResultLabelContent` (mammography reference composition strings, construction state visibility rules, probability mode, spam vocabulary), by-condition label regression, region group sets per grouping state.

**Spec divergences:** None. The implementation follows the spec: both layouts from same algorithm, dual positions stored per icon, grouping state as an orthogonal dimension, compound labels consistent across grouping states using `compositionString` from Region B.

**Forward-looking notes:**
- The `DualLayoutIcon` stores `byCondition` and `byTestResult` as separate `IconPosition` objects — Layer 4 can interpolate between them with GSAP by animating `x` and `y` from one position set to the other.
- `DualLayoutResult` exposes shared `grid`, `iconSize`, `spacing`, `firstLevelGap`, and `firstLevelAxis` from the by-condition layout. Both layouts use the same grid dimensions since they share the same N and container. If a future need arises for per-layout metadata (e.g. different gap sizes), the structure can be extended.
- The `computeRegionBounds` function was generalised to accept `Array<{ x: number; y: number }>` instead of `IconData[]`, since it now works with `IconPosition` objects from either layout.

- **Status:** Complete
- **Verify:** `npx vitest run src/components/iconArray/dualLayout.test.ts` (39 tests pass), `npx vitest run` (all 311 tests pass), `npx tsc --noEmit` (zero errors), `npx vite build` (succeeds), visual verification of both grouping states at mammography N=1000 frequency mode, mammography N=1000 probability mode by-test-result, spam filter N=200 by-test-result

**2.4: Frequency tree — full static rendering** ✓

**What was done:**
- `FrequencyTree` React component in `src/components/frequencyTree/FrequencyTree.tsx`. Renders a vertical SVG tree consuming Region A (for structure) and Region B (for all text labels).
- Layout engine in `src/components/frequencyTree/layout.ts` as a pure function: `computeTreeLayout(width, height) → TreeLayout`. Fixed topology with proportional scaling — all positions and sizes scale linearly with the container's limiting dimension (reference design: 1000×700). Minimum scale floor (0.35) prevents illegibility.
- Seven nodes: root (grey), two first-level (warm orange / cool blue), four leaves (TP dark warm, FN light warm, FP light cool, TN dark cool). Nodes are uniformly sized rounded rectangles using `TREE_NODE_COLORS` from `colours.ts`. Node text colour adapts for contrast (white on dark fills, dark on light fills).
- Six branches: neutral grey lines (`COLORS.branch`) connecting parent bottom-centre to child top-centre. Branch labels from `regionB.treeBranches` positioned midway, with left/right side assignment matching the tree's left-right branch direction.
- Cross-branch combination: U-shaped bracket path beneath TP and FP leaf nodes with tick marks at the arms. Sum and posterior labels from `regionB.crossBranchCombination` centred below. Only shown when `TreeCombinationState.CombinationShown` AND `TreeConstructionState.FullyBranched` (orthogonal dimensions).
- Four construction states via visibility sets: `RootOnly` (1 node, 0 branches), `FirstBranch` (3 nodes, 2 branches), `ConditionPositiveSecondBranch` (5 nodes, 4 branches), `FullyBranched` (7 nodes, 6 branches). Visibility logic is pure functions (`isNodeVisible`, `isBranchVisible`) for testability.
- Display mode support: frequency mode uses plain text labels; probability mode uses KaTeX rendering. Node labels in probability mode use a `KaTeXInline` component inside a `foreignObject` with flexbox centring. Branch and bracket labels in probability mode use the existing `KaTeXLabel` component.
- Demo in `App.tsx` updated to a tabbed layout (`VisualisationDemo`) with View selector (Icon Array / Frequency Tree), shared controls (scenario, N, display mode), and component-specific controls (construction state + combination state for tree; construction state + grouping state for icon array).
- 43 unit tests in `layout.test.ts`: node count and identity, branch count and identity, spatial ordering (root above first-level above leaves; left-to-right ordering), container bounds, branch connectivity (parent-child attachment points), branch label positioning (between parent and child), bracket geometry (below leaves, spanning TP to FP, centred labels), proportional scaling (2× container → ~2× node size), extreme containers (very small, very wide, very tall), construction state visibility (all 4 states: correct node/branch counts, progressive visibility, root always visible).

**Spec divergences:**
- Node labels in probability mode use an inline KaTeX renderer (`KaTeXInline`) inside a centred `foreignObject` div, rather than the standalone `KaTeXLabel` component used elsewhere. This was necessary because node labels need vertical and horizontal centring within the node rectangle, which `KaTeXLabel`'s absolute-positioned foreignObject doesn't support. The inline approach uses flexbox centring within the foreignObject for reliable alignment. Both approaches use the same underlying KaTeX rendering.
- Reference node dimensions (150×44 at scale=1) were tuned larger than an initial attempt (130×38) to accommodate probability-mode labels like "P(D ∩ T⁺) = 0.009" without clipping. The spec says "a fixed moderate size that fits the longer labels" — this is the implementation of that constraint.
- Branch label side assignment (left branches get left-side labels, right branches get right-side labels) is an implementation detail not specified in the spec. This ensures labels don't overlap the branch lines and maintains visual clarity.

**Forward-looking notes:**
- The `computeTreeLayout` function is a pure function that can be called outside React for testing or for Layer 4 animation planning. The layout result includes all positions needed for GSAP animation targets.
- The `isNodeVisible` / `isBranchVisible` functions and the `VISIBLE_NODES` / `VISIBLE_BRANCHES` maps are exported for use by Layer 4's construction animation — the animation can determine which elements to reveal at each step.
- The bracket is rendered as an SVG path — Layer 4 can animate it using GSAP's `drawSVG` or stroke-dashoffset technique for the "bracket draws" animation step.
- The `KaTeXInline` component is local to `FrequencyTree.tsx`. If other components need inline centred KaTeX in foreignObjects, it could be extracted to a shared utility. For now it's kept local per scope discipline.
- **Tree node domain labels not yet rendered.** The spec (Implementation Details, Terminology Model, line 1027/1031) specifies that tree nodes carry domain group names alongside counts — e.g. "Have disease: 10" not just "10". Currently the tree renders only the `TreeNodeLabels` content (count or probability string). The `TreeNodeLabels` type was designed to carry only the numerical content; domain labels would need to come from `ByConditionLabels` (which has `domainLabel` for each group). How to present domain labels on tree nodes (inside the node alongside the count? above/adjacent? compound like icon array labels?) is a **Layer 3 integration decision** — it interacts with available space, node sizing, and visual clutter. Layer 3 should resolve this when the tree is placed in the actual exploration mode layout.
- **Probability-mode combination labels use joint probabilities, not the full Bayes' theorem expansion.** The cross-branch combination shows `P(D|T⁺) = P(D∩T⁺)/P(T⁺)` — this is correct per spec (Output 8). The full Bayes' theorem form showing how joint probabilities decompose into prior × likelihood (i.e. `P(D∩T⁺) = P(D)·P(T⁺|D)`) is the **Bayes' rule formula toggle** feature, scoped to Layer 5.4 as a click-to-reveal reference in probability mode.

- **Status:** Complete
- **Verify:** `npx vitest run src/components/frequencyTree/layout.test.ts` (43 tests pass), `npx vitest run` (all 354 tests pass), `npx tsc --noEmit` (zero errors), `npx vite build` (succeeds), visual verification of: full tree with combination at mammography N=1000 frequency mode, root-only state, condition-positive-second-branch state, probability mode with KaTeX labels, spam filter scenario with domain vocabulary

---

### Layer 3 — App Shell and Integration *(critical milestone: first working exploration mode)*

**3.1: Layout and parameter controls** ✓

**What was done:**
- Three-layer screen layout implemented as `ExplorationMode` component (`src/components/explorationMode/`): top strip, sidebar (320px), and main area. Replaces the previous `VisualisationDemo` in App.tsx.
- **Top strip:** Scenario dropdown selector (all 6 scenarios), display mode toggle (segmented control: Frequency/Probability), question text (with KaTeX rendering for probability-mode notation line), and problem statement text — always visible.
- **Sidebar:** Population size (N) segmented control (100/200/500/1000), base rate slider (N-relative steps, range 1/N to (N-1)/N), sensitivity slider (1% steps, 0–100%), FPR slider (1% steps, 0–100%). All sliders update live during drag. Parameter display strings consumed directly from Region B — frequency mode shows Y2 format ("Base rate (prior): 1%" with "10 out of 1,000 have the disease" description), probability mode shows KaTeX notation ("P(D) = 0.01" with "Prior (prevalence)" description).
- **Derived results:** Visually distinguished from input controls with background cards, left-accent borders (blue for total test-positive rate, orange for posterior), uppercase section labels, and a dividing rule. Content parsed from Region B display strings — frequency mode shows rate + count, probability mode shows KaTeX notation.
- **Main area:** Format selector tabs (Icon Array / Frequency Tree) at top of visualisation area. Placeholder content for now (subtask 3.2 places actual components).
- **State management:** `parameterReducer` updated with base rate snapping on N change (`snapBaseRate` function rounds to nearest 1/N step, clamped to valid range). Initial state changed from null/generic to mammography scenario loaded (scenarioId, vocabulary, and all parameters set from `MAMMOGRAPHY` constant).
- **KaTeXInline component** created for HTML-context LaTeX rendering (used in sidebar parameter labels and derived results). Separate from the SVG-context `KaTeXLabel` used by the tree component.

**Building-phase decisions resolved:**
- **Sidebar width:** 320px fixed. Accommodates Y2 format strings at reasonable font size. Main area gets remaining width.
- **Problem statement:** Always visible (not collapsible). It's short enough across all scenarios and both modes. Collapsibility would add UI complexity for minimal space savings.
- **N selector:** Segmented control (button group). Four options fit well horizontally. Communicates "discrete choice from small set" better than a dropdown.
- **Parameter panel layout:** Label + rate value on header line (left/right aligned), slider below, count description below slider. Clean vertical rhythm following the dependency chain.
- **Derived results styling:** Card-style with coloured left accent (blue = cool family for test-positive rate, orange = warm family for posterior). Uppercase section labels. Background differentiation from input controls.
- **Scenario selector:** Dropdown. Compact, works for 6 items, expandable if more scenarios are added.
- **Format selector:** Tab-style button pair at top of main area. Active tab uses the deep blue from the colour scheme (#1A5276) for consistency.

**Spec divergences:**
- The initial state now loads mammography by importing `MAMMOGRAPHY` directly in `parameterState.ts`, rather than dispatching `SET_SCENARIO` on first render. This avoids a flash of generic/empty state. Functionally identical to the spec's "on first load, the tool presents mammography."
- The `KaTeXInline` component was created as a separate HTML-context renderer rather than reusing the SVG-context `KaTeXLabel`. This was already anticipated in 2.4's forward-looking note ("If other components need inline centred KaTeX in foreignObjects, it could be extracted to a shared utility"). The HTML-context component is simpler (no foreignObject, no x/y positioning) — both share the same KaTeX rendering call.

**Forward-looking notes:**
- The `ExplorationMode` component holds `activeFormat` state locally (not in the reducer) since it's a view-layer concern. If Layer 4 format-switching animation needs to coordinate across components, this state may need to be lifted to the context.
- The `Sidebar` component's string parsing (`parseFrequencyParam`, `parseProbabilityParam`, `parseDerivedResult`) splits Region B display strings by delimiter (" — " and ": "). This works for all current template outputs but is coupled to the template format. If the template system's string format changes, these parsers need updating.
- The regrouping toggle (icon array contextual control) is not yet placed — it will be added in subtask 3.2 when the icon array component is integrated into the main area.
- Base rate snapping (`snapBaseRate`) uses `Math.round(baseRate * n) / n` which works reliably for all N presets (100, 200, 500, 1000). Floating-point precision is not an issue at these magnitudes.

- **Status:** Complete
- **Verify:** Sliders move and data package updates; scenario selection loads new parameters and vocabulary; display mode toggle switches all text layers; N selector triggers base rate snapping; derived results update reactively; layout accommodates all content in both modes

**3.2: Visualisation integration** ✓

**What was done:**
- `MainArea` component replaced placeholder with real `IconArray` and `FrequencyTree` components. Container dimensions measured via `ResizeObserver` and passed as `width`/`height` props. The non-active component unmounts when the format tab switches (not just hidden).
- Data package (`regionA`, `regionB`) and state props (`displayMode`, `groupingState`) wired from `ExplorationMode` through `MainArea` to the visualisation components. Both components re-render on every parameter change during slider drag — direct updates, no animation triggers.
- **Regrouping toggle** added as a contextual control in the toolbar, adjacent to the format selector. Segmented control styled consistently with the display mode toggle ("Group by: Condition | Test Result"). Only visible when icon array is active — disappears when tree is selected. Hard snap between grouping states (animation deferred to Layer 4).
- `groupingState` managed as local state in `ExplorationMode` (alongside `activeFormat`), since both are view-layer concerns, not problem-definition state.
- **Tree node domain labels (integration decision resolved).** Domain labels rendered as small text annotations above root and first-level nodes only. Root shows population name ("people", "emails"), first-level shows condition group names ("Have the disease", "Are spam"). Leaf nodes excluded: their domain labels from `ByConditionLabels` are identical to the parent's (both TP and FN say "Have the disease"), adding no new information. Leaves are distinguished by tree position and branch labels (structural terms like "Sensitivity: 90%"). Font size slightly smaller than branch labels for visual hierarchy.
- **Tree cross-branch combination** persistently shown in exploration mode (`CombinationShown` state passed by default).
- **Initial state** confirmed: mammography scenario, frequency mode, icon array, grouped-by-condition, fully partitioned construction state. All defaults flow correctly through context.
- Toolbar `flex-wrap` added for graceful handling at narrower viewport widths.

**Building-phase decisions resolved:**
- **Regrouping toggle placement:** In the toolbar, to the right of the format selector with a 16px left margin. Segmented control matching existing UI patterns.
- **Regrouping toggle wording:** "Group by: Condition / Test Result" — clear without prior knowledge, follows strand b wording principles (operation-descriptive rather than structural-terminology).
- **Tree node domain labels — above-node text vs. inside-node compound:** Above-node text chosen. Keeps node rectangles compact (150×44 at scale=1), avoids needing two-line layouts inside nodes, and maintains visual separation between domain context (what this group is) and numerical content (how many). Consistent with branches having their labels beside them rather than inside.
- **Tree domain labels — root and first-level only:** Leaf domain labels excluded because they're redundant with parent (conditionPositive.truePositive.domainLabel = conditionPositive.group.domainLabel = "Have the disease"). The leaf's distinguishing characteristic is its tree position and branch label, not a distinct domain name.

**Spec divergences:**
- Tree node domain labels show on root and first-level nodes only, not on leaves. The spec says "tree nodes carry domain group names alongside counts" for all nodes, but the current `ByConditionLabels` data structure assigns leaf nodes the same domain label as their parent group. Showing "Have the disease" above both the conditionPositive node (10) and the truePositive node (9) is redundant and adds visual clutter. If distinct leaf-level domain labels are needed later (e.g. "Have disease & test positive"), the template system would need to produce them — this is a potential Layer 5 refinement.
- `TreeCombinationState.CombinationShown` is passed as a constant for exploration mode rather than being configurable. The spec says "persistently shown" for exploration mode, so this is correct behaviour — the combination state toggle is a Part 4 concern.

**Forward-looking notes:**
- The `groupingState` is local to `ExplorationMode`. If Layer 4's regrouping animation needs to coordinate across components (e.g. disable the toggle during animation), this state access pattern works — the animation trigger and state change happen in the same component.
- The vis container uses `overflow: hidden` to prevent SVG overflow during transitions. Layer 4 animation should work within these bounds.
- At very narrow viewports (< ~750px main area width), the toolbar wraps the regrouping toggle below the format selector. Layer 5's responsive layout will handle this more fully.

- **Status:** Complete
- **Verify:** Drag a slider → visualisation updates immediately; switch format → other component appears with regrouping toggle showing/hiding; load different scenario → all text, parameters, and visualisation update; regrouping toggle switches icon array layout; tree shows domain labels above root and first-level nodes; cross-branch combination visible on tree; both display modes work across all components

**3.3: Full display mode integration** ✓

**What was done:**
- No new code required — all display mode integration was implemented as part of subtasks 3.1 and 3.2. Subtask 3.1 built the TopStrip (question text and problem statement switching between frequency and probability framing, with KaTeX rendering for probability-mode notation lines) and the Sidebar (parameter display strings in Y2 format for frequency mode and KaTeX probability notation for probability mode, including Bayesian parentheticals). Subtask 3.2 wired display mode through to both visualisation components.
- This subtask was a **verification and close-out pass** confirming all three persistent visibility layers switch correctly on display mode toggle, across all six scenarios, both formats (icon array and frequency tree), both grouping states, and multiple N values.

**Verification results:**
- Layer 1 (Top strip): Question text and problem statement switch correctly between frequency framing and probability framing (with KaTeX notation line) for all scenarios verified (mammography, spam filter, blood donation, factory inspection, drug screening, COVID antigen).
- Layer 2 (Sidebar): Parameters show Y2 format with Bayesian parentheticals in frequency mode ("Base rate (prior): 1% — 10 out of 1,000 have the disease") and KaTeX probability notation in probability mode ("P(D) = 0.01" with "Prior (prevalence)"). Derived results switch between frequency counts and probability values. Domain-specific label names (e.g., "Detection rate (likelihood)" for spam filter) display correctly.
- Layer 3 (Visualisation): Icon array compound labels switch between count/percentage strings and probability strings. Frequency tree node labels, branch labels, and cross-branch combination labels switch between plain text and KaTeX. Both formats verified in both modes.
- Visual sweep across scenarios: no label clipping, overflow, or layout issues found at N=100, 200, 500, 1000. Extreme proportion cases (mammography 1/99 at N=100, 10/990 at N=1000) handled correctly with label overlap avoidance.

**Spec divergences:** None — no new code was written.

**Forward-looking notes:** None — Layer 3 is now complete.

- **Status:** Complete
- **Verify:** Toggle between frequency and probability mode; all text across all three layers changes correctly; parameter panel formatting correct in both modes

---

### Layer 4 — Animation

**4.1: Regrouping animation** ✓

**What was done:**
- GSAP-based regrouping animation in `IconArray.tsx`. When `animateTransitions` prop is true, grouping state changes trigger smooth position interpolation instead of hard snap.
- Single progress tween architecture for performance: one GSAP tween drives a `{ value: 0→1 }` object, and `onUpdate` batch-sets all icon `x`/`y` attributes per frame. This avoids creating 1000 individual GSAP tweens — a single tween computes all positions each frame, keeping the animation smooth at N=1000.
- Both label sets (by-condition and by-test-result) always rendered in the DOM, wrapped in `<g>` elements with opacity control. During animation, GSAP crossfades: source labels fade out (0–40% of duration), target labels fade in (60–100% of duration), creating a brief both-hidden gap during the fastest icon movement.
- Ref collection via callback refs on each `<rect>` element, stored in a `Map<number, SVGRectElement>`. GSAP accesses DOM elements directly through these refs.
- `useLayoutEffect` handles the animation trigger: runs after React's DOM update but before browser paint, immediately sets icon positions to source layout positions (overriding React's target-position render), then starts the GSAP timeline. The user never sees a flash to target positions.
- Animation parameters: 700ms duration, `power2.inOut` easing. Configurable via constants (`REGROUP_DURATION`, `REGROUP_EASE`).
- Reverse transitions work by natural symmetry: clicking the toggle again triggers a new animation from the current state back to the previous state. The same code path handles both directions.
- `MainArea` passes `animateTransitions` to `IconArray`. The prop defaults to `false` for backwards compatibility — existing consumers (tests, future Part 4) get instant snapping unless they opt in.
- Animation discipline: slider drag changes `regionA`/`dualLayout` which is in the effect's dependency array — the cleanup function kills any running timeline, and the effect re-runs but returns early (groupingState unchanged). Icons snap to new data-driven positions. Scenario changes and N changes also kill running animations via the same mechanism.
- Mid-animation toggle: kills the current timeline and starts a fresh animation from the previous state's positions to the new target. For the two-state toggle, this produces a natural snap-to-source-then-animate-to-target behavior.

**Building-phase decisions resolved:**
- **Animation duration:** 700ms. Tested at N=1000 mammography — long enough to track individual icon movement (the 89 FP icons flowing to join 9 TP icons is clearly visible), short enough not to feel sluggish.
- **Label crossfade timing:** Source labels start fading immediately (first 40% = 280ms), target labels start fading in at 60% (last 40% = 280ms). The ~140ms gap where both are dim prevents a jarring label swap mid-movement and draws attention to the spatial transformation.
- **Batch position update vs. 1000 individual tweens:** Batch approach chosen. A single GSAP tween with `onUpdate` that loops through all icons and calls `setAttribute` is simpler and avoids the overhead of GSAP managing 1000 concurrent tween instances. GSAP handles the timing/easing; the loop handles the spatial interpolation.

**Spec divergences:** None. The implementation follows the spec: GSAP for element-level animation via refs, timeline coordination for multi-phase transitions, both directions supported, instant state setting preserved alongside animation.

**Forward-looking notes:**
- The `animateTransitions` prop is a simple boolean — it controls whether grouping state changes animate. Subtask 4.4 (animation discipline) is already handled by the `useLayoutEffect` dependency on `dualLayout`: data changes kill the timeline. If more granular animation control is needed (e.g., "animate this specific transition but not that one"), the prop could be extended to a callback or enum.
- The single-progress-tween pattern (one GSAP tween driving batch DOM updates via `onUpdate`) could be reused for icon array construction-step animation (subtask 4.2) — the same architecture works for batch colour transitions.
- Both label `<g>` groups are always in the DOM (one at opacity 0). This adds negligible rendering cost (invisible SVG groups with a few text elements) but avoids mount/unmount cycles during animation.
- The `useLayoutEffect` depends on `[groupingState, animateTransitions, dualLayout]`. If `dualLayout` changes (data or container resize), any running animation is killed and icons snap to their new positions — this is correct behavior since the spatial layout has fundamentally changed.

- **Status:** Complete
- **Verify:** Click regrouping toggle → smooth icon movement with label transitions; reverse works; mammography at $N = 1000$ performs smoothly

**4.2: Tree construction and combination animations** — DEFERRED to Part 4

Construction state stepping (RootOnly → FirstBranch → ConditionPositiveSecondBranch → FullyBranched) and combination animation are Part 4 (guided mode) concerns — exploration mode always renders FullyBranched with CombinationShown. No exploration-mode consumer exists for these animations. Per scope discipline: only build capabilities the current layer's consumers need.

**Dependency check (performed 2026-03-28):** No hard dependencies from 4.3, 4.4, Layer 5, or Part 4 on 4.2 being done now. 4.3 (format-switching) is a text-only crossfade independent of structural animation. 4.4 (animation discipline) already works via the cleanup mechanism established in 4.1. Part 4 can drive construction state transitions via instant snaps — the rendering support (construction state prop, visibility functions) is already built in Layer 2. Animation is an enhancement for Part 4, not a prerequisite.

**What's preserved for Part 4:** The `FrequencyTree` component accepts `constructionState` and `combinationState` props. `isNodeVisible`, `isBranchVisible`, `getVisibleNodes`, `getVisibleBranches`, and `VISIBLE_NODES`/`VISIBLE_BRANCHES` maps are exported. The bracket is rendered as an SVG path suitable for stroke-dashoffset animation. The single-progress-tween pattern from 4.1 is reusable for batch colour transitions.

- **Status:** Deferred to Part 4

**4.3: Format-switching cross-fade** ✓

**What was done:**
- Coordinated cross-fade animation across all three persistent visibility layers when the display mode toggle switches between Frequency and Probability. Implemented via `useFormatCrossFade` hook in `src/components/explorationMode/useFormatCrossFade.ts`.
- Animation strategy: fade-out (150ms) → dispatch state change at midpoint (content invisible) → fade-in (150ms). Total 300ms, within the spec's 200–400ms range. Uses GSAP for consistency with the regrouping animation (4.1).
- Three content areas targeted via refs: top strip text (question + problem statement), sidebar content (parameter labels + derived results), and visualisation container (icon array labels or tree labels). Controls (scenario selector, display mode toggle buttons, N selector, format selector) remain fully visible — only text content that changes between modes participates in the cross-fade.
- ExplorationMode orchestrates: intercepts the `onDisplayModeChange` callback, routes it through the hook instead of dispatching directly. The hook manages the GSAP timeline and dispatches the real `SET_DISPLAY_MODE` at the animation midpoint.
- Guard against no-op transitions: clicking the already-active mode button does nothing. Mid-animation toggle kills the current timeline and restores opacity.
- Content wrapper divs added to TopStrip (`top-strip__content`) and Sidebar (`sidebar__content`). MainArea's vis-container serves double duty as the cross-fade target (callback ref merges both the ResizeObserver ref and the cross-fade ref).
- **Layout shift fix:** Probability mode's question text has an extra KaTeX notation line (`P(D | T⁺) = ?`) that frequency mode lacks. Without mitigation, the top strip height would change between modes, causing everything below to jump. Fixed by rendering an invisible spacer (`visibility: hidden`) in frequency mode that renders the same KaTeX content — this reserves exactly the right height so the top strip is the same size in both modes. Zero layout shift during cross-fade.

**Spec divergences:** None. The implementation follows the spec exactly: cross-fade of all text content across all three layers, 200–400ms, spatial structure static throughout, Part 3 orchestrates using GSAP.

**Forward-looking notes:**
- The `useFormatCrossFade` hook exposes an `isTransitioning` ref. Subtask 4.4 (animation discipline) can use this to prevent other animations from starting during the cross-fade, or to decide interaction behaviour during the brief transition.
- The cross-fade dispatches the state change at the midpoint via `onComplete` of the fade-out phase. React re-renders with new content while opacity is 0. The fade-in then reveals the new content. This means the new KaTeX content has the full 150ms fade-in duration to parse and render — more than enough for the lightweight KaTeX inline calls used in the sidebar and tree.
- The `contentRef` props on TopStrip, Sidebar, and MainArea are optional — these components work unchanged if the ref is not provided (backwards compatibility for tests or other consumers).

- **Status:** Complete
- **Verify:** Toggle display mode → coordinated text transition across all three layers; spatial structure doesn't shift; both directions work; clicking the already-active mode does nothing; works with both icon array and frequency tree; works across all scenarios

**4.4: Animation discipline during live interaction**
- Slider drag: direct updates only (no GSAP animations triggered)
- Discrete state changes (regrouping toggle, format switch, scenario change): animations trigger
- Throttling if rendering can't sustain frame rate during drag at high $N$
- Note: regrouping animation (4.1) already implements discipline via `useLayoutEffect` cleanup — data changes kill running timelines. 4.4 verifies this works across all animation types (regrouping + format-switching) and confirms no conflicts during rapid interaction.
- **Status:** Not started
- **Verify:** Drag slider → no animation, just direct updates; click regrouping toggle → smooth animation; rapid interaction doesn't cause animation conflicts

---

### Layer 5 — Polish and Edge Cases

**5.1: Responsive layout**
- Sidebar → stacked transition at narrow/mobile breakpoints
- Parameter controls adapt to compact horizontal band or collapsible section
- Visualisation takes full width below
- Format selector and contextual controls adapt
- Building-phase decisions to resolve here: exact breakpoints, mobile control layout
- **Status:** Not started
- **Verify:** Test at various viewport widths; controls and visualisation remain usable

**5.2: Accessibility**
- ARIA attributes on SVG elements (icon array regions, tree nodes)
- Keyboard navigation for controls and interactive elements
- Colour scheme verification against colour-blind simulation
- Screen reader testing for key information (counts, labels, state changes)
- **Status:** Not started
- **Verify:** Screen reader walkthrough; keyboard-only navigation; colour-blind simulation check

**5.3: Edge cases and degenerate states**
- $N_{T^+} = 0$ display (contextual message from template system)
- Zero-from-rounding soft contextual notes
- Sticky slider UX (subtle indication near thresholds where count changes)
- $N$-change notification when base rate snaps to nearest valid step
- Small $N_D$ behaviour across all visualisations
- **Status:** Not started
- **Verify:** Set parameters to trigger each edge case; contextual messages appear correctly

**5.4: Further polish (scope TBD based on earlier layers)**
- Control styling refinement
- Label text fine-tuning (guided by strand b wording principles in context)
- First-time-user affordances (if needed)
- Hover tooltips on compound labels — vocabulary bridging for structural abbreviations (evaluate once assembled UI shows whether gap is felt; see Implementation Details building-phase note)
- Bayes' rule formula toggle (click-to-reveal, probability mode only)
- Glossary component (could-cut)
- **Tree leaf domain labels — evaluate whether leaves should show "Test positive"/"Test negative" above-node labels.** Currently leaf nodes have no domain labels (branch labels carry the test-result information via structural terms like "Sensitivity: 90%"). The question is whether adding explicit test-result domain labels aids novice comprehension (direct labelling reduces cognitive load per graph comprehension literature — Carpenter & Shah 1998) or adds visual clutter to an already label-dense tree. Key tension: redundant encoding vs. information overload; expertise reversal effect (novices benefit from explicit labels, but the inference from branch label to test outcome is a one-step connection that may constitute useful germane load). Consider in context of guided mode — if the construction animation scaffolds leaf meaning through sequenced appearance, static labels may be less necessary. If added, the template system would need to produce distinct leaf-level domain labels rather than repeating the parent's condition name.
- **Status:** Not started

---

### Post-Exploration-Mode: Part 4 — Guided & Practice Modes

Part 4 is not yet specified. Its design depends on the exploration mode being built and the Part 1 components being stable. Development of Part 4 requires a design phase first (pedagogical sequence design, scaffolding model, fading strategy), followed by extending Part 1 components with the interaction hooks Part 4 needs (icon-level events, node value input, batch colouring, region highlighting).

- **Status:** Not started — requires design phase before development

---

## Harmonisation Log

<!-- Records when harmonisation passes were done and what was updated. -->
<!-- Format: date, what was harmonised, brief summary of changes to Implementation Details doc. -->

**2026-03-26 — Post-Layer 1 harmonisation.** Reconciled accumulated spec divergences from subtasks 0.1, 1.1, and 1.2 with the Implementation Details doc. Changes made:

1. **Step 1 defensive rounding:** Added implementation note to the computation pipeline (Step 1) documenting that `standardRound` is applied defensively to the first-level partition multiplication, guarding against floating-point edge cases. No functional divergence from spec.
2. **Output 4 degenerate wording:** Updated the Output 4 degenerate case from "Nobody [test_positive_name]" to "No [population_name] [test_positive_name]" — making it consistent with the already-updated Output 9 wording (which was corrected during the Part 5 template verification pass).
3. **Decimal formatting precision:** Added implementation note to the number formatting convention section specifying 3 decimal places for values ≥ 0.01 (necessary for values like 0.901, 0.089, 0.098), with trailing-zero stripping to minimum 2 characters. Percentage formatting uses 1 decimal place.
4. **Outputs 9/10 as standalone functions:** Added note to the template system summary that Outputs 9 (degenerate messages) and 10 (glossary entries) are exported as standalone helper functions rather than embedded in Region B's type structure, since Region B doesn't have fields for them.
5. **KaTeX via foreignObject:** Added new subsection to the Tech Stack Decision documenting the resolved approach: KaTeX HTML output wrapped in SVG `<foreignObject>` elements. This was left open in the spec and resolved during subtask 0.1.

Also updated `Our Plan + Status.md`:
- Updated "Next steps" paragraph and status summary to reflect that coding has begun and Layers 0–1 are complete.

**2026-03-27 — Post-Layer 2 harmonisation.** Reconciled accumulated spec divergences from subtasks 2.1, 2.2, and 2.4 with the Implementation Details doc. (Subtask 2.3 had no spec divergences.) Changes made:

1. **Grid dimension calculation:** Added implementation note documenting the candidate-scoring approach used instead of the simple $s = \sqrt{(W \times H) / N}$ formula. The scoring approach accounts for inter-icon spacing and reliably prevents container overflow. Same constraints satisfied.
2. **Region-to-cell allocation:** Added implementation note documenting that the allocation algorithm counts actual occupied cells per grid line (handles incomplete last row/column at extreme aspect ratios or $N$ values).
3. **Label positioning:** Added implementation note to the compound label section documenting the overlay approach (labels inside region bounding box) and the overlap avoidance logic for extreme-proportion cases (e.g., mammography 10/990 split).
4. **Tree node dimensions and KaTeXInline:** Added implementation note to node rendering section documenting the 150×44 reference node dimensions and the `KaTeXInline` component (flexbox-centred foreignObject for node labels, vs. the absolute-positioned `KaTeXLabel` used for branch/bracket labels).
5. **Branch label side assignment:** Added implementation note documenting left-side labels for left branches, right-side for right branches.
6. **Tree node domain labels:** Added implementation note to the terminology model's "domain labels" section documenting that tree node domain labels (e.g., "Have disease: 10" rather than just "10") are deferred to Layer 3 as an integration decision — presentation format interacts with available space and node sizing in the assembled layout.

Also updated `Our Plan + Status.md`:
- Updated "Next steps" paragraph and status summary to reflect that Layers 0–2 are complete and Layer 3 is next.

**2026-03-28 — Post-Layer 3 harmonisation.** Reconciled accumulated spec divergences and building-phase decision resolutions from subtasks 3.1, 3.2, and 3.3 with the Implementation Details doc. (Subtask 3.3 had no spec divergences — it was a verification pass.) Changes made:

1. **Tree node domain labels — integration decision resolved:** Updated the implementation note in the terminology model's "domain labels" section (previously flagged as a Layer 3 integration decision). Resolution: above-node text annotations on root and first-level nodes only; leaf nodes excluded (redundant with parent). Above-node text chosen over inside-node compound to keep nodes compact. Includes forward pointer to Layer 5.4 evaluation of leaf-level domain labels.
2. **Part 3 current status:** Updated from "building-phase decisions to be resolved" to reflect that Layer 3 is built and verified, with remaining items (animation, responsive, polish) identified.
3. **Building-phase decisions — resolutions documented:** Updated the 13-item building-phase decisions list with resolutions for each item resolved during Layer 3 coding: sidebar width (320px), problem statement always visible, segmented controls for toggles, dropdown scenario selector, regrouping toggle placement (toolbar, contextual) and wording ("Group by: Condition / Test Result"), derived results styling (card with coloured accent), format selector (tab-style). Remaining items (responsive breakpoints, animation coordination, Bayes formula toggle, hover tooltips, first-time affordance) carry forward to Layers 4–5.
4. **Initial state loading:** Added implementation note documenting direct import of mammography constant rather than dispatching SET_SCENARIO on first render (avoids flash of empty state).
5. **HTML-context KaTeX component:** Added implementation note documenting the separate `KaTeXInline` component for HTML-context rendering (sidebar, derived results) vs. the SVG-context `KaTeXLabel`.

Also updated `Our Plan + Status.md`:
- Updated "Next steps" paragraph to reflect Layers 0–3 complete and Layer 4 next.
- Updated Part 3 status row from "Core decisions confirmed — ready to build" to "Complete (Layer 3 built)" with summary of resolved decisions.
- Updated "in-between layer" paragraph to reflect Part 3 is built.
- Updated summary line to reflect Layer 3 complete.
