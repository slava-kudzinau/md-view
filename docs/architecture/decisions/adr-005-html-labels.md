---
description: Mermaid labels are HTML (htmlLabels), so a shift drag selects from the pressed point.
status: accepted
date: 2026-11-22
---

# ADR-005: HTML labels for mermaid diagrams

The page draws mermaid labels as HTML with `htmlLabels: true` in
`mermaid.initialize`.

**Why:** the viewer pans with a pointer drag, so label selection needs a
mode that skips the capture (Shift). With SVG `<text>` labels (the default),
a selection anchors at the nearest glyph in layout order, so a shift drag
started far from the pressed point and covered many labels at once. HTML
labels (`foreignObject` divs) start the selection at the pressed point.

**Rejected:** SVG `<text>` labels with the Shift capture skip. Selection ran,
but it anchored at the nearest glyph, not at the pressed point.

Measured in Chrome 158 and 150: a shift drag selects from the pressed point
to the release point inside the labels it crosses. A click places no caret
and a double-click selects no word inside a `foreignObject` (measured with
and without pointer capture, so capture is not the cause); selection runs by
drag only. Sequence, class and state diagrams may keep SVG labels; the flag
applies where mermaid honors it. See story mermaid-text-selection.
