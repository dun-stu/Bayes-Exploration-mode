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
Layers 0 (scaffolding), 1 (data foundation), and 2 (static rendering) complete. Both visualisation components — icon array and frequency tree — render fully with all construction states, both display modes, and container-responsive scaling. Next: Layer 3 (app shell and integration — first working exploration mode). Harmonisation passes done after Layer 1; Layer 2 harmonisation pending.

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

- **Status:** Complete
- **Verify:** `npx vitest run src/components/frequencyTree/layout.test.ts` (43 tests pass), `npx vitest run` (all 354 tests pass), `npx tsc --noEmit` (zero errors), `npx vite build` (succeeds), visual verification of: full tree with combination at mammography N=1000 frequency mode, root-only state, condition-positive-second-branch state, probability mode with KaTeX labels, spam filter scenario with domain vocabulary

---

### Layer 3 — App Shell and Integration *(critical milestone: first working exploration mode)*

**3.1: Layout and parameter controls**
- Three-layer screen structure: top strip (question/scenario/display mode), sidebar (parameter controls + derived results), main area (visualisation)
- Parameter controls wired to computation pipeline: $N$ selector (discrete presets), base rate slider ($N$-relative steps), sensitivity slider (1% steps), FPR slider (1% steps)
- Derived results display (total test-positive rate, posterior) visually distinguished from inputs
- Scenario selector loading scenarios from Part 5 data
- Display mode toggle (frequency ↔ probability)
- Building-phase decisions to resolve here: sidebar proportions, problem statement visible vs. collapsible, $N$ selector widget type, parameter panel layout, derived results styling, format selector placement
- **Status:** Not started
- **Verify:** Sliders move and data package updates; scenario selection loads new parameters; layout accommodates all content

**3.2: Visualisation integration**
- Icon array and frequency tree components placed in main area, receiving data package
- Format selector tabs switching between components
- Live updating during slider drag (direct updates, no animation triggers)
- Regrouping toggle for icon array (hard snap — animation comes in Layer 4)
- Initial state: mammography scenario, frequency mode, icon array, grouped-by-condition
- **Status:** Not started
- **Verify:** Drag a slider → visualisation updates; switch format → other component appears; load different scenario → everything updates; regrouping toggle works

**3.3: Full display mode integration**
- Part-3-facing template outputs integrated: question text, problem statement, parameter display strings in their UI positions
- Display mode toggle switches all three layers simultaneously (hard swap — cross-fade animation comes in Layer 4)
- Parameter panel shows Y2 format in frequency mode, probability notation in probability mode
- Bayesian parentheticals visible in parameter labels
- **Status:** Not started
- **Verify:** Toggle between frequency and probability mode; all text across all three layers changes correctly; parameter panel formatting correct in both modes

---

### Layer 4 — Animation

**4.1: Regrouping animation**
- GSAP integration for icon array position interpolation between grouping layouts
- All icons animate simultaneously with configurable easing and duration
- Label fade transitions coordinated with icon movement (old labels fade out, new labels fade in as icons settle)
- Reverse transition supported (regroup ↔ un-regroup)
- **Status:** Not started
- **Verify:** Click regrouping toggle → smooth icon movement with label transitions; reverse works; mammography at $N = 1000$ performs smoothly

**4.2: Tree construction and combination animations**
- Branch-addition sequence: branch extends → child node appears → branch label fades in → node label appears
- Cross-branch combination sequence: TP/FP nodes highlight → bracket draws → sum label appears → posterior appears
- Construction state transitions trigger appropriate animations
- **Status:** Not started
- **Verify:** Step through each construction state with animation; combination animation plays correctly

**4.3: Format-switching cross-fade**
- Coordinated cross-fade across all three layers (question text, parameter labels, visualisation labels), 200–400ms
- Spatial structure remains static throughout — only text changes
- Works for both icon array and tree components
- **Status:** Not started
- **Verify:** Toggle display mode → coordinated text transition everywhere; spatial structure doesn't shift

**4.4: Animation discipline during live interaction**
- Slider drag: direct updates only (no GSAP animations triggered)
- Discrete state changes (regrouping toggle, format switch, scenario change): animations trigger
- Throttling if rendering can't sustain frame rate during drag at high $N$
- Building-phase decisions to resolve here: regrouping toggle exact placement, animation coordination timing
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
