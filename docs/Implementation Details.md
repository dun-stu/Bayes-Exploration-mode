# Implementation Specification

This document is the companion to the Plan & Status document. It is home for the in-between layer's substantive output — both *what* to build and *why*, at the implementation-specification level.

For each part, it records: specifications (feature specs, UI details, interaction mechanics, data structures, component interfaces); the full reasoning behind implementation-level decisions (including nuance, weighing-up, considered-and-rejected alternatives, and the practical, logical, and literature-driven considerations behind each choice); notes for later (tagged by context — [Report], [Evaluation], [Tech Stack], [Part N], etc.); and cross-part flags (implications for other parts, placed in the destination part's section).

The Plan & Status document retains its role as home for the project's overall shape, progress tracking, scope-level reasoning, and the decision-making process record. See the Two-Document Model section in that document for the full description of how the two documents relate.

Organised by the same five parts as the Plan & Status document for clear cross-reference.

---

## Part 1: Visualisation Rendering

*Icon array and frequency tree as standalone visual components.*

**Current status:** Scope clarified. Boundary decisions resolved. Implementation specifics in progress — data package structure defined.

### Scope

**What this part produces:** Two components that render a visualisation given a data package of pre-computed parameters, respond to format-switching, support partial-state rendering at any construction stage, and expose interaction hooks for modes to wire up.

**What's in:**
- Icon array rendering: grid of icons, colour-coded by partition, with grouped spatial arrangement, label system, and regrouping between grouped-by-condition and grouped-by-test-result states
- Frequency tree rendering: node-branch structure with counts in nodes and rates on branches, colour-coded nodes matching the icon array scheme, cross-branch combination visual mechanism
- Partial-state rendering for both formats (supporting any construction stage, from empty/root-only through to fully partitioned/regrouped/combined)
- Format-switching on the visual layer (rendering different label sets for frequency vs. probability mode, driven by the data package)
- Multi-scale interaction model for icon arrays (different interaction mechanics at moderate vs. high $N$)
- Animation capabilities for state transitions (regrouping, construction steps, format-switching)

**What's out (belongs to other parts):**
- Parameter controls, sliders, input fields → Part 2
- The data package structure and computation (raw parameters → derived counts) → Part 2
- Overall screen layout, the three-layer persistent visibility model as UI, mode selection → Part 3
- Mode-specific construction sequences, scaffolding, when/why to trigger state transitions → Part 4
- Specific scenario content → Part 5

### Boundary Decisions

#### 1. Partial-state rendering: built into Part 1 components — confirmed

**The decision:** Both visualisation components accept a construction state parameter and render the appropriate partial view for that state. "Full" is the default (used by exploration mode). Other states support guided/practice mode construction sequences without those modes needing to manipulate the component's internals.

**Why this belongs in Part 1 (rendering) rather than Part 4 (modes):**

The construction stages are *rendering states* — they describe what the visual component looks like at a given point. "An icon array showing only the base-rate partition" is a visual description. "A tree with only the root and first branches" is a visual description. These are things the rendering component needs to know how to draw, regardless of what triggered the state.

The design-level decisions (Plan & Status, Phase 3 strand a) already fully specify what each construction stage looks like. The icon array has a defined progression: all grey (neutral) → base-rate partition (two colour families appear, two spatial regions form) → test-result partition within each group (shade variations within each colour family) → regrouped by test result (spatial regions reconfigure). The frequency tree has five explicit steps: root only → first branch (base-rate partition) → condition-positive second branch (sensitivity applied) → condition-negative second branch (FPR applied) → cross-branch combination shown.

These stages were designed to mirror the Bayesian reasoning process — each step corresponds to a cognitively meaningful operation targeting a specific failure mode (see Plan & Status, Notes for Later, "[Report — Technical Quality] The construction sequence mirrors the Bayesian reasoning process"). That design reasoning is settled. What remains is rendering each stage correctly.

**What happens if Part 1 doesn't support this:**

If the components only render the full state, Part 4 would face three bad options: (a) modify Part 1's internals to support partial rendering — creating tight coupling and fragility; (b) overlay or hide parts of the full rendering — producing a visually unconvincing result where a tree has nodes hidden rather than genuinely not-yet-built; (c) rebuild partial rendering separately — duplicating logic and risking visual inconsistency between Part 1's full rendering and Part 4's partial rendering. All three are worse than building the capability once, correctly, in the component that owns rendering.

**Practical benefit — independent testability:**

Building partial-state rendering into Part 1 means each construction stage can be visually verified during Part 1 development, before any mode logic exists. We can inspect "does the base-rate-only icon array look right?" by setting the construction state directly, without needing guided mode to drive it there. This supports the development workflow where Parts 1 and 2 proceed before Parts 3 and 4.

**Design cost:**

Low. Partial-state rendering is conditional rendering based on a state parameter — "if construction stage is base-rate-only, colour only the first-level partition regions; don't render shade variations." It's not a separate rendering pipeline. The full-state rendering is the most complex case; each partial state is a subset of it. The component doesn't get more complex for exploration mode's case (which always uses "full"); it just also handles simpler cases.

**Granularity of construction states:**

The state model should be granular enough to express each cognitively meaningful step from the design decisions. For the icon array, the minimum set is:

- `unpartitioned` — all icons grey/neutral. The starting state before any construction.
- `base-rate-partitioned` — two spatial regions, warm (condition-positive) and cool (condition-negative) colour families. First constructive step; targets base-rate neglect.
- `condition-positive-subpartitioned` — within the warm region, shade variation distinguishes TP (darker warm) and FN (lighter warm). The condition-negative region remains a single cool colour. This intermediate state exists because applying sensitivity to the affected group and applying FPR to the unaffected group are separate cognitive operations with different inputs — the user considers each test characteristic within its reference class.
- `fully-partitioned` — both regions sub-partitioned. All four groups (TP, FN, FP, TN) visually distinct. The complete partition before any regrouping.
- `regrouped-by-test-result` — spatial regions reconfigured so test-positive icons (TP + FP) are spatially adjacent and test-negative icons (FN + TN) are spatially adjacent. Labels update to reflect the new grouping. The critical step targeting denominator neglect and the inverse fallacy.

For the frequency tree:

- `root-only` — single node showing the total population $N$.
- `first-branch` — root with two child nodes ($N_D$, $N_{\neg D}$) and branch labels (base rate).
- `condition-positive-second-branch` — the $N_D$ node has two children ($N_{TP}$, $N_{FN}$) with sensitivity on the branches. The $N_{\neg D}$ node has no children yet.
- `fully-branched` — both second-level branches complete. All four leaf nodes visible.
- `cross-branch-combined` — a visual element connecting $N_{TP}$ and $N_{FP}$ nodes, showing their sum ($N_{T^+}$) and the resulting posterior. The constructive step targeting the inverse fallacy.

Whether guided mode actually uses every intermediate state (e.g., whether icon array construction always goes through `condition-positive-subpartitioned` before `fully-partitioned`) is Part 4's concern. Part 1 provides the rendering capability; Part 4 decides the pedagogical sequence.

[Part 4] **Flag — construction stage granularity:** The states listed above represent the minimum set needed to express each cognitively meaningful step from the design decisions. Part 4 may need finer granularity (e.g., an animation between stages, a "partially filled" state where the user has entered some but not all values in a tree node). If so, the state model may need extension. The current design accommodates this — the states above are stable rendering points, and transitions between them can be animated or stepped as Part 4 requires.

---

#### 2. Regrouping and cross-branch combination as state, not just animation — confirmed

**The decision:** Regrouping (icon array) and cross-branch combination (frequency tree) are modelled as *states the component can be in*, with animated transitions between states as an additional capability. Components can be set to any grouping/combination state directly (no animation) or transitioned to it with animation.

**Why state, not just animation:**

The design decisions establish that these mechanisms serve different roles in different modes. In exploration mode, the cross-branch combination is "persistently shown" (Plan & Status, Phase 3 strand a, "Exploration mode behaviour") — it's a static visual element present from the start, with no animation needed. The component simply *is in* the combination-shown state. In guided mode, the same visual result is reached through an active constructive step (the user triggers the combination) — here the *transition* is pedagogically significant, but the *result* is the same state.

Similarly for the icon array: after regrouping, the "grouped by test result" state persists while the user examines the composition of the test-positive cluster. The regrouped state needs to be stable and inspectable, not just a moment in an animation.

**The component model:**

Each component maintains a grouping/combination dimension as part of its state:

- Icon array: `grouped-by-condition` | `grouped-by-test-result`
- Frequency tree: `combination-hidden` | `combination-shown`

Transitions between states can be:
- **Instant** — the component snaps to the new state. Used when setting initial state (exploration mode loads with combination shown) or when animation isn't pedagogically relevant.
- **Animated** — the component smoothly transitions. Used when the transition itself carries pedagogical meaning (the regrouping animation showing icons flowing between clusters; the cross-branch combination visually connecting previously separate nodes).

The reverse transition must also work — in exploration mode, the user might toggle regrouping back and forth to compare the two groupings. The animation should work in both directions.

**Interaction with construction state:**

The grouping/combination dimension is orthogonal to the construction stage. A fully-partitioned icon array can be in either grouping state. A fully-branched tree can have the combination hidden or shown. The `regrouped-by-test-result` state in the icon array construction stages listed above is really the combination of `fully-partitioned` + `grouped-by-test-result`. Similarly, `cross-branch-combined` in the tree is `fully-branched` + `combination-shown`. Making these orthogonal keeps the state model clean: construction stage and grouping state are independent dimensions, and the component renders the appropriate view for any combination.

This orthogonality means the component state is not a single linear progression but a two-dimensional space. The rendering logic handles: "given this construction stage and this grouping state, what do I draw?" Most combinations are natural (fully-partitioned + grouped-by-condition; fully-partitioned + grouped-by-test-result). Some combinations don't make sense and should be prevented at the mode level: you can't regroup an icon array that hasn't been fully partitioned yet (there's nothing to regroup), and you can't show the cross-branch combination on a tree that doesn't have both second-level branches yet. Part 1 doesn't need to enforce these constraints — it's sufficient for it to render any valid combination and for Parts 3/4 to only request valid states.

[Part 4] **Flag — reverse transitions:** Guided mode may or may not want to support un-regrouping / hiding the combination after it's been shown. In exploration mode this is clearly supported (the user explores freely). In guided mode, the construction is progressive — but does the user benefit from being able to "undo" the regrouping step to compare grouped-by-condition vs. grouped-by-test-result? This is a pedagogical design question for Part 4. Part 1 supports both directions regardless.

---

#### 3. Components receive pre-computed data package (Option B) — confirmed

**The decision:** Visualisation components receive a pre-computed data package from Part 2's data layer, containing integer partition counts, label sets for the current display mode, and all textual content. Components do not receive raw parameters ($N$, base rate, sensitivity, FPR) or compute derived quantities internally.

**The alternative considered — Option A (self-computing components):**

Under Option A, each component would take raw parameters ($N$, base rate, sensitivity, FPR) and internally compute all derived quantities ($N_D$, $N_{\neg D}$, $N_{TP}$, $N_{FN}$, $N_{FP}$, $N_{TN}$, regrouped totals, posterior). The appeal is self-containment: hand the component four numbers and it renders the right thing, with no dependency on external computation.

**Why Option B is better — five reinforcing reasons:**

**1. Single source of truth for derived quantities.**
The visualisation components are not the only consumers of the derived quantities. The text template system needs them ("Of the 10 who have the disease, 9 test positive"). The parameter panel needs them (showing current counts alongside rates). The question layer needs them ("Of all 98 who test positive..."). Under Option A, either each consumer independently computes the same derived quantities (scattered computation, consistency risk), or one component becomes the source and others depend on it (implicit coupling worse than explicit shared computation).

If any consumer computes differently — even subtly, such as different rounding behaviour — the display becomes inconsistent. The icon array might show 9 true positives while the text says 8. This is not a hypothetical concern: the computation from raw parameters to natural frequency counts can produce non-integers (e.g., $N = 200$, base rate $= 1\%$ → $N_D = 2$, sensitivity $= 90\%$ → $N_{TP} = 1.8$), so rounding decisions are unavoidable and must be consistent across all consumers.

**2. Rounding and constraint logic belongs in the data layer.**
The natural frequency framework — which the tool's entire theoretical basis rests on — requires genuinely natural frequencies: whole-number counts preserving base-rate information through natural sampling (Plan & Status, Notes for Later, "[Report — Background / Technical Quality] Why natural frequencies must be genuinely 'natural'"). Displaying "5.4 true positives" violates this principle. Rounding silently can produce partition counts that don't sum correctly across the tree.

How to handle this — rounding strategy, parameter constraints, edge cases, whether to adjust $N$ — is a design decision with pedagogical implications. It is a data-layer concern (Part 2), not a rendering concern. Under Option A, this logic would live inside rendering components, burying a pedagogical decision in visual code. Under Option B, Part 2 handles it once, centrally, with explicit and consistent logic, and Part 1 receives clean integer data that is guaranteed to be internally consistent.

[Part 2] *(Cross-part flag — see Part 2 section below.)*

**3. Format-switching is cleaner.**
Format-switching changes what labels appear but not what's rendered spatially/structurally. In frequency mode, a tree node shows "10"; in probability mode, the same node shows "$P(D) = 0.01$." The underlying structure (which node, where, what colour) is identical. Under Option B, the data package includes the label set for the current display mode — Part 2 provides the right strings, the component renders them. Format-switching means Part 2 provides a different label set; Part 1 re-renders labels without changing spatial structure.

Under Option A, the component would need to know both raw parameters and current display mode, and would be assembling text — constructing probability notation strings, frequency phrasing — which is the text template system's job (Part 2, strand b's wording principles). The component would be doing Part 2's work. There is a separation-of-concerns argument here: the text/labelling layer was designed as a cross-cutting concern governed by eight specific wording principles (Plan & Status, Phase 3 strand b). These principles should be implemented once, in one place (Part 2's template system), not replicated inside each rendering component. A component that generates its own label text is a component that must independently respect all eight wording principles — and that independently risks violating them.

**4. The data package formalises the three-layer persistent visibility model as an architectural artifact.**
The three-layer model (question, parameters, visualisation-with-labels) was designed as a pedagogical structure — three persistent information channels the user needs for reasoning. Under Option B, this becomes a data structure: the data package has regions corresponding to each layer. The question text, the parameter display values, and the visualisation labels are all fields in a single coherent object produced by Part 2 and consumed by Parts 1 and 3. The pedagogical design principle is directly embodied in the software architecture.

[Report — Technical Quality] **The data package as architectural embodiment of the three-layer persistent visibility model.** The decision to have Part 2 produce a single data package consumed by all display components means the three-layer persistent visibility model isn't just a design principle but an architectural reality. The question text, parameter labels, and visualisation labels are fields in a single coherent data structure. This demonstrates that the tool's architecture was shaped by its pedagogical design, not just by implementation convenience — the boundary between Part 1 and Part 2 was drawn where it was *because* the persistent visibility model defines what information the user needs, and the data package ensures all three layers stay synchronised. The rubric rewards "use of design methodologies" and understanding of technical aspects; an architecture that directly reflects the design principles is evidence of both.

**5. Development workflow supports independent progress.**
Under Option B, Part 1 can be developed and tested with hardcoded data packages before Part 2's computation logic exists. A hand-written data package for the mammography scenario ($N = 1000$, $N_D = 10$, $N_{TP} = 9$, $N_{FN} = 1$, $N_{FP} = 89$, $N_{TN} = 901$, with appropriate label strings) lets the developer build and iterate on icon array rendering without any parameter infrastructure. Part 2 can similarly be developed against a known-correct expected output without needing the rendering to consume it yet. The data package structure is the interface contract that lets both parts progress somewhat independently — they agree on the structure, develop against it, and connect later. This supports the Plan & Status document's expectation that Parts 1 and 2 are "done first, together or in close succession, likely in the same thread or adjacent threads."

**What this means for the component interface:**

The component receives a data package and a component state (construction stage + grouping state). It renders the appropriate view. It does not receive raw parameters, does not compute derived quantities, and does not generate text. All label content is pre-computed strings from Part 2.

The data package structure itself — what fields it contains, in what format — is a joint concern of Parts 1 and 2. Part 1 defines what data it needs to render; Part 2 defines what data it can produce. The structure is the meeting point. Defining this structure is the natural first task when moving from scope clarification to implementation specifics.

[Part 2] *(Cross-part flag — see Part 2 section below.)*

---

### Implementation Specifics

#### Data Package Structure — confirmed

The data package is the interface contract between Part 2 (which produces it) and all display consumers (Part 1's visualisation components, Part 3's question display and parameter panel). It is a single comprehensive object representing the complete numerical and textual description of a Bayesian problem — everything any display component could need, in any state it could be in.

**Structural decisions — seven confirmed:**

**1. Hierarchical label structure mirroring the partition hierarchy — confirmed.**

Labels describe partitions, so they are structured as partitions. The alternative — a flat list of group labels — would lose the structural information about which labels belong to which partition level. The icon array needs to know that TP and FN are *sub-groups* of the condition-positive region (because they're spatially nested within it). The tree needs to know that TP is the child of the condition-positive node (because it's visually connected to it by a branch). A flat list forces the component to reconstruct the hierarchy from implicit conventions — fragile and semantically impoverished.

The hierarchical structure also mirrors the Bayesian reasoning process itself: the partition hierarchy IS the nested-set structure (population → condition partition → test-result partition within each condition group). The data structure encoding this hierarchy means the rendering component receives data that already embodies the logical structure it needs to display. This is the same principle as the data package embodying the three-layer visibility model — the data structure reflects the pedagogical structure.

The hierarchy has three levels:
- Level 0: population (total $N$, population domain label)
- Level 1: condition groups ($N_D$, $N_{\neg D}$, with labels)
- Level 2: test-result groups ($N_{TP}$, $N_{FN}$, $N_{FP}$, $N_{TN}$, with labels)

Plus the regrouped view, which is a *different* hierarchy of the same leaf nodes:
- Level 0: population (same)
- Level 1: test-result groups ($N_{T^+}$, $N_{T^-}$, with labels)
- Level 2: condition-origin groups within each (TP and FP within test-positive; FN and TN within test-negative)

These are two different hierarchical views of the same six counts. Both are included in the data package.

**2. Both grouping states' labels included — confirmed.**

The icon array needs to render in either grouping state (by-condition or by-test-result) and to transition between them. Having both label sets available means the component doesn't need to request new data mid-animation.

The deeper reason: the regrouping operation is the critical pedagogical moment — the user sees the same population reorganised by a different dimension, revealing the composition of the test-positive group. During this transition, the *old* labels (by-condition) fade out while the *new* labels (by-test-result) fade in. Both label sets must exist simultaneously for the transition to be coherent.

For the tree, the cross-branch combination introduces *additional* labels (the sum node, the posterior display) rather than *alternative* labels — they augment the existing tree rather than replacing its labels. So the tree's case is "base labels plus combination labels" rather than "two alternative label sets."

**3. Both display modes' labels included upfront — confirmed.**

When the user toggles format-switching (frequency ↔ probability), virtually every text element changes. The data package includes label sets for *both* display modes, so format-switching is a pure view-layer operation — the components swap to their alternative label set without waiting for recomputation.

The reasoning for "upfront rather than on-demand" rests on several reinforcing considerations:

*Animation smoothness.* If the component has both label sets, it can cross-fade between frequency and probability labels during the format-switching animation without a round-trip to Part 2. The counts and spatial structure stay identical — only text transitions. This is the smoothest possible switching experience.

*Consistency with decision 2.* We include both grouping states' labels for the same reason — enabling smooth transitions. Applying the same logic to display modes produces a symmetric architecture: the data package contains every label set the component could need in any combination of (grouping state × display mode), eliminating all transitions that require new data.

*The pedagogical importance of format-switching.* Format-switching is core — one of the tool's distinctive pedagogical contributions (Plan & Status, Strand 3: "Lets users toggle between probability format and natural frequency format for the same problem, so they *experience* the natural frequency effect"). A core feature deserves responsive, smooth interaction. Any perceptible delay during the toggle would undermine the "experiencing the difference" moment — the pedagogical power depends on the *contrast* feeling immediate.

*Negligible cost.* The data package is roughly doubled in label content — approximately 40–50 additional strings. This is trivially small in memory terms. The generation cost is also trivial — Part 2 is already computing all underlying values; generating a second set of formatted strings is negligible additional work. Part 2 generates labels the user may never see (if they never toggle), but the cost of generating them is so small that "don't generate what might not be needed" optimisation is premature and would complicate the architecture for no meaningful gain.

*Architectural cleanliness.* With both modes upfront, the rendering layer is truly self-sufficient once it has its data. Format-switching is a state change within the component, not a data request to an external system. This keeps the data flow unidirectional: Part 2 produces → Part 3 distributes → Part 1 renders. No callbacks, no re-requests.

**4. Counts are mode-independent; labels are mode-dependent — confirmed.**

The natural frequency counts ($N_{TP} = 9$, $N_{FP} = 89$, etc.) are the same regardless of display mode. The spatial structure of the visualisations (grid layout, tree branching) depends on counts, not on display mode. Only the text — what's written on/near each visual element — changes. This reflects the theoretical grounding: the natural frequency counts ARE the underlying reality; the two display modes are two *representations* of the same reality. One canonical set of counts, multiple representational layers.

*Subtlety — the posterior value.* In frequency mode, the posterior is expressed as "$N_{TP}$ out of $N_{T^+}$" (a fraction of integers: "9 out of 98"). In probability mode, it's "$P(D | T^+) \approx 0.092$" (a decimal). The *value* is the same; the *expression* differs. The data package includes the raw values ($N_{TP}$, $N_{T^+}$, and the decimal ratio) in the counts section, and includes the formatted display strings in both label sets. This follows the same pattern: raw data is mode-independent, formatted text is mode-dependent.

**5. Raw rates included alongside counts — confirmed.**

The raw input parameters (base rate, sensitivity, FPR) serve multiple purposes: the parameter panel displays them, the tree branches label them (in frequency mode: "Sensitivity: 90%"; in probability mode: "$P(T^+ | D) = 0.90$"), and they make the package self-describing — you can look at a data package and know what parameters generated the counts, without reference to external state.

Self-description matters for the development workflow (hardcoded test packages are fully self-contained) and for guided/practice modes (where parameters come from a scenario, not from sliders, and the package is the complete problem description). In exploration mode, the parameter controls (Part 2) own the current parameter values and recompute the package when they change — the raw rates in the package reflect the values that produced *these specific* counts.

**6. Question text and problem statement included — confirmed.**

These are consumed by Part 3's layout (question layer and problem statement area), not by Part 1's rendering components. Including them in the data package means Part 2 produces a single object containing everything the display needs, and Part 3 distributes relevant portions.

Question text and problem statement are mode-dependent (they change with format-switching — e.g., "Of all those who test positive, how many actually have the disease?" in frequency mode vs. "What is $P(D | T^+)$?" in probability mode), so they follow the same pattern as labels: both display mode variants included upfront.

**7. Scenario metadata included — confirmed.**

Scenario name, domain identifier, and any other administrative/display information. Makes the package fully self-describing.

**Three-region structure:**

Working through the seven decisions produced a clear three-region architecture:

**Region A — Mode-independent numerical data.** $N$, all partition counts (six leaf-level: $N_{TP}$, $N_{FN}$, $N_{FP}$, $N_{TN}$; two first-level: $N_D$, $N_{\neg D}$; two regrouped: $N_{T^+}$, $N_{T^-}$), raw rates (base rate, sensitivity, FPR), posterior value (as decimal ratio), and $N$ itself. These are the mathematical content. They don't change with display mode or grouping state.

All intermediate totals ($N_D = N_{TP} + N_{FN}$, etc.) are included explicitly rather than requiring the component to derive them. The "no computation in the component" principle from boundary decision 3 was about avoiding pedagogically significant computation (rounding/constraint logic), and simple addition isn't in that category. But explicit inclusion costs nothing and means the component is a truly pure renderer — the data package is a complete description of the numerical state with no derivation needed. It also means every consumer sees exactly the same totals — no possibility of inconsistency even from trivial arithmetic.

**Region B — Mode-dependent textual data.** Two complete label sets (frequency mode and probability mode), each containing:

- *By-condition grouping labels:* for each of the six groups (population, condition-positive, condition-negative, TP, FN, FP, TN) — domain label, structural label, count display string. Structured hierarchically matching the partition hierarchy.
- *By-test-result grouping labels:* for each regrouped group (test-positive, test-negative) — domain label, structural label, count display string, composition string showing the group's makeup (e.g., "TP: 9, FP: 89"). Structured hierarchically with condition-origin sub-groups.
- *Tree node labels:* display string for each node (counts in frequency mode, probabilities in probability mode).
- *Tree branch labels:* display string for each branch (accessible names with rates in frequency mode: "Sensitivity: 90%"; probability notation in probability mode: "$P(T^+ | D) = 0.90$").
- *Cross-branch combination labels:* sum label, posterior display string (fraction form and/or percentage).
- *Question text:* the problem question in this display mode.
- *Problem statement text:* the full scenario narrative in this display mode, following the parameterised template.
- *Parameter display strings:* formatted values for the parameter panel.

A display mode flag indicates which label set is currently active, but both are always available. Format-switching swaps the active flag; the component re-renders with the other label set.

**Region C — Metadata.** Scenario identifier, domain (medical, spam, etc.), scenario name. Administrative and display-level.

**Data flow model:**

Part 2 produces the complete data package (Regions A + B + C) whenever parameters change (exploration mode slider adjustment, scenario selection, etc.). Part 3 receives the package and distributes: question text and parameter display to their respective UI areas, the visualisation-relevant data (Region A + visualisation labels from Region B) to Part 1 components. Part 1 components render based on their current state (construction stage × grouping state × active display mode), drawing from the appropriate portions of the data they received.

Format-switching is a view-layer operation: the active display mode changes, the component re-renders labels from the other label set in Region B, no new data is requested from Part 2.

Regrouping is a view-layer operation: the grouping state changes, the component re-renders spatial layout and swaps to the other grouping's label set, no new data is requested from Part 2.

Only parameter changes (slider movements, scenario switches) trigger Part 2 to produce a new data package.

[Report — Technical Quality] **The three-region data package structure as principled architecture.** The data package's three-region structure (mode-independent numerical data, mode-dependent textual data, metadata) directly reflects the tool's conceptual structure: one underlying probabilistic reality (the counts), multiple representational modes for viewing it (frequency vs. probability labels), and contextual framing (the scenario). This maps onto the natural frequency theoretical framework — the counts are the "natural" representation; the display modes are different ways of presenting the same underlying frequencies. The architecture doesn't just implement the theory; it structurally mirrors it. Under Technical Quality, "the designs are very well considered, clear, and easy to understand" rewards this kind of structural clarity where the software mirrors the conceptual model.

[Report — Technical Quality] **Format-switching and regrouping as pure view-layer operations.** The decision to include both display modes and both grouping states upfront means the two most pedagogically significant interactions in the tool — format-switching (experiencing the natural frequency effect) and regrouping (constructing the denominator) — are purely view-layer operations that don't require data recomputation. This has an architectural implication worth articulating: the pedagogically critical interactions are the *fastest and most responsive* because they don't involve data flow. This is not accidental — it follows from the design principle that these interactions should feel immediate, because their pedagogical power depends on the contrast being experienced as direct and visceral rather than mediated by loading or delay. The architecture serves the pedagogy.

[Report — Technical Quality / Complexity] **The hierarchical label structure as an encoding of the Bayesian partition structure.** The data package's label hierarchy mirrors the partition hierarchy, which mirrors the nested-set structure, which mirrors the Bayesian inference process. This is a four-level structural alignment: mathematical structure → visual encoding → data architecture → label organisation. Being able to trace this alignment from Bayes' rule through to the label hierarchy in the data package demonstrates that the implementation decisions are not arbitrary but emerge from the theoretical foundations. Under the rubric, "demonstrates a thorough understanding of the technical details" at the higher bands includes understanding how implementation choices connect back to the theory.

---

#### Icon Array Spatial Layout Algorithm — confirmed: alternating-axis hierarchical subdivision

**The problem (restated with the discrete grid constraint made explicit):**

Given $N$ icons arranged in a grid of $R$ rows × $C$ columns, assign each icon to one of four groups (TP, FN, FP, TN) such that: each group occupies a contiguous spatial region, the counts match the data package, the spatial arrangement makes the *hierarchical* partition structure visible (two first-level groups each subdivided into two second-level groups), and the layout works across all parameter ranges the tool handles (from mammography at $N = 1000$ with $N_D = 10$ to moderate scenarios at $N = 100$ with $N_D = 20$).

The key constraint the grid imposes: regions are composed of discrete grid cells. A "contiguous region" means cells connected through shared edges. The simplest and most perceptually clear contiguous regions are rectangular blocks. Non-rectangular regions (L-shapes, irregular blobs) are contiguous but harder to perceive as a single group and harder to compare proportionally. This pushes toward rectangular sub-regions — but arbitrary area ratios can't always be tiled with exact rectangles.

**Why alternating-axis subdivision is the right approach:**

The partition IS hierarchical — population splits into condition groups, each of which splits into test-result groups. Hierarchical rectangular subdivision (treemap-style) naturally represents this: recursively partition the rectangle into sub-rectangles at each level. For our specific structure (two levels, two children at each level), this reduces to alternating-axis subdivision:

Step 1: Divide the grid into two rectangles for the first-level partition. Split along one axis (say horizontal — left for condition-positive, right for condition-negative). The split position is proportional to the base rate.

Step 2: Within each first-level rectangle, divide into two sub-rectangles for the second-level partition. Split along the *other* axis (vertical — top/bottom within each first-level region). Within the condition-positive region, TP on top, FN on bottom, proportional to sensitivity. Within the condition-negative region, FP on top, TN on bottom, proportional to FPR.

This guarantees: all four regions are rectangles (clean, comparable shapes); the hierarchy is visually explicit (the two partition levels use different spatial axes — one horizontal, one vertical — making them visually distinguishable as different operations); no gaps or overlaps; and the first-level boundary is the most prominent (a full-height line through the grid) while second-level boundaries are contained within each first-level region.

**Alternatives evaluated and rejected:**

*Simple left-to-right fill (groups in reading order):* Produces contiguous regions, but the hierarchy is invisible. All four groups are just sequential blocks. The boundary between FN and FP (a first-level boundary — condition-positive to condition-negative) looks identical to the boundary between TP and FN (a second-level boundary). There is no visual distinction between partition levels. This directly violates the nested-set transparency principle, where the hierarchical structure should be geometrically apparent — the user should *see* that TP and FN are sub-divisions of a larger group, not just adjacent blocks in a sequence.

*Row-based allocation (groups occupy complete rows):* Always produces clean horizontal boundaries, but makes both partition levels look the same — all boundaries are horizontal lines. The first-level boundary is visually identical to the second-level boundaries. Slightly better than left-to-right fill (regions are at least roughly rectangular) but still fails to encode the hierarchy through spatial orientation. The user cannot tell from the spatial structure alone which boundaries represent the condition split and which represent the test-result split.

*Fully general treemap algorithm (e.g., squarified treemaps):* More complex algorithms exist that optimise for aspect ratios (keeping sub-rectangles close to square). These are valuable for deep or wide hierarchies where aspect-ratio distortion accumulates. But our hierarchy is exactly two levels deep with exactly two children at each level — the simplest possible case. A squarified treemap algorithm adds complexity without benefit for this topology. The alternating-axis approach IS the treemap algorithm for a balanced binary hierarchy of depth 2.

**Axis assignment — adapts to container aspect ratio:**

Which axis for which partition level? Two options: (i) first level horizontal (left/right), second level vertical (top/bottom); or (ii) first level vertical (top/bottom), second level horizontal (left/right).

The choice interacts with the container's aspect ratio. A wide container works well with option (i) — the first-level boundary is a vertical line running the full height of the container, maximally prominent. A tall container works better with option (ii) — the first-level boundary is a horizontal line running the full width. The principle: **the first-level split runs along the container's shorter dimension** (i.e., divides the container along its longer dimension), making the first-level boundary as visually prominent as possible.

There is a secondary consideration for extreme base rates: at low base rates ($N_D = 10$ out of $N = 1000$), the condition-positive region is very small — roughly 1% of the grid. In option (i), this is a thin column on the left. The second-level split within that thin column is vertical (TP on top, FN on bottom). Even in a single column, this is legible — the user sees darker warm at top, lighter warm at bottom. In option (ii), the condition-positive region would be a thin horizontal strip, and the second-level split within it would be horizontal — subdividing an already-thin strip into thinner strips, which is perceptually harder. This subtly favours option (i) for typical screen aspect ratios (wider than tall), which happens to be the more common case. The container-adaptive rule handles this naturally: for wide containers (the common case), option (i) is selected; the condition-positive region is a narrow column with internal vertical subdivision, which works.

**Handling the discrete grid constraint — jagged edges:**

The first-level split must fall on column boundaries (for a horizontal split). If $N_D / R$ (number of columns for the condition-positive region) is not an integer, the condition-positive region gets $\lfloor N_D / R \rfloor$ full columns plus enough cells from the next column (from the top) to reach exactly $N_D$ icons. The boundary is a vertical line that jogs by one cell at the partial column.

The same logic applies to second-level splits: within each first-level region, the split may not fall on a row boundary, producing a one-cell horizontal jag.

These jagged edges are always at most one cell deep. At moderate $N$ where icons are large, the step is visible but clearly a minor irregularity in an otherwise clean boundary. At high $N$ where icons are small, the step is imperceptible. In both cases, the colour contrast (warm vs. cool for first level, shade variation for second level) makes the grouping clear regardless of whether the boundary is geometrically perfect.

An alternative considered was *choosing grid dimensions that divide evenly* — finding $R$ and $C$ such that all partition counts produce integer column/row counts. Analysis of the mammography case ($N = 1000$, $N_D = 10$) shows this is often impossible at extreme proportions: even in a 100×10 grid, the condition-positive region would be 1 column × 10 rows = 10 icons, and the second-level split (TP = 9, FN = 1) requires a non-integer row boundary within that single column. The even-division constraint would over-constrain grid dimensions to the point of distorting the grid's aspect ratio. The jagged-edge approach is more robust — it works for any counts on any grid dimensions.

**Row-major fill within regions for the second-level partition:**

Rather than computing exact rectangular sub-regions at the second level (which may require the same jagged-edge handling), a simpler approach fills each first-level region in reading order: the first $N_{TP}$ cells (in row-major order within the condition-positive region) are TP; the remaining $N_{FN}$ cells are FN. Similarly within the condition-negative region.

This guarantees contiguity (both sub-groups are contiguous because they're sequential within a rectangle). The boundary between TP and FN is roughly horizontal (perpendicular to the first-level boundary), preserving the hierarchical visual distinction (different axes for different levels). The boundary may have a one-cell jag if the count doesn't fill complete rows, identical to the first-level jagged-edge handling.

The advantage: simpler algorithm, guaranteed correctness, and the visual result is effectively identical to a fully computed rectangular second-level subdivision. The implementation is straightforward: iterate through each first-level region's cells in row-major order, assigning group membership based on cumulative count.

**Both layouts (by-condition and by-test-result) computed by the same algorithm:**

The regrouping animation transitions between "grouped by condition" and "grouped by test result." The regrouped layout needs its own spatial arrangement using the same algorithm but with different grouping parameters:

- By-condition layout: first level splits population into condition-positive / condition-negative, second level splits each by test result.
- By-test-result layout: first level splits population into test-positive / test-negative, second level splits each by condition origin.

Each icon has a stable identity — it belongs to exactly one of the four groups (TP, FN, FP, TN) regardless of layout. The icon's colour doesn't change between layouts; only its position changes. This is what makes the regrouping animation pedagogically powerful: the user sees the *same* icons (same colours) flowing into new spatial arrangements, making the *act of regrouping* visible as a spatial transformation.

Implementation: both layouts are computed upfront when the data package is received. Each icon stores two positions (by-condition position and by-test-result position). The current grouping state determines which position set is rendered. The regrouping animation interpolates all icons from one position set to the other. The icon-to-group assignment is deterministic — same counts + same grid = same layout, ensuring animation consistency.

**Grid dimension calculation:**

Given container width $W$, height $H$, and $N$ icons, the algorithm determines rows $R$ and columns $C$ such that: $R \times C \geq N$ (with $R \times C$ as close to $N$ as possible to minimise empty cells), $C/R \approx W/H$ (grid aspect ratio matches container), and icons are large enough to be perceptible.

A practical approach: compute the ideal icon size as $s = \sqrt{(W \times H) / N}$, then $C = \lfloor W / s \rfloor$ and $R = \lceil N / C \rceil$. Adjust if $R \times C < N$. A few empty cells in the bottom-right of the grid are acceptable and visually neutral (same background colour, no partition membership). At moderate $N$ this is usually avoidable ($100 = 10 \times 10$, $200 = 10 \times 20$); at high $N$ it's negligible.

[Report — Technical Quality / Complexity] **The spatial layout algorithm as resolved: alternating-axis subdivision with container-adaptive axis assignment.** The algorithm directly encodes the nested-set hierarchy using spatial orientation — different axes for different partition levels. This is the geometric realisation of the most important facilitating property identified in the theoretical literature (nested-set transparency, Böcherer-Linder & Eichler, 2019). The connection to treemap layout algorithms (Shneiderman, 1992; Bruls, Huizing & van Wijk, 2000) is concrete: the alternating-axis approach is the treemap algorithm for a balanced binary hierarchy of depth 2. The container-adaptive axis assignment is a responsive design decision driven by perceptual considerations (maximising the first-level boundary's prominence). Three alternative approaches were evaluated and rejected on principled grounds: left-to-right fill (hierarchy invisible), row-based (hierarchy indistinguishable), and fully general treemap (unnecessary complexity for our simple topology). This demonstrates that the algorithm choice was driven by the design principle rather than implementation convenience, and that alternatives were critically evaluated — exactly the kind of "key decisions highlighted and justified" the Technical Quality rubric rewards.

[Report — Technical Quality] **Jagged edges as a principled compromise with the discrete grid constraint.** The decision to accept one-cell boundary jags rather than constraining grid dimensions to produce exact integer splits demonstrates awareness of the tension between geometric idealism and practical constraints. The analysis showing that even-division constraints are often impossible at extreme proportions (mammography case) is itself evidence of careful parameter-space reasoning. The argument that jagged edges are imperceptible at high $N$ (where they occur most often) and minor at moderate $N$ (where the colour contrast makes grouping clear regardless) shows that the compromise was evaluated against the perceptual function it must serve, not just against aesthetic criteria.

---

#### Icon Rendering Specifics — confirmed

**Icon shape: rounded squares — confirmed.**

The design decision (Plan & Status, Phase 3 strand a) deferred icon shape to implementation with the guidance: "a shape that scales well across grid densities, is clearly perceptible as discrete, and doesn't introduce unwanted connotations."

Now that the spatial layout is defined, the practical considerations are concrete:

*Squares* pack the grid with zero wasted space — the icon IS the cell minus spacing. At high $N$ this maximises visible coloured area, making colour-based partition regions as visually solid as possible. But at moderate $N$, a grid of squares can read as "a coloured grid" or "pixels" rather than "individual things." The discrete-countable-objects property (one of the three facilitating properties from Böcherer-Linder & Eichler, 2019) is what makes icon arrays distinctively useful versus area-proportional formats. If icons don't read as discrete objects, the array loses its theoretical justification.

*Circles* leave corner gaps between adjacent icons. At moderate $N$ this is fine — circles are large enough that gaps are small relative to the icon, and circles read naturally as "individual things." At high $N$ the gaps become proportionally significant, reducing colour density and making partition regions less visually solid. This undermines base-rate salience at exactly the scale where it matters most (the mammography problem at $N = 1000$).

*Rounded squares* resolve the tension: they pack like squares (maximising colour density at high $N$) but the rounding softens them enough to read as individual objects at moderate $N$. The rounding radius can scale continuously with icon size — more rounding at moderate $N$ (where discreteness matters), fading toward pure squares at high $N$ (where density matters). This isn't a novel invention; it's a standard approach in icon array implementations.

The specific rounding radius is a visual tuning parameter for development — not a specification-level decision. The design-level commitment: shape that maximises colour density while maintaining perceptual discreteness, with the balance shifting toward density at high $N$.

**Icon sizing:**

Given container width $W$, height $H$, and grid dimensions $R$ rows × $C$ columns (from the grid dimension calculation above): icon size $= \min(W / C, H / R) - \text{spacing}$. All icons are the same size — uniform sizing is important for the discrete-countable-objects property and for the area-proportional perception of partition regions (if icons varied in size, the area comparison between regions would be distorted).

**Spacing between icons:**

Spacing scales continuously with icon size / $N$:

- At moderate $N$ (100–200): spacing is 15–20% of icon size. Maintains "discrete objects" perception — visible gaps between individual icons.
- At high $N$ (500–1000): spacing shrinks to 5–10% or less. Prioritises colour density — the array reads as a coloured field with subtle texture rather than individual dots.

The spacing is a continuous function of icon size, not a step function. As icons get smaller, spacing shrinks proportionally.

**Partition boundary delineation:**

The spatial layout algorithm produces hierarchical rectangular regions distinguished by colour (warm/cool families for first level, shade variation for second level). The question: should there be additional visual delineation beyond colour contrast?

**Options evaluated:**

*(a) Colour only — no explicit boundaries:* Cleanest visually. The colour scheme does all the work. But at subtle colour transitions (the shade variation between TP and FN within the warm family, for instance), the second-level boundary may not be immediately obvious, especially at high $N$ where icons are small and shade variation is harder to perceive.

*(b) Subtle boundary lines at first level only:* A thin line at the first-level boundary reinforces the hierarchical structure — the first-level boundary is explicitly marked, the second-level boundaries are not. This makes the hierarchy perceptually explicit through a *different visual mechanism* (line vs. colour), which is a form of redundant encoding.

*(c) Boundary lines at both levels:* More explicit but potentially cluttered. Undermines the hierarchical distinction — if both levels have lines, the levels look equally prominent.

*(d) Increased spacing (gap) at first-level boundary:* The gap between the condition-positive and condition-negative regions is wider than the normal inter-icon spacing. This makes the first-level boundary more prominent through spatial separation rather than a drawn element. Subtler than a line, consistent with the grid aesthetic.

**Chosen approach: (d) increased spacing at first-level boundary, optionally combined with (b) subtle line — confirmed.**

The reasoning: hierarchical visual distinction is the key principle. The first-level boundary should be more visually prominent than second-level boundaries. Increased spacing achieves this through the same visual language as the inter-icon spacing — it's a natural extension of the grid aesthetic rather than a new visual element. A subtle line at the first-level boundary can reinforce it without cluttering.

At second-level boundaries, normal inter-icon spacing plus colour change (shade variation within a colour family) is sufficient. The colour change is less dramatic than the first-level change (both sub-groups share the same colour family), so the boundary is perceptually softer — which is *correct*, because it IS a lower-level partition.

After regrouping, the same principle applies: the boundary between test-positive and test-negative groups gets the wider gap, while the internal colour variation within each regrouped cluster provides the second-level structure.

---

#### Label System — confirmed: compound first-level labels

**The core design question: legends vs. in-region/adjacent labels.**

This required deeper analysis than initially anticipated. Three approaches were evaluated:

**Option 1 — Legend (separate from the array):** A colour-coded key positioned outside the array area, mapping colours to groups. Each group gets a colour swatch and label text. The array itself has no text overlaid on or near it.

*Advantages:* No dynamic label placement problem. The legend is a fixed UI element that doesn't react to region geometry, $N$, container size, or extreme proportions. The FN group with 1 icon causes no layout difficulty — its legend entry is the same size as every other. Clean visual separation between array (visual) and labels (textual). Works identically at every $N$.

*Disadvantages:* Breaks the spatial association between labels and regions. The user must visually match "dark warm = TP" in the legend to the dark warm region in the array — a lookup operation that adds cognitive load. This directly conflicts with the persistent visibility principle and redundant encoding design: the literature (and the design decisions grounded in it) specifically recommends presenting numerical information *alongside* the visual representation, not in a separate legend requiring cross-referencing. The risk communication literature (Fagerlin, Zikmund-Fisher & Ubel, 2011; the IPDAS recommendations) is explicit that numbers should accompany the visual, not be displaced to a separate area.

There is also a regrouping problem: when the array regroups, the legend must restructure entirely — different groups, different labels, different composition information. The legend becomes a dynamic element that changes between grouping states, undermining the "no dynamic placement" advantage that was its main appeal.

**Option 2 — Labels positioned in/adjacent to regions:** Labels sit within or next to the region they describe. Direct spatial association.

*Advantages:* Strongest perceptual association — no lookup required. Matches how published icon array studies actually present information (arrays consistently paired with numerical labels in the experimental paradigm — Plan & Status Notes, "[Report — Background / Technical Quality] How published icon array studies actually function"). Supports the persistent visibility principle.

*Disadvantages:* Dynamic placement problem. Label positions depend on region geometry, which depends on partition counts, $N$, container size, and grouping state. Small regions (FN = 1 icon at mammography parameters) cannot physically contain a label. At extreme proportions, labels for tiny groups may overlap with labels for large groups. At high $N$, labels overlaying the icon field need background treatment for readability. During regrouping, labels must transition positions.

**Option 3 — Hybrid (in-region for large, legend for small):** Some groups get direct labels, others appear in a legend.

*Rejected:* Creates inconsistency — the user must know which groups to look for in the array and which to find in the legend. This is a worse user experience than either pure approach, because the labelling strategy itself becomes something the user has to learn and adapt to rather than a consistent system.

**The dynamic placement problem — deeper analysis:**

The core difficulty: given four regions of wildly varying sizes, place a label near each region such that (a) each label is clearly associated with its region, (b) no labels overlap, (c) labels don't obscure important visual information, and (d) the layout works across all parameter ranges.

This is a known hard problem in cartography and information visualisation (label placement). But our case has simplifying structure: always exactly four groups plus two first-level groups, the spatial layout is a hierarchical rectangular subdivision, and the labels have a known hierarchy.

**The resolution — compound first-level labels:**

Rather than placing six labels (two first-level + four second-level) with dynamic positioning, the label system uses **two compound first-level labels**, each showing the first-level group's total and its sub-group composition:

- By-condition grouping: "Have disease: 10 (TP: 9, FN: 1)" and "No disease: 990 (FP: 89, TN: 901)"
- By-test-result grouping: "Test positive: 98 (TP: 9, FP: 89)" and "Test negative: 902 (FN: 1, TN: 901)"

The sub-group breakdown is embedded in the first-level label rather than placed separately near each sub-region. This reduces the placement problem from "six labels near variously-sized regions" to "two labels near two regions that together span the entire array." Two labels at predictable locations (top or edge of each first-level region) is a dramatically simpler layout problem — essentially solved by the alternating-axis spatial layout, which guarantees two cleanly separated first-level regions.

**Why this works pedagogically:**

The compound label approach aligns with the redundant encoding principle operating as designed. The visual channel (colour and shade) identifies each sub-group spatially — the user sees four colour groups in the array. The textual channel (compound labels) provides the numerical breakdown — the user reads the counts and composition. The two channels work in parallel. The label doesn't need to be physically ON the 1-icon FN region to serve its function — it needs to be *readable* and *clearly associated with the correct first-level group*.

Crucially, the compound label is *already the approach used in the regrouped state*. The Plan & Status design (strand b) specifies regrouped labels as "Test positive: 98 (TP: 9, FP: 89)" — a compound label with composition information. The composition labels were described as "critical — they make the denominator construction explicit." Using the same compound approach for the by-condition state makes the label style consistent across both grouping states: each first-level group always shows its total and its composition, regardless of which dimension the grouping is along. This consistency means the user learns one label-reading pattern that works in both states.

**At high $N$ (500–1000):** The compound labels are the primary precision channel. Two labels, positioned prominently at the edges of or overlaying the first-level regions with semi-transparent background for readability. The simplicity of "two labels, two regions" is a significant advantage at high $N$ — fewer labels means less visual clutter on an already-dense icon field.

**At moderate $N$ (100–200):** The first-level compound labels remain the primary label system. Optionally, if sub-regions are large enough (a determination based on rendered region size in pixels), smaller second-level labels can appear *within* the sub-regions as visual reinforcement. These are secondary — the compound labels carry the information regardless. The in-region labels are a visual nicety that strengthens the spatial association when space permits. They can be omitted entirely when space is tight without information loss.

**Label prominence scaling:** Label font size and visual weight scale continuously with $N$ (paralleling the icon spacing scaling). At moderate $N$, labels are a secondary visual layer — present but not dominating the array. At high $N$, labels are larger and more prominent, becoming the primary information channel as the array becomes a gestalt rather than individually countable. This is the continuous scaling function the Plan & Status design notes describe.

**Label transition during regrouping:** When the array regroups, the two compound labels transition: old labels (by-condition) fade out while new labels (by-test-result) fade in. The timing coordinates with the icon movement — new labels appear as icons settle into their new positions. Since there are only two labels in each state, the transition is visually clean — no complex multi-label choreography required. This is a significant practical advantage of the compound label approach over a six-label system, where the transition would involve multiple labels moving, appearing, and disappearing simultaneously.

[Report — Technical Quality] **The compound label approach as a design decision that simultaneously resolves a technical problem and reinforces a pedagogical principle.** The shift from per-sub-group labels to compound first-level labels was driven by the dynamic label placement problem (a technical implementation challenge), but it turns out to also strengthen the pedagogical design. The compound label explicitly shows the *composition* of each first-level group — "Have disease: 10 (TP: 9, FN: 1)" presents the hierarchical structure in a single readable unit. This mirrors what the icon array represents visually: a group (the warm region) composed of sub-groups (the shade variations within it). The label describes the same structure the visual encodes. The technical solution (avoiding per-sub-group placement) and the pedagogical solution (explicit composition labels) are the same design. This is worth articulating in the report — it demonstrates that the technical and pedagogical concerns converge rather than conflict, and that the implementation constraint led to a *better* pedagogical design, not a compromised one.

[Report — Technical Quality] **Consistency of label approach across grouping states.** The compound label pattern is identical in both grouping states: first-level group total + sub-group composition. In the by-condition state: "Have disease: 10 (TP: 9, FN: 1)." In the by-test-result state: "Test positive: 98 (TP: 9, FP: 89)." The user reads labels the same way regardless of how the array is currently grouped. This consistency supports transfer within the tool — the label-reading skill learned in one grouping state applies directly to the other. For the report, this connects to the representation training principle that consistent structural patterns across contexts build transferable skill.

---

#### Multi-Scale Interaction — confirmed: abstract capability requirements

**Important framing note — tech-stack independence:**

The interaction capabilities described here are **functional requirements** — what the component must be able to do, expressed without framework-specific language. The *specific implementation* of these capabilities (React props and callbacks, DOM events, a pub/sub system, method calls on a class instance, a state management store, etc.) depends on the tech stack decision, which is sequenced to happen after Part 1 specification is complete and before Part 2 work begins. The descriptions below specify *what external code can ask the component to do or learn from the component*, not the API surface through which it does so.

**At moderate $N$ (100–200) — direct manipulation capabilities:**

Individual icons are large enough to be clicked/tapped and hovered. The component needs to support:

- *Icon-level event reporting:* When an icon is clicked or hovered, the component reports which icon (by index or group membership) to external code. The component does not decide what the event *means* — that is Part 4's concern (in guided mode, a click might mean "assign this icon to a group"; in exploration mode, it might mean "show details for this icon's group").
- *Region-level event reporting:* When a partition region is clicked, the component reports which group was targeted. Useful for selection, highlighting, or showing aggregate information.
- *Visual feedback for construction:* During guided-mode construction (Part 4), the component can visually indicate a pending partition — for example, highlighting the boundary where the condition-positive region will end, or showing a "preview" of what the partition will look like before the user confirms it.
- *Individual/batch icon state changes:* External code can change the colour state of specific icons (grey → warm, warm → darker warm) individually or in batches, with smooth transitions. This supports fine-grained construction where Part 4 controls which icons change.

**At high $N$ (500–1000) — calculation-and-visualise capabilities:**

Individual icons are too small to click meaningfully. The interaction shifts to numerical input with visual response:

- *Batch colouring by count:* External code instructs "colour $k$ icons in this region with this state." The component smoothly transitions the appropriate number of icons. The construction action happens through numerical input (Part 4 provides the input UI); the component *visualises* the result.
- *Animated batch transitions:* When icons change state in batch (e.g., 10 icons go from grey to warm for the base-rate partition), the transition should be visible as a brief sequential colouring or sweep — not instantaneous, so it feels like "building" rather than "appearing." The animation makes the user's numerical input tangible.
- *Partition boundary auto-adjustment:* When a batch colouring occurs, the spatial layout automatically adjusts to encompass the correct number of icons in each region. The user doesn't manually position boundaries at high $N$ — the boundaries follow from the counts.

**Scale-dependent capability availability:**

Rather than a hard cutoff between "moderate" and "high" $N$ interaction, the component reports its **rendered icon size** (in pixels) to external code. Parts 3/4 use this to decide which interaction mode to offer. At large icon sizes, both direct manipulation and numerical input are available. At small icon sizes, only numerical input is practical. The threshold is determined by rendered size, not by $N$ directly — a 1000-icon array on a large display might have clickable icons; the same array on a phone screen would not.

This keeps the boundary decision in Parts 3/4 (which know the interaction context) rather than in Part 1 (which only knows rendering).

**Capabilities available regardless of scale:**

- *State setting:* External code can set the construction stage, grouping state, and active display mode, with or without animation. This is the primary control mechanism — Parts 3/4 manage state, Part 1 renders it.
- *Regrouping trigger:* External code triggers the regrouping animation (or instant state change). Part 1 handles the animation; Parts 3/4 decide when to trigger it.
- *Region highlighting:* External code can highlight or un-highlight specific partition regions (e.g., during construction, to show which region the user is about to modify). The highlight is a visual overlay — a brighter border, a subtle glow, or increased opacity — that draws attention to the region without changing its colour encoding.

[Part 4] **Flag — interaction mode decisions for guided construction.** Part 1 provides the capabilities; Part 4 decides how to compose them into guided-mode construction experiences. Key questions for Part 4: At moderate $N$, does the user click individual icons, drag a boundary, or enter a number and see the result? At high $N$, does the user type into an input field, use a slider, or answer a prompted question ("How many out of 1000 have the disease?") with the array animating the result? These are pedagogical interaction design questions — the array component supports all of these patterns through the capabilities above, and Part 4 chooses which pattern serves the pedagogical goal at each construction stage.

---

#### Frequency Tree Rendering — confirmed

The tree component is more independent than the icon array — different visual structure, different rendering concerns, simpler layout (fixed topology rather than dynamic spatial partitioning).

**Basic structure:**

A vertical tree with root at top (Plan & Status, Phase 3 strand a — vertical layout confirmed). Root node = total population. First-level branches to two child nodes (condition-positive, condition-negative). Second-level branches to four leaf nodes (TP, FN under condition-positive; FP, TN under condition-negative). In combination-shown state, a visual element connects TP and FP leaf nodes showing their sum and the posterior.

**Node rendering:**

Nodes are uniformly sized (Plan & Status, Phase 3 strand a — proportionally-sized nodes rejected). Each node is a rounded rectangle containing text — the node's label from the data package (a count in frequency mode, a probability expression in probability mode).

Nodes must accommodate the longer probability-mode labels ($P(D) = 0.01$) without looking empty for shorter frequency-mode labels ("10"). A fixed moderate size that fits the longer labels, with shorter labels centred within, is the practical approach. The node border or background uses the hierarchical warm/cool colour scheme matching the icon array:

- Root: grey (neutral/unpartitioned)
- First-level: warm fill (condition-positive), cool fill (condition-negative)
- Leaf level: shade variations — dark warm = TP, light warm = FN, dark cool = TN, light cool = FP

**Branch rendering:**

Branches connect parent to child nodes with lines (straight angled lines or slight curves). Each branch carries a label from the data package — accessible rate name in frequency mode ("Sensitivity: 90%"), probability notation in probability mode ("$P(T^+ | D) = 0.90$").

Branch labels are positioned beside the branch line, roughly midway between parent and child. The standard convention in the Bayesian reasoning literature (Binder et al.) positions labels on or near the angled branch.

**Branch colour: neutral (grey or dark grey) — confirmed.** The colour encoding is reserved exclusively for nodes. Coloured branches could be misread as encoding semantic information beyond mere connection. Neutral branches keep the visual hierarchy clean: node colour = group identity, branch = structural connection, branch label = the rate that drives the split. Each visual element has one clear role.

**Tree layout:**

The tree's topology is fixed (always the same shape — root, two first-level, four leaves, optional combination element). The layout positions nodes at fixed relative positions within the container, scaling with container size:

- Root centred at top
- First-level nodes spaced apart horizontally at the second level
- Leaf nodes spaced further apart at the third level
- Sufficient vertical spacing between levels for branch labels

The layout is simpler than the icon array's because nothing about the topology changes with parameters — only the labels and colours change. The same relative positioning works for every scenario. The layout scales with container size (nodes, branches, and labels scale proportionally), with minimum legibility as the binding constraint — below certain container dimensions, node labels become too small to read.

**Cross-branch combination visual: bracket with sum — confirmed.**

When combination is shown, the TP and FP leaf nodes are visually connected showing they form the test-positive group.

**Options evaluated:**

*(a) Bracket or brace spanning TP and FP:* A bracket beneath the two leaf nodes, with sum and posterior labels below. Visually clean, clearly indicates "these two combine." Conventional mathematical notation for grouping.

*(b) Connector line with sum node:* A line linking TP and FP with a new node at the junction. Extends the tree downward with an additional visual level. But this makes the combination look like another tree level — a third level of branching — when it's a fundamentally *different* operation. The tree branches represent conditional decomposition (splitting); the combination represents conditional *recomposition* (merging across branches). The visual should distinguish these.

*(c) Highlighting/enclosure:* TP and FP nodes enclosed in a shared outline or background. Subtler, but might not be prominent enough for what is the critical pedagogical moment of the entire tree — the point where the user constructs the posterior.

**Chosen: (a) bracket.** The bracket is visually distinct from the tree's branch structure, which is appropriate because the combination IS a different kind of operation. Branches split; the bracket combines. The visual distinction mirrors the logical distinction. This is the same kind of "different visual elements for different logical operations" reasoning that drives the alternating-axis layout in the icon array (different spatial axes for different partition levels).

The bracket sits below the TP and FP leaf nodes with labels showing:

- In frequency mode: the sum ("Test positive: 9 + 89 = 98") and the posterior as a natural frequency ("9 out of 98 ≈ 9.2%")
- In probability mode: the marginal ("$P(T^+) \approx 0.098$") and the posterior in Bayesian notation ("$P(D | T^+) \approx 0.092$")

The label detail may need to scale with available space — a condensed version for smaller containers, expandable detail for larger ones. This is a visual polish consideration for development.

**Tree construction animation:**

When transitioning between construction stages, new nodes and branches appear with animated transitions:

For each branch-addition step:
1. Branch line extends from parent toward child position (drawing along the path)
2. Child node appears at branch endpoint (scale up or fade in)
3. Branch label fades in beside the branch
4. Node label (count) appears inside the node

This four-phase sequence makes the tree's growth feel organic — the branch reaches out, the node appears, and information fills in. It mirrors the reasoning: "given this rate (branch label), this group splits into this count (node label)."

For the cross-branch combination step (step 5), a different animation sequence:
1. TP and FP nodes pulse or highlight (drawing attention)
2. Bracket draws beneath them (extending from one to the other)
3. Sum label appears below bracket
4. Posterior label appears

This sequence emphasises the *combining* action — identifying the relevant nodes, connecting them, computing the result. The visual progression corresponds to the cognitive operation the user performs.

**Tree capability requirements (tech-stack-agnostic):**

Paralleling the icon array's capability requirements:

- *State setting:* External code sets construction stage and combination state, with or without animation.
- *Node-level event reporting:* When a node is clicked, the component reports which node. Part 4 uses this for guided construction (e.g., the user clicks the node they want to fill in next) and for the cross-branch combination step (the user selects the nodes to combine).
- *Node value input:* External code can set or prompt for the value in a specific node. In guided mode, the user might type a count into a node; the component provides the input affordance (an editable field within the node) and reports the entered value.
- *Combination trigger:* External code triggers the cross-branch combination animation and display.
- *Highlight/selection:* External code can highlight specific nodes or branches for visual emphasis during guided construction.

---

#### Format-Switching Visual Mechanics — confirmed: cross-fade

Format-switching changes all text content on both components (and on Part 3's question/parameter display) while leaving spatial structure unchanged. Both display modes' label sets are pre-computed in the data package (data package decision 3), so format-switching is a pure view-layer operation.

**What changes:**
- Icon array labels: count strings ↔ rate/probability strings
- Tree node labels: count strings ↔ probability expressions
- Tree branch labels: accessible rate names ↔ probability notation
- Cross-branch combination labels: frequency expression ↔ Bayesian formula
- (Part 3, not Part 1): question text, problem statement, parameter display

**Transition style: cross-fade — confirmed.**

Options evaluated:

*Instant swap:* All labels change simultaneously. Simplest. The "before and after" contrast is immediate. But potentially too abrupt — the user needs a moment to register that the display changed and to compare the new state with their memory of the old.

*Cross-fade:* Old labels fade out while new labels fade in, over 200–400ms. Creates a brief transition moment that signals "something changed" while being short enough not to impede comparison. The spatial structure remains completely static throughout — only text overlaying the structure changes. The user's spatial reference is stable.

*Sequential reveal:* Labels change in a sweep (top-to-bottom or following the tree structure). More dramatic but distracting — the user's eye follows the sweep rather than comparing states. Over-designed for what is fundamentally a text swap.

**Chosen: cross-fade.** The pedagogical power of format-switching depends on the user *experiencing* the contrast between the two representations (Plan & Status, strand b, principle 8: "The contrast should be vivid"). Cross-fade gives the user a brief perceptual moment of transition — enough to register the change — followed by the new state to examine. It's faster than sequential but more perceptible than instant.

Duration: 200–400ms. Long enough to perceive as a transition, short enough not to feel like waiting. A visual tuning parameter for development.

**Label length differences between modes:** Probability-mode labels ("$P(T^+ | D) = 0.90$") are substantially longer than frequency-mode labels ("Sensitivity: 90%"). For the tree, nodes must accommodate the longer labels (as noted in node rendering). For the icon array, compound labels may shift slightly in width between modes. The cross-fade handles this gracefully — old label fades out at its position, new label fades in at its (possibly slightly adjusted) position. If positions are very similar, this reads as an in-place text change. If they differ slightly, it reads as a gentle repositioning.

---

#### Consolidated Icon Array Component Summary

The icon array component, as fully specified:

**Accepts:**
- A data package (Region A counts + Region B labels for both display modes and both grouping states)
- A component state: construction stage × grouping state × active display mode
- A container size (width × height)

**Computes internally:**
- Grid dimensions (rows × columns) from $N$ and container aspect ratio
- Icon size and spacing (continuous scaling with $N$)
- Two spatial layouts (by-condition and by-test-result) via alternating-axis hierarchical subdivision, both computed upfront
- Icon positions for current grouping state
- Compound label positions at first-level region edges
- Rendered icon size (reported to external code for interaction-mode decisions)

**Renders:**
- A grid of rounded-square icons, each coloured by group membership and current construction stage
- Hierarchical partition boundaries: increased spacing at first-level, colour contrast at both levels
- Two compound first-level labels showing group totals and sub-group composition, from the active display mode's label set
- Optional in-region second-level labels at moderate $N$ where space permits
- Regrouping animation (icon position interpolation between layouts)
- Construction-step animations (progressive colouring)
- Format-switching cross-fade (label set swap)

**Exposes to Parts 3/4 (tech-stack-agnostic capabilities):**
- Icon-level and region-level event reporting
- State setting (construction stage, grouping state, display mode) with/without animation
- Batch icon colouring for construction
- Region highlighting for visual feedback
- Rendered icon size for interaction-mode decisions
- Regrouping trigger

---

### Animation Mechanics — updated specification

The components need smooth animated transitions between states. The specific animation technology depends on the tech stack (to be decided after Part 1 specification, before Part 2 work). The *requirements* are:

**Icon array regrouping animation:**
- Each of $N$ icons has a source position (current layout) and target position (other layout)
- Animation interpolates all icons from source to target simultaneously
- At $N = 1000$, this is 1000 elements moving independently — performance requirement
- Icon colours do not change during regrouping — only positions
- Labels transition (fade out / fade in) coordinated with icon movement
- The animation is *more* visually dramatic at high $N$ with low base rates (89 FP icons flowing to join 9 TP icons) — the pedagogical benefit is strongest where the rendering challenge is hardest
- Must work in both directions (regroup ↔ un-regroup)
- Duration: a visual tuning parameter, likely 500–1000ms — long enough to track the movement, short enough not to feel slow

**Tree construction animation:**
- Four-phase per step: branch extends, node appears, branch label fades in, node label appears
- Smooth transitions (not instantaneous pops)
- Cross-branch combination: highlight, bracket draws, sum appears, posterior appears

**Construction-step animation (icon array):**
- Icons transitioning from grey to coloured (or from one colour to shade variation)
- At moderate $N$: individual or small-batch transitions
- At high $N$: sweep/wave of colour across a region, making the batch colouring feel like "building"

**Format-switching animation:**
- Cross-fade of all text content, 200–400ms
- Spatial structure static throughout

[Tech Stack] **Updated constraint note.** The animation requirements — particularly the regrouping animation requiring element-level position interpolation for 1000+ simultaneously-moving elements — remain the primary tech-stack constraint from Part 1. Any framework/approach must support: individual element animation at scale, smooth position interpolation with configurable timing, coordination of multiple simultaneous transitions, and performant rendering at high element counts. See Tech Stack section for the full constraint list.

[Report — Technical Quality] **The regrouping animation at high $N$ with low base rates — pedagogical effectiveness inversely correlated with rendering difficulty.** The regrouping animation is *more* visually effective at high $N$ with low base rates, not less. The animation of 89 false positives from a cluster of 990 joining 9 true positives — showing that the vast majority of the positive-test cluster came from the healthy population — is more dramatic at $N = 1000$ because the size disparity is extreme. But this is also where the rendering challenge is hardest (1000 simultaneous element animations). The implementation must deliver smooth animation at exactly the scale where pedagogical benefit is greatest. This tension between pedagogical benefit and rendering performance is itself reportable as a technical challenge that the implementation addresses, demonstrating awareness of how implementation constraints interact with design goals.

---

### Container-Responsive Layout — updated specification

**Icon array:** Accepts a container (width × height) and adapts grid dimensions, icon size, spacing, partition layout, and label positioning to fill the space. The first-level partition axis adapts to container aspect ratio (splits along the shorter dimension). All scaling is continuous — no step changes as the container resizes.

**Frequency tree:** Accepts a container and scales node sizes, branch lengths, label positioning, and spacing proportionally. The tree's fixed topology means layout is simpler than the icon array's. The main constraint is minimum legibility — node labels must remain readable. Below a threshold container size, the component may need to signal to the parent layout that it cannot render legibly at the given dimensions.

**Both components are container-filling, not container-requesting:** they adapt to whatever space Part 3 gives them, rather than demanding specific dimensions. Part 3 orchestrates the overall screen layout and allocates space to each component based on the three-layer persistent visibility model and the current mode.

---

### Notes for Later

[Report — Technical Quality / Complexity] **The component state model as evidence of principled architecture.** The two-dimensional state model (construction stage × grouping state) emerged from analysing what the components actually need to support across modes — not from a generic "make everything configurable" impulse. The construction stages map directly to cognitively meaningful operations in Bayesian reasoning; the grouping dimension maps to the two ways of examining the same partition structure (by condition vs. by test result). The orthogonality between these dimensions means the component cleanly supports both exploration mode (full state, free grouping) and guided mode (progressive construction, scaffolded grouping) without mode-specific rendering logic. For the report, this demonstrates that the software architecture was designed to reflect the pedagogical structure, not just to implement features. This connects to the broader pattern noted in the Plan & Status document of design principles being realised in technical architecture — under Technical Quality, "the designs are very well considered, clear, and easy to understand" rewards exactly this kind of principled design-to-implementation mapping.

[Report — Technical Quality] **The data package as architectural embodiment of the three-layer persistent visibility model.** *(Duplicated from boundary decision 3 for findability.)* The decision to have Part 2 produce a single data package consumed by all display components means the three-layer persistent visibility model isn't just a design principle but an architectural reality. The question text, parameter labels, and visualisation labels are fields in a single coherent data structure. This demonstrates that the tool's architecture was shaped by its pedagogical design, not just by implementation convenience — the boundary between Part 1 and Part 2 was drawn where it was *because* the persistent visibility model defines what information the user needs, and the data package ensures all three layers stay synchronised.

[Evaluation] **Partial-state rendering enables per-step evaluation.** Because the component can render each construction stage independently, it's possible to evaluate user understanding at each stage — not just at the final answer. Does the user correctly construct the base-rate partition? Do they accurately apply sensitivity within the affected group? Do they correctly identify the denominator when regrouping? This per-step evaluation capability is a property of the architecture (each stage is a discrete renderable state) rather than a separate evaluation feature. Worth noting if the evaluation strategy includes process metrics rather than just final-answer accuracy. This connects to the representation training literature's emphasis on the *process* of constructing representations, not just the *product* — if the skill being taught is the translation process itself, then evaluating that process (not just whether the final answer is correct) is a more authentic assessment of whether the tool achieves its pedagogical goal.

[Report — Technical Quality / Complexity] **The spatial layout algorithm connects visualisation theory to geometric computation.** The icon array's spatial layout is where the nested-set transparency principle (Böcherer-Linder & Eichler, 2019) becomes a computational problem. The algorithm must produce a layout that makes hierarchical set-subset relationships geometrically visible — first-level partitions clearly separated, second-level partitions nested within. This is analogous to treemap layout algorithms (a well-studied area in information visualisation — Shneiderman, 1992; Bruls, Huizing & van Wijk, 2000) applied to a probability representation context. The cross-disciplinary connection — treemap layout algorithms from information visualisation, applied to a cognitive psychology design principle about nested-set transparency, in service of a pedagogical tool for Bayesian reasoning — is the kind of multi-area combination that the Complexity criterion rewards ("combines ideas from several areas in an interesting way").

[Report — Technical Quality] **The compound label approach as convergence of technical and pedagogical concerns.** The shift from per-sub-group labels to compound first-level labels was driven by the dynamic label placement problem (a technical challenge), but it strengthens the pedagogical design. The compound label explicitly shows the *composition* of each group — presenting the hierarchical structure in a single readable unit. The technical solution (avoiding complex dynamic placement) and the pedagogical solution (explicit composition labels matching the regrouped-state approach) are the same design. This demonstrates that technical and pedagogical concerns converge rather than conflict, and that the implementation constraint led to a *better* pedagogical design. For the report, this kind of "constraint-as-opportunity" narrative shows design sophistication beyond "we made it work."

[Report — Technical Quality] **Visual distinction between partition operations as a design principle across both formats.** The icon array uses different spatial axes for different partition levels (alternating-axis layout). The tree uses different visual elements for different operations (branches for splitting, bracket for combining). Both follow the same principle: different operations should be visually distinguishable. The user should be able to see, without reading any labels, which visual boundaries represent the condition split and which represent the test-result split (icon array), or which visual connections represent decomposition and which represent recomposition (tree). This cross-format consistency in design principle — while the specific visual mechanisms differ because the formats have different visual languages — demonstrates coherent design thinking across the tool.

[Report — Background / Complexity] **The icon array at high $N$ converges toward unit squares — revisited through the lens of label design.** The Plan & Status notes observe that at high $N$, when individual icons become imperceptible, the icon array effectively becomes a coloured area (approaching a unit square). The compound label design addresses this convergence practically: at high $N$, the labels (not the individual icons) carry the numerical precision, while the coloured regions carry the gestalt. The icon array with compound labels at high $N$ is functionally a unit square with more explicit numerical annotation. This connection between the icon array and unit square formats — mediated by scale — is worth articulating in the Background as evidence of understanding the relationships between visualisation formats, not just their individual properties.

---

## Part 2: Parameter & Scenario Infrastructure

*Data layer, template system, parameter controls.*

**Current status:** Complete. Parameter model, rounding/constraint logic, display conventions, terminology model, computation function, scenario data structure, template system, and parameter control functional specification all specified.

### Scope

**What this part produces:** The computation and text-generation system that takes raw parameters (or a scenario selection) and produces the complete data package (Regions A + B + C) as specified in Part 1's implementation specifics. Plus the parameter controls' functional behaviour for exploration mode.

**What's in:**
- Parameter model: $N$, base rate, sensitivity, FPR — their valid ranges, step granularity, inter-parameter constraints, and the rationale for each
- Rounding and constraint logic: how non-integer intermediate results are handled to produce valid natural frequency counts
- Display conventions: how parameter values and their rounded results are presented to the user
- Terminology model: which vocabulary (domain, structural, Bayesian) appears where, and why
- Computation function: the pipeline from raw parameters to Region A of the data package
- Scenario data structure: the schema defining what a scenario is, for Part 5 to populate
- Parameterised text template system: generating Region B (all label strings for both display modes, both grouping states, question text, problem statement, parameter display strings)
- Parameter control functional specification: the controls' behaviour, ranges, step logic, and how changes propagate to data package recomputation

**What's out:**
- Visual rendering of parameters/scenarios (Part 1)
- Overall screen layout and spatial integration of parameter controls (Part 3)
- Mode-specific construction sequences and scaffolding (Part 4)
- Specific scenario content — which scenarios, which numerical parameters, which domain vocabulary (Part 5)

**Boundary between Part 2 and Part 3 for parameter controls:** Part 2 specifies the controls' *functional behaviour* — what parameters exist, their valid ranges, step granularity, constraints between them, presets, how changes propagate to data package recomputation. These are parameter model decisions with pedagogical implications (e.g., the logarithmic vs. linear scale question for base rate). They're about what the controls *do*, which is inseparable from the parameter model they operate on. Part 3 handles their *spatial integration* — where they sit in the three-layer layout, how they visually relate to the question and visualisation areas, responsive behaviour. Part 2 produces a parameter control component (or specification for one) that manages parameter state and triggers data package recomputation. Part 3 places it.

### Cross-Part Flags from Part 1

**Data package structure — now defined (see Part 1, Implementation Specifics).** The data package structure has been specified in detail during Part 1 implementation specifics. Part 2 must produce this package. The structure has three regions: Region A (mode-independent numerical data — all partition counts, raw rates, posterior), Region B (mode-dependent textual data — two complete label sets for frequency and probability modes, each containing hierarchical labels for both grouping states, tree labels, question text, problem statement, parameter display strings), and Region C (metadata — scenario identifier, domain, name). See Part 1's data package structure section for the full specification, structural decisions, and reasoning.

Part 2's key responsibilities in relation to the data package:
- Compute all derived counts from raw parameters ($N$, base rate, sensitivity, FPR), handling rounding and constraints to produce internally-consistent integer counts that preserve genuinely natural frequencies
- Generate all label strings for both display modes, following the eight wording principles from strand b
- Generate question text and problem statement text for both display modes, using the parameterised template system
- Produce the complete package whenever parameters change (exploration mode slider adjustment, scenario selection)

**Rounding and constraint logic** — flagged during Part 1 as non-trivial. Now resolved; see Implementation Specifics below.

**Bayesian theoretical terminology** — flagged during Part 1 as a design consideration for the label generation system. Now resolved; see Terminology Model below.

---

### Implementation Specifics

#### Parameter Model & Constraints — confirmed

The user controls four parameters in exploration mode. These interact in a specific dependency chain:

$$N \xrightarrow{\text{base rate}} N_D, N_{\neg D} \xrightarrow{\text{sensitivity, FPR}} N_{TP}, N_{FN}, N_{FP}, N_{TN}$$

$N$ and the base rate together determine the first-level partition. The first-level counts and the test characteristics determine the second-level partition. This cascade matters because decisions at each level constrain what's meaningful at the next. The parameter constraints are designed with this dependency chain in mind, treating each level appropriately for its role.

The fundamental tension underlying all parameter constraint decisions: the rates are continuous quantities but the counts must be integers. At $N = 100$, base rate $= 1\%$ gives $N_D = 1$. Sensitivity of $85\%$ on 1 person gives $N_{TP} = 0.85$ — not meaningful as a natural frequency. The user has set two perfectly reasonable rates that together produce a nonsensical count. This tension has three possible resolution points, each with different trade-offs (see "Resolution point analysis" under Rounding below). The parameter constraints address the input side; the rounding logic addresses the output side.

**$N$ (population size): discrete presets via selector — confirmed.**

$N$ is not a probability parameter — it is the *resolution* of the natural frequency representation. "1 out of 100" and "10 out of 1000" express the same probability but are different natural frequencies with different granularity. The choice of $N$ determines the denominator of the frequency representation, which determines the granularity of the counts the user works with. This reframing — from "how many icons to draw" to "which natural frequency representation to use" — was established in the Plan & Status design decisions and carries through here.

Preset values: **100, 200, 500, 1000.** Each represents a meaningful granularity level. 100 is the coarsest (1% steps in any rate). 1000 is the finest the icon array can usefully display (established by the mammography requirement and the $N \leq 1000$ ceiling from the Plan & Status design). 200 and 500 are intermediate granularities.

A **selector** (dropdown, segmented control, or radio buttons) rather than a slider communicates this correctly — these are distinct resolution options, not points on a continuum. The specific UI element is a Part 3 concern; the design-level decision is that $N$ is a discrete choice from a small set, not a continuous parameter.

The presets are chosen so each represents a power-of-ten or a round halfway point. Custom $N$ values (user types in a number) could be a further enrichment but are not specified — the presets cover the practical range, and arbitrary $N$ values could produce grid dimensions that are awkward for the icon array layout. If custom $N$ were added, it would need constraints (e.g., minimum 50, maximum 1000, must be a multiple of 10 or produce a reasonable grid aspect ratio).

**Base rate: slider with $N$-relative steps — confirmed.**

Step size: $1/N$ per step (equivalently, $N_D$ changes by 1 per step). At $N = 1000$, that's $0.1\%$ steps — very fine-grained. At $N = 100$, that's $1\%$ steps — appropriately discrete. The slider feels smooth at high $N$ and appropriately quantised at low $N$.

This constraint is both practical and theoretically grounded. Practically, it guarantees integer $N_D$ with zero rounding — every slider position produces a base rate where $N \times \text{base rate}$ is exactly an integer. Theoretically, it respects the natural frequency framework: each slider position corresponds to a *distinct* natural frequency ("$k$ out of $N$"), and there's no position that doesn't correspond to a valid frequency.

Range: minimum $1/N$ (at least 1 person with the condition), maximum $(N-1)/N$ (at least 1 person without). At $N = 1000$: $0.1\%$ to $99.9\%$. At $N = 100$: $1\%$ to $99\%$. Both extremes (only 1 person affected, or all but 1 affected) produce valid partitions, though they are pedagogically extreme cases where the Bayesian insight is obvious rather than surprising.

The key advantage of $N$-relative steps over free-form input: since $N$ is a preset (not a slider), the step size is stable while the user adjusts the base rate. There are no mysterious jumps or interdependencies. Changing $N$ changes the step size, but $N$ changes are discrete preset switches — a clear context switch rather than a continuous adjustment.

**Sensitivity: slider with fixed fine steps — confirmed.**

Step size: $1\%$ (a tuning parameter — $0.5\%$ is an alternative if finer control is desired, but $1\%$ is standard and sufficient). Range: $0\%$ to $100\%$ inclusive. Both extremes are valid and pedagogically interesting:

- Sensitivity $= 0\%$: the test misses everyone with the condition. No true positives ($N_{TP} = 0$). The test-positive group is entirely false positives. PPV $= 0/(0 + N_{FP}) = 0\%$. An instructive edge case showing a useless test.
- Sensitivity $= 100\%$: the test catches everyone with the condition. No false negatives ($N_{FN} = 0$). Every affected person tests positive. PPV depends entirely on the false positive rate and base rate. Also instructive.

The resulting $N_{TP}$ is rounded (see Rounding section), and $N_{FN} = N_D - N_{TP}$ by construction.

Unlike base rate, sensitivity is NOT constrained to produce integer counts directly. The step sizes that would guarantee integer $N_{TP}$ are $1/N_D$ — which changes whenever the base rate changes. This interdependency was considered and rejected: changing the base rate would change the available sensitivity values, potentially snapping the sensitivity slider to a new position the user didn't choose. At small $N_D$ the available values become extremely coarse ($N_D = 3$ gives sensitivity options of $0\%, 33\%, 67\%, 100\%$). The exploration experience degrades at exactly the parameter ranges that are most pedagogically interesting (low base rates). See "Resolution point analysis" under Rounding for the full evaluation.

**FPR (false positive rate): same as sensitivity — confirmed.**

Step size: $1\%$. Range: $0\%$ to $100\%$ inclusive. Both extremes valid:

- FPR $= 0\%$: no false positives ($N_{FP} = 0$). PPV $= N_{TP}/N_{TP} = 100\%$ — the test never gives a false alarm. Instructive: a "perfect specificity" test.
- FPR $= 100\%$: everyone without the condition tests positive ($N_{FP} = N_{\neg D}$). PPV equals the base rate — testing positive tells you nothing. Instructive: a completely non-specific test.

The resulting $N_{FP}$ is rounded, and $N_{TN} = N_{\neg D} - N_{FP}$ by construction.

**FPR rather than specificity as the parameter — confirmed.**

The tool uses FPR ($P(T^+ | \neg D)$) rather than specificity ($P(T^- | \neg D) = 1 - \text{FPR}$) as the parameter the user controls and the label the visualisations show. Specificity is shown as the complementary conventional term where appropriate (e.g., in the parameter panel as secondary information; in curated medical scenarios where problems are conventionally described using sensitivity/specificity pairs). Four reinforcing reasons:

1. *Computational directness.* FPR maps directly onto the tree branch operation: $N_{\neg D} \times \text{FPR} = N_{FP}$. The parameter IS the rate on the branch. Specificity requires an inversion ($\text{FPR} = 1 - \text{specificity}$) before it enters the computation — an extra cognitive step that has nothing to do with Bayesian reasoning. The tool is built around making the Bayesian computation transparent; using a parameter that requires inversion works against that.

2. *Cross-format consistency.* Both tree branches work the same way: the rate on the branch is the rate that produces the child count. Sensitivity does this for the condition-positive branch. FPR does this for the condition-negative branch. If the parameter were specificity, the condition-negative branch would show a rate whose complement drives the count — an asymmetry between the two sides of the tree that has no theoretical justification.

3. *Cross-domain generality.* FPR generalises across scenario domains more naturally than specificity. The concept "rate of incorrect flags in the unaffected group" applies whether the domain is medical screening ("false positive rate"), spam filtering ("false alarm rate"), or quality control ("false rejection rate"). Specificity is more bound to medical/epidemiological vocabulary.

4. *Sensitivity is widely used across domains (not just medical).* Sensitivity is the standard term in statistics, machine learning (where it's also called "recall"), and information retrieval, not just medicine. It works as both a domain and structural term. Specificity is more domain-bound to medical/epidemiological usage. The pairing of sensitivity + FPR is more structurally symmetric (both are rates that directly drive the computation) than sensitivity + specificity (one direct, one inverted).

The **specificity** value ($1 - \text{FPR}$) is derived and available in the data package for display purposes — the parameter panel in medical scenarios can show "FPR: 9% (Specificity: 91%)" as secondary information. Curated medical scenarios (Part 5) may describe tests using sensitivity and specificity in their problem text (because that's how tests are conventionally described), with the template system internally converting specificity to FPR for computation. The scenario data structure accommodates either input format (see Scenario Data Structure below).

[Report — Technical Quality] **FPR over specificity as a principled parameter choice.** The decision was driven by computational directness, cross-format consistency, and cross-domain generality — not by convention. In medical communication, tests are described using sensitivity and specificity (both "how good is the test" framings, both high-is-good). But specificity requires inversion before entering the Bayesian computation ($\text{FPR} = 1 - \text{specificity}$), creating an asymmetry between the two tree branches. The tool prioritises making the computation transparent over matching conventional description patterns. This follows the same principle as using natural frequencies over probabilities — the conventional representation (probabilities / specificity) is not the representation that best supports Bayesian reasoning.

[Report — Technical Quality] **The parameter asymmetry between first and second levels as a principled design.** The base rate uses $N$-relative steps (constrained to produce exact integer $N_D$), while sensitivity and FPR use fixed fine steps (with rounding). This asymmetry is not arbitrary — it follows from the dependency structure. $N$ is a fixed preset, so $N$-relative base rate steps are stable. Sensitivity and FPR depend on $N_D$ and $N_{\neg D}$ respectively, which change with the base rate. Constraining them to produce exact counts would create an interdependency where changing one parameter's step size silently moves another parameter's value. The asymmetry keeps base rate adjustment stable and predictable, while accepting minor rounding at the second level — which is theoretically sound within the natural frequency framework (the integer counts ARE the natural frequencies; the rates are a secondary summary).

**Degenerate parameter combinations — allowed, handled gracefully.**

Certain parameter combinations produce edge cases:

- *Both sensitivity $= 0\%$ AND FPR $= 0\%$:* Nobody tests positive at all. $N_{T^+} = 0$. The question "of those who test positive, how many have the disease?" has no answer ($0/0$). The tool displays this state honestly: "Nobody tests positive with these parameters, so the question doesn't apply." Preventing this combination would require inter-parameter constraints that add complexity for a rare edge case.

- *Both sensitivity $= 100\%$ AND FPR $= 100\%$:* Everyone tests positive. PPV simply equals the base rate — testing positive tells you nothing new. Valid, trivial, instructive.

- *Very small $N_D$:* At $N = 100$, base rate $= 1\%$ gives $N_D = 1$. The affected group is a single person. Sensitivity is effectively binary (0% or 100% after rounding). The icon array shows a trivially small region; the tree shows a branch with tiny counts. These states are not *invalid* — they are *less illustrative*. The tool allows them, optionally with a soft contextual note: "The affected group is very small at this population size — try a larger N for more detail."

The alternative — preventing these states by enforcing minimum $N_D$ (e.g., $\geq 3$) — was considered and rejected. It would constrain the base rate's lower bound relative to $N$ (at $N = 100$, minimum base rate would be $3\%$, preventing exploration of low-prevalence scenarios). More importantly, the observation that "1% base rate at $N = 100$ only gives 1 person" is itself pedagogically valuable — it demonstrates why the natural frequency literature uses larger $N$ for low-prevalence problems, and why the choice of $N$ matters.

**$N$-change behaviour — confirmed: snap with notification.**

When the user switches $N$ (e.g., from 1000 to 100), the base rate must adjust if the current rate isn't valid at the new step size. At $N = 1000$, base rate $= 0.3\%$ ($N_D = 3$). At $N = 100$, the step size is $1\%$, and $0.3\%$ isn't a valid step — $N_D$ would be $0.3$. The base rate snaps to the nearest valid value (here, $1\%$, giving $N_D = 1$).

Going from lower to higher $N$ is generally clean: the finer step grid at higher $N$ contains all positions that were valid at lower $N$ (e.g., every $1\%$-step value at $N = 100$ is also a valid $0.1\%$-step value at $N = 1000$).

Going from higher to lower $N$ can force adjustment: the coarser step grid may not contain the current rate. The snap is made visible: the parameter panel briefly indicates that the base rate was adjusted ("Base rate adjusted from 0.3% to 1% at this population size"). This visibility serves a pedagogical purpose: the fact that lower $N$ forces coarser rates IS the pedagogical point of $N$-relative stepping — the resolution of the frequency representation constrains what distinctions you can make.

Sensitivity and FPR are not affected by $N$ changes at the input level (they have fixed $1\%$ steps regardless of $N$). The *counts* they produce change because $N_D$ and $N_{\neg D}$ change, but the slider positions stay where the user put them.

---

#### Rounding & Constraint Logic — confirmed: cascading round-and-derive

**The constraints that must hold:**

The data package requires integer partition counts that are genuinely natural frequencies — whole numbers that sum correctly across the partition hierarchy:

1. $N_D + N_{\neg D} = N$ (first-level partition sums to total)
2. $N_{TP} + N_{FN} = N_D$ (condition-positive sub-partition sums to its parent)
3. $N_{FP} + N_{TN} = N_{\neg D}$ (condition-negative sub-partition sums to its parent)
4. $N_{TP} + N_{FP} = N_{T^+}$ (regrouped test-positive is sum of its components)
5. $N_{FN} + N_{TN} = N_{T^-}$ (regrouped test-negative is sum of its components)
6. $N_{T^+} + N_{T^-} = N$ (regrouped partition sums to total)
7. All counts $\geq 0$
8. All counts are integers

Constraints 4–6 are derived from 1–3 (they follow automatically if 1–3 hold and all values are correctly computed). So the core problem reduces to: produce integer values for $N_D$, $N_{TP}$, $N_{FN}$, $N_{FP}$, $N_{TN}$ satisfying constraints 1–3, 7, and 8.

Further reduction: if $N_D$ is fixed, $N_{\neg D} = N - N_D$ (constraint 1 by construction). If $N_{TP}$ is fixed, $N_{FN} = N_D - N_{TP}$ (constraint 2 by construction). If $N_{FP}$ is fixed, $N_{TN} = N_{\neg D} - N_{FP}$ (constraint 3 by construction). The rounding problem reduces to **three independent rounding decisions**: $N_D$, $N_{TP}$, and $N_{FP}$.

**Resolution point analysis — where to resolve the continuous-to-discrete tension:**

Three candidate approaches were evaluated:

**(i) Constrain the input** so only integer-producing combinations are selectable. The slider for sensitivity would snap to values where $N_D \times \text{sensitivity}$ is an integer. At $N_D = 10$, that's $10\%, 20\%, 30\%, \ldots, 100\%$. At $N_D = 1$, that's $0\%$ or $100\%$ — only two options, barely a slider at all.

Rejected for three reasons: (a) At the second partition level, the valid step sizes depend on $N_D$, which depends on the base rate — changing the base rate would change the available sensitivity values, potentially snapping the sensitivity slider to a new position the user didn't choose. This interdependency makes exploration feel unstable. (b) At small $N_D$ the available values become extremely coarse, degrading the exploration experience at exactly the parameter ranges that are most pedagogically interesting (low base rates). (c) This is a UI that misleadingly promises precision (a slider) but delivers extreme quantisation (a handful of steps).

However, approach (i) IS appropriate at the first level: the base rate uses $N$-relative steps because $N$ is a fixed preset, making the step size stable. The conditions that make (i) problematic at the second level (dependency on a variable parent count) don't apply at the first level (dependency on a fixed preset).

**(ii) Accept any input, round the output.** The slider is fine-grained. The computation rounds. The displayed count is always an integer. The input rate and the effective rate may differ slightly.

Chosen for the second level (sensitivity and FPR). The user has full freedom to explore. The system always produces valid integer counts. The rounding is usually minor (off by at most 1 at any level).

**(iii) Accept any input, snap the displayed rate to the effective rate.** The slider is smooth, but the *displayed* rate reflects the rounded count rather than the raw input. The user moves the slider to "85%", the system computes $N_{TP} = \text{round}(10 \times 0.85) = 9$, and the displayed rate updates to "90% (9 out of 10)."

Partially adopted for the visualisation layer (see Display Conventions below), but the parameter panel shows the input rate alongside the resulting count, not the effective rate. See the reasoning under Display Conventions for why.

**The hybrid design: constrained first level, rounded second level — confirmed.**

- **First level (base rate → $N_D$):** $N$-relative steps guarantee integer $N_D$. No rounding needed. The slider position, the displayed rate, and the resulting count are always exactly consistent.

- **Second level (sensitivity → $N_{TP}$, FPR → $N_{FP}$):** Fine $1\%$ steps with rounding. The computation: $N_{TP} = \text{round}(N_D \times \text{sensitivity})$, $N_{FN} = N_D - N_{TP}$. Similarly: $N_{FP} = \text{round}(N_{\neg D} \times \text{FPR})$, $N_{TN} = N_{\neg D} - N_{FP}$. All partition constraints satisfied by construction.

This means only the second-level partition involves rounding. Since $N_D$ is exact, the tree's first branch is always clean — the displayed base rate and the node count correspond exactly. The rounding only affects the leaf-level counts, and the discrepancy is at most 1 person per group.

**Rounding function: standard rounding — confirmed.**

$\text{round}(x) = \lfloor x + 0.5 \rfloor$. The 0.5 case (exact midpoint) is rare — it requires the multiplication to produce exactly a half-integer. Standard rounding (round half up) is simple and predictable. Banker's rounding (round half to even) was considered — it is technically better for statistical applications to avoid systematic bias, but adds complexity for no practical benefit here. The counts are for pedagogical display, not statistical analysis, and the user will never notice the difference.

**The rounding is not a deficiency — it is inherent to the natural frequency framework.**

Natural frequencies ARE the integer counts. "9 out of 10 people with the disease test positive" is a complete and valid natural frequency statement regardless of whether the input sensitivity was $85\%$ or $90\%$. The count is the fact; the rate is a summary of the fact. The slight discrepancy between an input rate and the realised count is the natural consequence of working with discrete populations. A tool that claims to use natural frequencies and then displays non-integer counts ($8.5$ people) is the one that's misrepresenting the framework.

**The "sticky slider" phenomenon — acknowledged, not prevented.**

When $N_D$ is small (e.g., $N_D = 10$) and the sensitivity slider has $1\%$ steps, many consecutive slider positions produce the same integer count. Moving the slider from $81\%$ to $84\%$ changes $N_D \times \text{sensitivity}$ from $8.1$ to $8.4$, all rounding to $N_{TP} = 8$. The slider moves but nothing changes in the array or tree until the next integer threshold ($85\%$, where $8.5$ rounds to $9$).

This is not a bug — it is inherent to applying a fine-grained rate to a small group. Three responses were considered:

(a) *Accept it.* The display updates the rate but the count and visualisation don't change until the next threshold. The user discovers that at small $N_D$, fine rate distinctions don't produce different natural frequencies. This is pedagogically accurate.

(b) *Use $N_D$-relative steps for sensitivity.* Eliminates stickiness but creates the interdependency problem (changing base rate changes sensitivity step size, potentially moving the sensitivity value). Rejected for the same reasons as approach (i) above.

(c) *Emphasise counts over rates in the display.* If the primary display is "9 out of 10 detected" rather than "Sensitivity: 85%", the user's attention is on the count, and the count changing by 1 feels meaningful.

Decision: **(a)**, reinforced by **(c)**'s display emphasis. The stickiness is the natural frequency framework working as intended — at small group sizes, the representation is inherently coarse. Trying to hide this misrepresents the framework. The UX concern — that "nothing happens" stretches might feel like latency rather than pedagogy — is a Part 3 concern (subtle visual indication near thresholds, count emphasis in the parameter display) rather than a Part 2 specification issue.

**Zero-from-rounding — allowed with soft contextual note.**

At very small $N_D$ with moderate rates, rounding can produce zero counts from non-zero rates. Example: $N_D = 3$, sensitivity $= 15\%$ → $3 \times 0.15 = 0.45$, rounds to $0$. The user set non-zero sensitivity but $N_{TP} = 0$. This is a specific instance where rounding produces a *qualitative* change — non-zero rate maps to zero count.

This falls under the same "allow it, handle gracefully" principle as other degenerate cases. The display shows "Sensitivity: 15% — 0 out of 3 detected" and the user can see why: $15\%$ of 3 people rounds to nobody. A soft contextual note may accompany this: "At this population size, the sensitivity doesn't produce any detected cases. Try a larger population for more detail." This acknowledges the state without preventing it, and directs the user toward the solution (increasing $N$).

**Posterior is computed from the rounded counts — confirmed as principled decision.**

The posterior displayed by the tool is $N_{TP} / (N_{TP} + N_{FP})$, computed from the integer counts, NOT from Bayes' theorem applied to the raw slider rates. This is stated as an explicit design commitment, not a simplification.

At typical parameter ranges the difference is negligible. At small $N_D$ it can be noticeable — the "textbook" posterior from the raw rates and the "natural frequency" posterior from the rounded counts may differ by a percentage point or more.

The natural frequency framework says this is correct. The counts are the primary representation. The posterior from the counts IS the answer to "of these people who tested positive, how many have the disease?" The slight discrepancy with the theoretical Bayes' theorem result is the cost of working with finite discrete populations, and understanding that cost is part of understanding natural frequencies.

This connects to format-switching: in probability mode, the displayed posterior is still computed from the integer counts (then expressed as a decimal). It is not recomputed from the raw rates via Bayes' theorem. Both display modes show the same underlying answer, just formatted differently. Consistency between modes requires a single source of truth, and that source is the counts.

[Report — Technical Quality / Background] **The rounding design as a principled engagement with the natural frequency framework, not a workaround.** The rounding decisions are not compromises necessitated by implementation constraints — they are direct applications of the natural frequency theoretical framework. Natural frequencies are integer counts preserving base-rate information through natural sampling. The rounding *produces* natural frequencies from continuous rate inputs. The posterior computed from these counts *is* the natural frequency answer. The slight discrepancy with the textbook Bayes' theorem result computed from the raw rates is the inherent discretisation cost of working with finite populations — the same cost that exists in every published natural frequency study ("Of 1000 women, 10 have breast cancer..."). Articulating this in the report demonstrates that the implementation decisions are grounded in the theoretical framework, not just in programming convenience. This reads well under Technical Quality ("demonstrates a thorough understanding of the technical details") and under Background (understanding of what natural frequencies are and why they work).

[Report — Technical Quality] **The hybrid first-level/second-level constraint design as evidence of dependency-aware architecture.** The asymmetric treatment of the first-level partition (exact, $N$-relative steps) and the second-level partition (fine-grained, rounded) was not arbitrary but follows from analysing the parameter dependency chain. The first level depends on $N$ (a stable preset), so input constraints are stable. The second level depends on $N_D$ (a variable derived from user input), so input constraints would be unstable — creating an interdependency where changing one parameter silently moves another. This analysis of where in the dependency chain constraints are stable vs. unstable, and the decision to constrain only at the stable point, demonstrates architectural reasoning at a level beyond "we added sliders." The rejected alternative ($N_D$-relative sensitivity steps) had a specific, named problem (interdependency) that the chosen approach avoids. The pattern — "evaluated, specific problem identified, alternative chosen" — continues the project's established design methodology.

[Report — Technical Quality / Complexity] **The sticky slider phenomenon as a property of the natural frequency framework, not a UI deficiency.** At small $N_D$, many slider positions produce the same integer count because the natural frequency representation is inherently coarse at small denominators. Recognising this as a property of the theoretical framework rather than a bug — and choosing to make it visible rather than hide it — demonstrates understanding of the relationship between the framework's mathematical properties and the user's experience. The alternative (hiding stickiness through $N_D$-relative steps) was rejected because it misrepresents the framework and introduces worse problems (interdependency). This is a small point but contributes to the overall narrative of a tool whose implementation decisions are driven by theoretical understanding.

---

#### Display Conventions — confirmed

**Parameter panel display: input rate + resulting count (Y2) — confirmed.**

The parameter panel shows both what the user set and what the system produced:

- Base rate: "Base rate (prior): 1% — 10 out of 1,000 have the disease"
- Sensitivity: "Sensitivity (likelihood): 85% — 9 out of 10 detected"
- FPR: "FPR: 9% — 89 out of 990 false positives (Specificity: 91%)"
- Total test-positive rate (marginal likelihood): 9.8% — 98 out of 1,000 test positive
- Posterior: 9.2% — 9 out of 98

The format is: structural term (Bayesian term): input rate — count description. The Bayesian term appears parenthetically for terms that have one (see Terminology Model). The count description uses domain vocabulary ("detected," "false positives," "test positive") that changes per scenario.

Four display options were evaluated:

*Option Y1 — input rate only:* "Sensitivity: 85%." The icon array shows 9 out of 10, which doesn't match 85% of 10. The mismatch is invisible in the parameter panel and confusing in the visualisation.

*Option Y2 — input rate and count:* "Sensitivity: 85% — 9 out of 10 detected." The mismatch is visible — the user can see that 85% of 10 gave 9. Both pieces of information (what they set, what resulted) are present.

*Option Y3 — effective rate and count:* "Sensitivity: 90% — 9 out of 10 detected." The slider says 85% but the panel says 90%. Accurate but potentially confusing.

*Option Y4 — both rates:* "Sensitivity: 85% → 9 out of 10 (effective: 90%)." Fully transparent but adds visual complexity.

**Y2 chosen** because: in the natural frequency framework, the count IS the primary representation. "9 out of 10 detected" is the natural frequency. The 85% on the slider is the user's input. The two are shown together. Any mismatch is self-evident if the user does the arithmetic — which is part of the pedagogical experience. Explicitly calculating and displaying the effective rate (Y3 or Y4) adds clutter for a distinction most users won't need. At large $N_D$ the mismatch is negligible; at small $N_D$ the coarseness is itself pedagogically relevant.

**Visualisation layer: effective rates, not input rates — confirmed.**

The tree branch labels and any rate annotations on the visualisations show the **effective rate** (derived from the integer counts) rather than the input rate. This is a different choice from the parameter panel, for a specific reason:

The initial proposal was to show input rates on tree branches ("Sensitivity: 85%") alongside integer counts in nodes ("9"). This creates a visible mismatch within the tree: the branch says 85% but $9/10 = 90\%$. This was initially considered acceptable as transparency about the discretisation.

However, the critical problem is **cross-format consistency**. The icon array is a pure natural-frequency picture — it shows 9 TP icons out of 10 condition-positive icons with compound labels showing counts. No rates appear on the icon array. The icon array lives entirely in the world of counts, implying 90%.

If the tree shows "85%" on the branch while the icon array implies "90%", the two formats are representing the same problem with a subtle difference in what story they tell about the rate-count relationship. When the user switches between formats — which is the whole point of the format architecture — this inconsistency could confuse rather than illuminate.

The resolution: **effective rates on visualisations**, keeping both formats in the natural frequency world. Tree branches show "Sensitivity: 90%" alongside node "9". Both formats agree. The parameter panel bridges the gap between the user's input (85%) and the natural frequency reality (90%, which is $9/10$).

The mismatch between input and effective now lives in one place — the parameter panel, which explicitly bridges the user's input and the resulting frequencies — rather than being split across formats. The three-layer persistent visibility model is doing its job: the parameter layer shows the problem specification (including the input-to-effective bridge); the visualisation layer shows the natural frequency result.

This extends to probability mode: branch labels show $P(T^+ | D) = 0.90$ (the effective rate derived from the counts), not $P(T^+ | D) = 0.85$ (the input rate). The parameters of the problem (what the user set) live in the parameter panel. The results (what the natural frequency representation produces) live in the visualisations. Input rates drive the computation; effective rates describe the result.

[Report — Technical Quality] **Cross-format consistency driving the input-vs-effective rate decision.** The decision to show effective rates on visualisations was driven not by a general preference but by a specific problem: if the tree shows the input rate while the icon array shows counts implying the effective rate, the two formats tell subtly different stories about the same problem. The multiple-representations principle says both formats represent the same problem — divergent rate information undermines the correspondence. The resolution uses the three-layer persistent visibility model architecturally: the parameter layer bridges input and output, the visualisation layer shows the natural-frequency result consistently across formats. This demonstrates that the display convention was resolved by reference to established design commitments (cross-format consistency, three-layer model) rather than by ad hoc choice.

---

#### Terminology Model — confirmed: three layers with progressive exposure

**The tension — restated with more precision.**

The natural frequency tradition (Gigerenzer, Hoffrage, Sedlmeier) argues that formal notation — $P(D | T^+)$, Bayes' theorem as a formula — is what makes Bayesian reasoning hard. Their claim is not that the *words* "prior" and "likelihood" are harmful. It is that reasoning with conditional probabilities as abstract mathematical objects is cognitively unnatural, while reasoning with natural frequencies is cognitively natural. The vocabulary issue is downstream of the representation issue.

A user who has learned to reason with frequencies — who can take "10 out of 1000 have the disease, 9 of those test positive, 89 of the healthy test positive" and derive "9 out of 98 positive tests are true" — has the *skill*. If they then learn that the 1% is called "the prior" and the 9.2% is called "the posterior," that is vocabulary acquisition layered on top of a competence they already have. Qualitatively different from presenting Bayes' theorem in formal notation and asking them to compute.

The tension is therefore not "natural frequencies vs. Bayesian terms" but "introduce Bayesian vocabulary *before* the user can reason with frequencies (harmful — the abstraction becomes the task)" vs. "introduce Bayesian vocabulary *after* the user can reason with frequencies (helpful — bridges to other contexts)." **The timing matters; the vocabulary itself is neutral.**

This reframing resolves the tension identified in Part 1's cross-part flags. The tool's natural frequency foundation is not threatened by Bayesian vocabulary, provided the vocabulary is introduced as a second language after fluency in the first (frequency-based reasoning), not as a replacement or simultaneous cognitive load. The progressive exposure model below implements this principle.

**Three vocabulary layers — confirmed, with updated mapping.**

| Position in Bayes' formula | Bayesian term | Structural term | Medical domain term | Role in tree | Role in icon array |
|---|---|---|---|---|---|
| $P(D)$ | Prior | Base rate | Prevalence | First branch rate | First partition proportion |
| $P(T^+ \| D)$ | Likelihood | Sensitivity | Sensitivity / detection rate | Second branch rate (condition-positive side) | Sub-partition proportion within affected group |
| $P(T^+ \| \neg D)$ | *(no single Bayesian name)* | FPR (false positive rate) | 1 − Specificity | Second branch rate (condition-negative side) | Sub-partition proportion within unaffected group |
| $P(T^+)$ | Marginal likelihood | Total test-positive rate | *(no standard single term)* | Cross-branch sum: $N_{TP} + N_{FP}$ | Regrouped test-positive cluster |
| $P(D \| T^+)$ | Posterior | *(result — not a parameter)* | *(result — not a parameter)* | Cross-branch combination result | Composition of regrouped cluster |

Changes from the Part 1 cross-part flags version:
- **"Evidence" replaced by "marginal likelihood"** as the Bayesian term for $P(T^+)$. "Evidence" is the more accessible Bayesian term but is misleading in a pedagogical context: it sounds like the test result itself (the observation) rather than the probability of the observation. "Marginal likelihood" is more precise — it names the mathematical operation (marginalising over the hypotheses) rather than giving it a metaphorical label. In a tool that makes mathematical operations transparent, a term that names the operation is more aligned. The bridging definition: "The **marginal likelihood** — the total probability of this test result, whether the person has the disease or not." The "whether... or not" phrasing directly reflects the marginalisation operation (summing over both possibilities), and contrasts structurally with the likelihood definition: the *likelihood* is the probability of this test result **given the disease**; the *marginal likelihood* is the probability of this test result **whether or not** the person has the disease. This parallel highlights that one is conditional and the other is unconditional — the structural distinction the user needs to understand. "Evidence" can be mentioned in the glossary as an alternative term used in some Bayesian treatments, particularly in machine learning and model selection contexts, without being the tool's primary Bayesian label for this quantity.
- **PPV dropped as a term the tool actively surfaces.** PPV is a medical domain term for the posterior. Unlike "prevalence" (which naturally appears in how medical problems are *described*), PPV doesn't appear in how problems are *posed*. Nobody says "what is the PPV?" in a problem statement; they say "of those who test positive, how many actually have the disease?" PPV is a label applied to the answer after the fact, not a term the user encounters while reasoning through the problem. "Posterior" covers the Bayesian bridging role; the domain-level description of the answer is already handled naturally by the question text and the cross-branch combination display. If a user later encounters "PPV" in a medical context, they can make the connection from conceptual understanding rather than from having memorised the abbreviation.
- **"Total test-positive rate" as the structural term for $P(T^+)$.** This is a descriptive label for the quantity that has no standard domain-level name. "Total *test*-positive rate" (rather than "total positive rate") avoids confusion with the number of people who *actually have the condition*. The "test-" prefix clarifies that this is about test results, not true condition status. The tool giving this quantity a name is itself a small pedagogical intervention — naming makes it cognitively available, which reinforces what the regrouping animation and cross-branch combination step do visually. The Part 1 cross-part flags observation that this quantity's namelessness connects to denominator neglect is preserved and strengthened by this design choice.
- **FPR has no single Bayesian name.** $P(T^+ | \neg D)$ is a component of the marginal likelihood calculation but is not independently named in the Bayesian framework. The parameter panel shows "FPR: 9%" without a Bayesian parenthetical. This asymmetry is honest — not every quantity in the computation has a Bayesian name, and inventing one would be misleading.

**Where each vocabulary layer appears — confirmed locations.**

*Domain labels:* The question text, problem statement text, icon array compound labels (primary position — "Have disease: 10"), tree node group names ("Have disease: 10"), and the count descriptions in the parameter panel ("10 out of 1,000 have the disease"). Domain labels change per scenario. In a spam scenario: "Is spam: 20" replaces "Have disease: 10." Domain terms provide concrete, contextual vocabulary that makes the scenario grounded and relatable.

*Structural labels:* The icon array compound labels (secondary position — the "TP: 9, FN: 1" part of the compound label), the tree branch labels ("Sensitivity: 90%", "FPR: 9%", "Base rate: 1%"), the parameter panel's primary parameter names ("Base rate:", "Sensitivity:", "FPR:"), and the "Total test-positive rate:" label on the derived result. Structural labels are constant across all scenarios. They are the tool's consistent analytical vocabulary, building transferable understanding.

The tree currently shows structural terms on branches ("Sensitivity: 90%") and domain terms on node group names ("Have disease: 10"). This is the strand (b) design — branches describe the *operation* (which rate drives this split), nodes describe the *group* (what this population is called in the scenario). The two label types serve different roles in the same format.

In non-medical scenarios, "Sensitivity" works as a structural term on the branch even if the domain doesn't use that word naturally (a spam filter's "detection rate" maps to sensitivity). The structural label provides consistency; the domain label in the problem text and on the node group names provides contextual grounding.

*Bayesian labels:* Parenthetical in the parameter panel / results area, notation in probability mode, and optionally in the glossary and guided mode vocabulary stage.

**Progressive exposure model — confirmed.**

Bayesian terms are introduced through a progression of contexts, each adding depth without requiring the others:

**Layer 1 — Passive exposure in exploration mode.** Parameter panel labels include Bayesian terms parenthetically:
- "Base rate (prior): 1% — 10 out of 1,000 have the disease"
- "Sensitivity (likelihood): 90% — 9 out of 10 detected"
- "FPR: 9% — 89 out of 990 false positives"
- "Total test-positive rate (marginal likelihood): 9.8% — 98 out of 1,000 test positive"
- "Posterior: 9.2% — 9 out of 98"

The parenthetical terms are present, visible, consistently placed, but not the focus of attention. The user is manipulating parameters and seeing results — they've already engaged with each quantity as a concrete concept. The Bayesian term at that point is bridging, not abstracting.

FPR does not get a Bayesian parenthetical because $P(T^+ | \neg D)$ has no single Bayesian name. This asymmetry is honest.

**Layer 2 — Active contrast in probability mode (via format-switching).** When the user toggles to probability mode, the notation IS the Bayesian vocabulary: tree branches show $P(D) = 0.01$, $P(T^+ | D) = 0.90$, $P(T^+ | \neg D) = 0.09$. The posterior shows $P(D | T^+) \approx 0.092$. The format-switching contrast — going from "10 out of 1000" to "$P(D) = 0.01$" — is where the user experiences the connection between the frequency representation they understand and the formal notation. No additional bridging needed in probability mode; the mode itself IS the bridge.

**Layer 3a — Glossary component (could-cut, strengthens significantly if guided mode isn't built).** A collapsible panel or modal accessible from the parameter area, showing the vocabulary mapping for the current scenario. Scenario-adaptive: the domain column changes per scenario; structural and Bayesian columns are constant. Contains the bridging definitions:
- "The **prior** (base rate) — your belief about how common the condition is before seeing any test result."
- "The **likelihood** (sensitivity) — the probability of this test result *given* the disease. Not the probability of the disease given the test result." (This clarification IS the inverse fallacy lesson, delivered through vocabulary.)
- "The **marginal likelihood** (total test-positive rate) — the total probability of this test result, whether the person has the disease or not."
- "The **posterior** — your updated belief after seeing the test result."

The glossary uses the same data the template system already generates — domain labels, structural labels, and the `bayesian_term` field. Implementation cost is low given the data infrastructure supports it. Persistent in the sense that it's always accessible (not gated behind interaction), but not always visible (doesn't consume screen space when the user is focused on the visualisation). This respects the persistent visibility principle for the *core* reasoning information while keeping reference material accessible without clutter.

If guided mode exists, the glossary is supplementary — the vocabulary stage within guided mode is richer and more pedagogically integrated. If guided mode doesn't exist, the glossary is the only place bridging text lives, and it becomes substantially more important. Hence the placement: could-cut that strengthens with the absence of guided mode.

**Layer 3b — Guided mode vocabulary stage (if guided mode is built; Part 4 concern).** The richest treatment. After the user has facility with frequency-based reasoning, a reflective stage explicitly maps the vocabularies. This is option (d) from the original Part 1 cross-part flags. The pedagogical timing is critical: Bayesian terms are introduced *after* conceptual understanding, as a second language, not before. The natural frequency tradition's objection is to premature formalism, not to eventual vocabulary building. Part 4's responsibility is the pedagogical design of when and how this stage occurs within the guided mode sequence.

**The three layers as redundant encoding applied to terminology.**

The three vocabulary layers are a form of redundant encoding applied to terminology rather than to visual/textual channels. The same quantity is named at multiple levels (domain, structural, Bayesian) so that the user can access it through whichever vocabulary they're most comfortable with, and gradually builds connections between vocabularies through repeated co-occurrence. A user who knows "prevalence" from medical contexts sees it alongside "base rate" and "(prior)" — three handles on the same concept, each reinforcing the others.

This extends the redundant encoding principle (established for visual + textual channels in the icon array design) into the vocabulary dimension. The principle is the same — present the same information through multiple channels so no user is left without access — but applied to terminology rather than modality. It demonstrates that the redundant encoding principle is being applied consistently across design dimensions.

[Report — Technical Quality] **The progressive exposure model as pedagogically timed vocabulary introduction.** The decision to introduce Bayesian terms through progressive layers — passive exposure (parenthetical), active contrast (probability mode), explicit bridging (glossary/guided mode) — is grounded in the reframing of the natural frequency tension: the problem is not Bayesian vocabulary per se, but premature formalism. The tool introduces formal vocabulary *after* the user has developed frequency-based competence, as a bridge to other contexts. Each layer adds depth without requiring the others, providing graceful degradation: if only exploration mode exists, passive exposure still provides vocabulary bridging. This demonstrates pedagogical design thinking about timing and sequencing, not just content.

[Report — Technical Quality] **"Likelihood" with care — the bridging text as inverse fallacy lesson.** The glossary definition of "likelihood" includes the clarification "the probability of this test result *given* the disease, not the probability of the disease given the test result." This is not just a vocabulary note — it IS the inverse fallacy lesson delivered through terminology. The user learns both a Bayesian term and the most common error in Bayesian reasoning in the same sentence. This dual function — vocabulary bridging and error prevention — is an example of design efficiency where a single element serves multiple pedagogical goals.

[Report — Technical Quality / Complexity] **The three vocabulary layers as extension of redundant encoding.** The tool applies redundant encoding at the visual level (icon array + numerical labels), at the format level (icon array + frequency tree showing the same problem), and now at the vocabulary level (domain + structural + Bayesian terms for the same quantity). The consistency of this design principle across multiple dimensions — visual, representational, terminological — demonstrates a coherent design philosophy rather than isolated feature decisions. The Complexity criterion rewards "combines ideas from several areas"; applying a visualisation design principle (redundant encoding) to a terminology design concern shows cross-disciplinary integration.

[Report — Background] **The "marginal likelihood" / $P(T^+)$ naming gap as a connection to denominator neglect — updated.** The observation from Part 1's cross-part flags is preserved and strengthened: the quantity most commonly neglected in Bayesian reasoning ($P(T^+)$, the denominator) is the one quantity that lacks a common domain-level name. The tool's structural label ("total test-positive rate") and Bayesian label ("marginal likelihood") both name this quantity explicitly. The tool's decision to give it a descriptive name — rather than leaving it unnamed as domain convention does — is itself a small pedagogical intervention targeting denominator neglect. What is named is harder to overlook than what isn't. The "test-" prefix in the structural term further disambiguates it from "total people who actually have the condition," preventing a reference-class confusion that could compound the very error the naming is designed to address.

[Report — Background] **The marginal likelihood bridging definition as structural parallel to the likelihood definition.** The definitions "the probability of this test result **given the disease**" (likelihood) vs. "the probability of this test result **whether or not** the person has the disease" (marginal likelihood) create a structural parallel that highlights the conditional/unconditional distinction. This is not just a vocabulary aid — it encodes the mathematical relationship: the marginal likelihood is the likelihood marginalised over the condition. The parallel phrasing makes this relationship accessible without formal notation. Worth noting in the report as an example of how vocabulary design serves mathematical understanding.

[Report — Background / Technical Quality] **"Evidence" considered and rejected as the Bayesian term for $P(T^+)$.** "Evidence" is the more commonly encountered term in some Bayesian treatments (particularly in machine learning and Bayesian model selection). It was rejected for the tool's primary Bayesian label because it is genuinely misleading in a pedagogical context: "evidence" sounds like the test result itself (the observation event — "the person tested positive") rather than the total probability of that observation across the population. The distinction between "the test came back positive" (an event) and "the probability of a positive test across the whole population" (a rate) is subtle and exactly the kind of conflation that trips up learners. In a tool that makes the distinction between events and rates central to its pedagogy, using a term that blurs this distinction would be counterproductive. "Marginal likelihood" was chosen because it names the mathematical operation (marginalising over the hypotheses) rather than giving the quantity a metaphorical label. In a tool built around making mathematical operations transparent, naming the operation is more aligned than naming a concept. "Evidence" can be mentioned in the glossary as an alternative term for awareness.

---

#### Computation Function — confirmed

The computation pipeline from raw parameters to Region A of the data package is straightforward given the rounding decisions above. It is a pure function: parameters in, data package Region A out.

**Inputs:** $N$ (integer, from presets), base rate (decimal, from $N$-relative steps — guaranteed to produce integer $N_D$), sensitivity (decimal, from $1\%$ steps), FPR (decimal, from $1\%$ steps).

**Pipeline:**

Step 1 — First-level partition (exact, no rounding):
- $N_D = N \times \text{base rate}$ (guaranteed integer by $N$-relative base rate steps)
- $N_{\neg D} = N - N_D$

Step 2 — Second-level partition (rounded):
- $N_{TP} = \text{round}(N_D \times \text{sensitivity})$
- $N_{FN} = N_D - N_{TP}$
- $N_{FP} = \text{round}(N_{\neg D} \times \text{FPR})$
- $N_{TN} = N_{\neg D} - N_{FP}$

Step 3 — Regrouped counts (derived, no rounding):
- $N_{T^+} = N_{TP} + N_{FP}$
- $N_{T^-} = N_{FN} + N_{TN}$

Step 4 — Posterior (derived):
- If $N_{T^+} > 0$: posterior $= N_{TP} / N_{T^+}$ (as decimal ratio)
- If $N_{T^+} = 0$: posterior is undefined (flagged in the data package)

Step 5 — Effective rates (derived from integer counts):
- Effective sensitivity $= N_{TP} / N_D$ (or undefined if $N_D = 0$, which the base rate range prevents)
- Effective FPR $= N_{FP} / N_{\neg D}$ (or undefined if $N_{\neg D} = 0$, which the base rate range prevents)
- Total test-positive rate $= N_{T^+} / N$
- Specificity (derived) $= 1 - \text{effective FPR} = N_{TN} / N_{\neg D}$

Step 6 — Joint probabilities (for probability-mode tree leaf nodes):
- $P(D \cap T^+) = N_{TP} / N$
- $P(D \cap T^-) = N_{FN} / N$
- $P(\neg D \cap T^+) = N_{FP} / N$
- $P(\neg D \cap T^-) = N_{TN} / N$

These are count-derived, consistent with the "counts as source of truth" principle. They are the values shown in the tree's leaf nodes in probability mode, and they make the probability-tree version of the posterior computation explicit: $P(D | T^+) = P(D \cap T^+) / P(T^+) = P(D \cap T^+) / (P(D \cap T^+) + P(\neg D \cap T^+))$.

Step 7 — Raw input rates preserved:
- The input base rate, sensitivity, and FPR are stored alongside the derived quantities so the parameter panel can show the Y2 display (input rate + resulting count).

**Region A contents (complete):**

Mode-independent numerical data: $N$, $N_D$, $N_{\neg D}$, $N_{TP}$, $N_{FN}$, $N_{FP}$, $N_{TN}$, $N_{T^+}$, $N_{T^-}$, posterior (decimal or undefined flag), input base rate, input sensitivity, input FPR, effective sensitivity, effective FPR, effective specificity, total test-positive rate, and the four joint probabilities ($P(D \cap T^+)$, $P(D \cap T^-)$, $P(\neg D \cap T^+)$, $P(\neg D \cap T^-)$).

All intermediate totals and derived quantities included explicitly (no computation required in the rendering components). The data package is a complete description of the numerical state.

**Reference scenario for development — mammography.**

The mammography screening problem serves as the development fixture: $N = 1000$, base rate $= 1\%$, sensitivity $= 90\%$, FPR $= 9\%$. At these parameters, with the rounding pipeline:

- $N_D = 10$, $N_{\neg D} = 990$ (exact)
- $N_{TP} = \text{round}(10 \times 0.90) = 9$, $N_{FN} = 1$
- $N_{FP} = \text{round}(990 \times 0.09) = \text{round}(89.1) = 89$, $N_{TN} = 901$
- $N_{T^+} = 98$, $N_{T^-} = 902$
- Posterior $= 9/98 \approx 0.0918$
- Effective sensitivity $= 9/10 = 90\%$ (matches input)
- Effective FPR $= 89/990 \approx 8.99\%$ (differs from input 9% by $\approx 0.01\%$)

This reference scenario provides a concrete test case for the entire pipeline and produces a slight FPR rounding discrepancy — which is useful for verifying that the display conventions handle the input-vs-effective distinction correctly.

---

#### Scenario Data Structure — confirmed

The scenario data structure is the schema that Part 5 populates. It defines what fields a scenario has and how they feed into the computation and template system.

**Schema:**

A scenario contains:

*Numerical parameters:*
- `base_rate` (decimal) — the prevalence / prior probability
- `sensitivity` (decimal) — the true positive rate / likelihood
- `fpr` (decimal) — the false positive rate. Alternatively, a scenario may specify `specificity` (decimal), from which FPR is derived as $1 - \text{specificity}$. The schema accepts either; the computation always uses FPR internally. This accommodates medical scenarios where tests are conventionally described using sensitivity/specificity pairs.
- `n` (integer) — the author-chosen population size for this scenario's icon array. This is a deliberate design choice per scenario, not a default (see Plan & Status, Phase 3 strand a, hybrid $N$ approach).

*Domain vocabulary (plural-subject forms — used in the frequency problem statement, compound labels, and all template positions with plural subjects):*
- `population_name` (string) — e.g., "people," "emails," "items"
- `condition_name` (string) — e.g., "have the disease," "are spam," "are defective"
- `condition_negative_name` (string) — e.g., "do not have the disease," "are not spam," "are not defective"
- `test_name` (string) — e.g., "the screening test," "the spam filter," "the inspection"
- `test_positive_name` (string) — e.g., "test positive," "are flagged," "are rejected"
- `test_negative_name` (string) — e.g., "test negative," "reach the inbox," "pass inspection"
- `sensitivity_domain_name` (string, optional) — e.g., "Detection rate" for non-medical scenarios where "Sensitivity" isn't natural. Defaults to "Sensitivity" if not provided.
- `fpr_domain_name` (string, optional) — e.g., "False rejection rate." Defaults to "False positive rate" if not provided.

*Domain vocabulary (singular-subject and grammatical forms — used in templates where the subject is singular, e.g., the probability-mode question):*
- `population_singular` (string) — e.g., "a person," "an email," "an item," "an employee." Used in the probability-mode question template ("What is the probability that [population_singular]...").
- `condition_name_singular` (string) — e.g., "has the disease," "is spam," "is defective," "uses drugs." Singular conjugation of `condition_name`, required because the probability-mode question uses a singular subject.
- `test_positive_name_singular` (string) — e.g., "tests positive," "is flagged," "is rejected." Singular conjugation of `test_positive_name`.
- `relative_pronoun` (string) — "who" for human populations, "that" for non-human. Used in both frequency and probability question templates and the frequency problem statement.
- `test_action` (string) — the verb phrase for the opening sentence of the frequency problem statement. E.g., "are tested," "are screened," "arrive," "are inspected." Replaces the previously hardcoded "are tested," which doesn't work for non-human populations or non-test processes (emails aren't "tested"; items are "inspected").
- `base_rate_domain_name` (string) — the domain-natural term for the base rate in probability-mode problem text. E.g., "prevalence of the disease," "spam rate," "defect rate," "drug use rate." Replaces the previously hardcoded "prevalence of [condition]," which is unnatural for non-medical domains. The full probability-mode sentence becomes "The [base_rate_domain_name] is [rate]%."

*Metadata:*
- `id` (string) — unique scenario identifier
- `name` (string) — display name, e.g., "Mammography Screening"
- `domain` (string) — category identifier, e.g., "medical," "technology," "manufacturing," "workplace"
- `description` (string, optional) — brief description for scenario selection UI

**Why six additional fields rather than deriving singular forms programmatically.** The singular forms (`condition_name_singular`, `test_positive_name_singular`) could theoretically be derived from the plural forms by conjugation rules ("have" → "has," "are" → "is," "test" → "tests"). For a curated library of six scenarios, this derivation is tractable. However, providing explicit singular forms is more robust — it avoids edge cases in English conjugation, makes the scenario definition fully self-contained (no hidden transformation logic), and costs nothing given the small library size. The `relative_pronoun`, `test_action`, and `base_rate_domain_name` fields have no mechanical relationship to the plural vocabulary and must be specified explicitly regardless. The overall principle: for a curated library, explicitness over cleverness.

The domain vocabulary fields slot into the parameterised text template (strand b, principle 5). The sentence structure stays the same across scenarios; only these bracketed terms change. The structural labels (TP, FP, FN, TN, Base rate, Sensitivity, FPR, Total test-positive rate, Posterior) and Bayesian labels (Prior, Likelihood, Marginal likelihood, Posterior) are constant — they are defined by the template system, not per scenario.

**Custom parameters in exploration mode** use the same computation pipeline. When the user adjusts parameters after loading a scenario, the scenario's domain vocabulary persists — "have the disease," "test positive," etc. remain in labels and problem text. The numbers change but the domain context stays. This means the user is exploring "what if the prevalence were higher?" within the medical screening frame, not suddenly in a generic context.

If no scenario is loaded (pure custom exploration without ever selecting a scenario), the domain vocabulary uses generic fallback terms — "have the condition," "test positive," "the test," "are tested," "who," "a person," "has the condition," "tests positive," "prevalence of the condition." These are the default domain terms that the template system uses when no scenario provides vocabulary.

---

#### Template System — confirmed: pure function from (Region A + scenario vocabulary) → Region B

The template system is the text-generation layer. It takes Region A (all integer counts and derived rates) plus the scenario's domain vocabulary and produces Region B: every piece of text any display component needs, in any state it could be in. It is a pure function — deterministic, no side effects, no state.

The eight wording principles from strand (b) govern all generated text. The template system is where these principles become concrete: explicit reference classes (principle 1) means every generated sentence names the group it refers to before stating the quantity; natural information sequencing (principle 2) means the problem statement presents population → condition → test → question; reference-class question phrasing (principle 3) means the question names the target group explicitly; and so on.

**Output 1 — Problem statement text: frequency and probability versions.**

The two versions follow structurally different rhetorical strategies because they serve different purposes. The frequency version builds the nested-set structure through sequenced natural language — it IS the pedagogical intervention. The probability version states rates directly in conventional form — it's the representation the user is learning to move away from. The contrast between them is the point of format-switching.

*Frequency version (parameterised template):*

> "Imagine [N] [population_name] [test_action]. Of these [N], [N_D] [condition_name]. Of the [N_D] [relative_pronoun] [condition_name], [N_TP] [test_positive_name]. Of the [N_¬D] [relative_pronoun] [condition_negative_name], [N_FP] [test_positive_name]."

Concrete mammography example:

> "Imagine 1,000 people are tested. Of these 1,000, 10 have the disease. Of the 10 who have the disease, 9 test positive. Of the 990 who do not have the disease, 89 test positive."

Spam filtering example:

> "Imagine 200 emails arrive. Of these 200, 50 are spam. Of the 50 that are spam, 45 are flagged. Of the 150 that are not spam, 15 are flagged."

Factory inspection example:

> "Imagine 400 items are inspected. Of these 400, 20 are defective. Of the 20 that are defective, 18 are rejected. Of the 380 that are not defective, 19 are rejected."

This template implements principles 1 (explicit reference classes — "Of the 10 who have the disease"), 2 (natural information sequencing — population → condition → test), 4 (natural frequencies in the problem text), and 5 (consistent sentence structure across scenarios). The bracketed terms change per scenario; the sentence structure stays the same. The `test_action` field (replacing the previously hardcoded "are tested") and `relative_pronoun` field (replacing the previously hardcoded "who") ensure the template reads naturally for both human and non-human populations.

The template needs enough flexibility to sound natural in each domain. "Of the 990 who do not have the disease, 89 test positive" must map to "Of the 80 that are not spam, 8 are flagged by the filter" without awkwardness. The domain vocabulary fields in the scenario data structure (`condition_name`, `condition_negative_name`, `test_positive_name`, etc.) are designed to slot into these positions. Part 5's scenario content work includes crafting domain vocabulary that reads naturally within the template.

*Probability version:*

> "The [base_rate_domain_name] is [base_rate as %]. The [test_name] has a [sensitivity_domain_name] of [input_sensitivity as %] and a [fpr_domain_name] of [input_FPR as %]."

Concrete mammography example:

> "The prevalence of the disease is 1%. The test has a sensitivity of 90% and a false positive rate of 9%."

Spam filtering example:

> "The spam rate is 25%. The spam filter has a detection rate of 90% and a false positive rate of 10%."

Factory inspection example:

> "The defect rate is 5%. The inspection has a detection rate of 90% and a false rejection rate of 5%."

This is deliberately more compact and conventional — it reads like a textbook problem statement. The `base_rate_domain_name` field (replacing the previously hardcoded "prevalence of [condition]") ensures natural domain-appropriate phrasing: medical scenarios use "prevalence," while non-medical scenarios use domain terms like "spam rate" or "defect rate." The `sensitivity_domain_name` and `fpr_domain_name` fields similarly adapt: medical scenarios use "sensitivity" and "false positive rate" (or specificity — see below), while non-medical scenarios can use "detection rate," "false rejection rate," etc. The rates are the input rates (what the user set), not the effective rates. In probability mode, the user sees the rates as the primary representation; the counts are absent. The contrast with the frequency version is stark: the frequency version gives you everything you need to solve the problem by counting; the probability version gives you rates that require Bayes' theorem to combine.

Note: in medical scenarios where the test is conventionally described using specificity rather than FPR, the probability version could read "...a sensitivity of 90% and a specificity of 91%" instead. This is a scenario-level choice: the scenario data structure's `specificity` field, if populated, signals that the probability-mode problem text should use specificity framing. The computation still uses FPR internally.

**Output 2 — Question text: frequency and probability versions.**

The question is separated from the problem statement because the three-layer persistent visibility model displays it independently (Layer 1).

*Frequency version:*

> "Of all those [relative_pronoun] [test_positive_name], how many actually [condition_name]?"

Mammography: "Of all those who test positive, how many actually have the disease?"
Spam: "Of all those that are flagged, how many actually are spam?"
Factory: "Of all those that are rejected, how many actually are defective?"

This implements principle 3 (reference-class question phrasing) — "of all those who/that test positive" explicitly names the reference class. The `relative_pronoun` field ensures grammatical correctness for both human ("who") and non-human ("that") populations.

*Probability version:*

> "What is the probability that [population_singular] [relative_pronoun] [test_positive_name_singular] [condition_name_singular]?"
>
> $P(D | T^+) = ?$

Mammography: "What is the probability that a person who tests positive has the disease?" with $P(D | T^+) = ?$ shown as secondary notation.
Spam: "What is the probability that an email that is flagged is spam?"
Factory: "What is the probability that an item that is rejected is defective?"
Blood donation: "What is the probability that a blood donation that is flagged carries the virus?"

The probability version uses the singular vocabulary fields (`population_singular`, `condition_name_singular`, `test_positive_name_singular`) because the question refers to a single entity ("a person," "an email"), requiring singular verb conjugation. The plural forms used elsewhere in the template system ("have the disease," "are flagged") would produce ungrammatical output with a singular subject ("a person who are flagged have the disease"). The singular fields are specified explicitly per scenario rather than derived programmatically — for a curated library of six scenarios, explicit specification is more robust than conjugation logic.

The probability version preserves the natural-language reference-class phrasing as the primary question text, with formal notation appended as secondary. This was a considered design choice against two alternatives:

*Alternative (i) — symbolic notation only:* "$P(D | T^+) = ?$" This would make the format-switching contrast maximally stark, but the notation requires the user to know what $D$ and $T^+$ refer to. In a tool teaching this material, that's not a safe assumption. More critically, the symbolic notation encodes the reference class in the conditioning bar — "$\mid T^+$" means "given a positive test" — which is *exactly where the inverse fallacy occurs*. Users confuse $P(D | T^+)$ with $P(T^+ | D)$. A question phrased purely as "$P(D | T^+) = ?$" provides no natural-language anchor to prevent this confusion. The frequency version's "of all those who test positive" makes the reference class unavoidably explicit; the symbolic version hides it in notation.

*Alternative (ii) — natural language only, no notation:* "What is the probability that a person who tests positive has the disease?" This is accessible but loses the connection to formal Bayesian vocabulary. The whole point of probability mode is bridging to the formal representation.

The **hybrid chosen** — natural language primary, notation secondary — gets both benefits. The reference-class phrasing prevents the inverse fallacy in both modes. The notation provides the formal vocabulary bridge. The user sees that "$P(D | T^+)$" MEANS "the probability that a person who tests positive has the disease" — the natural language and the notation are right next to each other, making the mapping explicit.

[Report — Technical Quality] **Reference-class phrasing preserved across both display modes as a deliberate design choice.** The question text in both frequency and probability modes uses natural-language reference-class phrasing ("of all those who test positive" / "a person who tests positive"). This was not a default — purely symbolic notation ($P(D | T^+) = ?$) was evaluated and rejected because it encodes the reference class in the conditioning notation, which is exactly where the inverse fallacy occurs. The decision to maintain reference-class clarity even in probability mode demonstrates that the pedagogical design (preventing the inverse fallacy through explicit reference classes) takes precedence over the display mode's "purity" (probability mode could be more formally symbolic). This is a specific instance of the general principle that the tool's design prioritises reasoning correctness over aesthetic consistency.

**Output 3 — Parameter display strings: frequency and probability versions.**

*Frequency mode (Y2 format):*

The format is: structural term (Bayesian term): input rate — count description using domain vocabulary.

- "Base rate (prior): [input_base_rate]% — [N_D] out of [N] [condition_name]"
- "[sensitivity_domain_name] (likelihood): [input_sensitivity]% — [N_TP] out of [N_D] detected"
- "FPR: [input_FPR]% — [N_FP] out of [N_¬D] false positives (Specificity: [specificity]%)"

Mammography:
- "Base rate (prior): 1% — 10 out of 1,000 have the disease"
- "Sensitivity (likelihood): 90% — 9 out of 10 detected"
- "FPR: 9% — 89 out of 990 false positives (Specificity: 91%)"

*Probability mode:*

The format inverts: notation is primary, structural/domain terms are secondary. Counts disappear — the user is in the probability-framing world.

- "$P(D) = [base_rate]$ — Prior ([domain prevalence term])"
- "$P(T^+ | D) = [sensitivity]$ — Likelihood ([sensitivity_domain_name])"
- "$P(T^+ | \neg D) = [FPR]$ — False positive rate (specificity: [specificity])"

Mammography:
- "$P(D) = 0.01$ — Prior (prevalence)"
- "$P(T^+ | D) = 0.90$ — Likelihood (sensitivity)"
- "$P(T^+ | \neg D) = 0.09$ — False positive rate (specificity: 91%)"

The full transformation of the parameter panel between modes — from count-rich natural-frequency descriptions to terse probability notation — is what makes format-switching vivid. The user experiences the same parameters feeling qualitatively different depending on representation.

**Number formatting convention across probability mode — confirmed.**

A formatting distinction exists between the tree and other display elements in probability mode:

- **Tree labels use decimal notation** ($P(D) = 0.01$, $P(D \cap T^+) = 0.009$) — matching formal Bayesian convention. The tree is the more "formal" visualisation; its probability-mode labels should look like what the user would encounter in a statistics textbook.
- **Icon array labels and parameter panel use percentage notation** ("Have disease: 1.0%", "TP: 0.9%") — matching accessible display convention. The icon array is the more "accessible" visualisation; percentage notation is more immediately readable.
- **Parameter panel in probability mode uses decimal notation** ($P(D) = 0.01$) — because the parameter panel in probability mode is presenting formal notation as primary.

Both are derived from the same underlying integer counts ($N_{TP}/N$, etc.), so there is no numerical inconsistency — only a formatting difference matching each context's character. The template system generates both formats from the same source values.

[Report — Technical Quality] **Formatting convention as extension of the format-character distinction between icon arrays and trees.** The Plan & Status design established that the icon array is spatial-holistic (the "accessible" format) while the tree is sequential-analytical (the "formal" format). The number formatting convention in probability mode extends this character distinction into the textual layer: the formal format (tree) uses formal notation (decimals); the accessible format (icon array) uses accessible notation (percentages). This is not arbitrary formatting — it is the same character distinction applied consistently to a new dimension. The template system generates both formats from identical source data, maintaining numerical consistency while adapting presentation.

**Output 4 — Derived result display strings.**

*Total test-positive rate:*
- Frequency: "Total test-positive rate (marginal likelihood): [total_test_positive_rate]% — [N_T+] out of [N] [test_positive_name]"
- Probability: "$P(T^+) \approx [total_test_positive_rate as decimal]$ — Marginal likelihood"

*Posterior:*
- Frequency: "Posterior: [posterior]% — [N_TP] out of [N_T+]"
- Probability: "$P(D | T^+) \approx [posterior as decimal]$ — Posterior"

*Degenerate case ($N_{T^+} = 0$):*
- Frequency: "Nobody [test_positive_name] with these parameters — the posterior is undefined."
- Probability: "$P(T^+) = 0$ — no positive tests. $P(D | T^+)$ is undefined."

**Output 5 — Icon array compound labels: four combinations.**

*By-condition grouping, frequency mode:*
- "[condition_name]: [N_D] (TP: [N_TP], FN: [N_FN])"
- "[condition_negative_name]: [N_¬D] (FP: [N_FP], TN: [N_TN])"

Mammography: "Have disease: 10 (TP: 9, FN: 1)" / "No disease: 990 (FP: 89, TN: 901)"

*By-test-result grouping, frequency mode:*
- "[test_positive_name]: [N_T+] (TP: [N_TP], FP: [N_FP])"
- "[test_negative_name]: [N_T-] (FN: [N_FN], TN: [N_TN])"

Mammography: "Test positive: 98 (TP: 9, FP: 89)" / "Test negative: 902 (FN: 1, TN: 901)"

*By-condition grouping, probability mode:*
- "[condition_name]: [N_D/N as %] (TP: [N_TP/N as %], FN: [N_FN/N as %])"
- "[condition_negative_name]: [N_¬D/N as %] (FP: [N_FP/N as %], TN: [N_TN/N as %])"

Mammography: "Have disease: 1.0% (TP: 0.9%, FN: 0.1%)" / "No disease: 99.0% (FP: 8.9%, TN: 90.1%)"

*By-test-result grouping, probability mode:*
- "[test_positive_name]: [N_T+/N as %] (TP: [N_TP/N as %], FP: [N_FP/N as %])"
- "[test_negative_name]: [N_T-/N as %] (FN: [N_FN/N as %], TN: [N_TN/N as %])"

Mammography: "Test positive: 9.8% (TP: 0.9%, FP: 8.9%)" / "Test negative: 90.2% (FN: 0.1%, TN: 90.1%)"

The compound label structure is identical across all four combinations — domain term + primary value + (structural composition). Only the numbers change format (counts vs. percentages) and the grouping changes which terms are primary vs. composition. This consistency means the user learns one label-reading pattern that works in all states.

**Output 6 — Tree node labels: frequency and probability versions.**

*Frequency mode:*
- Root: "[N]" (e.g., "1,000")
- First-level: "[N_D]" and "[N_¬D]" (e.g., "10", "990")
- Leaf: "[N_TP]", "[N_FN]", "[N_FP]", "[N_TN]" (e.g., "9", "1", "89", "901")

*Probability mode:*
- Root: "1" (total probability)
- First-level: "$P(D) = [base_rate]$" and "$P(\neg D) = [1 - base_rate]$" (e.g., "$P(D) = 0.01$", "$P(\neg D) = 0.99$")
- Leaf: joint probabilities — "$P(D \cap T^+) = [joint]$", "$P(D \cap T^-) = [joint]$", "$P(\neg D \cap T^+) = [joint]$", "$P(\neg D \cap T^-) = [joint]$" (e.g., "$P(D \cap T^+) = 0.009$")

The probability-mode tree is a more substantial transformation than a simple label swap. The frequency tree shows *counts* in nodes — the natural frequencies the user can directly combine. The probability tree shows *joint probabilities* in leaf nodes — values obtained by multiplying conditional probabilities along the branch path from root to leaf.

This matters because the posterior computation looks fundamentally different in the two modes:
- Frequency: $\text{Posterior} = N_{TP} / (N_{TP} + N_{FP}) = 9 / (9 + 89) = 9/98$ — adding counts
- Probability: $P(D | T^+) = P(D \cap T^+) / (P(D \cap T^+) + P(\neg D \cap T^+)) = 0.009 / (0.009 + 0.089) = 0.009 / 0.098$ — adding joint probabilities (which themselves required multiplication)

The frequency version is clearly simpler — which is the entire pedagogical point. The user who has experienced both modes understands *why* natural frequencies make Bayesian reasoning more tractable: the frequency tree gives them counts they can directly add and divide; the probability tree gives them values that first require multiplication (along branches) before addition (across branches) before division.

**Why joint probabilities in leaf nodes — considered alternatives:**

**(a) Joint probabilities — chosen.** The only option that makes the tree a coherent probability tree where the posterior can be derived from displayed values using Bayes' theorem. Creates the strongest pedagogical contrast between modes.

**(b) Conditional probabilities in leaf nodes** ($P(T^+ | D) = 0.90$, etc.) — same as the branch labels. Rejected: redundant (nodes just restate what branches show) and doesn't support the posterior computation (you can't derive the posterior from conditional probabilities displayed at the leaves without also knowing the priors, which are on the first-level branches — the user must hold information from multiple tree levels simultaneously).

**(c) Empty leaf nodes** — all information on branches. Rejected: the tree feels incomplete in probability mode (nodes that contained rich count information in frequency mode are suddenly empty). The contrast becomes "frequency trees are useful; probability trees are barren" rather than "frequency trees and probability trees contain the same information in different forms, and the frequency form is easier to work with."

**(d) Counts in leaf nodes even in probability mode** — a hybrid tree with probability branches and frequency nodes. Rejected: neither a clean frequency tree nor a clean probability tree. Muddled representation that undermines the format-switching contrast. The user can't tell whether they're in frequency or probability mode by looking at the nodes.

[Report — Technical Quality / Complexity] **The probability-mode tree as a genuine probability tree, not a relabelled frequency tree.** The format-switching design for the tree goes beyond label substitution. The frequency tree and probability tree represent genuinely different information architectures: counts in nodes vs. joint probabilities in leaf nodes, with correspondingly different posterior computations. This demonstrates that the format-switching feature was designed with awareness of *how* probability trees and frequency trees actually differ in the literature (Binder, Krauss & Bruckmaier, 2015), not as a superficial visual toggle. The four alternative approaches for probability-mode leaf nodes were evaluated against coherence, redundancy, and pedagogical contrast. This decision connects to the broader project commitment: the probability-tree vs. frequency-tree comparison is itself a pedagogical feature (Plan & Status, Phase 2 strand 1) — it can only serve that function if the probability tree is a genuine probability tree.

[Report — Background / Technical Quality] **The probability tree's posterior derivation as evidence for why frequency trees work.** The contrast between the two posterior computations — counting ($9/98$) vs. multiplying-then-adding-then-dividing ($0.009 / (0.009 + 0.089)$) — directly demonstrates the finding that frequency trees facilitate Bayesian reasoning while probability trees do not (Binder, Krauss & Bruckmaier, 2015). The tool doesn't just cite this finding; it lets the user *experience* it through format-switching. The probability tree is deliberately designed to make the difficulty of probability-based computation palpable, not to present probabilities as a viable alternative.

**Output 7 — Tree branch labels: frequency and probability versions.**

*Frequency mode:*
- First-level branches: "Base rate: [effective_base_rate]%" and "(1 − Base rate): [1 − effective_base_rate]%"
- Condition-positive second-level: "[sensitivity_domain_name]: [effective_sensitivity]%" and "(1 − [sensitivity_domain_name]): [1 − effective_sensitivity]%"
- Condition-negative second-level: "FPR: [effective_FPR]%" and "(1 − FPR): [1 − effective_FPR]%"

Mammography: "Base rate: 1%", "Sensitivity: 90%", "FPR: 9.0%", etc.

These show **effective rates** (derived from integer counts), not input rates — per the cross-format consistency decision in Display Conventions. The tree and icon array both live in the natural-frequency world.

*Probability mode:*
- First-level: "$P(D) = [base_rate]$" and "$P(\neg D) = [1 - base_rate]$"
- Condition-positive second-level: "$P(T^+ | D) = [sensitivity]$" and "$P(T^- | D) = [1 - sensitivity]$"
- Condition-negative second-level: "$P(T^+ | \neg D) = [FPR]$" and "$P(T^- | \neg D) = [1 - FPR]$"

Mammography: "$P(D) = 0.01$", "$P(T^+ | D) = 0.90$", "$P(T^+ | \neg D) = 0.09$", etc.

In probability mode, branch labels use the **input rates** expressed as decimals. This is a deliberate asymmetry with frequency mode (which uses effective rates). The reasoning: in probability mode, the tree is presenting a formal probability tree. The branches show conditional probabilities — these are the problem's given parameters, not derived quantities. The input rates ARE the conditional probabilities. In frequency mode, the branches show effective rates because the tree is in the natural-frequency world where the integer counts are primary and rates are derived descriptions of those counts.

This asymmetry is consistent with the broader display convention: in frequency mode, everything derives from the counts (effective rates). In probability mode, the parameters are the primary representation (input rates as formal probabilities). The posterior in both modes is still derived from the integer counts — the single source of truth — but the branch labels reflect the representational character of each mode.

**Output 8 — Cross-branch combination labels: frequency and probability versions.**

*Frequency mode:*
- Sum: "[test_positive_name]: [N_TP] + [N_FP] = [N_T+]"
- Posterior: "[N_TP] out of [N_T+] ≈ [posterior as %]"

Mammography: "Test positive: 9 + 89 = 98" / "9 out of 98 ≈ 9.2%"

*Probability mode:*
- Sum: "$P(T^+) = P(D \cap T^+) + P(\neg D \cap T^+) = [joint_TP] + [joint_FP] = [marginal]$"
- Posterior: "$P(D | T^+) = P(D \cap T^+) / P(T^+) = [joint_TP] / [marginal] \approx [posterior]$"

Mammography: "$P(T^+) = 0.009 + 0.089 = 0.098$" / "$P(D | T^+) = 0.009 / 0.098 \approx 0.092$"

The probability-mode combination labels make Bayes' theorem visible as arithmetic on the tree's values. This is the culmination of the probability tree design: the user can see that deriving the posterior from a probability tree requires multiplying along branches to get joint probabilities, summing joints to get the marginal, then dividing — a multi-step computation — whereas the frequency tree just requires adding counts and dividing.

**Output 9 — Degenerate state messages.**

- $N_{T^+} = 0$: "No [population_name] [test_positive_name] with these parameters — the posterior is undefined." (frequency) / "$P(T^+) = 0$ — no positive tests. $P(D | T^+)$ is undefined." (probability)
- Zero-from-rounding: "At this population size, the [sensitivity_domain_name] doesn't produce any detected cases. Try a larger population for more detail."
- Small $N_D$: "The affected group is very small at this population size — try a larger N for more detail."

The frequency-mode degenerate message uses `population_name` rather than the previously hardcoded "Nobody" — "Nobody are flagged" is ungrammatical for non-human populations; "No emails are flagged" and "No items are rejected" work correctly. For human populations, "No people test positive" is slightly less natural than "Nobody tests positive," but the consistency across all scenarios outweighs the marginal awkwardness for the human case. (An alternative would be to condition on `relative_pronoun` — "who" → "No one [test_positive_name_singular]"; "that" → "No [population_name] [test_positive_name]" — but the added template complexity isn't justified for a message the user will rarely see.)

**Output 10 — Glossary entries (if glossary is built).**

A vocabulary mapping table for the current scenario, containing bridging definitions:

| Structural term | Domain term | Bayesian term | Bridging definition |
|---|---|---|---|
| Base rate | [base_rate_domain_name, e.g., "Prevalence"] | Prior | "How common the condition is before seeing any test result." |
| Sensitivity | [sensitivity_domain_name] | Likelihood | "The probability of this test result *given* the condition. Not the probability of the condition given the test result." |
| FPR | [fpr_domain_name] | *(none)* | "The rate at which [population_name] without the condition incorrectly [test_positive_name]." |
| Total test-positive rate | *(none — quantity has no domain name)* | Marginal likelihood | "The total probability of this test result, whether the condition is present or not." |
| Posterior | *(result, not a parameter)* | Posterior | "The updated probability after seeing the test result." |

The domain column adapts per scenario. Structural and Bayesian columns are constant. The bridging definitions are constant text, phrased in domain-neutral language ("the condition" rather than "the disease") so they work across medical, technology, and manufacturing scenarios. The `population_name` and `test_positive_name` fields in the FPR definition ensure it reads naturally per domain: "The rate at which people without the condition incorrectly test positive" (medical) vs. "The rate at which items without the condition incorrectly are rejected" (factory). The phrasing "without the condition incorrectly [test_positive_name]" works because `test_positive_name` is a verb phrase — though "incorrectly are rejected" is slightly awkward; this can be refined during coding if the glossary is built (could-cut).

The glossary also includes the specificity note for medical scenarios: "Specificity ([specificity]%) = 1 − FPR. The probability of a negative test given no disease."

**Template system summary — complete output set:**

The template system is a pure function: (Region A + scenario domain vocabulary) → Region B. It generates:

1. Problem statement text (frequency + probability versions)
2. Question text (frequency + probability versions, with notation secondary in probability)
3. Parameter display strings (frequency Y2 format + probability notation format)
4. Derived result display strings (total test-positive rate + posterior, both versions)
5. Icon array compound labels (2 grouping states × 2 display modes = 4 sets)
6. Tree node labels (frequency counts + probability joint-probabilities)
7. Tree branch labels (frequency effective-rates + probability conditional-probabilities)
8. Cross-branch combination labels (frequency count-arithmetic + probability Bayes'-theorem arithmetic)
9. Degenerate state messages
10. Glossary entries (if glossary is built)

All generated text follows the eight wording principles from strand (b). Domain vocabulary comes from the scenario; structural and Bayesian vocabulary is constant. Both display modes' complete label sets are generated upfront and included in the data package, so format-switching is a pure view-layer operation (data package decision 3, Part 1).

[Report — Technical Quality] **The template system as the implementation of the text-as-intervention principle.** The Extracted Insights establish that "text is itself an intervention, not a wrapper" — even with identical numbers, performance changes based on wording. The template system is where this principle becomes concrete: every generated string follows specific wording principles derived from the framing literature (explicit reference classes, natural information sequencing, reference-class question phrasing, natural frequencies). The problem statement in frequency mode doesn't just "state the problem" — its sentence structure actively builds the nested-set structure through language, sequencing information in the same order the visualisations represent it and the construction sequences build it. The template system ensures this pedagogical structure is consistent across all scenarios, because the structure is in the template, not in the scenario content. Part 5 provides the domain vocabulary; the template provides the pedagogical scaffolding.

[Report — Technical Quality / Complexity] **The two problem statement versions as genuinely different rhetorical strategies.** The frequency and probability problem statements are not the same text with different numbers. They follow different structures: the frequency version sequences four sentences that progressively build the partition hierarchy (population → condition → test within condition → question about test-positive group). The probability version states three parameters directly (prevalence, sensitivity, FPR) without building any structure. This structural difference is the text-level analogue of the visual difference between icon arrays (build up the partition visually) and probability notation (state the problem abstractly). The template system generates both from the same inputs, but the generation logic is substantively different for each — not a formatting change but a rhetorical change.

---

#### Parameter Control Functional Specification — confirmed

The parameter controls manage the four parameter values ($N$, base rate, sensitivity, FPR), propagate changes to the computation function, and display current state. In exploration mode, these are the user's primary interaction with the data layer — every visualisation change starts with a parameter change here.

**$N$ selector:**

- Control type: discrete selector (segmented control, dropdown, or radio group — Part 3 decides widget)
- Options: 100, 200, 500, 1000
- Default: scenario-specified $N$ when a scenario is loaded; 1000 for pure custom exploration (finest resolution, handles all base rates)
- On change: triggers base rate snapping if needed (current rate may not be valid at new step size), then full data package recomputation, with notification if snapping occurred
- Display: the selected value — "Population: 1,000" or "N = 1,000"

**Base rate slider:**

- Control type: continuous slider with snapping to $N$-relative steps
- Step size: $1/N$ — at $N = 1000$: $0.1\%$ steps; at $N = 100$: $1\%$ steps
- Range: $1/N$ to $(N-1)/N$
- Default: scenario-specified base rate; for custom, a moderate default ($5\%$ or $10\%$ — interesting enough to show Bayesian effects without being extreme)
- On change: full data package recomputation; no cascading effects on other sliders (sensitivity and FPR positions stay where they are — only their resulting counts change because $N_D$ and $N_{\neg D}$ changed)
- Display: Y2 format in frequency mode; notation format in probability mode (see Parameter Display Strings in Template System)
- **Updates live** during drag, not just on release — the display, data package, and both visualisations all update in real time as the slider moves

**Sensitivity slider:**

- Control type: continuous slider with $1\%$ steps
- Range: $0\%$ to $100\%$ inclusive
- Default: scenario-specified; for custom, $90\%$
- On change: data package recomputation; no effect on other sliders
- Display: Y2 / notation format per mode
- Live updating during drag

**FPR slider:**

- Control type: continuous slider with $1\%$ steps
- Range: $0\%$ to $100\%$ inclusive
- Default: scenario-specified; for custom, $5\%$ or $10\%$
- On change: data package recomputation; no effect on other sliders
- Display: Y2 / notation format per mode, with specificity shown as secondary
- Live updating during drag

**Derived results display (read-only):**

The total test-positive rate and posterior are displayed in the parameter area but are not user-adjustable. They update reactively when any parameter changes. Visually distinguished from input controls — the user should see at a glance which values they can adjust and which are computed results.

Degenerate-state messages replace the posterior display when $N_{T^+} = 0$ or when other edge conditions occur.

**Scenario loading behaviour:**

When a scenario is selected from the scenario library:
- All four parameters are set to the scenario's values
- Sliders move to the scenario's positions; $N$ selector highlights the scenario's preset
- Domain vocabulary updates to the scenario's terms throughout all generated text
- The user can then adjust freely from the scenario's starting point

If the user adjusts parameters after loading a scenario, the scenario's **domain vocabulary persists** — "have the disease," "test positive," etc. remain in labels and problem text. The numbers change but the domain context stays. The user is exploring "what if the prevalence were higher?" within the medical screening frame.

If no scenario has been loaded, generic fallback vocabulary is used — "have the condition," "test positive," "the test."

Selecting a new scenario overwrites all current parameters and vocabulary to the new scenario's values.

**State ownership and recomputation:**

The parameter controls own the current parameter state: four raw input values ($N$, base rate, sensitivity, FPR) and the current scenario reference (if any). The computation function and template system are pure functions called with these values. The data package is derived state — deterministically computed from parameters, not separately stored.

In React terms: parameter state in `useReducer` at a level accessible to Parts 1, 2, and 3 (context provider or common parent). Parameter changes dispatch actions updating the state. Data package computed via `useMemo` with parameter dependencies. Data package propagates to child components via props or context. Recomputation is trivially fast (~20 numerical values + ~50 strings) — well under a millisecond.

[Part 3] **Live updating performance consideration.** The data package recomputation is trivially fast, but the downstream visualisation rendering (Part 1) may be more expensive — particularly the icon array at $N = 1000$ if colours or layout change. During live slider dragging, the system produces ~60 data package recomputations per second (matching frame rate). Part 1's rendering should be efficient enough to keep up. If not, standard throttling (skip intermediate frames, always render the final position) handles this. GSAP animations should not be triggered during live dragging — the visualisation should update positions/colours directly, with animations reserved for discrete state transitions (regrouping, construction steps). This is a Part 3 integration concern.

[Report — Technical Quality] **The parameter controls as the bridge between user intent and natural frequency representation.** The parameter controls mediate between what the user wants to explore (rates — "what if sensitivity were 80%?") and what the tool works with (counts — "8 out of 10 detected"). The Y2 display format makes this mediation visible: the user's rate and the resulting count appear side by side. The controls are not just UI widgets — they are the interface between the probability world (where the user thinks) and the natural frequency world (where the tool reasons). The live updating during drag makes this translation feel immediate and tangible rather than mediated by a "calculate" button. This connects to the broader pedagogical goal: the user develops intuition about how rates map to counts, which is itself part of understanding natural frequencies.

### Notes for Later

*(Updated — includes items from previous update plus new items from template system and parameter control specification.)*

[Part 4] **Bayesian vocabulary building — pedagogical sequence design.** The richest option for the Bayesian terminology bridge is a vocabulary-building stage within guided mode: after the user has gained facility with frequency-based construction, a reflective stage explicitly bridges the vocabularies. The timing is critical — Bayesian terms introduced *after* conceptual understanding, as a second language, not simultaneously. The natural frequency tradition's objection is to premature formalism; vocabulary building after fluency is a different matter entirely. Part 4's responsibility is the pedagogical design of when and how this stage occurs. The full vocabulary mapping (three layers, five key terms, the marginal likelihood bridging definition, the structural parallel between likelihood and marginal likelihood definitions) is documented in the Terminology Model section above. Other lighter-touch options (format-switching bridging text, parameter panel parentheticals, glossary component) operate independently and are already specified.

[Part 3] **Parameter control spatial integration.** Part 2 specifies the controls' functional behaviour (ranges, steps, constraints, presets, display format). Part 3 handles placement within the three-layer layout. Considerations for Part 3: the parameter panel doubles as the input interface in exploration mode; the Y2 display format (input rate + count) needs enough space to be readable; the Bayesian parentheticals add label length; the $N$ selector is visually distinct from the rate sliders; the "Total test-positive rate" and "Posterior" are derived results, not user inputs — they should be visually distinguished from the input parameters.

[Part 3] **Sticky slider UX mitigation.** The sticky slider phenomenon (many slider positions producing the same count at small $N_D$) is acknowledged as inherent to the natural frequency framework. Part 3 may want subtle visual indication when the slider is near a threshold where the count will change, or count emphasis in the parameter display that makes the discrete count-changes feel more meaningful than the continuous rate-changes. This is UX polish, not specification.

[Part 3] **$N$-change notification display.** When switching $N$ presets forces the base rate to snap to the nearest valid step, the parameter panel should briefly indicate the adjustment. Part 3 handles the visual treatment — a brief highlight, a tooltip, or a momentary "adjusted from X to Y" annotation.

[Part 3] **Degenerate state displays.** When $N_{T^+} = 0$ (nobody tests positive), or when zero-from-rounding occurs, the tool shows contextual messages. Part 3 handles where these appear and how they're styled. The messages are generated by Part 2's template system and included in the data package.

[Part 3] **Glossary component layout.** If built (could-cut), the glossary is a collapsible panel or modal accessible from the parameter area. Scenario-adaptive (domain column changes), containing bridging definitions. Part 3 handles its spatial integration. Part 2's template system generates the content (vocabulary mapping table using domain, structural, and Bayesian labels).

[Part 3] **Live updating during slider drag — animation vs. direct update.** During live dragging, visualisations should update positions/colours directly. GSAP animations (regrouping, construction steps) should not trigger mid-drag — animations are reserved for discrete state transitions. If rendering can't keep up at 60fps, standard throttling applies. Part 3 orchestrates this interaction between continuous parameter updates and discrete animation triggers.

[Part 3] **Format-switching as a coordinated transition across all layers.** When format-switching is toggled, the parameter panel, question text, and visualisation labels all change simultaneously. Part 2's template system provides both versions upfront in the data package. Part 3 orchestrates the visual transition — cross-fade of text content across all three layers, 200–400ms. The spatial structure of both visualisations stays identical; only text changes. The coordination is the same GSAP timeline approach used for regrouping (Part 1), applied to text elements rather than spatial elements.

[Part 5 — addressed] **Scenario parameters chosen for clean integers where possible.** Curated scenarios use parameters specifically chosen to minimise or eliminate rounding at their author-specified $N$. Four of six scenarios are perfectly clean (all integer counts); two have negligible rounding (mammography: $N_{FP}$ off by 0.1; blood donation: $N_{TP}$ and $N_{FP}$ each off by 0.05). Full integer verification is documented per scenario in Part 5.

[Part 5 — addressed] **Specificity-to-FPR conversion in scenario definitions.** Medical scenarios (mammography, COVID, blood donation) provide a `specificity` field in addition to FPR. Non-medical scenarios (spam, factory, drug screening) specify FPR directly. The template system uses whichever framing is natural for the domain. Part 5's scenario definitions document which field each scenario provides.

[Part 5 — addressed] **Probability-mode problem statement using specificity for medical scenarios.** Implemented via the `base_rate_domain_name` and `sensitivity_domain_name` / `fpr_domain_name` schema fields, which allow each scenario to control the probability-mode phrasing. Medical scenarios with a `specificity` field can use specificity framing; non-medical scenarios use domain-appropriate terms (detection rate, false rejection rate, etc.).

[Evaluation] **Rounding effects as a measurable dimension.** The rounding design produces slightly different posteriors at different $N$ values for the same rates. This is a property, not a bug, but it could be a confound in evaluation. If comparing user accuracy across $N$ conditions, the "correct" answer differs slightly between conditions. Evaluation should use the natural-frequency posterior (from integer counts) as the correct answer, not the theoretical Bayes' theorem result from the raw rates. This is consistent with how the published literature evaluates accuracy — participants working with natural frequencies are scored against the frequency-derived answer.

[Evaluation] **Format-switching as a testable pedagogical dimension.** The probability-mode tree is designed to make the difficulty of probability-based computation palpable (multi-step multiplication-then-addition-then-division vs. simple count-addition-then-division). Whether users who experience both modes show greater understanding of *why* frequencies help — compared to users who only see frequencies — is a testable evaluation question. The template system's generation of genuinely different problem statements and tree structures across modes (not just label swaps) makes this comparison meaningful.

[Report — Technical Quality] **The computation function as a formalisation of the natural frequency derivation.** The seven-step pipeline (first-level exact partition, second-level rounded partition, regrouped counts, posterior, effective rates, joint probabilities, input rates preserved) directly mirrors the logical structure of Bayesian inference as the tool teaches it. Steps 1–2 correspond to the tree's construction sequence (population → condition partition → test-result partition). Step 3 corresponds to the cross-branch combination. Step 4 produces the answer. Steps 5–7 serve the display layer. The computation IS the reasoning process, formalised as a function. This structural correspondence between the computation pipeline and the pedagogical sequence is the same pattern as the icon array construction sequence mirroring Bayesian reasoning — the software encodes the pedagogy.

---

## Tech Stack Decision

*Decided after Part 1 specification complete, before Part 2 work begins.*

**Decision: React + GSAP + SVG + Vite.** Part 1's implementation specifics produced concrete requirements that are the primary constraints on the tech stack (element-level animation for 1000+ elements, reactive state-based rendering, responsive layout, hierarchical spatial layout computation). Part 2's requirements (data computation, template string generation, reactive parameter updates) are less constraining — virtually any modern frontend framework handles these. The decision is treated as the **working decision** — the choice we build on going forward. If Part 2's work surfaces something genuinely constraining that the working decision cannot accommodate, we can re-evaluate. In practice, this is unlikely because Part 1's animation and rendering requirements are the demanding constraints, and Part 2's needs are a subset of what any framework satisfying Part 1's requirements would provide.

### Why Web-Based

The tool is pedagogical — it is designed to be used by learners. Zero-installation browser access directly serves this commitment: a web app runs in any browser, on any device, with no barriers between the user and the tool. The interactivity requirements — real-time animation at scale, reactive parameter-driven updates, construction sequences with immediate visual feedback, format-switching with coordinated transitions across multiple display layers — are native capabilities of the web platform, with mature infrastructure purpose-built for this class of problem (SVG rendering, hardware-accelerated animation, reactive UI frameworks, event handling). The web platform is the natural home for the combination of pedagogical accessibility and interactive complexity this project requires.

### Rendering Technology: SVG — confirmed

**The decision:** Both visualisation components (icon array and frequency tree) render as SVG.

**Why SVG:**

The icon array at $N = 1000$ means 1000 individual elements (e.g., `<rect>` or `<circle>`) that need independent position, colour, and potentially opacity. 1000 SVG elements is well within modern browser capability — performance concerns with SVG DOM nodes don't meaningfully appear until roughly 5,000–10,000+ elements, well above the project's practical ceiling.

Each icon being a real DOM element gives several properties the design actively uses: per-element animation via any standard method (GSAP, CSS transitions, Web Animations API, and D3 transitions all operate directly on DOM elements); per-element event handling, which is directly useful at moderate $N$ where direct manipulation is the interaction mode (the multi-scale interaction model from Part 1); accessibility via ARIA attributes, continuing the accessibility-as-design-input pattern established at the colour scheme level; and styling via CSS, which keeps the visual encoding (colour scheme, shade variations) cleanly separated from layout logic.

The frequency tree has approximately 7 nodes, 6 branches, and associated text labels — trivially within SVG's capabilities. SVG's native text rendering is also superior to Canvas for the label-heavy displays both components require — compound labels with domain-primary and structural-secondary terms, count annotations, branch rate labels, and the composition sub-labels that appear during regrouping all benefit from the typographic control SVG text provides.

**Canvas — considered and rejected:**

Canvas would offer a performance advantage for very large element counts. But $N = 1000$ is the project's practical ceiling (the canonical mammography scenario), and SVG handles this comfortably. Canvas would sacrifice DOM-based accessibility (no ARIA attributes on drawn shapes), require custom hit-detection for any per-icon interaction (relevant at moderate $N$ for direct manipulation), and produce inferior text rendering for the label-heavy design. These are real costs for no practical gain at this scale. Canvas would be premature optimisation that trades away properties the design actively uses to solve a performance problem that doesn't exist at $N \leq 1000$.

**Hybrid (Canvas for icon array, SVG for tree) — considered and rejected:**

This would add architectural complexity — two different rendering pipelines, two different interaction models, two different animation approaches — to solve the same non-existent performance problem. The components share a colour scheme and need to feel like parts of a unified tool, which is easier when they share a rendering technology. The added complexity would need to justify itself through a concrete benefit, and at this $N$ range, none exists.

**Connection to the multi-scale interaction model:** At moderate $N$ where direct manipulation is the interaction mode, SVG's per-element event handling is directly useful — the user can click, select, or hover individual icons because each is a distinct DOM element. At high $N$ where calculation-and-visualise is the mode, the per-element DOM identity still matters for the regrouping animation (each icon has an independent trajectory) and for the colour/opacity encoding that distinguishes the four partition groups. The rendering technology supports both interaction modes without adaptation.

[Report — Technical Quality] **SVG justified against the specific $N$ range, not as a default.** The rendering decision was evaluated against the project's concrete requirements — specifically the $N \leq 1000$ ceiling, the per-element animation needs, the label-heavy design, and the accessibility commitment — not chosen as a default "SVG is good for data visualisation" decision. Canvas was considered for its performance characteristics and rejected because the performance advantage is irrelevant at this scale while its costs (lost accessibility, inferior text, custom hit-detection) are real. This demonstrates that even the rendering technology choice was evaluated against the project's specific constraints.

[Accessibility] **SVG's ARIA capability continues the accessibility-as-design-input pattern.** The colour scheme was designed for colour-blind safety at the palette level (blue-orange avoiding the red-green axis). The rendering technology continues this approach: SVG elements can carry `role`, `aria-label`, and other attributes that make the visualisation navigable by screen readers. This is a property of the rendering choice, not a post-hoc accommodation — accessibility considerations shaped the technology selection alongside animation and interaction requirements.

### Animation Approach: GSAP — confirmed

**The decision:** GSAP (GreenSock Animation Platform) for element-level animation, particularly the icon array regrouping and construction-step transitions.

**What the animation system needs to do:**

The regrouping animation is the binding constraint. It requires: computing 1000 (source position, target position) pairs when the grouping state changes; interpolating all positions simultaneously over a shared duration with configurable easing; coordinating the icon movement with label transitions (old labels fade, new labels for the regrouped clusters appear); and supporting the reverse transition (un-regrouping to compare the two groupings), which means the animation must work in both directions.

Construction-step transitions are less demanding: elements appear (tree nodes grow in, branches extend, icon regions gain colour) in sequence, potentially with animation. These are staged appearance animations, not mass position interpolation.

Format-switching transitions are the least demanding: labels change content simultaneously across all three persistent layers, potentially with a brief crossfade or morph effect. This is a coordinated content swap.

The regrouping drives the animation technology decision. The construction-step and format-switching animations are achievable with virtually any animation approach, including framework-native transitions.

**GSAP — chosen:**

GSAP is purpose-built for complex DOM animation. It can animate arbitrary properties on thousands of elements simultaneously, with timeline coordination, configurable easing functions, and stagger effects. Animating 1000 SVG elements' `x` and `y` attributes is well within its design parameters.

The timeline API naturally supports the multi-phase transitions the design specifies. The regrouping sequence — icons begin moving, partway through the old labels start fading, icons arrive at target positions, new labels fade in — is expressed as a GSAP timeline with overlapping tweens at specified offsets. The same timeline structure serves the construction-step animations (node appears → branch extends → child node appears → branch label fades in) and the format-switching coordination (question text, parameter display, and visualisation labels all transitioning with specified relative timing).

Reverse transitions are natively supported — a GSAP timeline can be reversed, producing the un-regrouping animation without separate animation logic. This directly serves the design requirement that users in exploration mode can toggle regrouping back and forth to compare the two groupings.

GSAP is framework-agnostic — it operates on DOM elements accessed via refs, so it doesn't compete with React's rendering model. Animation logic lives in effect hooks or callbacks that target specific SVG elements through refs, cleanly separated from React's declarative component structure.

The cost is an additional dependency, but GSAP is lightweight and its scope is clearly bounded — it handles element-level animation, nothing else.

**D3 transitions — considered, not chosen:**

D3's transition system has a genuinely elegant model for this use case. The data-join pattern (`enter`/`update`/`exit`) maps naturally to the icon array's state changes: when the grouping state changes, each icon's data (target position) updates, and D3 interpolates the DOM attributes to their new values. This is conceptually clean — the animation is a direct consequence of the data change, not a separate imperative operation.

D3 handles 1000 simultaneous transitions routinely. The `d3-ease` module provides configurable easing functions. The data-driven model would express the regrouping as: "rebind the position data with new target coordinates; transition all elements to their new data values." This is a natural description of what the regrouping *is*.

However, two considerations weigh against D3 as the primary animation approach:

First, D3 wants to own the DOM elements it manages. D3's selection model — `d3.select(container).selectAll('rect').data(iconData)` — creates, updates, and removes DOM elements directly. React also manages the DOM through its virtual DOM and reconciliation. When both systems target the same elements, the standard resolution is a clear boundary: React owns the container element, D3 owns everything inside it. This works but requires disciplined boundary management — React must not re-render the contents D3 is managing, and D3 must not modify elements outside its boundary. The boundary is maintainable but adds architectural friction that GSAP's ref-based approach avoids entirely.

Second, D3's broader capabilities don't independently justify the dependency. The frequency tree has a fixed binary structure with ~7 nodes — computing node positions is straightforward arithmetic (~20 lines of code), and D3's `d3-hierarchy` / `d3-tree` layout algorithms solve a general problem (arbitrary hierarchies of unknown size) that this specific problem doesn't have. The icon array's spatial layout (grouped rectangular regions with partition boundaries) is also domain-specific — D3 doesn't have a layout algorithm for "rectangular grid subdivided by hierarchical partitions." So D3 would be imported primarily for its transition system, with its layout capabilities largely unused. GSAP provides the transition capability without the unused generality.

D3 remains a viable alternative. If future requirements surface a need for D3's data-join model (e.g., if the icon array needs to handle dynamic $N$ changes where icons are added or removed, rather than just repositioned), the D3 transition approach could be reconsidered. The current design — where $N$ is set per scenario or per user choice, not continuously varying — doesn't require enter/exit transitions, only update transitions (repositioning existing elements), which GSAP handles directly.

**Web Animations API (WAAPI) — considered, not chosen:**

WAAPI is the browser-native animation API. Calling `element.animate()` on each of the 1000 SVG elements, specifying keyframes for position, is zero-dependency and potentially GPU-accelerated.

The coordination requirements are where WAAPI falls short of GSAP for this use case. Orchestrating 1000 animations that need to feel unified — same duration, same easing, starting simultaneously, with staggered label transitions overlaid — is achievable but requires more manual management than GSAP's timeline API provides natively. Easing options are limited to CSS timing functions unless keyframes are computed manually. The `Animation` objects returned by `.animate()` support `.finished` promises and can reference `document.timeline`, but assembling these into the multi-phase choreography the regrouping requires is substantially more code than the equivalent GSAP timeline.

WAAPI is a reasonable choice for projects where the animation requirements are simpler or where zero-dependency is a hard constraint. This project's animation requirements — particularly the multi-phase coordination and reverse-transition support — benefit enough from GSAP's purpose-built API to justify the dependency.

**Custom `requestAnimationFrame` loop — considered, not chosen:**

A manual animation approach: store source and target positions for each icon in a data structure, use `requestAnimationFrame` to interpolate positions each frame via an easing function, and set SVG attributes directly. This offers maximum control and zero dependencies, and can batch all 1000 position updates into a single computation per frame.

The cost is that it re-implements functionality GSAP already provides — easing functions, timing management, coordination of multiple animations, interruption handling, and reverse playback all need to be hand-rolled. Edge cases (animation interrupted mid-flight by a state change, reverse transition requested before forward transition completes, partial completion states) require careful handling that GSAP has already solved. The project's value and complexity come from its design thinking and pedagogical reasoning, not from low-level animation engineering. Implementing a custom animation system would add implementation effort in a layer where the project has nothing distinctive to contribute.

**Framework-native transitions (Framer Motion, Svelte transitions, Vue transitions) — considered, not chosen:**

These systems are designed for UI-scale transitions — a modal appearing, a list reordering, a component mounting with a fade. They handle element-level animation elegantly for small numbers of elements. But animating 1000 independent SVG elements simultaneously — each with its own target position, all coordinated — pushes them well beyond their intended use case. Framer Motion's `motion.rect` or Svelte's `tweened` stores could theoretically manage 1000 simultaneous animations, but the overhead (1000 individual animation instances managed by the framework's reactivity system, updating 60 times per second) would be fighting the design rather than being served by it.

These transitions remain useful for the non-visualisation parts of the UI — the parameter panel, mode selector, format-switching toggle, and other interface elements. GSAP handles the heavy visualisation animation; framework-native transitions handle the lighter UI animation. The two don't conflict.

[Report — Technical Quality] **GSAP chosen specifically for the regrouping animation requirement, not as a general animation default.** The decision traces a direct line from pedagogical design to technical requirement to tooling choice: the regrouping animation was designed as the mechanism targeting denominator neglect and the inverse fallacy (Plan & Status, Phase 3 strand a); this mechanism requires 1000-element batch animation with coordinated multi-phase transitions and reverse support (Part 1 specification); this technical requirement constrains the animation tooling to purpose-built libraries (this decision). Being able to trace the tech stack choice back through the implementation requirement to the pedagogical design decision demonstrates that the technology serves the pedagogy, not the reverse.

[Part 2] **GSAP's timeline coordination extends beyond the icon array.** The format-switching design specifies that all three persistent layers (question, parameters, visualisation labels) change simultaneously, and the construction sequences involve staged multi-element transitions. GSAP's timeline API serves both — the same coordination model that choreographs the regrouping animation can choreograph format-switching transitions and construction-step sequences. This means the animation approach is unified across the tool's interactive features, not specific to one component.

### Application Framework: React — confirmed

**The decision:** React as the application framework, managing the overall UI: component architecture, state management, parameter controls, layout, mode switching.

**Why React:**

React's component model maps naturally onto the tool's architecture. The icon array and frequency tree are self-contained visualisation components receiving state via props — construction state, grouping state, display mode, and the data package from Part 2. The parameter panel, mode selector, scenario picker, question display, and three-layer layout are standard UI components composed in a hierarchy that mirrors the tool's information architecture.

The multi-dimensional state space the tool requires — construction state (5+ discrete states per component) × grouping state (2 states for icon array, 2 for tree) × display mode (frequency vs. probability) × current parameters (base rate, sensitivity, FPR, $N$) × current scenario — is naturally managed by `useReducer` with a structured state object and typed actions. State changes are explicit and traceable: a "toggle display mode" action updates the display mode, which propagates through the data package recomputation (Part 2's responsibility) to the visualisation components' props, triggering re-render with the new label sets. This explicitness suits a tool where understanding *why* the display changed is important for debugging and for the report's technical description.

The ref-based integration with GSAP is clean: React renders the SVG structure (the `<svg>` container, the `<g>` groups for partition regions, the individual `<rect>` or `<circle>` elements for icons), and refs provide GSAP with direct access to the DOM elements it needs to animate. React's rendering and GSAP's animation operate on different timescales — React handles state-driven structural changes (which icons exist, what colours they have), GSAP handles smooth transitions between states (where icons move to, how labels crossfade). The separation is natural, not forced.

For preventing unnecessary re-renders of the 1000-icon SVG when unrelated state changes occur (e.g., a mode selector highlight changing shouldn't re-render the icon array), React provides `memo`, `useMemo`, and `useCallback`. These require explicit use — React doesn't optimise by default — but the patterns are well-established and the cost is modest boilerplate rather than architectural compromise.

React's API has been stable across recent versions. The hooks-based model introduced in React 16.8 (2019) is essentially unchanged in its core patterns through the current version. This stability means documentation, examples, and tooling reliably apply — there is no version fragmentation where patterns from one era conflict with another.

**Svelte — considered alternative, genuine strengths acknowledged:**

Svelte's compiled reactivity model is a genuinely strong architectural fit for this project's data flow. Reactive declarations — the equivalent of "when base rate changes, recompute $N_D$, $N_{\neg D}$, and all downstream counts" — are expressed declaratively without the memoisation ceremony React requires (`useMemo` with dependency arrays, `useCallback` for stable references). Svelte compiles these declarations into direct DOM manipulation code, with no virtual DOM layer between the state change and the DOM update. For a tool where the critical path is "parameter change → derived computation → visual update for 1000 elements," fewer intermediary layers is a genuine advantage.

Svelte's fine-grained reactivity means that when a single parameter changes, only the specific DOM elements whose values depend on that parameter are updated — without the developer needing to manually specify memoisation boundaries. React achieves the same result but requires the developer to think about it explicitly (wrapping components in `memo`, computing derived values in `useMemo`). For the parameter-driven live updating in exploration mode, Svelte's model is more naturally aligned.

However, React was chosen over Svelte on practical grounds. React's ecosystem is substantially larger — more documentation, more examples of the specific integration patterns this project needs (React + SVG + animation libraries), more tooling support, and a larger base of community knowledge for troubleshooting. React's API stability across versions is a practical advantage: Svelte's transition from version 4 to version 5 introduced a fundamentally different reactivity model (runes replacing reactive declarations and `export let` props), which fragments the available documentation and examples across two incompatible paradigms. React's hooks-based model has remained essentially stable since 2019.

The virtual-DOM overhead that Svelte eliminates is theoretical at this project's scale — it doesn't cause measurable performance problems, it just represents an architectural layer that isn't doing useful work. This is a genuine inefficiency but not a practical one. The practical benefits of React's ecosystem maturity outweigh the theoretical benefits of Svelte's more direct reactivity model for this project.

[Report — Technical Quality] **Framework choice justified by specific architectural requirements.** The decision was evaluated against the project's concrete needs — multi-dimensional state management, component isolation for visualisation and UI layers, ref-based animation integration, ecosystem maturity — rather than chosen by default or by popularity. The Svelte consideration, with its genuine strengths for parameter-driven data flow, is worth mentioning briefly in the report as a considered alternative following the project's pattern of documenting evaluated-and-rejected options with stated reasoning. This demonstrates that the framework choice, like the rendering and animation choices, was evaluated against the project's specific requirements.

[Report — Technical Quality] **The virtual DOM as an honest acknowledgment.** React's virtual DOM is not *needed* by this project — it's an intermediary layer that doesn't contribute to the tool's rendering or animation pipeline. Acknowledging this honestly in the report, while explaining why React was chosen despite it (ecosystem maturity, API stability, integration patterns), follows the same intellectual honesty pattern as the vertical tree layout decision (Plan & Status, strand a) — not every aspect of every choice needs to be theoretically optimal; some are practical, and being transparent about which is which demonstrates design maturity.

### Build Tool: Vite — confirmed

**The decision:** Vite as the build tool and development server.

Vite provides fast development builds with hot module replacement, optimised production builds, and native support for React and JSX — the core build infrastructure the project needs without unnecessary layers. Development iteration is fast (sub-second hot reload on file changes), and production output is optimised static assets (HTML, JS, CSS) that can be deployed anywhere.

Meta-frameworks (Next.js, SvelteKit, Nuxt, etc.) were not considered because their additions — server-side rendering, file-based routing, API routes, server components — solve problems this project does not have. The tool is a single-page client-side application: all computation happens in the browser, there is no server-side logic, there are no multiple pages requiring routing, and there is no need for server-rendered HTML. A meta-framework would add configuration overhead and conceptual complexity (understanding which code runs on the server vs. client, how routing conventions work, when SSR is triggered) for capabilities the project would never use.

Vite is the build layer; React is the application layer; the two are cleanly separated.

### Cross-Part Flags from the Tech Stack Decision

**[Part 1] Animation capabilities confirmed.** The SVG + GSAP combination directly achieves the animation capabilities specified in Part 1: element-level position interpolation (GSAP animating individual SVG element attributes via refs), coordinated multi-phase transitions (GSAP timelines), configurable timing and easing (GSAP's easing library), and reverse transitions (GSAP timeline reversal). No design compromises are needed — the Part 1 specification can be implemented as specified.

**[Part 2] Data flow through React's state model.** React's state management patterns (`useReducer`, context) suit the data package flow: Part 2's computation takes raw parameters and produces the data package; the package propagates via props or context to the visualisation components. Reactive parameter updates in exploration mode (slider adjustment → state change → data package recomputation → prop update → component re-render) flow through React's standard unidirectional data model. The recomputation is a pure function (parameters in, data package out) that sits naturally in a `useMemo` with parameter dependencies.

**[Part 3] Three-layer layout as component hierarchy.** The three-layer persistent visibility model (question, parameters, visualisation) maps naturally to React's component hierarchy — each layer as a component receiving shared state from a common parent or context provider. The overall screen layout is a React layout concern, with CSS (likely CSS modules or a utility framework) handling the spatial arrangement. The tabbed/toggle format switching in exploration mode is a standard React UI pattern (controlled tab state, conditional rendering of the active visualisation component).

---

## Part 3: Exploration Mode

*First assembled user experience.*

**Current status:** Layout topology, initial state, and control architecture confirmed. Remaining details (proportions, styling, responsive breakpoints, animation coordination) are building-phase decisions to be resolved empirically during coding.

### Scope

**What this part produces:** The first complete, usable version of the tool — assembling Part 1's visualisation components and Part 2's parameter/scenario infrastructure into a working exploration mode. This is the supervisor's baseline expectation.

**What's in:**
- Overall screen layout realising the three-layer persistent visibility model as UI
- Tabbed/toggle format switching between icon array and frequency tree (one format at a time)
- Wiring parameter changes to live visualisation updates
- Exploration-mode-specific behaviour: full construction state, regrouping toggle, cross-branch combination persistently visible in tree view
- Display mode toggle (frequency ↔ probability) affecting all three layers simultaneously
- Scenario loading from the scenario library
- Initial state configuration (what the user sees on first load)
- Bayes' rule formula reference (click-to-reveal in probability mode)

**What's out:**
- Step-by-step construction sequences, scaffolding, fading → Part 4
- Specific scenario content (which scenarios, which parameters, which domain vocabulary) → Part 5
- Side-by-side view (both formats simultaneously) → scoped out for current build phase, could-cut

### Layout Topology — confirmed: sidebar + top strip + main area, responsive

**The binding constraint:** The exploration mode interaction loop requires the user to drag a parameter slider and *simultaneously watch* the visualisation respond. Parameter controls and the visualisation must be in the user's visual field at the same time. If the user has to scroll or shift visual attention significantly to find the controls, the live-updating experience breaks — the pedagogical power depends on the immediacy of seeing rates map to counts.

**Desktop layout:**

- **Top strip:** Question/problem statement text, scenario selector, and display mode toggle (frequency ↔ probability). These are "framing" elements — they set the context for what the user sees below. The question text is the most important element here (it anchors the reasoning task); the scenario selector and display mode toggle are controls that reframe the entire display.

- **Sidebar (left):** Parameter controls ($N$ selector, base rate slider, sensitivity slider, FPR slider) plus derived results display (total test-positive rate, posterior). The sidebar provides vertical space for all controls and results in a natural top-to-bottom flow that mirrors the parameter dependency chain ($N$ → base rate → sensitivity/FPR → derived results).

- **Main area:** The visualisation (icon array or frequency tree, one at a time), filling the remaining space. The format selector (icon array ↔ tree) lives at the top of this area. The regrouping toggle lives near the icon array (contextual — only when icon array is displayed). The Bayes' rule formula reference (click-to-reveal, probability mode only) also lives in this area.

**Narrow/mobile layout:** The sidebar stacks above or collapses, with the parameter controls becoming a compact horizontal band or collapsible section above the visualisation. The top strip remains at the top. The visualisation takes full width below.

**Why sidebar rather than stacked or bottom parameters:**

A fully stacked layout (question → parameters → visualisation, top to bottom) was considered. It works on narrow screens but on desktop it reduces the visualisation's vertical space — which matters for the frequency tree's vertical layout and for the icon array's preference for a roughly square container. The sidebar gives the visualisation maximum contiguous area while keeping parameters always visible and in the same visual field.

Parameters below the visualisation was considered and rejected: the user would be looking down at sliders while the visual response happens above, breaking the simultaneous viewing that makes live updating pedagogically effective.

### Control Architecture — confirmed: three functional groups

The controls are grouped by *what they affect*, not by widget type. This grouping prevents "which toggle does what?" confusion by spatially separating controls with different scopes.

**Group 1 — Problem context (top strip): "What problem am I looking at?"**

- *Scenario selector:* Picks a pre-built scenario or custom exploration. When a scenario is loaded, all parameters are set to the scenario's values and domain vocabulary updates throughout all generated text (per Part 2's scenario loading behaviour specification).
- *Display mode toggle (frequency ↔ probability):* Affects the entire display — question text, parameter labels, visualisation labels, all three layers simultaneously. This is the broadest-scope control in the tool, which is why it lives at the highest spatial level (the top strip) rather than near a specific component.

**Group 2 — Parameters (sidebar): "What are the numerical values?"**

- *$N$ selector:* Discrete presets (100, 200, 500, 1000) via segmented control, dropdown, or radio group.
- *Base rate slider:* Continuous with $N$-relative steps.
- *Sensitivity slider:* Continuous with $1\%$ steps.
- *FPR slider:* Continuous with $1\%$ steps.
- *Derived results display (read-only):* Total test-positive rate and posterior. Visually distinguished from input controls — the user should see at a glance which values they can adjust and which are computed.

All parameter controls follow Part 2's functional specification (ranges, steps, constraints, display format, live updating during drag).

**Group 3 — Viewing options (visualisation area): "How am I viewing the result?"**

- *Format selector (icon array ↔ frequency tree):* Tabs or toggle at the top of the visualisation area. Switches which visualisation component is displayed. The question and parameters stay the same — only the visual representation changes.
- *Regrouping toggle:* Switches the icon array between grouped-by-condition and grouped-by-test-result, triggering the regrouping animation. Only relevant when the icon array is displayed — when the tree is active, this control either disappears or is disabled. Its label should make the operation clear without requiring prior knowledge (something like "Group by: Condition / Test Result" — exact wording is a building-phase decision following strand b wording principles).
- *Bayes' rule formula toggle:* Show/hide the formula reference. Only visible when probability mode is active. Persistent once opened (per the confirmed design in the Plan & Status document).

**Why the display mode toggle is in the top strip, not near the visualisation:**

The display mode toggle (frequency ↔ probability) and the format selector (icon array ↔ tree) could both plausibly live in the visualisation area. But they have fundamentally different scopes. The format selector changes *which visual component is displayed* — a local change within the visualisation area. The display mode toggle changes *the representational framing of the entire display* — question text rephrases, parameter labels switch between counts and notation, visualisation labels transform. Placing the display mode toggle in the top strip (where it sits alongside other "whole display" controls like the scenario selector) correctly communicates its scope. Placing it near the visualisation would suggest it only affects the visual, when it actually affects all three persistent layers.

### Initial State — confirmed: mammography scenario in frequency mode

**On first load, the tool presents:**

- **Scenario:** Mammography screening (the canonical Bayesian reasoning benchmark — prevalence ~1%, sensitivity ~90%, FPR ~9%). Three reasons for this as the default: (1) it's the benchmark task of the entire literature, putting the user directly into the motivating problem space; (2) the most surprising Bayesian insight (most positive tests are false positives at low base rates) is most dramatic at mammography-like parameters, making the user's first experience the "wait, only 9 out of 98?" moment; (3) the tool is specifically designed to handle it (hybrid $N$, multi-scale interaction, compound labels — all exist because mammography at $N = 1000$ is the hardest case).

- **Display mode:** Frequency (the pedagogically preferred representation — the tool is frequency-first; probability mode is the bridge, not the starting point).

- **Format view:** Icon array (more concrete/spatial — matches the concrete-to-abstract progression established in the format architecture, and is the supervisor's starting direction).

- **Grouping state:** Grouped-by-condition (the default partition view — the user hasn't performed any regrouping operation yet; they see the base-rate partition and the test-result sub-partitions within each condition group).

- **Construction state:** Full (exploration mode always shows the complete partition — step-by-step construction is guided mode's concern, Part 4).

- **Cross-branch combination:** Persistently shown when the user switches to tree view (per the exploration mode behaviour confirmed in Plan & Status, Phase 3 strand a).

- **Bayes' rule formula:** Hidden (click-to-reveal; not shown on first load — the user starts in frequency mode where the formula isn't available anyway).

### Cross-Part Flags from Parts 1 and 2

The following items were flagged during Parts 1 and 2 specification as Part 3 concerns. Their resolution status:

**Live updating during slider drag — animation vs. direct update.** During live dragging, visualisations should update positions/colours directly. GSAP animations (regrouping, construction steps) should not trigger mid-drag — animations are reserved for discrete state transitions. If rendering can't keep up at 60fps, standard throttling applies. → Building-phase concern. The data package recomputation is trivially fast; the potential bottleneck is Part 1's rendering at $N = 1000$ if colours or layout change every frame. Standard throttling (skip intermediate frames, always render final position) handles this.

**Sticky slider UX mitigation.** At small $N_D$, many slider positions produce the same integer count. → Building-phase concern. The display's emphasis on counts over rates (Y2 format) already helps. Additional mitigation (subtle visual indication near thresholds) can be explored during building.

**$N$-change notification display.** When switching $N$ presets forces the base rate to snap, the parameter panel should briefly indicate the adjustment. → Building-phase concern. Visual treatment (highlight, tooltip, momentary annotation) resolved during building.

**Degenerate state displays.** Messages for $N_{T^+} = 0$, zero-from-rounding, and small $N_D$ are generated by Part 2's template system. → Part 3 handles where these appear and how they're styled. Building-phase concern.

**Glossary component layout.** If built (could-cut), a collapsible panel accessible from the parameter area. → Not blocking Part 3. Can be added during or after core exploration mode build.

**Format-switching as coordinated transition.** Cross-fade of text content across all three layers, 200–400ms. → Part 3 orchestrates the visual transition using GSAP timelines. Specific timing and coordination resolved during building.

**Parameter control spatial integration.** Y2 display format needs enough space to be readable; Bayesian parentheticals add label length; $N$ selector visually distinct from rate sliders; derived results visually distinguished from input parameters. → Building-phase layout tuning.

### Building-Phase Decisions (not specified — to be resolved empirically during coding)

The following are flagged as decisions that benefit more from seeing the built result than from further specification. They are listed here so they are not forgotten and can be tracked during development.

- Exact proportions of sidebar vs. main visualisation area
- Responsive breakpoint(s) for sidebar → stacked transition
- Whether the problem statement text is always visible or collapsible (depends on how much vertical space it consumes relative to the question)
- Visual styling of toggles, selectors, and controls (button groups, tabs, switches, segmented controls — aesthetic/UX choices)
- Whether the scenario selector is a dropdown, card picker, or other widget
- Exact label text on all controls (guided by strand b wording principles but resolved by seeing them in context)
- Whether the parameter panel needs internal scrolling on smaller desktop screens
- Exact placement and appearance of the regrouping toggle relative to the icon array
- Exact placement and appearance of the Bayes' rule formula toggle and formula display
- Animation coordination during live slider dragging (throttling strategy if rendering can't sustain 60fps)
- Any first-time-user affordance (welcome state, subtle hints, tooltip on first visit) — if needed at all
- Exact responsive behaviour of the format selector tabs when sharing space with contextual controls (regrouping toggle)

These are all low-cost-of-change decisions — adjusting a proportion, swapping a widget type, or repositioning an element once it exists is fast. Specifying them in advance would be guessing at answers that are better discovered by looking at the actual UI.

### Notes for Later

[Report — Technical Quality] **The layout topology as an implementation of the three-layer persistent visibility model.** The screen layout directly realises the three-layer model established in the design decisions: the top strip is the question layer, the sidebar is the parameter layer, and the main area is the visualisation layer. Each layer has its own spatial region, all three are simultaneously visible (on desktop), and format-switching affects all three simultaneously. The layout isn't an arbitrary arrangement of UI elements — it's the persistent visibility model made concrete as a spatial hierarchy. Under Technical Quality, "the designs are very well considered, clear, and easy to understand" rewards this kind of principled layout-from-design-model mapping.

[Report — Technical Quality] **Control grouping by scope as a design decision.** The three control groups (problem context in top strip, parameters in sidebar, viewing options in visualisation area) are separated by *what they affect*: the scenario selector and display mode toggle affect the entire display; parameter sliders affect the numerical values; the format selector and regrouping toggle affect the visual presentation. This functional grouping prevents confusion between controls with different scopes (particularly the display mode toggle vs. the format selector, which are both "switches" but operate at different levels). Articulating this in the report demonstrates UI design reasoning grounded in the tool's information architecture.

[Report — Technical Quality] **Mammography as initial state — not a default, a design choice.** The decision to start with mammography is grounded in three specific reasons (canonical benchmark, most dramatic Bayesian insight, hardest design case). This is worth articulating briefly in the report to show that even the initial state was considered rather than arbitrary. The frequency-mode / icon-array / grouped-by-condition starting configuration follows from the tool's pedagogical commitments (frequency-first, concrete-to-abstract progression, construction sequence as the reasoning process).

---

## Part 5: Scenario Library Content

*Specific scenarios applying established principles.*

**Current status:** Complete. Six scenarios selected, fully specified with numerical parameters, domain vocabulary (including new singular/grammatical fields), and complete template verification.

---

### Selection Principles

The scenario library was selected as a *collection*, not as six independent choices. Seven dimensions governed the selection, each grounded in the project's established design principles and literature base:

**1. Parameter profile diversity.** The Extracted Insights note that scenarios should have "interesting parameter profiles (e.g., very low prevalence to highlight base-rate effects, moderate prevalence where intuition is less reliable, different sensitivity/specificity trade-offs)." Each scenario teaches a distinct lesson about how base rate, sensitivity, and FPR interact to determine the posterior. A library where every scenario has low base rate and moderate test accuracy would repeat one lesson six times.

**2. Domain diversity for transfer.** The representation training literature emphasises that durable skill comes from practising across varied contexts. The structural labels, colour scheme, and template sentence structure stay identical across all scenarios — only the domain vocabulary changes. This is itself a pedagogical mechanism: the user sees the same Bayesian structure in different domains, building recognition that the reasoning pattern is domain-general.

**3. Clean integers at author-specified $N$.** Per Part 2's design (cascading rounding with $N$-relative steps), the template generates text with integer counts ("Of the 990 who do not have the disease, 89 test positive"). Parameters are chosen to minimise rounding at each scenario's $N$. See the integer verification under each scenario below.

**4. Template naturalness.** All domain vocabulary fields must slot into the parameterised template and produce natural English. This was verified by running all six scenarios through all ten template outputs — see Template Verification below.

**5. Emotional loading gradient.** Medical scenarios carry motivational weight (the "this matters because physicians get it wrong" framing) but can provoke anxiety. The library spans from cancer screening (highest loading) through routine tests (moderate) to spam filtering (none), providing an emotional gradient that lets users engage at their comfort level.

**6. Benchmark comparability.** The mammography problem with its published parameters enables direct comparison to the experimental literature's baseline figures. This scenario preserves exact comparability. Others use realistic but not necessarily literature-exact parameters.

**7. Pedagogical "surprise" value.** The posterior should be counterintuitive given the inputs — this is what creates the "aha" moment that motivates understanding. A scenario where the test accuracy roughly matches the PPV doesn't teach the base-rate lesson.

---

### Parameter Profile Framework

Five distinct parameter profiles were identified, each teaching a qualitatively different lesson:

| Profile | Base rate | Test quality | PPV | Primary lesson |
|---|---|---|---|---|
| A — Low BR + moderate test | ~1% | Moderate | Very low (~9%) | The canonical base-rate neglect demonstration |
| B — Very low BR + excellent test | ~0.5% | Excellent (99%/99%) | Still low (~33%) | Even excellent tests fail at very low prevalence — isolates the base-rate mechanism |
| C — Moderate BR + mediocre sensitivity | ~10% | Good specificity, weak sensitivity | Moderate (~64%) | Many missed cases (high FN) — the sensitivity lesson |
| D — Low-moderate BR + decent test | ~5% | Good (90%/95%) | ~50% | About half of positive results are wrong — the "coin flip" |
| D variant — Ethical dimension | ~10% | Good (95%/95%) | ~68% | False positives with tangible social consequences |
| E — Higher BR + good test | ~25% | Good | High (~75%) | PPV is reasonable — base rate "rescues" test performance |

The profiles span the parameter space in pedagogically distinct ways and together tell a coherent story about how base rate, sensitivity, and FPR interact. The PPV gradient across the library (9% → 33% → 49% → 64% → 68% → 75%) makes the base-rate effect visible as a trend: as prevalence rises, PPV rises — even when test quality varies.

[Report — Technical Quality] **The parameter profile framework as principled scenario selection.** The scenarios were not chosen arbitrarily or by listing "interesting examples." They were selected against a parameter profile framework that identifies five qualitatively distinct lessons about the interaction between base rate, sensitivity, and FPR. Each scenario occupies a different region of the parameter space and teaches a different lesson. The framework ensures the library as a collection covers the conceptual territory systematically — very low to moderate base rates, excellent to mediocre tests, very low to high PPV. This demonstrates that the scenario design is as principled as the visualisation design: both are grounded in what the literature identifies as the important cognitive territory to cover.

[Report — Technical Quality] **The PPV gradient as a pedagogical design feature.** The library's PPV values (9%, 33%, 49%, 64%, 68%, 75%) form a gradient that makes the base-rate effect visible as a trend across scenarios, not just within one. A user who browses through the scenarios — or explores by switching between them — sees that the base rate is the dominant factor determining PPV, even as test quality varies. This cross-scenario gradient complements the within-scenario parameter manipulation in exploration mode (where the user drags the base-rate slider and watches PPV change continuously). The gradient is a designed property of the collection, not an incidental outcome.

---

### Scenario Definitions

#### Scenario 1: Mammography Screening

**Profile:** A — Low base rate + moderate test → shockingly low PPV.

**Role in the library:** The canonical Bayesian reasoning benchmark. This is the problem most frequently used in the experimental literature (Brase 2009, 2014; Gigerenzer & Hoffrage, 1995). It serves as the initial state in exploration mode, the primary benchmark for evaluation comparability, and the scenario most users will encounter first.

**Numerical parameters:**

| Parameter | Value |
|---|---|
| `base_rate` | 0.01 |
| `sensitivity` | 0.90 |
| `specificity` | 0.91 |
| `fpr` | 0.09 (derived from specificity) |
| `n` | 1000 |

**Integer verification at $N = 1000$:**
- $N_D = 10$, $N_{\neg D} = 990$ — clean
- $N_{TP} = 9$, $N_{FN} = 1$ — clean ($10 \times 0.90 = 9.0$)
- $N_{FP} = 89$, $N_{TN} = 901$ — near-clean ($990 \times 0.09 = 89.1$, rounds to 89)
- $N_{T^+} = 98$. Posterior: $9/98 \approx 9.18\%$
- All four partition cells populated. One rounding (FP), negligible (0.1 person).

**$N$ choice:** $N = 1000$ is required by the 1% base rate — at $N = 100$, only 1 person has the disease, and $N_{TP}$ rounds to 1 or 0 depending on sensitivity. At $N = 1000$, the icon array is in the multi-scale interaction regime (gestalt + labels rather than individual counting), but the base-rate salience is visually dramatic (10 warm icons in a sea of 990 cool icons). The regrouping animation — 89 false positives joining 9 true positives to form the 98-person test-positive group — is enhanced at this scale because the size disparity between source groups is extreme (see Plan & Status, Notes for Later, "[Report — Technical Quality] The regrouping animation is more effective at high $N$ with low base rates").

**Domain vocabulary:**

| Field | Value |
|---|---|
| `population_name` | "people" |
| `condition_name` | "have the disease" |
| `condition_negative_name` | "do not have the disease" |
| `test_name` | "the mammogram" |
| `test_positive_name` | "test positive" |
| `test_negative_name` | "test negative" |
| `sensitivity_domain_name` | "Sensitivity" (default) |
| `fpr_domain_name` | "False positive rate" (default) |
| `population_singular` | "a person" |
| `condition_name_singular` | "has the disease" |
| `test_positive_name_singular` | "tests positive" |
| `relative_pronoun` | "who" |
| `test_action` | "are tested" |
| `base_rate_domain_name` | "prevalence of the disease" |
| `specificity` | 0.91 |

**Metadata:**

| Field | Value |
|---|---|
| `id` | "mammography" |
| `name` | "Mammography Screening" |
| `domain` | "medical" |
| `description` | "Breast cancer screening — the most studied Bayesian reasoning problem" |

---

#### Scenario 2: Rapid COVID Antigen Test

**Profile:** C — Moderate base rate + mediocre sensitivity → many missed cases.

**Role in the library:** Shifts the lesson from false positives (mammography's focus) to false negatives — rapid antigen tests are known for missing cases. Student-relatable (familiar, less anxiety-provoking than cancer screening). The moderate base rate (10%, among symptomatic patients) contrasts sharply with mammography's 1%, showing a different region of the parameter space.

**Why "symptomatic patients" framing:** The 10% base rate is justified as prevalence among a *pre-selected* population (people presenting with symptoms), not general population prevalence. This is a deliberate framing choice that teaches an incidental but important lesson: the base rate depends on the population you're testing. A user who, in exploration mode, drags the base rate down toward the general-population COVID prevalence (<<1%) would see the PPV collapse — discovering that the same test behaves very differently in different contexts. This connects to the concept of pre-test probability, which is central to medical decision-making and to Bayesian reasoning generally.

**Numerical parameters:**

| Parameter | Value |
|---|---|
| `base_rate` | 0.10 |
| `sensitivity` | 0.80 |
| `specificity` | 0.95 |
| `fpr` | 0.05 (derived from specificity) |
| `n` | 200 |

**Integer verification at $N = 200$:**
- $N_D = 20$, $N_{\neg D} = 180$ — clean
- $N_{TP} = 16$, $N_{FN} = 4$ — clean ($20 \times 0.80 = 16.0$)
- $N_{FP} = 9$, $N_{TN} = 171$ — clean ($180 \times 0.05 = 9.0$)
- $N_{T^+} = 25$. Posterior: $16/25 = 64.0\%$
- **Perfectly clean — all integer, no rounding.** All four cells populated.

**$N$ choice:** $N = 200$ at 10% base rate gives 20 condition-positive icons — well above the visibility threshold, individually countable. The icon array is in the moderate-$N$ regime where individual icons are clearly discrete objects, supporting direct manipulation interaction. The total of 200 icons fits comfortably in a typical viewport.

**Domain vocabulary:**

| Field | Value |
|---|---|
| `population_name` | "symptomatic patients" |
| `condition_name` | "have COVID" |
| `condition_negative_name` | "do not have COVID" |
| `test_name` | "the rapid antigen test" |
| `test_positive_name` | "test positive" |
| `test_negative_name` | "test negative" |
| `sensitivity_domain_name` | "Sensitivity" (default) |
| `fpr_domain_name` | "False positive rate" (default) |
| `population_singular` | "a symptomatic patient" |
| `condition_name_singular` | "has COVID" |
| `test_positive_name_singular` | "tests positive" |
| `relative_pronoun` | "who" |
| `test_action` | "are tested" |
| `base_rate_domain_name` | "COVID prevalence among symptomatic patients" |
| `specificity` | 0.95 |

**Metadata:**

| Field | Value |
|---|---|
| `id` | "covid_antigen" |
| `name` | "Rapid COVID Antigen Test" |
| `domain` | "medical" |
| `description` | "Rapid testing of symptomatic patients — illustrating the missed-cases problem" |

---

#### Scenario 3: Blood Donation Screening

**Profile:** B — Very low base rate + excellent test → still surprisingly low PPV.

**Role in the library:** The single most powerful isolation of the base-rate effect. Both sensitivity and specificity are 99%, yet PPV is only 33%. This teaches a qualitatively different lesson from mammography: mammography's low PPV is partly attributable to the test's moderate FPR (9%). Here, the test is excellent by any standard, and prevalence alone drives PPV down. It isolates the base-rate mechanism from test quality.

**The empty FN cell ($N_{FN} = 0$).** At 99% sensitivity on a group of 5, $5 \times 0.01 = 0.05$, which rounds to 0. One of the four partition cells is empty. This was a deliberate design choice — evaluated and accepted for three reasons:

1. *The empty cell IS the punchline.* The scenario's lesson is that test quality isn't the problem. A test that catches literally everyone who has the condition ($N_{FN} = 0$) and has only a 1% false positive rate *still* gives 33% PPV at 0.5% prevalence. If the FN cell were filled by lowering sensitivity (e.g., to 90%), the user might attribute the low PPV partly to missed cases, muddying the base-rate-isolation message. The mammography scenario already teaches the "moderate test + low base rate" lesson; this scenario must teach the "excellent test + very low base rate" lesson, which requires the FN cell to be empty or near-empty.

2. *Every other scenario in the library demonstrates the full four-partition structure.* The user has seen all four categories in mammography, COVID, spam, factory, and drug screening before encountering this scenario. The four-partition structure is well-established. Seeing it at zero in blood donation is a variation on a familiar structure, not a gap.

3. *The visualisation handles it gracefully.* In the icon array, the entire condition-positive group is uniformly "detected" (no shade variation) — visually clean, not broken. In the frequency tree, the FN leaf shows "0" and the branch still exists structurally — making explicit that the FN pathway exists even when empty. The tree representation is arguably more informative in this case than in scenarios where $N_{FN} > 0$, because it shows that sensitivity of 99% applied to 5 people produces 0 misses — the rounding is itself part of the story about how natural frequencies work with very small groups.

[Report — Technical Quality] **The empty FN cell as a principled design choice, not an oversight.** The blood donation scenario deliberately produces $N_{FN} = 0$ at its author-specified $N$. This was not an accidental consequence of parameter choices — it was evaluated against the alternative (lowering sensitivity to force a non-zero FN) and accepted because the empty cell is essential to the scenario's pedagogical purpose: isolating the base-rate effect from test quality. Documenting this as a considered design choice (with the alternative explicitly rejected) demonstrates that the scenario design accounts for edge cases in the visualisation and makes deliberate trade-offs between visual completeness and pedagogical clarity.

**Framing: "Blood Donation Screening" rather than "HIV Screening."** Three framings were evaluated:

- *"HIV Screening (Blood Bank)"*: Specific, recognisable, widely used in the published literature. But HIV carries stigma that could distract from the mathematical lesson, and the scenario might inadvertently reinforce associations between blood donation and disease risk that public health messaging actively works against.
- *"Blood Donation Screening"*: Process-focused. The blood-donation context is concrete enough to be meaningful — the user understands why screening matters and why high sensitivity is essential (contaminated blood must not pass through). It doesn't name a specific disease, keeping focus on the mathematical structure. The scenario metadata and report can cite the HIV/hepatitis screening literature for grounding without making the in-tool problem text about a stigmatised condition.
- *"Rare Disease Screening"*: Too abstract. Loses the distinctive blood-donation context. "Have the disease" / "test positive" vocabulary is functionally identical to mammography, making the scenarios feel like parameter variations rather than distinct domains.

The blood-donation framing was chosen: concrete, process-focused, lower emotional loading than naming HIV, and domain vocabulary ("carry the virus," "are flagged," "are screened") that sounds distinctively different from the other medical scenarios.

**Numerical parameters:**

| Parameter | Value |
|---|---|
| `base_rate` | 0.005 |
| `sensitivity` | 0.99 |
| `specificity` | 0.99 |
| `fpr` | 0.01 (derived from specificity) |
| `n` | 1000 |

**Integer verification at $N = 1000$:**
- $N_D = 5$, $N_{\neg D} = 995$ — clean
- $N_{TP} = 5$, $N_{FN} = 0$ — near-clean ($5 \times 0.99 = 4.95$, rounds to 5; $N_{FN} = 5 - 5 = 0$)
- $N_{FP} = 10$, $N_{TN} = 985$ — near-clean ($995 \times 0.01 = 9.95$, rounds to 10)
- $N_{T^+} = 15$. Posterior: $5/15 = 33.3\%$
- Two roundings (TP and FP), both small (0.05 person each). $N_{FN} = 0$ — one cell empty (see above).

**$N$ choice:** $N = 1000$ is required by the 0.5% base rate — at $N = 200$, only 1 person carries the virus (too few for meaningful partition). At $N = 1000$, the 5 warm-coloured icons in a sea of 995 cool-coloured icons produce the most visually dramatic base-rate display in the entire library — the tiny warm cluster makes the "this condition is rare" point viscerally.

**Domain vocabulary:**

| Field | Value |
|---|---|
| `population_name` | "blood donations" |
| `condition_name` | "carry the virus" |
| `condition_negative_name` | "do not carry the virus" |
| `test_name` | "the screening test" |
| `test_positive_name` | "are flagged" |
| `test_negative_name` | "are cleared" |
| `sensitivity_domain_name` | "Sensitivity" (default) |
| `fpr_domain_name` | "False positive rate" (default) |
| `population_singular` | "a blood donation" |
| `condition_name_singular` | "carries the virus" |
| `test_positive_name_singular` | "is flagged" |
| `relative_pronoun` | "that" |
| `test_action` | "are screened" |
| `base_rate_domain_name` | "virus prevalence among donations" |
| `specificity` | 0.99 |

**Metadata:**

| Field | Value |
|---|---|
| `id` | "blood_donation" |
| `name` | "Blood Donation Screening" |
| `domain` | "medical" |
| `description` | "Screening blood donations for infectious diseases — even a 99% accurate test produces many false alarms at very low prevalence" |

---

#### Scenario 4: Email Spam Filter

**Profile:** E — Higher base rate + good test → PPV is high.

**Role in the library:** First purely non-medical scenario. Technology domain, directly relevant for CS students. The highest base rate in the library (25%) means PPV is reasonable (75%) — this is the "base rate rescues test performance" scenario that contrasts with mammography's "base rate destroys test performance." No emotional loading. Demonstrates Bayesian structure in a completely different context — the "same maths, different clothes" moment that supports transfer of learning.

**Why the PPV contrast with mammography matters pedagogically:** A user who has just seen mammography's 9% PPV switches to spam filtering and sees 75% PPV with a similarly-imperfect test. The base rate is the dominant change (1% → 25%). This cross-scenario contrast, combined with the within-scenario parameter manipulation in exploration mode, reinforces the base-rate lesson from two directions: the user sees it as a trend across curated points AND as a continuous relationship when they drag the slider.

**Vocabulary repetition avoidance.** An early vocabulary draft used `test_positive_name` = "are flagged as spam." This creates the sentence "Of the 50 that are spam, 45 are flagged as spam" — "spam" appears twice. The revised vocabulary uses "are flagged" (without restating the condition), producing "Of the 50 that are spam, 45 are flagged." The problem statement already establishes that the filter is a spam filter; restating "as spam" in every test-result reference is redundant and reads poorly.

**Numerical parameters:**

| Parameter | Value |
|---|---|
| `base_rate` | 0.25 |
| `sensitivity` | 0.90 |
| `fpr` | 0.10 |
| `n` | 200 |

**Integer verification at $N = 200$:**
- $N_D = 50$ (spam), $N_{\neg D} = 150$ (legitimate) — clean
- $N_{TP} = 45$ (correctly flagged), $N_{FN} = 5$ (spam that got through) — clean ($50 \times 0.90 = 45.0$)
- $N_{FP} = 15$ (legitimate flagged), $N_{TN} = 135$ — clean ($150 \times 0.10 = 15.0$)
- $N_{T^+} = 60$. Posterior: $45/60 = 75.0\%$
- **Perfectly clean — all integer, no rounding.** All four cells populated.

**$N$ choice:** $N = 200$ at 25% base rate gives 50 condition-positive icons — clearly visible, individually countable. The icon array is in the moderate-$N$ regime. The 50/150 split is visually unambiguous.

**Domain vocabulary:**

| Field | Value |
|---|---|
| `population_name` | "emails" |
| `condition_name` | "are spam" |
| `condition_negative_name` | "are not spam" |
| `test_name` | "the spam filter" |
| `test_positive_name` | "are flagged" |
| `test_negative_name` | "reach the inbox" |
| `sensitivity_domain_name` | "Detection rate" |
| `fpr_domain_name` | "False positive rate" (default) |
| `population_singular` | "an email" |
| `condition_name_singular` | "is spam" |
| `test_positive_name_singular` | "is flagged" |
| `relative_pronoun` | "that" |
| `test_action` | "arrive" |
| `base_rate_domain_name` | "spam rate" |

No `specificity` field — non-medical scenario; FPR is the native framing.

**Metadata:**

| Field | Value |
|---|---|
| `id` | "spam_filter" |
| `name` | "Email Spam Filter" |
| `domain` | "technology" |
| `description` | "Spam detection — when the base rate is high, a decent filter mostly gets it right" |

---

#### Scenario 5: Factory Quality Inspection

**Profile:** D — Low base rate + decent test → about half of rejections are wrong.

**Role in the library:** Second non-medical scenario, industrial/manufacturing context. The "coin flip" scenario — PPV is approximately 49%, meaning a positive result is essentially meaningless for prediction. This is its own distinctive and memorable lesson: "the inspection is 90% sensitive and 95% specific, and a positive result is no better than a coin flip." Emotionally neutral (products, not people). The near-equal TP and FP counts (18 vs 19) produce a visual property in the icon array that directly encodes the lesson — the two clusters look nearly identical in size, making the ~50% PPV geometrically self-evident before the user reads any numbers.

**$N = 400$ with 90%/5% rather than $N = 200$ with 80%/10% — evaluated trade-off.** Two parameter sets were considered:

- *$N = 200$, sensitivity 80%, FPR 10%:* PPV ~30%. More dramatic, but 80% sensitivity with 10% FPR represents a poor inspection system. The user might think "this inspection is terrible" rather than "even reasonable systems produce surprising results." Also, PPV at ~30% is close to blood donation's ~33%, creating a cluster in the library's PPV distribution.
- *$N = 400$, sensitivity 90%, FPR 5%:* PPV ~49%. More realistic test parameters (90% sensitivity and 95% specificity are plausible for visual inspection). Better PPV spread in the library (49% fills the gap between 33% and 64%). The near-equal TP/FP counts (18 vs 19) produce a visual encoding that embodies the lesson: the TP and FP clusters in the icon array look nearly identical, making the coin-flip PPV geometrically obvious.

The $N = 400$ version was chosen: more realistic parameters, better PPV distribution across the library, and a visual property (near-equal clusters) that directly encodes the pedagogical message. Given that the tool's purpose is making probability structure visually transparent, choosing parameters whose visual encoding IS the lesson is the right trade-off.

[Report — Technical Quality] **Visual encoding that embodies the lesson — the factory inspection "coin flip."** The factory inspection scenario's parameters were chosen so that $N_{TP} = 18$ and $N_{FP} = 19$ — the two groups that compose the positive-test class are nearly identical in size. In the icon array, the TP and FP spatial clusters are visually indistinguishable in area, making the ~49% PPV geometrically self-evident before any number is read. This is an example of choosing scenario parameters not just for mathematical interest but for *visual-pedagogical alignment* — the icon array's geometric properties directly encode the lesson the scenario teaches. This goes beyond "we generated a grid of icons" to "we designed the scenario so that the grid's visual properties carry meaning."

**Numerical parameters:**

| Parameter | Value |
|---|---|
| `base_rate` | 0.05 |
| `sensitivity` | 0.90 |
| `fpr` | 0.05 |
| `n` | 400 |

**Integer verification at $N = 400$:**
- $N_D = 20$ (defective), $N_{\neg D} = 380$ (good) — clean
- $N_{TP} = 18$ (correctly caught), $N_{FN} = 2$ (defective passed) — clean ($20 \times 0.90 = 18.0$)
- $N_{FP} = 19$ (good items rejected), $N_{TN} = 361$ — clean ($380 \times 0.05 = 19.0$)
- $N_{T^+} = 37$. Posterior: $18/37 \approx 48.6\%$
- **Perfectly clean — all integer, no rounding.** All four cells populated.

**$N$ choice:** $N = 400$ is a 20×20 grid, still readable with individually distinguishable icons. The 20 defective items (5%) form a visible cluster; the 19 false rejections form a near-identical cluster. $N = 400$ is the only non-standard $N$ in the library (the others use 200 or 1000), which naturally differentiates the scenario in the UI and demonstrates that $N$ is a designed parameter per scenario, not a fixed default.

**Domain vocabulary:**

| Field | Value |
|---|---|
| `population_name` | "items" |
| `condition_name` | "are defective" |
| `condition_negative_name` | "are not defective" |
| `test_name` | "the inspection" |
| `test_positive_name` | "are rejected" |
| `test_negative_name` | "pass inspection" |
| `sensitivity_domain_name` | "Detection rate" |
| `fpr_domain_name` | "False rejection rate" |
| `population_singular` | "an item" |
| `condition_name_singular` | "is defective" |
| `test_positive_name_singular` | "is rejected" |
| `relative_pronoun` | "that" |
| `test_action` | "are inspected" |
| `base_rate_domain_name` | "defect rate" |

No `specificity` field — non-medical scenario; FPR/false rejection rate is the native framing.

**Metadata:**

| Field | Value |
|---|---|
| `id` | "factory_inspection" |
| `name` | "Factory Quality Inspection" |
| `domain` | "manufacturing" |
| `description` | "Quality inspection — when defects are rare, about half of all rejections are wrong" |

---

#### Scenario 6: Workplace Drug Screening

**Profile:** D variant — Low-moderate base rate + good test → false positives with tangible social consequences.

**Role in the library:** The sixth scenario, deliberately included despite partial parameter-profile overlap with factory inspection. Drug screening occupies the same broad profile (decent test, still lots of false positives) but adds three dimensions that factory inspection cannot provide:

1. *The decision-cost dimension.* Factory inspection's false positives waste products (economic cost to the company). Drug screening's false positives accuse people (reputational/career cost to an individual). The question "is a 68% PPV good enough to act on?" has a very different answer when acting means discarding a widget versus firing someone. This adds qualitative depth that pure numbers don't capture — the user naturally *feels* the asymmetry between false positive and false negative costs, without the tool needing to formally model decision costs (which would be scope expansion). The tool shows the numbers; the ethical reflection happens in the user's head.

2. *A base rate the user can question.* Drug use prevalence in a workplace population (the 10% figure) is itself an assumption that depends on context — pre-employment vs random testing, industry, demographics. In medical scenarios, prevalence feels like a fixed fact of nature. In drug screening, the base rate is transparently an *input that someone chose*, which draws attention to the base rate as a modelling decision rather than a given.

3. *A distinct parameter profile from factory inspection.* Drug screening has higher base rate (10% vs 5%), higher sensitivity (95% vs 90%), same FPR (5%), and higher PPV (68% vs 49%). The lessons differ: factory inspection teaches "positive result is a coin flip"; drug screening teaches "1 in 3 positives is wrong, and the 1 is a person."

**Why this is the most cuttable scenario but still included.** If time pressure required dropping a scenario, this would be the first to go — the library works at five without it. The factory inspection and spam filtering scenarios provide the non-medical/non-workplace domain diversity needed for transfer. But at six scenarios (well within the ~5–10 target), the ethical-consequences dimension is worth having. For the report, describing the scenario library as spanning "medical diagnosis → industrial process → workplace policy" contexts reads well under Technical Quality and demonstrates awareness that Bayesian reasoning applies across domains with different stakes and different ethical considerations.

[Report — Technical Quality] **False positive costs as a design consideration for scenario selection.** The drug screening scenario was included not for parameter novelty but for the qualitative dimension it adds: the user confronts the question of whether a given PPV is "good enough" in a context where false positives have social consequences (an innocent employee accused). This demonstrates that the scenario library design considers not just the mathematical properties of different parameter profiles but also the real-world contexts in which Bayesian reasoning matters — connecting the abstract tool to the applied literature on decision-making under uncertainty. The rubric's Technical Quality criterion rewards "understanding of the material" beyond the purely computational.

[Report — Background] **The confirmatory test as a natural Bayesian updating story.** In practice, positive drug screens are confirmed with a more specific test (e.g., GC-MS after immunoassay). This sequential testing process is itself a natural example of Bayesian updating: the posterior from the first test becomes the prior for the second. While the tool does not implement sequential updating (this would be a substantial scope expansion), the drug screening scenario provides natural material for discussing this concept in the report's Further Work section. The connection between the tool's single-test framework and the real-world multi-test workflow is a genuine limitation worth articulating.

**Numerical parameters:**

| Parameter | Value |
|---|---|
| `base_rate` | 0.10 |
| `sensitivity` | 0.95 |
| `fpr` | 0.05 |
| `n` | 200 |

**Integer verification at $N = 200$:**
- $N_D = 20$ (users), $N_{\neg D} = 180$ (non-users) — clean
- $N_{TP} = 19$ (correctly identified), $N_{FN} = 1$ (missed) — clean ($20 \times 0.95 = 19.0$)
- $N_{FP} = 9$ (falsely accused), $N_{TN} = 171$ — clean ($180 \times 0.05 = 9.0$)
- $N_{T^+} = 28$. Posterior: $19/28 \approx 67.9\%$
- **Perfectly clean — all integer, no rounding.** All four cells populated.

**$N$ choice:** $N = 200$ at 10% base rate gives 20 condition-positive icons — same moderate-$N$ regime as the COVID scenario. The 10% base rate happens to match COVID's, but the scenarios teach different lessons (drug screening: good test but still many FPs; COVID: mediocre sensitivity, many missed cases).

**Domain vocabulary:**

| Field | Value |
|---|---|
| `population_name` | "employees" |
| `condition_name` | "use drugs" |
| `condition_negative_name` | "do not use drugs" |
| `test_name` | "the screening test" |
| `test_positive_name` | "test positive" |
| `test_negative_name` | "test negative" |
| `sensitivity_domain_name` | "Sensitivity" (default) |
| `fpr_domain_name` | "False positive rate" (default) |
| `population_singular` | "an employee" |
| `condition_name_singular` | "uses drugs" |
| `test_positive_name_singular` | "tests positive" |
| `relative_pronoun` | "who" |
| `test_action` | "are tested" |
| `base_rate_domain_name` | "drug use rate" |

No `specificity` field — drug screening uses sensitivity/FPR terminology natively (not specificity). Though drug tests are medical devices, the workplace context makes "false positive rate" more natural than "specificity" for the audience.

**Metadata:**

| Field | Value |
|---|---|
| `id` | "drug_screening" |
| `name` | "Workplace Drug Screening" |
| `domain` | "workplace" |
| `description` | "Routine workplace drug testing — about 1 in 3 positive results is a false accusation" |

---

### Library Summary

| # | Scenario | Domain | $N$ | Base rate | Sensitivity | FPR | PPV | Profile | All cells? | Clean? |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Mammography Screening | Medical | 1000 | 1% | 90% | 9% | 9.2% | A | Yes | Near (1 rounding) |
| 2 | Rapid COVID Antigen Test | Medical | 200 | 10% | 80% | 5% | 64.0% | C | Yes | Perfect |
| 3 | Blood Donation Screening | Medical | 1000 | 0.5% | 99% | 1% | 33.3% | B | No ($N_{FN}=0$) | Near (2 roundings) |
| 4 | Email Spam Filter | Technology | 200 | 25% | 90% | 10% | 75.0% | E | Yes | Perfect |
| 5 | Factory Quality Inspection | Manufacturing | 400 | 5% | 90% | 5% | 48.6% | D | Yes | Perfect |
| 6 | Workplace Drug Screening | Workplace | 200 | 10% | 95% | 5% | 67.9% | D variant | Yes | Perfect |

**Coverage:**
- Base rates: 0.5%, 1%, 5%, 10% (×2), 25% — three orders of magnitude in the parameter most people neglect
- PPV: 9%, 33%, 49%, 64%, 68%, 75% — full spectrum from "almost certainly wrong" to "mostly right"
- $N$ values: 200 (×3), 400 (×1), 1000 (×2) — three different icon-array scales
- Domains: 3 medical/quasi-medical, 1 technology, 1 manufacturing, 1 workplace
- Sensitivity: 80% to 99%; FPR: 1% to 10%
- Integer cleanliness: 4 of 6 perfectly clean; 2 with negligible rounding
- All four partition cells populated in 5 of 6 scenarios; one deliberate empty cell (blood donation $N_{FN} = 0$, justified above)

---

### Template Verification

All six scenarios were systematically run through all ten template outputs specified in Part 2 (frequency and probability problem statements, frequency and probability questions, parameter display strings, derived result strings, icon array compound labels for all four grouping/mode combinations, tree node labels, tree branch labels, cross-branch combination labels, degenerate state messages, and glossary entries).

**Issues found and resolved during verification:**

1. **Hardcoded "are tested" in frequency problem statement.** Broke for non-human/non-test populations — emails aren't "tested," items are "inspected," blood donations are "screened." Resolved by adding the `test_action` schema field.

2. **Hardcoded "who" in frequency problem statement and question templates.** Broke for non-human populations — "emails who are spam" is ungrammatical. Resolved by adding the `relative_pronoun` schema field ("who" for people, "that" for things).

3. **Hardcoded "a person who" in probability question template.** Broke for all non-human populations and had a verb conjugation problem even for human populations — the plural vocabulary forms ("test positive," "have the disease") don't work with a singular subject ("a person who test positive have the disease"). Resolved by adding `population_singular`, `condition_name_singular`, and `test_positive_name_singular` schema fields.

4. **Hardcoded "prevalence of [condition]" in probability problem statement.** Unnatural for non-medical domains — "the prevalence of spam" reads poorly vs. "the spam rate." Resolved by adding the `base_rate_domain_name` schema field.

5. **Vocabulary repetition in spam and factory scenarios.** Early drafts used `test_positive_name` = "are flagged as spam" and "are flagged as defective," producing "Of the 50 that are spam, 45 are flagged as spam" — the condition is restated. Resolved by revising to "are flagged" and "are rejected" respectively.

6. **Hardcoded "Nobody" in degenerate state messages.** "Nobody are flagged" doesn't work for non-human populations. Resolved by restructuring to "No [population_name] [test_positive_name]."

7. **`sensitivity_domain_name` and `fpr_domain_name` defaults.** The default "Sensitivity" is unnatural for spam filtering and factory inspection contexts, where "detection rate" is the domain term. Similarly, "false positive rate" is acceptable for most scenarios but "false rejection rate" is the standard quality-control term. Resolved by explicitly setting these fields for non-medical scenarios rather than accepting defaults.

8. **Spam `test_negative_name` too long.** "Pass through to the inbox" is too long for a compound label. Revised to "reach the inbox."

9. **Drug screening vocabulary too long/awkward.** "Have used the substance" / "have not used the substance" reads poorly in labels and questions. Revised to "use drugs" / "do not use drugs" — simpler, reads as habitual (appropriate for the context).

**Outputs verified clean after all revisions:** All ten template outputs produce grammatical, natural English for all six scenarios in both display modes. The verification was comprehensive — every scenario × every template × both modes — rather than spot-checked. This systematic verification is what surfaced the six schema additions and four template revisions documented in Part 2's updated schema and template sections.

[Report — Technical Quality] **Template verification as evidence of implementation-specification thoroughness.** The scenario library's domain vocabulary was verified by systematically running all six scenarios through all ten template outputs in both display modes. This process surfaced six schema additions and four template revisions that would not have been apparent from designing scenarios individually — the issues only appear when domain vocabulary meets template structure across the full matrix of scenarios × outputs × modes. Documenting this verification demonstrates that the implementation specification was tested at the integration level, not just designed component by component.

---

### Candidates Evaluated and Not Selected

Several candidate scenarios were considered during selection and deliberately not included. These are documented for two reasons: they demonstrate the breadth of the evaluation process, and some serve as natural further-work extensions.

**Genetic screening (BRCA/prenatal).** Very low base rate (~0.2%) with high-stakes results. Parameter-profile redundancy with both mammography (Profile A) and blood donation screening (Profile B) — the same low-base-rate lesson without adding a distinct parameter region. Very high emotional loading (cancer risk, pregnancy decisions). The $N$ problem is worse than blood donation: 0.2% prevalence needs $N = 1000$ for just 2 condition-positive icons, leaving $N_{FN}$ almost certainly at 0. Dropped: covered by existing scenarios, highest emotional loading in the candidate pool, worst clean-integer properties.

**Weather prediction ("rain given the forecast").** The Bayesian framing is valid in principle ($P(\text{rain} | \text{forecast says rain})$), but the domain vocabulary maps awkwardly onto the template. "Of the 60 days that do not rain, 9 have a rain forecast" reads less naturally than any selected scenario. The deeper problem: weather isn't cleanly a binary condition with a binary test in the way the template assumes — rain is a continuous variable discretised for the problem, and "the forecast" isn't a single binary test in the way a screening test is. Interesting in principle but not worth the vocabulary friction and conceptual strain.

**A high-base-rate scenario (40–50% prevalence).** Would show PPV tracking roughly where intuition places it — moderate-to-high despite a mediocre test. The pedagogical surprise is weak (the maths confirms the gut feeling). The primary value would be *contrastive* — showing what happens when prevalence is on the user's side, as a foil to the low-base-rate scenarios. However, this contrast is exactly what exploration mode's parameter manipulation provides: the user can drag the base-rate slider from 1% to 40% and watch PPV climb continuously. The discovery through manipulation is more pedagogically valuable than a curated comparison point. Additionally, spam filtering at 25% already serves as the "base rate helps" end of the library. A 7th scenario was judged unnecessary — the library's existing base-rate gradient (0.5% → 25%) and exploration mode's continuous manipulation together cover this ground.

[Part 4] **High-base-rate scenario as complexity progression for guided/practice modes.** While not included in the curated library, a high-base-rate problem could serve as an "easy" early task in practice mode's complexity progression — a problem where PPV roughly matches intuition, allowing the user to build confidence with the representation-construction skill before tackling counterintuitive low-base-rate problems. If Part 4's mode design surfaces a need for this, a scenario can be added with no infrastructure changes (the schema and template system are fully general). This is noted as a potential Part 4 consideration, not a current gap.

[Report — Background] **Weather prediction as a case study in template boundary conditions.** The weather scenario's awkward fit illustrates a genuine design constraint: the template system assumes a population of discrete entities (people, emails, items) partitioned by a binary condition and a binary test. Domains where the "condition" is continuous (weather), where the "test" isn't a discrete event (ongoing monitoring), or where the population isn't naturally countable struggle with this structure. This constraint is inherent in the natural-frequency framework — natural frequencies require discrete counts of entities in categories. Acknowledging this boundary in the report shows awareness of the framework's scope and limitations rather than presenting it as universally applicable.

---

## Part 4: Guided & Practice Modes

*Pedagogical layer (construction sequences, scaffolding, fading).*

*(Not yet started.)*

### Cross-Part Flags from Part 1

**Construction stage granularity.** Part 1 provides rendering at each cognitively meaningful construction stage (see Part 1, boundary decision 1 for the full state lists). Part 4's guided mode designs the pedagogical sequence — which stages the user progresses through, what triggers advancement, what scaffolding accompanies each stage. Part 4 may need finer granularity than Part 1 currently specifies (e.g., a "partially filled" state where the user has entered a value in one tree node but not its sibling, or a transitional animation between stages with pauses for user input). If so, the Part 1 state model can be extended — the current states are stable rendering points, and the transition mechanics (how to get from one state to the next) are where Part 4's pedagogical design operates.

**Reverse transitions in guided mode.** Part 1 supports animated transitions in both directions (regroup ↔ un-regroup; show combination ↔ hide combination). Whether guided mode allows or encourages the user to reverse a construction step (e.g., un-regroup to compare the two groupings, then re-regroup) is a pedagogical design question for Part 4. There may be value in letting the user toggle back and forth at specific stages as a way of building understanding — seeing the same partition structure from two perspectives is itself an exercise in the kind of flexible reference-class reasoning that Bayesian inference requires. Conversely, the guided sequence may be strictly progressive to reduce complexity. Part 1 supports either — the capability exists regardless of the pedagogical decision.

**Bayesian vocabulary building — pedagogical sequence design.** During Part 1's data package work, a terminology gap was identified, and during Part 2's terminology model work, the gap was resolved at the design level. The tool now has a three-layer vocabulary model (domain, structural, Bayesian) with a progressive exposure design: passive exposure via parenthetical Bayesian terms in the parameter panel, active contrast via probability mode notation, and optionally deeper bridging via a glossary component (could-cut) and/or a guided mode vocabulary stage.

The richest option for the Bayesian vocabulary bridge remains a vocabulary-building stage within guided mode: after the user has gained facility with frequency-based construction, a reflective stage explicitly bridges the vocabularies — "You've been working with the base rate, the sensitivity, and the false positive rate. In Bayesian terms, these are called the *prior*, the *likelihood*, and part of the *marginal likelihood*..." This introduces abstract terminology *after* conceptual understanding is in place, which aligns with the concrete-to-abstract pedagogical progression already built into guided mode's design (icon array before tree, frequency before probability).

The key reframing from Part 2's terminology work: the natural frequency tradition's objection is to *premature formalism*, not to vocabulary building per se. Introducing Bayesian terms after frequency-based fluency is a different matter from introducing them simultaneously. The timing matters; the vocabulary itself is neutral.

The full vocabulary mapping (three layers, five key terms, the marginal likelihood bridging definition, the structural parallel between likelihood and marginal likelihood definitions) is documented in Part 2's Terminology Model section. The data package structure accommodates a `bayesian_term` field. Part 4's responsibility is the pedagogical design of when and how the vocabulary-building stage occurs within the guided mode sequence — the content and data infrastructure are already specified.
