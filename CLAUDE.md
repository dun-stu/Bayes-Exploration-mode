# Agent Instructions — Development Workflow

This file provides standing instructions for the coding agent during development. Read this at the start of every session.

---

## Key Files

- **`docs/development_companion.md`** — Development status and tracking doc. Read at session start; update after completing work. This is the primary coordination document.
- **`docs/rubric_reference.md`** — Relevant assessment criteria from the project rubric. Use this to judge whether something is report-relevant.
- **Implementation Details doc** — The full implementation specification. This is NOT in the repo — it is an external document. You will usually receive only a curated spec extract (the relevant section(s) for your current subtask) as part of your prompt. If you encounter an issue with potential cascading effects across components, ask the user to load the full document.

---

## After Completing a Subtask

Update `docs/development_companion.md` with:

1. **What was done.** Brief description of what was built, under the relevant subtask entry.
2. **Spec divergences (only where applicable).** If what you coded differs from the spec extract you were given — whether a deliberate change, an adaptation, or a resolution of something the spec left open — note *what* is different and *why*. Include enough reasoning that the Implementation Details doc can be updated properly during harmonisation. This includes:
   - Things that were intentionally left open in the spec for development-phase resolution
   - Approaches that needed to change once you actually built them
   - Design reasoning that emerged during implementation
3. **Forward-looking notes (only where applicable).** Anything that subsequent subtasks should be aware of — constraints introduced, interfaces established, potential issues identified.

Do **not** record routine debugging iteration. Record **outcomes**, not process — with one exception (see below).

---

## Things to Watch For and Flag

### Cross-component issues
If you identify an issue whose resolution might affect components beyond the current subtask — e.g., it touches shared infrastructure, changes an interface between components, or challenges an architectural assumption — **stop and describe the issue** rather than pushing through. Explain what you think is affected and why. The user will decide whether to resolve it in-session or take it to a planning conversation.

### Report-relevant technical challenges
If an iteration involved a genuine technical challenge — not routine debugging, but something where the difficulty encountered and the reasoning to overcome it were substantive — flag it as potentially worth recording in the companion doc. Use `docs/rubric_reference.md` to judge relevance: the rubric rewards "difficulties overcome" (Scale), "key decisions highlighted and justified" (Technical Quality), and demonstrations of understanding through problem-solving. If borderline, ask the user whether it's worth noting rather than deciding silently.

### Report-relevant screenshots
When requesting verification screenshots, note if a particular screenshot might also be worth saving for the report — e.g., it shows the visualisation in a state that demonstrates a key feature, a design decision, or a before/after comparison. Suggest the user save it to a designated folder.

---

## Scope Discipline

The visualisation components (icon array and frequency tree) expose a rich set of interaction capabilities in the Implementation spec. **Only build the capabilities that the current layer's consumers need.** For the exploration mode build (Layers 0–5), the components need: state setting (construction stage, grouping state, display mode), regrouping trigger, and data package updates. Part 4 interaction hooks (icon-level event reporting, node value input, batch colouring for construction, region highlighting for guided mode) are **deferred** — the architecture should be friendly to later extension (clean separation, refs exposed, event handler props easy to add) but should not implement unused capabilities prematurely.

---

## Verification

After completing a subtask:

1. **Describe what the user should see** — what the expected visual or functional outcome looks like, so they have a quick sense-check.
2. **Ask for what you need to verify** — request specific screenshots, command output, or other evidence so *you* can confirm the outcome is correct. Both: tell the user what correct looks like, and ask for what you need to check it yourself.

---

## Companion Doc Structure

The companion doc has a project overview section at the top. If the current subtask changes the project state in a way that affects the overview (e.g., a component is now complete, or the next phase is different from what was listed), update it.

Subtask entries sit under their relevant section in the decomposition. Mark completed subtasks clearly.

---

## When You Need More Context

- **For the current subtask:** You should have a curated spec extract covering the relevant section(s) of the Implementation Details doc. If something in the extract is unclear or seems incomplete, ask.
- **For cross-cutting concerns:** If your work touches shared infrastructure (computation pipeline, data package structure, colour scheme, template system, scenario data structure), and you don't have the relevant spec section, ask for it.
- **For cascading issues:** If you need to see the full Implementation Details doc to assess the scope of an issue, say so. The user can load it.
