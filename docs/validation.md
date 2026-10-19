# Validation status

## Passed locally

`node --test tests/*.test.cjs`: 11 tests passed.

- Analytical open-loop and P-control equilibria.
- PI error removal, aggressive-integral overshoot and load rejection.
- Saturation bounds, anti-windup recovery and derivative-on-measurement behaviour.
- Downward steps, undefined zero-amplitude metrics and settling revocation.
- DATA2 field mapping, empty/malformed/non-finite rejection.
- Actual UI-script execution in a minimal DOM harness: start/stop, setting changes, segment IDs, full CSV row counts, duration completion, invalid time constant and hidden-tab stop.
- Actual encoder-monitor script with mocked Web Streams: fixed command allowlist, speed/ratio conversion, stream loss and reconnect/disconnect.

## Still required before classroom rollout

`tests/browser.cjs` supplies Playwright smoke checks for simulation, CSV download, validation, serial mocks, disconnection, responsive layout, student sheet and Practical 1 load. **It has not run successfully here:** Chromium was not installed and its download failed (invalid/truncated archive). The DOM harness does not verify browser layout, real canvas rendering, browser permission prompts or native Web Serial behaviour. Run the browser suite and inspect desktop/mobile layout and print output on a machine with Playwright Chromium installed.

No physical Pico, motor or driver was available. Actual USB interoperability and all physical actuation remain unverified. The new page does not support hardware PID. No claim of electrical safety, firmware validation or classroom hardware readiness is made.

The Practical 1 change is limited to navigation and sharing its DATA2 parser. Its connection lifecycle and 6 October USB-disconnection handling are retained. Native-browser and real-device regression checks are still required.
