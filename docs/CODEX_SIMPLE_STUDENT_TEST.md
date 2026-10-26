# Codex: test Practical 2 by following the task sheet

Read `docs/practical2-speed-task.html` first. Use the latest source checkout and `practical2-control.html`. The website sections 1–6 must follow that sheet, with no repeated P1 identification. Leave the selected lecture slides, P1 page and P2 UF2 unchanged.

## Scope and known hardware

Two supported selections:
- 6 V, 280 RPM gearbox output, N=21.3.
- 6 V, 1360 RPM gearbox output, N=4.4.

Both use 44 decoded encoder counts per MOTOR revolution, separate from the gearbox ratio, and the same P2 UF2. The selection is not encoder auto-detection. Motor RPM is used for targets and gains throughout. Use each actual motor's own P1 gain and time constant; do not apply the 280 RPM model/gains to the 1360 RPM kit as a validated design.

The required experiment is P analysis in simulation, then PI simulation and a reviewed PI speed trial. Physical position commands are disabled. Position is optional in MATLAB/Simulink only. Do not perform physical Ziegler–Nichols instability tests, repeated identification or a starting-duty search.

## 1. Preserve evidence and establish the version

Work in the user's existing project. Preserve local changes and previous raw CSV/log/JSON files. Record the checkout SHA, website revision, task-sheet version and UF2 SHA256. Run the available JS and C checks. State any unavailable compiler/runtime rather than claiming tests ran.

P2 UF2 expected SHA256: `74c915c9541da3c637880ccb31a300a86ecdf59092494fd6d81171e5844b562b`. Already-flashed P2 1.0.0 need not be flashed again just for this UI update.

## 2. Test both selections without operating a motor

Open the actual student page in Chrome/Edge through a supported automation route. Do not bypass browser security or approval controls.

1. Verify that one section is visible, headings match the task sheet and STOP stays visible. No physical position, identification, raw protocol, duplicated model input or unexplained Tc/lambda controls appear in the student path.
2. Select each motor in turn. Check label, gearbox ratio and 44 motor counts. No serial command, gain application or ARM may occur from selection or model preparation.
3. Enter explicitly labelled synthetic test values solely for conversion checks. Check `K = Kbar*N*60/(2*pi)*Vs`; tau must not change. At 1000 motor RPM, output labels are approximately 46.95 RPM for N=21.3 and 227.27 RPM for N=4.4. These are unit checks, not observed motor data.
4. Switching motor selections must clear the previous model and gain-entry fields. Saved run data must keep their original metadata.
5. Sections 2 and 3: compare three P settings; then three I settings with P fixed. The ideal P plot is monotonic with offset. PI simulation includes its zero. Save the simulation CSV and confirm its simulation label. Simulation must not fill or send hardware gains automatically.
6. Check section 4 targets, assessment band, and section 5 hardware-unit labels. Verify stale/mismatched device configuration blocks ARM until Apply configuration succeeds.
7. Replay original raw speed CSVs on the actual browser, keeping command times and raw transition frames. Compare displayed metrics, exported CSV and re-imported metrics. Preserve fault/incomplete status. Imported data are not a new physical trial.
8. Capture desktop and narrow-screen screenshots. Check all task-sheet and UF2 links. Report every failed or blocked action.

## 3. Complete the physical student workflow on the available kit

Use prior explicitly confirmed bench settings while they remain current. The earlier tested bench was an original RP2040 Pico on Kitronik 5331 Motor 1 (GP3/GP2), encoder GP26/GP27, 6 V supply, secured unloaded motor and freely rotating shaft. The supply's 3 A label is a maximum rating, not measured motor current or an established adjustable current limit. Do not infer a safe current setting from it.

The prior speed pass used N=21.3. A later N=21.6 estimate was used in a failed position trial; preserve that record and disclose any deliberate return to the 21.3 named speed profile. Do not relabel old runs. The 100% duty ceiling was expressly approved for that 6 V bench only. Other kits need their own approved limit and P1 model.

Follow only the visible student controls:
- Section 1: choose the physically present motor and prepare its existing P1 model.
- Sections 2–4: check the reviewed simulation and targets; do not search hardware gains blindly.
- Section 5: Connect Pico, Apply configuration, confirm readback, enter the reviewed PI gains, and deliberately Arm & run a finite speed trial.
- Section 6: Analyse response, Save CSV, Load P2 CSV, reanalyse, and compare metrics exactly. Then, when safe and intended, freeze gains and record three fresh repeats without retuning.

For regression on the SAME previously tested 21.3 kit only, prior reference values are Kp=0.000128451558317523 duty/RPM; Ki=0.00100746320249038 duty/(RPM*s); Kd=0; Tf=0.020 s; target=1000 motor RPM; 10 s trial; actual supply=6 V; approved duty ceiling=100%. These are historical reference settings, not universally validated student answers.

Do not assume that both physical motor versions are available. If only one exists at the bench, report the other as software-tested only. Do not run the failed position candidates.

Verify STOP, finite expiry and (with the necessary physical action from the user) USB disconnection separately. A heartbeat timeout alone does not establish a physical unplug check. Never auto-rearm after a fault. Do not add friction boosts, minimum duty, feedforward or looser limits to force a pass. Finish DISARMED with zero duty and, after coast-down, zero measured speed; release the serial port.

## 4. Required report

Save `P2_Student_Website_Test_Report.md` and, when tooling is available, PDF, plus machine-readable JSON, screenshots and raw CSV references. Use PASS / FAIL / BLOCKED / NOT TESTED for each numbered action. Include:
- Source, firmware and task-sheet versions; test environment; actual motor profile and settings.
- Task-sheet-to-screen mapping for every step, and whether any extra unexplained step was necessary.
- Both profile conversion/interlock results and the actual motor(s) physically tested.
- Simulated versus physical evidence, metrics and duty; repeated-run results individually and worst case.
- Native browser trial/export/re-import evidence, raw timing exclusions and metric agreement.
- STOP/expiry/physical-unplug status and final device state.
- Remaining blockers. A serial Python script, mock browser or synthetic CSV does not prove a complete physical student workflow.

If desktop capture, accessibility or a permission prompt blocks browser operation, use only a supported alternative. Report the concrete blocker and the minimal unavoidable user action. Do not claim completion or install unrelated workarounds. No further changes to the teaching method are requested.
