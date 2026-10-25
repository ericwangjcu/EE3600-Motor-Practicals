# Validation status

Updated 25 October 2026 for the Practical 2 Pico control page and revised task sheet.

## Passed locally

All three JavaScript test files pass with `node --test tests/*.test.cjs`:

- The existing model and simulation-interface tests cover analytical equilibria, PI tracking, saturation, anti-windup, derivative on measurement, response metrics, CSV export, and the Practical 1 encoder-stream parser/lifecycle.
- The Pico interface harness reports **45 checks passed**. These execute the actual page scripts and cover model/unit conversion, response metrics, explicit arming, acknowledged configuration, trial-command order, heartbeat, stale-data STOP, lost-ARM recovery, serial failure and download/navigation contracts.

The supplied firmware source passes **109 host controller/protocol checks**, built with `-Wall -Wextra -Werror -pedantic`. The UF2 validator confirms 240 valid RP2040 blocks, the expected firmware identity, and the original binary hash:

`74c915c9541da3c637880ccb31a300a86ecdf59092494fd6d81171e5844b562b`

The firmware is the existing **EE3600_P2 1.0.0** release, copied unchanged. Source hashes match its build manifest. The Practical 1 UF2 is also unchanged. The hardware page's control core is unchanged from the existing test pack; integration edits concern navigation, labels and required/optional sections.

The revised task sheet compiles to five A4 pages. Every page was rendered and visually inspected. HTML structure, relative links, and `git diff --check` were checked. The selected PID lecture PDF was not edited.

## Native browser and physical checks

The automated harnesses do not validate layout, canvas rendering, browser permission prompts or native Web Serial. `tests/browser.cjs` supplies the existing Playwright simulation smoke checks, but it has not run successfully here because Chromium is not installed. Desktop Chrome/Edge testing remains necessary for native serial operation and classroom use.

No physical Pico, motor or driver was connected during this update. The browser now has a hardware PID command path, but actual USB interoperability, encoder sign/scale, motor response, STOP, trial expiry and USB/heartbeat loss still need the planned bench test. Software test results are not motor measurements.

See [the hardware guide](practical2-hardware.md) for the operating sequence and [hardware status](hardware-readiness.md) for the remaining bench checks.
