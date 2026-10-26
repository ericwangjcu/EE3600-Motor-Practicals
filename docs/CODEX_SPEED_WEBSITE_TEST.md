# Local Codex: finish the Practical 2 website validation

Run on the PC connected to the Pico. This brief is not evidence that a local Codex session has been launched.

## Scope

Use the current `ericwangjcu/EE3600-Motor-Practicals` website revision. Preserve local changes and every earlier result. Practical 2 is **P and PI speed control**. Position is **simulation only**: do not issue position, zero-position or physical reversal experiments for a position task. Leave the PID slides, Practical 1 and verified firmware unchanged.

The website already includes an ideal P/PI comparison, speed-only command guards, and bounded pre-command sample selection. Do not repeat the P1 identification or physical-parameter work. Test the student workflow rather than substituting a serial-script run for a browser run.

## Established evidence to carry forward

The supplied bench report records three fresh numerical speed passes for one unloaded, mounted kit with clear shaft, 6 V supply, 100% duty ceiling, 44 motor counts/revolution, target 1000 motor RPM and 10 s trials. Tested gains:

- Kp = 0.000128451558317523 duty/RPM
- Ki = 0.00100746320249038 duty/(RPM*s)
- Kd = 0; Tf = 0.020 s

Those speed runs used gear ratio 21.3. A later position investigation used an estimate of 21.6. Preserve each historical configuration; record the currently confirmed value rather than silently rewriting records. These gains act on motor RPM; output-RPM display and conversion depend separately on the ratio.

The carried-forward reported P1 model is `4.88/(0.051*s+1)` from terminal volts to output rad/s. It is an earlier rounded model, not a new fit. It showed substantial mismatch with the short PWM bench observation. No exact 67% breakaway threshold was measured; no minimum-duty clamp or starting boost is permitted. The supply's 3 A maximum rating is not a measured current or adjustable current-limit setting.

## Complete the following

1. Check the local project revision, unchanged UF2 hash, firmware identity and saved results. Do not overwrite a working local copy blindly. Confirm the bench is presently ready before any motion; reuse established settings rather than asking for already documented values.
2. Run software tests. Use an allowed browser-control route. Do not bypass OS/browser permissions, approval restrictions or security settings to work around earlier capture failures.
3. With motor power off or the Pico disconnected, inspect the actual student page: no visible physical position controls; hardware gains not silently filled; P1 conversion; P comparisons; fixed-P I comparisons; simulated CSV labels; task-sheet and firmware links.
4. Load the actual saved physical speed records using their original metadata. Recalculate the metrics. Preserve raw frames; exclude only the explicitly counted pre-command transition frames allowed by the page. Do not move command time to motion onset, loosen targets or hide failed runs. If a native-format conversion is required, save it separately with provenance and preserve every source row.
5. On the ready bench, perform a finite physical speed trial through the actual website with the above frozen reference gains. The purpose is interface regression, not another gain search. Observe live speed/duty, then Analyse response, Save CSV, re-import and re-analyse. Compare the displayed and saved metrics. Capture screenshots and retain serial/raw CSV evidence.
6. Verify STOP and finite expiry through the website at an appropriate reviewed operating point. Complete physical USB removal separately from the earlier heartbeat timeout test, requesting only the unavoidable physical action. Confirm no restart on reconnection.
7. Stop on a fault and diagnose it; do not automatically re-arm or increase limits. No position trial is authorised by this brief.

## Report

Create `Practical2_Website_Test_Report.md` and a readable HTML/PDF copy where supported. Include:

- revision and firmware identity, actual configuration and gain units;
- one PASS / FAIL / BLOCKED row per student website step;
- real-browser screenshots, CSV names, command timestamps and exclusion counts;
- displayed versus exported/re-imported metric comparison;
- preserved original validation results versus newly executed trials;
- STOP, expiry, heartbeat and physical-unplug results as separate checks;
- clear distinction between simulations, synthetic browser tests and physical measurements;
- exact remaining blocker, if any.

The GitHub browser checks used synthetic CSVs only. They do not close the physical-browser or physical-unplug items. If local capture/permissions still block a step, report that step as BLOCKED rather than using a serial-only substitute and claiming success.

Finish with zero drive, DISARMED state, observed coast-down to zero encoder speed and the serial port released. Do not publish raw personal paths/device identifiers or unrelated local files to the public repository.
