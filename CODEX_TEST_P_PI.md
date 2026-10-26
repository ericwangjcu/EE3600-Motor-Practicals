# Codex: test the updated Practical 2 website and produce a report

Execute this on the PC connected to the existing teaching Pico. The task is **speed control with P and PI**. Do not change the selected PID lecture slides, repeat Practical 1 identification, or run position hardware trials. Position is an optional simulation extension only.

## Use the supplied revision

Use `practical2-control.html`, `practical2-ppi.html`, `docs/EE3600_Practical_2.pdf`, and the editable `docs/practical2-student.html`. Read `docs/ppi-validation-report.md` and preserve local changes and all existing bench recordings. Do not reset the user's workspace or overwrite the original results. The existing `EE3600_P2 1.0.0` UF2 is unchanged; do not reflash a correctly running device merely to satisfy a checklist.

The student sequence is: reuse P1 model -> analyse/simulate P-only -> add I and tune in simulation -> enter reviewed gains -> finite speed trials -> analyse/save -> refine -> freeze gains -> three fresh repeats. The main explanation is P's persistent offset and the integral term's retained drive. PI is sufficient; D is not compulsory. Ziegler–Nichols is an applicability discussion or separate suitable example, not a forced-oscillation experiment on this motor.

## Prior evidence, not a new test

The user reported three fresh numerical speed passes on the unloaded 6 V kit at 1000 motor RPM. The historical reference gains are:

- Kp = 0.000128451558317523 duty/motor RPM
- Ki = 0.00100746320249038 duty/(motor RPM*s)
- Kd = 0; Tf = 0.020 s
- 44 motor counts/revolution; 10 s trials; 8000 motor RPM speed limit
- 100% duty ceiling approved for this particular 6 V kit

The original passing speed records used N=21.3; a later position attempt used N=21.6. Preserve these records separately. Use the actual current kit setting and record it, rather than rewriting old metadata. Motor-RPM feedback does not require dividing by N; output-RPM display and voltage/output-model conversion do.

The reported P1 baseline is 4.88/(0.051s+1), output rad/s per volt. It is a carried-forward rounded model, not newly measured or newly verified. Its prediction substantially differed from a later PWM check. Use it as a starting model, not as proof of motor capability. The final gains are a reference for this tested kit, not the unique student answer.

The 3 A figure is the supply maximum rating, not a measured motor current or configured adjustable current limit. Do not invent current, temperature or terminal-voltage measurements. A successful 67% motion check is not an established universal breakaway threshold. Do not add minimum duty, feedforward or hidden starting boosts.

## 1. Software and files

Run the available JavaScript tests, UF2 validation and strict C checks where tools are available; record exact commands and actual results. If a compiler is absent, report that check as not rerun rather than reusing an old pass as new evidence. Verify the unchanged UF2 hash:

`74c915c9541da3c637880ccb31a300a86ecdf59092494fd6d81171e5844b562b`

Check page links and downloads, the three-page P/PI task sheet, native units, zero preloaded hardware gains, retired position controls, and no motor command from model conversion or suggestions. The HTML is the current editable task-sheet source; do not regenerate an old position worksheet from the historical LaTeX file.

## 2. Replay existing raw speed records

Find the existing results containing `physical-speed-analysis.json`, `Practical2-final-settings.json` and the timestamped speed CSV/JSON/serial logs. Do not ask the user to retype values present in those files.

Replay the actual raw speed data through the revised assessment. It preserves raw rows and timestamps, excludes only reported armed transition samples within one 10 ms control tick before a real command event, and reports the excluded count. A larger discrepancy, fault, ambiguous event, missing baseline or gap must remain invalid. Do not shift t=0 to the start of movement or change the assessment band to obtain a pass.

If a bench CSV lacks webpage metadata, create a separate derived import file using actual recorded event/config/baseline evidence and document every added field. Never overwrite the original. Missing evidence is a blocker, not a value to fabricate.

Compare all replayed metrics with the saved report. Retain the original failure/unfinished status across export and re-import. A file import must send no motor command.

## 3. Actual browser checks

Use the updated website in desktop Chrome/Edge on HTTPS or localhost. Use the available supported browser-automation route. Do not bypass security prompts or approval restrictions. The previous desktop-capture error was `SetIsBorderRequired / 0x80004002`; do not claim this has been fixed without an observed successful browser session.

Test the actual visible controls: Connect Pico, configuration, P1 conversion, model helper, explicit gain entry, speed run, plot rendering, displayed metrics, Save CSV, Load CSV and identical re-imported metrics. Save screenshots and the exact page revision. Synthetic or mocked serial tests are useful but cannot replace this physical browser path.

If necessary, ask once for a precise unavoidable physical action or permission interaction. Continue independent replay, document and software checks. Do not ask for values already recorded and not changed.

## 4. Physical acceptance, only with the established ready bench

Reuse current physical confirmations and protection settings. The motor must remain secured, unloaded, shaft clear, and within the established 6 V limits. The computer cannot infer present physical readiness from a connection alone.

Use the historical final speed gains above for an instructor regression, not as prefilled student answers. Run finite 1000 motor-RPM trials through the actual website, then three fresh repetitions with unchanged settings. Preserve each CSV and its metadata. Do not automatically retune beyond this acceptance task or clear a fault and retry without diagnosis.

Keep the speed targets fixed: overshoot <=5%, 10–90% rise <=0.50 s, settling <=1.00 s and >=2 s final dwell. At 44 counts and 50 ms window, the two-quantum floor is 54.545 motor RPM. Report that band and its percentage; do not call it strict 2% settling at 1000 RPM. Final MAE is the last two armed seconds, with bias also reported. Report t10 from command to show startup delay. Exclude coasting after disarm.

Check STOP, finite expiry and the outstanding physical USB-removal behaviour at a modest approved operating condition. A deliberately withheld heartbeat is not a physical unplug test. Ask for USB removal/reconnection only if it cannot be physically performed by the available tools. No automatic restart is allowed after reconnect.

## 5. Report and deliverables

Generate a local `Practical2_Website_Acceptance_Report.md` and a readable HTML/PDF copy. Include:

- tested source/page/UF2 identity and actual configuration;
- a PASS / FAIL / BLOCKED table for every software, browser and physical check;
- visible screenshots of the actual student browser flow;
- raw CSV paths, configuration/event provenance, exclusions and displayed/recomputed metric comparison;
- initial versus final P/PI explanation and a table of the three fresh speed repeats;
- all actual failures, missing evidence and remaining manual action;
- the unchanged scope: no repeated P1 work, no lecture edit, no position hardware.

Separate prior user-reported bench evidence, new physical tests, simulation, synthetic browser tests and code-only checks. A passing serial-script experiment is not a completed native website experiment. Do not claim complete end-to-end validation until the required native browser and physical checks are actually complete.

Finish DISARMED, zero drive, observe coast-down and release the serial port. Keep the original source, recovery UF2 and all historic logs. Do not publish raw local bench data or alter the live website during this acceptance test without explicit instruction.
