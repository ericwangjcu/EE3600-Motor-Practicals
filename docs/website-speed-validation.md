# Simplified two-motor P/PI website validation

Generated 2026-10-26T21:50:39.542Z.

Workflow: https://github.com/ericwangjcu/EE3600-Motor-Practicals/actions/runs/40407649203

## Executed browser checks

- PASS: Only the task-sheet section is shown; two motor choices; diagnostics and duplicate model fields hidden
- PASS: Disconnected page: zero entered gains, no arming and no visible position controls
- PASS: 4.4 kit: correct model conversion, output-speed label and P/PI comparison without changing hardware gains
- PASS: Switching motors clears previous model/design fields instead of reusing another kit’s measured values
- PASS: P1 conversion and P/PI comparisons leave hardware gains unchanged
- PASS: Simulation CSV is explicitly labelled and contains the compared traces
- PASS: Actual Chromium import, assessment, CSV export and re-import agree for synthetic data; raw pre-command frame retained
- PASS: Importing a disconnected run does not erase its incomplete status
- PASS: Incomplete original metadata cannot be promoted into a completed validation
- PASS: Narrow viewport has no page-level horizontal overflow
- PASS: Every task-sheet section stays usable on a narrow screen
- PASS: Student-facing relative links, firmware and task sheet resolve
- PASS: Task sheet renders and pages have no uncaught JavaScript errors

The workflow also runs the existing JavaScript/serial mock tests, new analytic/timestamp regressions, portable C controller checks and the unchanged UF2 validator. See workflow logs for their actual results.

## Limits

No motor was connected to this runner. Native USB permissions, a physical browser-run trial, replay of the original bench files, and physical USB removal remain pending. The exported CSV and metrics screenshot here are deliberately SYNTHETIC tests, not new evidence of motor performance. Prior physical speed results are attributed to the coordinator-supplied report. Firmware, P1 and lecture slides are unchanged.
