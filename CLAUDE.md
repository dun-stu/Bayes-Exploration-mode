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

**After all completion steps are done:** Commit and push the changes. Each completed subtask is a clean, verified unit of work — the remote should always reflect the latest confirmed state. Then stop and ask the user before proceeding to the next subtask. The next subtask requires a planning thread session to curate the relevant spec extract and formulate the prompt — do not pick up the next subtask autonomously. Tell the user the subtask is complete and that the next step is to return to the planning thread for the next subtask's prompt.

---

## Things to Watch For and Flag

### Cross-component issues
If you identify an issue whose resolution might affect components beyond the current subtask — e.g., it touches shared infrastructure, changes an interface between components, or challenges an architectural assumption — **stop and describe the issue** rather than pushing through. Explain what you think is affected and why. The user will decide whether to resolve it in-session or take it to a planning conversation.

### Report-relevant technical challenges
If an iteration involved a genuine technical challenge — not routine debugging, but something where the difficulty encountered and the reasoning to overcome it were substantive — flag it as potentially worth recording in the companion doc. Use `docs/rubric_reference.md` to judge relevance: the rubric rewards "difficulties overcome" (Scale), "key decisions highlighted and justified" (Technical Quality), and demonstrations of understanding through problem-solving. If borderline, ask the user whether it's worth noting rather than deciding silently.

### Screenshots worth saving

The rubric assesses visual material in two places: **Presentation** (3.5) rewards "suitable figures and tables" with "images of suitable resolution or scalable graphics"; **Technical Quality** (3.3) rewards "architecture diagrams, UML, database schemas, algorithms, mathematics." Both refer to polished report figures, not raw development captures. The screencast (Section 4) needs live demonstration, not screenshots.

However, development-time captures are useful *raw material* for later report figures — especially states that are hard to reproduce later, or before/after pairs. When requesting verification, flag screenshots worth saving if they show:

- **Key visual states of the tool** that could become annotated report figures (e.g., the icon array at N=1000 showing base-rate salience, the tree with cross-branch combination, regrouped vs ungrouped layouts). These will need annotation and captioning later, but the raw capture is only available now.
- **Before/after pairs** if a visual problem is solved — the "before" can only be captured in the moment. Worth saving even if it may not make the report.
- **Edge case displays** (degenerate states, extreme parameter values) that demonstrate the system handles boundary conditions — useful for evaluation figures.

Do **not** routinely save every verification screenshot. Most verification screenshots confirm "it works" and have no report value. Save only those that could plausibly illustrate a specific point in the Technical Quality, Evaluation, or Presentation sections.

#### Saving screenshots — process

Report-asset screenshots are saved to `report-assets/` (in the external `For development` folder, not the repo) with descriptive filenames and an entry in `report-assets/INDEX.md`. When a subtask produces screenshots worth saving, follow whichever path applies:

1. **Screenshots taken during development (Preview tool verification):** The Preview tool returns images inline — it does not save files to disk. If a Preview capture is worth saving, tell the user which state to reproduce and have them take a screenshot manually (see path 2).

2. **Screenshots the user takes after the subtask is done:** Provide exact capture instructions — which scenario, which N value, which state/toggle, and any other selections needed. The user will take the screenshots (via Win+Shift+S or similar) and pass them back for verification. Once verified, copy the files from the user's screenshots folder (`~/Pictures/Screenshots/`) to `report-assets/` with descriptive filenames and update the INDEX.

In both cases: the INDEX entry should record what the image shows, why it was saved, and potential report use (see existing entries for format). Do this as part of the subtask completion flow, before the final commit.

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

---

## Workflow Confirmation

When carrying out workflow steps — whether from this file (e.g., "After Completing a Subtask" steps 1–3, "Verification" steps 1–2) or from the `Planning_Thread_Guide.md` (e.g., Session Workflow Steps 1–5) — **state explicitly at the end which workflow steps you completed.** A brief checklist confirmation is sufficient: name each step and confirm it was done. This makes it visible when steps were completed and easy to catch if any were skipped.
