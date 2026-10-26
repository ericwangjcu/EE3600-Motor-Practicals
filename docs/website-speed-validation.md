# P/PI speed website validation

Generated 2026-10-26T13:41:29.761Z.

Workflow: https://github.com/ericwangjcu/EE3600-Motor-Practicals/actions/runs/40332719382

## Executed browser checks

- PASS: Disconnected page: zero entered gains, no arming and no visible position controls
- PASS: P1 conversion and P/PI comparisons leave hardware gains unchanged
- PASS: Simulation CSV is explicitly labelled and contains the compared traces
- PASS: Actual Chromium import, assessment, CSV export and re-import agree for synthetic data; raw pre-command frame retained
- PASS: Importing a disconnected run does not erase its incomplete status
- PASS: Incomplete original metadata cannot be promoted into a completed validation
- PASS: Narrow viewport has no page-level horizontal overflow
- PASS: Student-facing relative links, firmware and task sheet resolve
- PASS: Task sheet renders and pages have no uncaught JavaScript errors

The workflow also runs the existing JavaScript/serial mock tests, new analytic/timestamp regressions, portable C controller checks and the unchanged UF2 validator. See workflow logs for their actual results.

## Limits

No motor was connected to this runner. Native USB permissions, a physical browser-run trial, replay of the original bench files, and physical USB removal remain pending. The exported CSV and metrics screenshot here are deliberately SYNTHETIC tests, not new evidence of motor performance. Prior physical speed results are attributed to the coordinator-supplied report. Firmware, P1 and lecture slides are unchanged.
