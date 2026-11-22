---
description: Let a person select label text in the diagram viewer with Shift, so copied labels come out of a full-screen diagram.
status: in-review
size: S
---

# Story: select label text in the diagram viewer with Shift

## Goal

A person reading a diagram full-screen wants the label text for notes or issues. Today every mouse drag pans the viewer, so no drag selects. With this story, Shift+drag selects label text, and a plain drag still pans.

## Context

The in-text diagram already selects labels: the page opens the viewer only on a click that ends no selection. The viewer box sets `user-select: none` and captures every pointer for panning (`lib/page.css`, `lib/page.js`). The approved plan for the feature is the source of this story's shape.

## Scope

**In:** the viewer box in `lib/page.js` and `lib/page.css`, the two browser test files, the spec, the README.
**Out:** the in-text view's cursor (it keeps `zoom-in`), touch selection, any toolbar button for select mode.

## Size

S. Two tasks, one contract (the two css classes), no new fixtures, no unknowns left.

## Unknowns

None.

## Acceptance criteria

- In the viewer, Shift+drag selects label text; a plain drag pans.
- While a person holds Shift, the box shows the text cursor.
- `make check` passes, including the new `viewer: shift preview and select mode` row.

## Notes

- Check: `make check`.
- Budget: $8 budget, $10 hard stop (S).
- flow tier=lite docs=plan design=no orchestrator=no final=final-reviewer-light gate=read-later scan=no verifier=none
- Gate page: read later in the PR.
- started: 2026-11-22T18:30:00Z
