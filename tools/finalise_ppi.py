from pathlib import Path
import re, hashlib
root=Path(__file__).resolve().parents[1]
p=root/'tests/pico-interface.test.cjs'
s=p.read_text()
old="check('P1 UI: analytic position conversion uses the same active gear, ignoring unapplied edits',()=>{const q=Number(elements.get('suggestions').innerHTML.match(/q = ([\\d.eE+-]+)/)[1]);close(q,6/21.3,1e-5);assert.equal(sent.length,beforeConversion);});"
new="check('P1 UI: speed PI suggestions are local only and do not expose position gains',()=>{assert.match(elements.get('suggestions').innerHTML,/Initial speed PI/);assert.doesNotMatch(elements.get('suggestions').innerHTML,/Position PD/);assert.equal(sent.length,beforeConversion);});"
if old in s:s=s.replace(old,new)
else:assert new in s, 'Expected legacy helper test not found'
p.write_text(s)
# Preserve the legacy simulator and its test contracts, but route students to the new page.
p=root/'practical2.html';s=p.read_text()
marker='PPI-1 current simulator'
if marker not in s:s=s.replace('<body><main>','<body><main><section class="card"><h2>PPI-1 current simulator</h2><p>This page is the legacy percent-duty/output-RPM simulator. For the current practical, use <a href="practical2-ppi.html">P and PI speed simulation</a>, whose gain units match the Pico page. Position hardware is no longer part of Practical 2; position is simulation-only.</p></section>')
p.write_text(s)
(root/'docs/practical2-hardware.md').write_text('''# Practical 2: speed control with P and PI

Revision PPI-1, 26 October 2026. Use [the task sheet](practical2-student.html), [PDF](EE3600_Practical_2.pdf), [P/PI simulator](../practical2-ppi.html) and [Pico speed page](../practical2-control.html).

## Student sequence
1. Reuse the P1 model and tutor-confirmed motor setup. No repeated identification.
2. Simulate P-only control at several gains; explain its offset and nominal monotonic response.
3. Add I while initially keeping P fixed. Select and justify a stable simulation candidate. D is not required.
4. Connect the Pico in desktop Chrome/Edge. Close any other serial-port owner.
5. Check the actual supply and kit limits, then Apply configuration. Device settings are metadata, not voltage/current measurements.
6. Convert P1 model, then Use converted model. Enter reviewed gains explicitly; the helper never applies them.
7. Arm & run speed trial. After completion, Analyse response and Save CSV before another run.
8. Refine conservatively, freeze successful gains and run three fresh repeats. Load a saved CSV to verify the metric round-trip.

## Units and hardware
The unchanged RP2040 `EE3600_P2 1.0.0` UF2 drives Kitronik 5331 Motor 1 on GP3/GP2, with encoder A/B on GP26/GP27. The established decoder uses 44 counts per motor revolution; apply the confirmed gearbox ratio separately. Do not enter approximately 937 output counts into the motor-count field.

References and speed gains use motor RPM and fractional duty. The new simulator uses these same units. The legacy percent-duty/output-RPM simulator requires dividing gains by 100*N.

For output rad/s/V P1 gain Kbar, the controller plant gain is K=Kbar*N*60/(2*pi)*Vs; tau is unchanged. Nominal PWM voltage scaling is an approximation.

A 6 V/100% teaching preset is supplied for the established kit only. Connecting and reading firmware settings may show the device's stored or reset defaults; verify actual supply and permitted limits before Apply configuration. A duty ceiling is not a minimum-drive clamp or current limit. No starting boost is added.

The controller runs at 100 Hz, with a 50 ms speed window and explicit finite trials. STOP removes drive; the shaft may coast. Faults stop the trial and require diagnosis, not automatic re-arming. Keep physical motor-power isolation accessible.

## Assessment and CSV
The website retains raw samples and original timestamps. Only armed transition samples dated less than or equal to one control tick before the actual command event are excluded from assessment, and exclusions are reported. Larger timing discrepancies, faults and incomplete data remain invalid. The strict metric core and acceptance thresholds are unchanged.

Rise is 10–90% of the requested change. t10 also reports startup delay. Settling uses the target-centred band max(2% of step, two speed quanta), with at least two seconds final dwell. At 44 counts/revolution the floor is 54.545 motor RPM. Report when this exceeds a strict 2% band. Final error is last-two-second MAE, with signed bias also reported. Post-disarm coasting is not assessed.

CSV reload preserves completion and failure status. Loading a saved run sends no motor command.

## Position
Position controls are retired from the student hardware UI and position-start requests are rejected by this page. Unchanged firmware retains its legacy protocol for compatibility. Position is an optional MATLAB/Simulink extension only; the two reported physical candidates faulted.

## Evidence boundary
The instructor reported three numerical speed passes on one unloaded kit at 6 V/1000 motor RPM. These are not universal gains or a new test by this release. Native student-browser hardware operation, export/re-import on the local PC and physical USB removal still need local verification. Cloud or synthetic-serial tests are not physical motor tests.
''')
# Ensure unchanged binary is actually unchanged, not merely a matching filename.
uf2=root/'firmware/EE3600_Practical_2_Pico.uf2'
assert hashlib.sha256(uf2.read_bytes()).hexdigest()=='74c915c9541da3c637880ccb31a300a86ecdf59092494fd6d81171e5844b562b'
print('Legacy contract updated; operating guide aligned; original UF2 hash verified')
