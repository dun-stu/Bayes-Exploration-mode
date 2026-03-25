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
No app code written. All specification work complete for Parts 1, 2, 3, and 5. Part 4 not yet specified. Tech stack decided.

---

## Development Log

<!-- PLACEHOLDER: Subtask entries will be added here once the decomposition is complete. -->
<!-- Structure will follow the decomposition order, with sections for each major layer/milestone. -->
<!-- Each completed subtask entry will include: -->
<!--   - What was done -->
<!--   - Spec divergences (if any) — with reasoning -->
<!--   - Forward-looking notes (if any) -->
<!--   - Report-relevant challenges (if any, flagged during development) -->

*To be populated once the decomposition is finalised and development begins.*

---

## Harmonisation Log

<!-- Records when harmonisation passes were done and what was updated. -->
<!-- Format: date, what was harmonised, brief summary of changes to Implementation Details doc. -->

*To be populated as harmonisation passes occur.*
