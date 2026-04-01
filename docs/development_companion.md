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
Layers 0–4 complete, Layer 5 in progress (5.1 responsive layout done, 5.3 edge cases done, 5.4a hover tooltips done, 5.4b Bayes' rule formula toggle done, 5.4c polish done, 5.4d tree leaf labels and cosmetic polish done). The exploration mode is a fully working integrated tool with animation: sidebar with parameter controls (Y2 format in frequency mode, KaTeX probability notation in probability mode, Bayesian parentheticals), top strip with scenario selector and display mode toggle, and main area with icon array and frequency tree. Display mode toggle switches all three persistent visibility layers simultaneously with a coordinated cross-fade animation (300ms total, GSAP). Format selector switches between icon array and frequency tree. Regrouping toggle triggers smooth GSAP animation (700ms, power2.inOut) — icons interpolate between by-condition and by-test-result layouts with coordinated label crossfade. Tree displays domain labels above root and first-level nodes, test-outcome labels below leaf nodes (scenario-adapted vocabulary), cross-branch combination persistently shown. Tree first-level nodes use blended midpoint shades (#ED8A30 mid-warm, #3B80AC mid-cool) distinguishing them from leaf nodes. All six scenarios, both display modes, both formats, and both grouping states verified working across N values 100–1000. Animation discipline verified: slider drag produces direct updates only (no GSAP), discrete state changes trigger appropriate animations, cross-animation conflicts handled gracefully. Tree construction/combination animation (4.2) deferred to Part 4. Responsive layout (5.1): single breakpoint at 768px, sidebar stacks above vis as compact horizontal band with 3-column slider grid and hidden descriptions. Edge case handling (5.3): contextual notes for zero-from-rounding, small N_D, and N_T+=0; transient N-change notification when base rate snaps. Hover tooltips (5.4a): compound label composition lines show expanded structural abbreviations with domain vocabulary on hover via SVG `<title>` elements. Bayes' rule formula toggle (5.4b): click-to-reveal in probability mode, live-substituted general form below the vis, persistent once opened across parameter/scenario/format changes. Formula bridging (5.4c): single-line three-zone formula — full general symbolic form (normal colour) → numerical substitution (grey/small) → joint/marginal form with hover tooltips (normal) → result. Tooltips use scenario vocabulary, applied via MutationObserver + KaTeX \htmlClass. Tree leaf labels and cosmetic polish (5.4d): leaf nodes show test-outcome domain labels, branch labels use perpendicular offset for balanced positioning, marginal likelihood accent uses warm→cool gradient. Probability-mode rendering fixes (5.4e): `isLatex()` detection for all probability notation, KaTeX label text-alignment (right for left-side branches, center for bracket), `\tfrac` stacked fractions in combination bracket, thin space in question notation. Scenario-adapted notation (5.5): probability-mode LaTeX uses per-scenario symbols — S/F for spam, I for factory test, D/T for medical/default. Factory vocabulary updated ("are rejected" → "are flagged"). Symbols resolved via `notationSymbols` on `DataPackageRegionB`, threaded through all LaTeX generators and Bayes formula panel. Accessibility (5.2): ARIA attributes on tree (per-node labels, full tree description) and icon array (partition summary); `prefers-reduced-motion` disables all GSAP and CSS animations; keyboard navigation verified with `:focus-visible` styles, `aria-pressed` on toggles, `aria-label` on sliders; `aria-live` announcer for discrete and debounced slider state changes. **Layer 5 complete. Next: Layer 5 harmonisation pass, then Part 4.**

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

**4.4: Animation discipline during live interaction** ✓

**What was done:**
- Verification and hardening pass — no code changes required. All animation discipline mechanisms from 4.1 and 4.3 compose correctly.
- **Slider drag discipline:** Confirmed correct by architecture. Slider `onChange` → `dispatch` → `useMemo` recomputes data package → React re-renders with new props. The regrouping `useLayoutEffect` returns early when `groupingState` is unchanged (`prevGrouping === groupingState` check). Format cross-fade is never invoked (no call to `handleDisplayModeChange`). If a regrouping animation is running mid-drag, the `useLayoutEffect` cleanup kills it before the new effect runs.
- **Cross-animation conflicts (6 scenarios tested via code review):**
  - Regrouping toggle during format cross-fade: both run on different DOM elements (SVG rects/groups vs. container divs). Regrouping continues through the opacity transition — not visually ideal but handles gracefully, no stuck states.
  - Format cross-fade during regrouping: same as above — independent DOM targets, no conflicts.
  - Slider drag during regrouping: cleanup kills running timeline, icons snap to new data positions. Correct.
  - Scenario change during format cross-fade: cross-fade completes normally, new scenario data flows through. Correct.
  - Rapid double-click on regrouping toggle: cleanup kills first animation, second starts fresh from source-to-target. Natural reversal. Correct.
  - Rapid double-click on display mode toggle: first cross-fade killed, second starts fresh. If clicked during fade-out (pre-dispatch), same-mode check restores opacity. If clicked during fade-in (post-dispatch), new cross-fade to original mode. Correct.
- **Throttling assessment:** Not needed. At N=1000, the rendering path (sub-millisecond computation + React keyed reconciliation of 1000 SVG rects) is well within 16ms frame budget. The companion doc's earlier observation ("performs smoothly at all N values") confirmed by architectural analysis.
- **Mutual exclusion guards between animation types:** Not added. Both animation systems handle interruption gracefully via kill-and-restart. Adding mutual exclusion would prevent a minor aesthetic edge case (regrouping during cross-fade) but at the cost of added complexity and potential interaction deadlocks. The edge case requires deliberate rapid clicking and produces no errors or stuck states.

**Spec divergences:** None — no code was written.

**Forward-looking notes:** None — Layer 4 is now complete.

- **Status:** Complete
- **Verify:** Drag slider → no animation, just direct updates; click regrouping toggle → smooth animation; rapid interaction doesn't cause animation conflicts

---

### Layer 5 — Polish and Edge Cases

**5.1: Responsive layout** ✓

**What was done:**
- Added a single CSS media query breakpoint at `max-width: 768px` in `ExplorationMode.css`. Below this width, the layout restructures from sidebar-beside-vis to a stacked layout where the parameter controls form a compact horizontal band above the full-width visualisation.
- **Content area** flex direction changes from `row` to `column`, stacking sidebar above main area.
- **Sidebar** loses its fixed 320px width, becomes full-width. Internal content reorganises via CSS grid: N selector spans full width, three parameter sliders arranged in a 3-column grid, derived results displayed side-by-side in a horizontal row.
- **Slider descriptions hidden** (`display: none`) in compact mode — the Y2 format text ("10 out of 1,000 have the disease") is removed to save ~200px of vertical height. The visualisation labels carry this information.
- **Section labels** ("Parameters", "Results") hidden in compact mode.
- **Main area** required `min-height: 0` and `overflow: hidden` to prevent the flex child from expanding unboundedly in column-direction layout (the default `min-height: auto` caused the vis container to grow to content size rather than being constrained by the flex parent).
- Top strip, toolbar, and all controls receive tighter padding and slightly smaller font sizes at the narrow breakpoint.
- All existing animation systems preserved: cross-fade refs (`topStripContentRef`, `sidebarContentRef`, `visContentRef`) remain on their original DOM elements. CSS-only changes — no JSX modifications.

**Building-phase decisions resolved:**
- **Breakpoint:** Single breakpoint at 768px. Above it, the desktop layout is unchanged. Below it, the stacked compact band layout activates.
- **Stacking, not collapsing:** The spec offers "stacks above or collapses" but the binding constraint (simultaneous viewing of controls and vis) rules out collapsing. Stacking preserves simultaneous visibility — at 768px × 900px, the compact band (~230px) + vis (~500px) both fit comfortably in the viewport.
- **No second breakpoint for phones:** The stacked layout degrades gracefully down to ~400px. At very narrow widths, the 3-column slider grid becomes tight but remains functional. No dedicated phone treatment — the tool targets desktop/laptop educational settings.
- **Slider descriptions hidden rather than compressed:** Hiding the Y2 descriptions (rather than making them smaller or collapsible) was chosen for simplicity and maximum vertical space savings. The vis itself shows the counts, so the information is not lost.

**Spec divergences:**
- None. The spec says "sidebar stacks above or collapses, with the parameter controls becoming a compact horizontal band or collapsible section above the visualisation" — we implemented the stacking/compact-band variant, which is one of the offered options. The breakpoint value (768px) and compact layout specifics (3-column grid, hidden descriptions) were building-phase decisions as intended.

**Forward-looking notes:**
- The `min-height: 0` fix on `.main-area` at the narrow breakpoint is essential for correct flex behaviour in column direction. If any future changes add nested flex containers in the content area column layout, they may need the same treatment.
- The 3-column slider grid works well at 600px+ but becomes tight below ~450px. If a phone-specific experience is ever needed, the sliders would need to stack vertically (single column), but this is not currently warranted.

- **Status:** Complete
- **Verify:** Test at various viewport widths; controls and visualisation remain usable. Specific widths to check: 1280px (desktop regression), 900px (desktop, tighter), 769px (just above breakpoint), 760px (just below — compact band active), 600px (narrower stacked), 400px (degraded but functional). Also verify: display mode cross-fade works at narrow width, slider drag updates vis at narrow width, regrouping toggle works at narrow width.

**5.2: Accessibility** ✓

**What was done:**
- **ARIA attributes on frequency tree SVG.** The tree SVG now has a comprehensive data-driven `aria-label` that describes the full tree structure using domain vocabulary — population, condition groups, partition counts, cross-branch combination result, and posterior. Each node group has `role="group"` and `aria-label` describing its semantic meaning (e.g., "Condition positive: 10 have the disease"). The combination bracket group has a descriptive label. All labels update dynamically when parameters, scenario, or display mode change. The `buildTreeAriaLabel` and `buildNodeAriaLabel` functions compose descriptions from existing data package fields (no duplicated template logic).
- **ARIA summary on icon array SVG.** The icon array SVG has a `role="img"` with a data-driven `aria-label` summarising the partition structure: population, condition group counts with sub-group breakdowns (TP, FN, FP, TN), and current grouping state. Updates on parameter, scenario, and grouping state changes. The `buildIconArrayAriaLabel` function derives the description from Region A counts and Region B domain vocabulary.
- **`prefers-reduced-motion` support.** A `usePrefersReducedMotion` hook (`src/hooks/usePrefersReducedMotion.ts`) detects the OS-level `prefers-reduced-motion: reduce` media query and listens for changes. When active: regrouping animation is disabled (instant snap via `animateTransitions=false` passed through ExplorationMode → MainArea → IconArray); format-switching cross-fade is disabled (instant dispatch, no GSAP timeline); CSS transition effects on buttons are disabled; the N-change notification slide-down animation is disabled. All three animation paths (GSAP regrouping, GSAP cross-fade, CSS keyframe) are covered.
- **Keyboard navigation audit and fixes.** All interactive elements already use native `<button>`, `<select>`, and `<input type="range">` — keyboard-accessible by default. Added: `:focus-visible` styles on all buttons, toggle controls, and sliders (2px solid #1A5276 outline, matching the UI accent colour); `role="group"` and `aria-label` on all segmented controls (display mode toggle, N selector, format selector, grouping toggle); `aria-pressed` on toggle buttons to communicate the active state; `aria-label` on slider inputs ("Base rate", "Sensitivity", "False positive rate"); `aria-labelledby` on the N selector button group linking to its label element; `role="status"` on contextual notes and the transient N-change notification; `aria-hidden="true"` on the grouping toggle's decorative "Group by:" text label (the group's `aria-label` provides the accessible name).
- **`aria-live` region for state changes.** A `useAriaLiveAnnouncer` hook (`src/hooks/useAriaLiveAnnouncer.ts`) manages a visually hidden (`sr-only` class) `aria-live="polite"` region in ExplorationMode. Two announcement modes: (1) Immediate for discrete changes — scenario switch ("Scenario: Mammography Screening"), N change ("Population size: 1,000"), display mode toggle ("Display mode: Probability"), format change ("Format: Frequency Tree"), grouping change ("Grouped by: Test Result"). (2) Debounced (500ms after last change) for continuous slider drag — announces the final value after the user stops dragging ("Base rate: 5%", "Sensitivity: 90%", "False positive rate: 9%"). The debounce prevents overwhelming the screen reader during a slider drag. The announcer uses a toggle-to-empty-then-set pattern (via `requestAnimationFrame`) to ensure re-announcement even when the message structure is similar.
- **`sr-only` utility class** added to `src/index.css` — standard visually-hidden pattern (1px clip rect, absolute positioning) for content that should be read by screen readers but not displayed.

**Spec divergences:**
- The spec mentioned "accessibility via ARIA attributes" as a property of the SVG rendering choice but did not specify what ARIA attributes to add. The implementation provides: summary-level `aria-label` on both SVG roots (data-driven, scenario-adapted), per-node `role="group"` + `aria-label` on tree nodes, `role="group"` on segmented controls, `aria-pressed` on toggle buttons, `aria-label` on slider inputs, and an `aria-live` announcer for state changes. These are building-phase accessibility decisions.
- `prefers-reduced-motion` support was not in the original spec — it's an accessibility best practice added during development. The implementation disables GSAP animations and CSS transitions/animations when the OS preference is active.

**Forward-looking notes:**
- **Icon array spatial-accessibility limitation.** The ARIA summary label provides the *data* (partition counts, grouping state) but not the *spatial experience*. The tool's pedagogical value for the icon array derives significantly from spatial perception — seeing 89 false positives visually swamping 9 true positives, the regrouping animation's dramatic spatial reconfiguration, the base-rate salience of 10 warm icons in a sea of 990 cool icons. These spatial-perceptual effects are fundamentally visual and cannot be conveyed through text labels. Full non-visual accessibility for the icon array's spatial pedagogy would require alternative representations (sonification, tabular alternative view, or a descriptive narrative mode) — this is a genuine limitation and a substantive further-work item, better acknowledged than papered over.
- The `usePrefersReducedMotion` hook returns a reactive boolean — if future animations are added (Part 4 construction sequences, combination animation), they should check this value before triggering GSAP timelines.
- The `useAriaLiveAnnouncer` hook is generic and reusable. If Part 4's guided mode needs to announce construction steps or feedback, the same hook pattern can be used.
- Colour-blind verification (palette under protanopia/deuteranopia/tritanopia simulation) is deferred to the evaluation phase — it's a visual verification task, not a code change, and will produce potential report figures. Noted in Plan & Status.

- **Status:** Complete
- **Verify:** Tab through all controls — visible focus ring on each; operate each control with Enter/Space/Arrow keys. Inspect tree SVG `aria-label` in DevTools — should contain full tree description with domain vocabulary. Inspect icon array SVG `aria-label` — should contain partition summary. Enable `prefers-reduced-motion` in Chrome DevTools (Rendering panel) — regrouping should snap instantly, format switch should be instant. Inspect the `sr-only` div — should contain announcement text after changing scenario, N, display mode, or sliders.

**5.3: Edge cases and degenerate states** ✓

**What was done:**
- **$N_{T^+} = 0$ display:** Verified that the template system's degenerate posterior strings render correctly in the sidebar's derived results area. Frequency mode shows "No people test positive with these parameters — the posterior is undefined." Probability mode shows "$P(T^+) = 0$ — no positive tests. Posterior is undefined." Fixed the probability-mode degenerate string — the original contained raw LaTeX (`\mid`) in a plain-text description portion, which would render as literal backslash text. Replaced with clean prose ("Posterior is undefined.") since the KaTeX notation portion (`P(T^+) = 0`) already conveys the mathematical state. Same fix applied to the `generateDegenerateMessages` helper for consistency. Tree cross-branch combination handles this case correctly (both frequency and probability modes).
- **Zero-from-rounding contextual notes:** Soft contextual note appears below the sensitivity slider when `sensitivity > 0` but `nTP === 0` (e.g., N_D=3, sensitivity=15% → round(0.45)=0). Analogous note for FPR slider when `fpr > 0` but `nFP === 0`. Messages adapted per parameter: sensitivity note mentions "detected cases", FPR note mentions "false positives". Notes are persistent while the condition holds, disappearing when parameters change to a non-degenerate state.
- **Small $N_D$ contextual note:** Soft contextual note appears below the base rate slider when $N_D \leq 3$ (and $N_D > 0$). Threshold of 3 chosen because at $N_D \leq 3$, sensitivity is effectively quantised to very coarse steps (33%/50%/100% at $N_D = 3$; binary at $N_D = 1$).
- **$N$-change notification:** Transient notification appears below the N selector when switching N presets forces the base rate to snap to a different value. Shows the before/after rates: "Base rate adjusted from 0.3% to 1% at this population size." Notification enters with a subtle slide-down animation (CSS keyframe) and auto-dismisses after 4 seconds. Also clears on any subsequent base rate change or scenario change (no stale notifications). Timer properly cleaned up on component unmount.
- **Sticky slider UX:** Verified by code reading that the Y2 format (count-emphasized display) already handles this correctly. The count updates at rounding thresholds while the rate changes smoothly — the Y2 format makes this visible and natural. No additional sticky-slider indicators implemented, per spec guidance ("the stickiness is the natural frequency framework working as intended").
- **Contextual note styling:** Warm informational style — small text (11px), amber-yellow background (#fff8e1), brown text (#795548), left border accent (#ffb74d). Feels like the tool explaining itself, not like an error state. Responsive: slightly smaller (10px) in compact mode.

**Spec divergences:**
- Probability-mode degenerate posterior string changed from `"P(T^+) = 0 — no positive tests. P(D \mid T^+) is undefined."` to `"P(T^+) = 0 — no positive tests. Posterior is undefined."`. The original contained raw LaTeX in a string that the sidebar renders as plain text (the `parseDerivedResult` function splits on ` — ` and renders the second part without KaTeX). The LaTeX notation is already conveyed by the first part. Same change applied to `generateDegenerateMessages().nTestPosZeroProbability`.
- Zero-from-rounding and small $N_D$ messages are inline strings in the Sidebar component rather than consuming the `generateDegenerateMessages` helper. The helper's `zeroFromRounding` message is sensitivity-specific ("the sensitivity doesn't produce any detected cases") — the FPR case needs a different message. The inline approach is simpler than extending the helper with per-parameter variants.

**Forward-looking notes:**
- The N-change notification state lives in `ExplorationMode` and is passed to `Sidebar` as a prop. If future subtasks need to show transient notifications for other events, the same pattern (state + timeout ref + prop) can be reused.
- `snapBaseRate` is now imported by `ExplorationMode` to pre-compute the snap before dispatching. This is safe because the function is pure and deterministic — the reducer applies the same snap.

- **Status:** Complete
- **Verify:** Set sensitivity=0% and FPR=0% → posterior shows degenerate message in sidebar and tree bracket. Set N=100, base rate=1%, sensitivity=15% → zero-from-rounding note on sensitivity slider. Set N=100, base rate=1% → small N_D note on base rate slider. Set N=1000, base rate=0.3%, then switch to N=100 → transient notification shows "Base rate adjusted from 0.3% to 1%". Drag sensitivity slider at N_D=10 → count updates at thresholds, rate changes smoothly.

**5.4a: Hover tooltips on compound labels** ✓

**What was done:**
- SVG `<title>` elements added to compound label composition lines (the "(TP: 9, FN: 1)" text). On hover, the browser displays a native tooltip expanding each structural abbreviation with its full name and scenario-specific domain description.
- `generateTooltipDescriptions` function produces domain-adapted descriptions for all four groups: e.g., mammography TP → "True Positive — have the disease and test positive"; spam TP → "True Positive — are spam and are flagged". Uses `ScenarioDefinition` vocabulary directly, with `DEFAULT_VOCABULARY` fallback for null scenarios.
- `buildCompositionTooltip` parses the composition string (e.g., "(TP: 9, FN: 1)") and expands each abbreviation into a multi-line tooltip with descriptions and values.
- `scenarioVocabulary` prop threaded through `ExplorationMode` → `MainArea` → `IconArray`. Tooltip descriptions memoised per scenario change.
- Composition text elements styled with `cursor: help` when tooltips are present, signalling interactivity.
- Both grouping states (by-condition and by-test-result) have tooltips on their respective composition lines. Both display modes (frequency and probability) supported — the tooltip expands whatever values the composition line contains (counts or percentages).
- 11 unit tests: `generateTooltipDescriptions` for mammography, spam filter, factory inspection, and null scenario; `buildCompositionTooltip` for all four composition types (TP+FN, FP+TN, TP+FP, FN+TN), percentage values, stripped parens, and cross-scenario vocabulary.

**Spec divergences:**
- SVG `<title>` elements chosen over a custom tooltip component. The spec recommended "SVG title attributes or a lightweight tooltip component" — `<title>` was chosen for simplicity (zero additional DOM, no positioning logic, no z-index concerns within SVG). The trade-off is less control over tooltip styling/positioning (browser-native tooltip appearance varies), but the content is multi-line text that doesn't need rich formatting. If richer tooltips are needed later, the `buildCompositionTooltip` function can be reused with a custom component.
- Tooltip descriptions use plural domain vocabulary ("have the disease and test positive") rather than singular ("has the disease and tests positive"). This matches the compound labels' context — the labels describe groups of icons (plural subjects), not individual cases.

**Forward-looking notes:**
- The `generateTooltipDescriptions` and `buildCompositionTooltip` functions are exported and pure — they can be reused by a glossary component (5.4c) or any other consumer that needs structural abbreviation expansion.
- The `scenarioVocabulary` prop on `IconArray` is optional (defaults to null/default vocabulary). Existing test consumers don't need to provide it.

- **Status:** Complete
- **Verify:** Hover over a composition line (e.g., "(TP: 9, FN: 1)" on mammography) → browser tooltip shows "True Positive — have the disease and test positive: 9" / "False Negative — have the disease but test negative: 1". Switch to spam filter → tooltip shows "are spam and are flagged" / "are spam but reach the inbox". Switch grouping to "Test Result" → test-result composition lines also show tooltips. `cursor: help` on composition text.

**5.4b: Bayes' rule formula toggle** ✓

**What was done:**
- `BayesFormulaPanel` component in `src/components/explorationMode/BayesFormulaPanel.tsx`. Renders the general form of Bayes' rule with live-substituted current parameter values via KaTeX: $P(D | T^+) = P(T^+ | D) \cdot P(D) / P(T^+) = 0.90 \times 0.01 / 0.098 = 0.009 / 0.098 \approx 0.092$ (mammography example).
- **Click-to-reveal toggle** in the main-area toolbar. Text-style link button ("Show Bayes' rule" / "Hide Bayes' rule") positioned after the format selector and regrouping toggle with `margin-left: auto` (right-aligned). Only rendered when `displayMode === Probability`.
- **Formula panel** below the visualisation container. Compact, centred layout with "BAYES' RULE" label header. Visually subordinate: light grey background (#f5f7fa), small label text, formula at 15px (desktop) / 13px (mobile). Horizontal scroll for overflow on narrow viewports.
- **Persistence behaviour:** `formulaRevealed` boolean state in `ExplorationMode` (view-layer concern, alongside `activeFormat` and `groupingState`). Persists across: parameter changes (formula values update live), scenario switches (formula values update), format-view toggles (icon array ↔ tree — same formula). Disappears when switching to frequency mode; reappears automatically when returning to probability mode (the revealed state persists across mode switches).
- **Both format views:** Formula panel appears identically whether viewing the icon array or the frequency tree.
- **Degenerate case:** When `P(T⁺) = 0` (posterior null), formula shows the substitution up to the division by zero with "— undefined" text, matching the sidebar's degenerate handling.
- **Responsive:** At the narrow breakpoint (≤768px), toggle button and formula panel use smaller font sizes. The formula panel's horizontal overflow scroll handles long expressions.
- `formatForFormula` helper: exact-to-2dp values show 2dp (0.01, 0.90); everything else rounds to 3dp. Consistent with the template system's `formatDecimal` convention.
- 9 unit tests in `BayesFormulaPanel.test.ts`: formatForFormula (exact 2dp values, non-exact values, posterior rounding), mammography reference formula (general form present, substituted values, ≈ notation), spam filter formula (different parameter profile), degenerate case (undefined, no ≈), edge cases (perfect sensitivity, high base rate).

**Building-phase decisions resolved:**
- **Toggle placement:** Text-style link button in the toolbar, right-aligned via `margin-left: auto`. Lightweight appearance (no background, blue text matching the deep blue accent #1A5276) — reads as a supplementary option, not a primary control.
- **Formula panel placement:** Below the visualisation container, within the main-area flex column. The vis-container (flex: 1) shrinks to accommodate the formula panel (flex-shrink: 0). This keeps the formula spatially near the visualisation while being visually subordinate (below, not overlaying).
- **Visual subordination:** Light grey background, small uppercase label, centred formula. No border or card styling — minimal visual weight. The formula is clearly a reference element, not competing with the visualisation.

**Spec divergences:**
- The formula shows a four-step expression: general form → substituted values → numerator product → approximate result ($P(D | T^+) = \frac{P(T^+ | D) \cdot P(D)}{P(T^+)} = \frac{0.90 \times 0.01}{0.098} = \frac{0.009}{0.098} \approx 0.092$). The spec example shows a three-step form ($\frac{0.90 \times 0.01}{0.098} \approx 0.092$). The extra step (showing the numerator product as 0.009 before dividing) makes the arithmetic more transparent — the user can verify the multiplication before the division.

**Forward-looking notes:**
- The `formulaRevealed` state could be persisted to localStorage if cross-session persistence is desired (the spec mentions this as an option). Currently it resets on page reload.
- The `BayesFormulaPanel` receives only `regionA` — it computes the formula string entirely from numerical values. If future work extends the formula display (e.g., step-by-step derivation from conditional probability definition, as noted in the Plan & Status "Further-work detail"), the component can be extended without changing its interface.

- **Status:** Complete
- **Verify:** Switch to probability mode → "Show Bayes' rule" link appears in toolbar. Click it → formula panel appears below the vis with live values. Toggle text changes to "Hide Bayes' rule". Switch scenario → formula values update. Drag sliders → formula values update in real time. Switch to frequency mode → formula and toggle disappear. Switch back to probability mode → formula reappears automatically. Switch format (icon array ↔ tree) → formula persists. Set sensitivity=0% and FPR=0% → formula shows "— undefined". Works at both desktop and narrow breakpoints.

**5.4c: Tree visual distinction and formula bridging** ✓

**What was done:**
- **Tree first-level node colour distinction.** First-level (parent) nodes in the frequency tree now use blended midpoint shades: condition-positive `#ED8A30` (between TP `#E66100` and FN `#F5B041`), condition-negative `#3B80AC` (between TN `#1A5276` and FP `#5DADE2`). This makes parent nodes visually distinguishable from their children — critical for distinguishing P(D) = 0.01 (the condition-positive parent — all people with the condition) from P(D ∩ T⁺) = 0.009 (the TP leaf — only those who also test positive). Change confined to `TREE_NODE_COLORS` in `colours.ts`; `ICON_COLORS` unaffected. Icon array verified unchanged (BaseRatePartitioned state uses `ICON_COLORS`, not `TREE_NODE_COLORS`).
- **Bayes' formula restructuring — single-line three-zone format.** The formula panel (`BayesFormulaPanel.tsx`) shows a single formula line with three visual zones:
  - **Zone 1 (normal):** $P(D \mid T^+) = P(T^+ \mid D) \cdot P(D) / P(T^+) =$ — full general symbolic form at normal size and colour.
  - **Zone 2 (grey/small):** $0.90 \times 0.01 / 0.098 =$ — numerical substituted values only, rendered grey (#919191) and smaller via KaTeX `\small\color{}{}`. Visually subordinate — the numbers are readable but don't compete with the conceptual structure.
  - **Zone 3 (normal):** $P(D \cap T^+) / P(T^+) = 0.009 / 0.098 \approx 0.092$ — joint/marginal form with hover-tooltip values and the result. Names the joint probability explicitly, connecting it to the TP leaf on the tree.
  - Hover tooltips on the zone-3 numerical values: numerator (0.009) shows the TP group description with percentage (e.g., "Have the virus and test positive: 0.9%"); denominator (0.098) shows the test-positive group label (e.g., "Test positive: 9.8%"). Both are scenario-adapted using `generateTooltipDescriptions` and `regionB.probability.byTestResult.testPositive.group.domainLabel`. Tooltips applied via MutationObserver watching for KaTeX innerHTML updates, setting `title` attributes on `.formula-tooltip-joint` and `.formula-tooltip-marginal` elements (injected via KaTeX `\htmlClass`). The `KaTeXInline` component has `trust?: boolean` prop to enable `\htmlClass` and `\htmlStyle` (KaTeX trust mode).
  - Degenerate case handled: when P(T⁺) = 0, zone 2 shows `sens × base / 0 =`, zone 3 shows "— undefined".
  - All values from `regionA`. `regionB` threaded through for the test-positive group label. `scenarioVocabulary` threaded through for TP description.
- **Tree leaf domain labels — evaluated, not added.** Decision: leaf nodes should NOT show domain labels. Reasoning: (1) The tree is already label-dense with 7 nodes, 6 branch labels, 3 domain labels, cross-branch combination text, and the formula panel — adding 4 more labels would push toward visual clutter. (2) The branch labels already communicate the test-result dimension (e.g., "Sensitivity: 90%" on the branch to TP means "test positive given disease"). (3) The cross-branch combination explicitly labels the test-positive group. (4) The new node colour distinction makes parent-vs-leaf identity clearer without text. (5) In guided mode (Part 4), construction animation will scaffold leaf meaning through sequenced appearance. The one-step inference from branch label to test outcome constitutes useful germane load rather than a barrier.
- **Glossary component — cut.** The formula bridging annotation and hover tooltips (5.4a) together cover the vocabulary bridging function the glossary was designed to serve. Glossary adds implementation complexity for diminishing marginal return.
- 12 unit tests in `BayesFormulaPanel.test.ts`: `formatForFormula` (exact 2dp, non-exact 3dp, rounding), mammography main formula (joint probability named, substituted values, no old-style P(T⁺|D)·P(D) in main line), mammography bridging (multiply-along-branches, marginal decomposition), spam filter formula (different parameter profile), degenerate case (undefined, no marginal decomposition in bridging), edge cases (perfect sensitivity, high base rate).

**Building-phase decisions resolved:**
- **Single-line three-zone formula (vs. two-line bridging annotation):** A second "where..." annotation line was initially built, but removed after review — it added implementation complexity and visual weight beyond the exploration mode's "bridging, not teaching" role. The zone-2 grey/small numerical section achieves the same subordination effect inline, keeping the formula compact and scannable.
- **Grey zone covers only numerical substitution:** The symbolic form `P(T⁺|D)·P(D)/P(T⁺)` remains normal colour/size. Only the substituted numbers `0.90×0.01/0.098 =` are grey/small. This preserves the conceptual structure as primary and treats the numbers as a secondary reference layer.
- **Hover tooltips via KaTeX `\htmlClass` + MutationObserver:** KaTeX's `\htmlClass` macro injects CSS class names into the rendered DOM, enabling `querySelector` targeting. Because KaTeX writes `dangerouslySetInnerHTML` asynchronously (from React's perspective), a `MutationObserver` is needed to reliably re-apply `title` attributes after each re-render. A simple `useEffect` with `requestAnimationFrame` was insufficient — the mutation observer approach is reliable.
- **KaTeX fraction pointer-events fix:** KaTeX renders fractions with structural `.vlist` and `.frac-line` spans that sit above the denominator in the DOM stacking order, intercepting pointer events. Fixed by setting `pointer-events: none` on all KaTeX structural elements within the formula panel (`.bayes-formula-panel .katex-html *`), then re-enabling `pointer-events: auto` specifically on the tooltip target elements. This ensures the denominator tooltip triggers reliably across its full area.
- **Tooltip visual affordance — resting-state background pill:** A very subtle background tint (`rgba(26, 82, 118, 0.06)`) applied at rest to the hoverable values, with `border-radius: 2px` and `padding: 0 1px`. Signals "these values are interactive" without underlines (which were rejected as inappropriate for a mathematical formula). The tint is barely visible — just enough to differentiate the hoverable values from the surrounding formula text.
- **Tooltips use scenario vocabulary:** The numerator tooltip uses `generateTooltipDescriptions` (same function as icon-array tooltips) for scenario-adapted TP descriptions. The denominator tooltip uses `regionB.probability.byTestResult.testPositive.group.domainLabel` — the same label shown on the icon array's by-test-result group. This creates consistent vocabulary across the visualisation and formula.

**Spec divergences:**
- The formula structure differs from both the original 5.4b form and the initial 5.4c two-line plan. Final structure: single-line with three visual zones — full general symbolic form (normal) → numerical substitution (grey/small) → joint/marginal with tooltips (normal) → result (normal). This was arrived at iteratively during implementation based on visual feedback. The "Further-work detail" in the spec described a full interactive derivation; the grey-zone approach is a lightweight, non-interactive version appropriate for the exploration mode.

**Forward-looking notes:**
- The `formatForFormula` function is exported from `BayesFormulaPanel.tsx` for use by tests. If other components need the same formatting, it can be moved to a shared utility.
- The `KaTeXInline` component now has `trust?: boolean` prop enabling KaTeX trust mode (`\htmlClass`, `\htmlStyle`). Any future consumer that needs these KaTeX macros can set `trust` on `KaTeXInline`.
- The MutationObserver tooltip pattern could be reused if other formula panels need post-KaTeX-render DOM manipulation.

- **Status:** Complete
- **Verify:** Switch to probability mode → click "Show Bayes' rule" → formula shows full symbolic form in normal colour, grey/small numerical substitution in middle, then joint/marginal form and result. Hover over 0.009 → tooltip with TP description and percentage. Hover over 0.098 → tooltip with test-positive group label and percentage. Switch scenarios → all values and tooltips update. Drag sliders → live updates. Tree first-level nodes visibly different shade from leaf nodes. Icon array colours unchanged.

**5.4d: Tree leaf labels and cosmetic polish** ✓

**What was done:**
- **Leaf node labels.** Test-outcome domain labels added below each of the 4 leaf nodes using scenario-adapted vocabulary from `ByTestResultLabels`. TP and FP leaves show the test-positive group label (e.g., "Test positive", "Are flagged"); FN and TN leaves show the test-negative group label (e.g., "Test negative", "Reach the inbox"). `getLeafTestOutcomeLabels` function extracts these from `regionB.[mode].byTestResult`. Labels appear in both display modes, updating on scenario change.
- **Branch label positioning.** Replaced horizontal-only label offset (`labelOffset = 8 * scale` applied to x only) with perpendicular-to-branch offset. The offset is now computed from the branch line's direction vector, ensuring left and right labels sit at equal visual distance from their branch lines regardless of branch angle. This fixes the issue where bottom-level left-side labels (Sensitivity, FPR) appeared noticeably further from their branches than right-side labels.
- **Font consistency.** Verified — no changes needed. In frequency mode, all text elements consistently use `system-ui, sans-serif` with a clear size hierarchy (nodes 12.8px/600, branches 11px/400, domain labels 9.9px/500). In probability mode, KaTeX rendering introduces its own math font for mathematical notation, which is expected and intentional.
- **Marginal likelihood accent colour.** The sidebar's P(T⁺) derived result card accent changed from solid `#1A5276` (TN blue — misleading since P(T⁺) sums across TP and FP) to a vertical gradient from `#E66100` (TP orange) → `#5DADE2` (FP blue). Both a midpoint blend colour and a CSS gradient were tried; the gradient was chosen because the midpoint colour looked muddy/bland. Implemented via `::before` pseudo-element (not `border-image`) to preserve `border-radius`. Both the midpoint colour and gradient were previewed; the gradient communicates "cross-group marginal" clearly without looking excessive on the 3px stripe.
- **Bracket gap increased.** `BRACKET_GAP_FRACTION` raised from 0.035 to 0.065 to accommodate the new leaf labels between nodes and the combination bracket.

**Building-phase decisions resolved:**
- **Leaf label content:** Test-outcome domain vocabulary (from `ByTestResultLabels` group labels), not structural names ("True Positive") or abbreviations ("TP"). Rationale: the parent domain label already gives the condition group; the leaf just needs the test outcome to complete the 2×2 classification. Using the same vocabulary as the icon array's test-result grouping creates consistency.
- **Marginal likelihood accent — gradient over midpoint blend:** The RGB midpoint of `#E66100` and `#5DADE2` produced a muddy warm-brown (`#A07850`) with no clear visual connection to either colour family. The gradient, while subtle on a 3px stripe, clearly communicates warm→cool transition. Pseudo-element approach avoids the `border-image` vs `border-radius` incompatibility.

**Spec divergences:**
- Leaf labels were evaluated in 5.4c and deliberately excluded (reasoning: redundant with parent, visual clutter). This reversal was requested during the planning thread. The test-outcome vocabulary avoids the redundancy concern — unlike the condition domain labels (which repeat the parent), these add new information (the test result dimension).
- Marginal likelihood accent was previously `#1A5276` (matching the condition-negative colour family). The gradient is a building-phase design decision not specified in the Implementation Details doc.

**Forward-looking notes:**
- The perpendicular branch label offset changes `labelY` as well as `labelX`. The KaTeX branch label positioning in `TreeBranch` uses `branch.labelY - fontSize * 0.7` for the foreignObject y-position — this still works correctly with the new perpendicular offset.
- The `::before` pseudo-element approach for result card accents could be extended if additional derived result variants are needed (e.g., a different accent for degenerate states).

- **Status:** Complete
- **Verify:** All 4 leaf nodes show scenario-adapted test-outcome labels; labels update on scenario change (mammography: "Test positive"/"Test negative"; spam: "Are flagged"/"Reach the inbox"; blood donation: "Are flagged"/"Are cleared"); branch labels equidistant from lines at both tree levels; marginal likelihood card has orange→blue gradient accent; posterior card has solid orange accent; responsive layout preserved

**5.4e: Probability-mode rendering consistency and cosmetic fixes** ✓

**What was done:**
- **`isLatex()` fix.** `P(D) = 0.01` (conditionPositive node label) was rendering as plain SVG text while all other probability-mode labels rendered via KaTeX, because `isLatex()` only checked for `\`, `^`, or `_` — and `P(D) = 0.01` contains none of those (unlike `P(\neg D) = 0.99` which has `\neg`). Fixed by adding `/^P\(/` pattern match so all probability notation is detected.
- **KaTeX branch label alignment.** Left-side KaTeX branch labels (e.g., `P(T⁺ | D) = 0.90`) appeared too far left because the foreignObject was positioned to right-align at `branch.labelX` but the KaTeX content was left-aligned within the container, leaving a gap. Added `textAlign` prop to `KaTeXLabel` component; left-side branches now use `textAlign="right"`, matching the `text-anchor: end` behaviour of plain-text labels. Combination bracket labels use `textAlign="center"`.
- **Stacked fractions in combination bracket.** The probability-mode posterior line under the bracket changed from slash notation (`P(D∩T⁺) / P(T⁺) = 0.009 / 0.098`) to text-mode stacked fractions (`\tfrac{P(D∩T⁺)}{P(T⁺)} = \tfrac{0.009}{0.098}`). This is visually consistent with the Bayes' rule formula panel which uses `\frac`, while `\tfrac` keeps the fractions compact for the inline bracket context. ForeignObject height and label spacing increased to accommodate the taller rendering.
- **Question mark spacing.** `P(D \mid T^+) = ?` changed to `P(D \mid T^+) = \,?` (thin space before `?`) in both the `computeRegionB` question generator and the TopStrip invisible spacer.

**Spec divergences:**
- `KaTeXLabel` now accepts a `textAlign` prop — this is a building-phase API extension.
- `\tfrac` in combination bracket vs slash notation is a building-phase rendering decision. Slash notation was not an explicit spec choice — it was just the initial implementation.
- `BRACKET_LABEL_SPACING_FRACTION` increased from 0.035 to 0.045 to accommodate `\tfrac` height.

- **Status:** Complete
- **Verify:** `P(D) = 0.01` renders in KaTeX font matching other probability labels; left-side branch labels right-aligned and equidistant from branch lines; combination bracket posterior uses stacked fractions; `P(D|T⁺) = ?` has visible space before `?`

**5.5: Scenario-adapted mathematical notation** ✓

**What was done:**
- Added `conditionSymbol` and `testSymbol` optional fields to `ScenarioDefinition` (defaults: `D` and `T`).
- Added `NotationSymbols` interface and `notationSymbols` field to `DataPackageRegionB`, populated by `computeRegionB` during vocabulary resolution.
- Parameterised all ~22 `String.raw` LaTeX templates in `computeRegionB.ts` — every probability-mode output (question text, parameter display, tree nodes, tree branches, cross-branch combination, degenerate messages) now uses resolved symbols instead of hardcoded `D`/`T`.
- Parameterised the Bayes' rule formula panel (`BayesFormulaPanel.tsx`) — reads symbols from `regionB.notationSymbols`.
- Parameterised the frequency-mode height-reserving spacer in `TopStrip.tsx` — receives `notationSymbols` as a prop.
- Applied symbol assignments: Spam Filter gets `S`/`F`, Factory Inspection gets `I` for test symbol. All medical scenarios and drug screening use default `D`/`T`.
- Factory vocabulary fix: `testPositiveName` "are rejected" → "are flagged", `testPositiveNameSingular` "is rejected" → "is flagged", description updated. `fprDomainName` kept as "False rejection rate".
- 9 new tests: symbol resolution for spam (S/F throughout), mammography (D/T default), null scenario (D/T default), factory/spam symbol fields in scenario data, degenerate messages with scenario test symbol, factory vocabulary assertions.

**Spec divergences:**
- This feature was not in the original spec — it was identified as an enhancement during development. The symbol assignment principle (differentiate only for non-medical domains) and factory vocabulary change ("rejected" → "flagged") were decided in the planning thread session. The spec's factory scenario vocabulary table shows `test_positive_name` = "are rejected" — the implementation diverges to "are flagged" for better alignment with the `I` (inspection) test symbol.

**Forward-looking notes:**
- The `notationSymbols` field on `DataPackageRegionB` is available to any future consumer that needs scenario-adapted symbols (e.g., Part 4 guided mode, if it generates notation).
- The `conditionSymbol` and `testSymbol` fields on `ScenarioDefinition` follow the same optional-with-default pattern as `sensitivityDomainName` and `fprDomainName`.

- **Status:** Complete
- **Verify:** Switch to spam filter in probability mode — all notation should use S/F (P(S|F⁺), tree nodes, branches, Bayes formula). Switch to factory inspection — probability mode should use I (P(D|I⁺)), frequency mode should show "are flagged". Mammography should be unchanged (P(D|T⁺)).

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

**2026-03-28 — Post-Layer 4 harmonisation.** Layer 4 had no formal spec divergences (all four subtasks reported "None" or wrote no code). The harmonisation documents implementation decisions and resolves building-phase items. Changes made:

1. **Regrouping animation implementation note:** Added to the Animation Mechanics section after the regrouping requirements. Documents: 700ms duration with `power2.inOut` easing; single-progress-tween architecture (one GSAP tween batch-updates all icon positions per frame via refs); label crossfade timing (source fades 0–40%, target fades 60–100%, ~140ms gap during fastest movement); `useLayoutEffect` trigger preventing flash to target positions; mid-animation toggle handling via kill-and-restart.
2. **Tree construction/combination animation deferral:** Added implementation note documenting deferral to Part 4 per scope discipline — exploration mode uses `FullyBranched`/`CombinationShown` with no consumer for these animations. Notes what's preserved for Part 4 (construction state prop, visibility functions, bracket SVG path, reusable single-progress-tween pattern).
3. **Icon array construction-step animation deferral:** Same rationale as tree construction — exploration mode uses `FullyPartitioned`.
4. **Format cross-fade implementation note:** Added to the Animation Mechanics section. Documents: 300ms (150ms fade-out + 150ms fade-in); fade-out → dispatch at midpoint → fade-in architecture; three content areas targeted via refs; layout shift mitigation via invisible spacer for probability mode's extra KaTeX line.
5. **Animation discipline implementation note:** Documents verified-correct-by-architecture outcome — no code changes needed. Slider drag kills running animations via `useLayoutEffect` cleanup. Cross-animation conflicts (regrouping during format cross-fade and vice versa) operate on independent DOM targets. No mutual exclusion guards — kill-and-restart handles all cases.
6. **Building-phase decision resolved:** "Animation coordination during live slider dragging" updated from "Deferred to Layer 4.4" to "Resolved (Layer 4.4)" with summary of the resolution.
7. **Part 3 current status:** Updated to reflect Layers 3 and 4 both built and verified.

Also updated `Our Plan + Status.md`:
- Updated status paragraph to reflect Layers 0–4 complete, Layer 5 next.
- Updated Part 3 status row from "Complete (Layer 3 built)" to "Complete (Layers 3–4 built)" with animation summary.
- Updated summary line to reflect Layer 3 complete.
