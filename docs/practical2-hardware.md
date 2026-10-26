# Practical 2: speed control with P and PI

Use the [updated task sheet](practical2-speed-task.html) and [Pico speed-control page](../practical2-control.html). The task sheet has a **Print / save as PDF** button. Reuse the completed Practical 1 model and kit; do not repeat identification. Position is optional **in simulation only**. The student page hides position controls and blocks position-actuation commands.

## Student sequence

1. **Connect Pico** and check actual kit settings; **Apply configuration** while disarmed.
2. Carry forward Kbar and tau: **Convert P1 model → Use converted model**.
3. Under **Compare P, then add I**, select **Use model fields for simulation**. Choose a base Kp and compare 0.5×, 1× and 2× P with I = D = 0. Explain the offset.
4. Keep P fixed, choose a base Ki and compare the three I values. Save the simulation CSV. Check the full response and requested duty; D is not required.
5. Review the candidate in a simulation that includes the agreed actuator limits and implementation effects. Enter the reviewed gains in **Speed control**; no gains are transferred automatically.
6. **Arm & run speed trial → Analyse response → Save CSV**. Stop before changing gains. Refine one setting at a time.
7. Freeze successful gains, record three fresh repeats, and load/export/re-import the saved CSVs. Report each repeat and the worst result.

## Existing firmware and settings

Use the unchanged [EE3600_Practical_2_Pico.uf2](../firmware/EE3600_Practical_2_Pico.uf2), identity `EE3600_P2 1.0.0`, for the original RP2040 Pico. Use the existing BOOTSEL loading procedure with motor power off. The established driver is Kitronik 5331 Motor 1 (GP3/GP2); encoder A/B are GP26/GP27. No firmware changes or new student programs are required.

Use desktop Chrome/Edge and close other applications holding the serial port. The page checks firmware identity before enabling trials; connection alone never arms the motor. Settings reset on Pico reboot. Device readback can replace the page defaults, so check the actual supply again before applying settings.

The speed controller uses motor-shaft RPM and **fractional duty**. For the demonstrated encoder use 44 decoded counts per motor revolution and a separate confirmed gearbox ratio. Do not enter the approximately 937 output counts in the motor-count field. The passing reported speed tests used N = 21.3; a later estimate of 21.6 does not retrospectively change their metadata.

The user-reported bench supply is 6 V, with a 100% maximum duty ceiling approved for that particular unloaded kit. This is not a general limit for every kit. The page starts at a lower entered limit and requires explicit application of tutor-approved settings. The supply entry is metadata, not a measured voltage/current. A supply's 3 A maximum rating is not a measured current or adjustable current-limit setting. No minimum-duty clamp, starting boost or feedforward is introduced.

A brief tutor direction check, if required, is available under **Tutor diagnostics**; it is not another P1 experiment. Positive duty must produce positive measured speed. Do not grip a moving shaft or bypass faults.

## Model and gain units

The P1 model `Kbar/(tau*s+1)` maps terminal voltage to output rad/s. Under the nominal PWM approximation, convert using:

`K_motor = Kbar * N * 60/(2*pi) * Vs` in motor RPM per duty fraction.

Tau stays unchanged. The new P/PI comparison panel uses these same units. Its exact continuous-model predictions include the PI zero but no friction, actuator limits, sampled controller or encoder quantisation. It flags demand exceeding the entered ceiling; that flag is not a simulated saturating response.

The [separate legacy limited simulator](../practical2.html) uses **percent duty / gearbox-output RPM**, a fixed actuator lag and different sampling/filtering. Divide its controller gains by **100 × N** to obtain fractional-duty/motor-RPM gains. Its extra actuator lag means it is not the ideal first-order P example. Check the implemented response after conversion.

Enter parallel gains: Kp in duty/RPM; Ki in duty/(RPM*s); Kd = 0 for the required PI task. Ki is not Ti. The optional analytical Tc helper only displays starting values; it never fills or applies gains.

## Assessment and raw-data preservation

Use the task sheet's target-centred overshoot, 10–90% rise, settling and final MAE definitions. With 44 counts/rev and a 50 ms speed window, the two-quantum measurement floor is 54.545 motor RPM. At 1000 RPM that gives a ±5.45% settling band, not strict ±2%. The new ideal simulation comparison reports strict 2% target settling separately.

All raw CSV frames remain intact. The website may exclude a pre-command ARMED/reference transition frame only when it precedes the actual device command by no more than one 10 ms control tick. It reports the excluded count without moving the command timestamp or removing startup delay. Larger timing discrepancies remain errors. Imported recordings retain their original completion/fault status; importing cannot turn a disconnected or incomplete run into a successful test.

STOP, expiry and heartbeat protections are unchanged. STOP removes drive but allows coasting. Save each recording before a new run. A fault, insufficient final dwell, large telemetry gaps or incomplete communication cannot be a pass.

## Validation scope

See the [executed website checks](website-speed-validation.md). These include real Chromium UI tests and a deliberately synthetic CSV export/re-import, not a physical motor experiment. The coordinator's earlier numerical speed pass is a separate source of evidence.

Still pending: a trial through the revised website on the real Pico, round-trip comparison using the original physical records, and physical USB removal. A heartbeat test does not replace the unplug test. Use the [local Codex completion brief](CODEX_SPEED_WEBSITE_TEST.md) for those checks. Do not perform physical position tests.
