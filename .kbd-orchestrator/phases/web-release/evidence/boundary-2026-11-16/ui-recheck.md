# UI re-check: B1 on bb399985 (boundary task 9.3, UI part)

Reviewer: independent-reviewer role, read-only, same model family; saved by the lead in the evidence
folder (not the worktree, so the tested tree does not change). Evidence:
playwright-packaged-20261116T142305Z, compared with playwright-packaged-20261116T140317Z.

**Verdict: PASS.** B1 FIXED.

- Padding: fields now start about 14 px inside (`--size-input-pad-x: 14px`, `--size-input-pad-y: 12px`)
  on home (dark and light, 375 and 1440) and the not-found view; the lobby name field has no
  placeholder, so it shows no change either way.
- Placeholder: `control-placeholder` on `control`, estimated about 4.51:1 dark and 4.58:1 light;
  was about 2:1. Passes SC 1.4.3 with little margin.
- No new issue: no overflow at 375 or 1440; buttons stay centred; Flat 2.0 holds.
- Advisory: contrast sits at the 4.5:1 line, and the placeholder now matches typed text colour, so
  the example code reads like an entered value. Both come from the design tokens; for the design owner.

The lead also viewed wr-8-home-dark-1440.png and saw the padded field with a light placeholder.
