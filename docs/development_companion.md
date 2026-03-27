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
Layers 0 (scaffolding) and 1 (data foundation) complete — all three Layer 1 subtasks done (computation pipeline, template system, scenario data). First harmonisation pass done after Layer 1. Layer 2 (static rendering) is next.

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

**2.1: Icon array — core grid and colouring**
- Spatial layout algorithm: alternating-axis hierarchical subdivision
- Grid dimension calculation from $N$ and container aspect ratio
- Icon rendering: rounded-square SVG elements, four-group colour scheme from shared constants
- First-level partition: axis adapts to container aspect ratio, jagged-edge handling
- Second-level partition: row-major fill within first-level regions
- Partition boundaries: increased spacing at first-level, colour contrast at both levels
- Container-responsive: adapts grid dimensions, icon size, spacing to fill available space
- **Status:** Not started
- **Verify:** Screenshot of mammography scenario ($N = 1000$, $N_D = 10$) showing correct proportions and colour regions; also verify at $N = 100$ and $N = 200$

**2.2: Icon array — labels and construction states**
- Compound label system: first-level labels showing group total + sub-group composition
- Label prominence scaling with $N$ (secondary at moderate $N$, primary at high $N$)
- Labels consume real template output from Layer 1 (both display modes)
- All five construction states rendering correctly: `unpartitioned`, `base-rate-partitioned`, `condition-positive-subpartitioned`, `fully-partitioned`, `regrouped-by-test-result`
- **Status:** Not started
- **Verify:** Screenshots at different $N$ values showing labels; each construction state producing correct partial view

**2.3: Icon array — second grouping layout**
- By-test-result layout computed using same algorithm with different grouping parameters
- Both position sets stored per icon (by-condition and by-test-result positions)
- Grouping state dimension functional (hard snap, no animation yet)
- Label sets swap correctly between grouping states
- **Status:** Not started
- **Verify:** Both grouping layouts render correctly; switching between them shows correct spatial rearrangement and label content

**2.4: Frequency tree — full static rendering**
- Vertical tree: root at top, two first-level nodes, four leaf nodes
- Node rendering: uniform sized rounded rectangles, colour-coded by group, labels from data package
- Branch rendering: neutral grey lines connecting parent to child, branch labels positioned midway
- Cross-branch combination: bracket beneath TP and FP nodes with sum and posterior labels
- All five construction states: `root-only`, `first-branch`, `condition-positive-second-branch`, `fully-branched`, `cross-branch-combined`
- Container-responsive scaling
- Both display modes (frequency labels and probability notation)
- **Status:** Not started
- **Verify:** Screenshot of full tree with combination; each construction state; probability mode labels rendering correctly (KaTeX)

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
