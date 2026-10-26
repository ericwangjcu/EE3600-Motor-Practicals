#!/usr/bin/env python3
"""Presentation/profile revision only; preserve the existing controller, metrics and UF2.
Run on the reviewed P/PI website, then run all regression and browser checks.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import re

root = Path(__file__).resolve().parents[1]
p = root / 'practical2-control.html'
text = p.read_text(encoding='utf-8')
if '<!-- P2-SIMPLE-TASK-FLOW -->' in text:
    print('Student flow already applied.'); raise SystemExit(0)
assert '<!-- P2-P-PI-SPEED-2026-10-26 -->' in text
s = BeautifulSoup(text, 'html.parser')
old = s.main.extract()
layout = '''
<main id="studentMain">
<nav class="student-links" aria-label="Practical links"><a href="docs/practical2-speed-task.html">Task sheet</a><a href="firmware/EE3600_Practical_2_Pico.uf2" download>P2 firmware</a><a href="index.html">Practical 1</a></nav>
<p class="student-intro">Follow the task sheet in order. Use your own P1 model. All speed inputs below are <strong>motor-shaft RPM</strong>.</p>
<nav class="task-nav" aria-label="Task-sheet sections">
<button type="button" data-go="1" aria-current="step">1 · P1 model</button><button type="button" data-go="2">2 · P only</button><button type="button" data-go="3">3 · Add I</button><button type="button" data-go="4">4 · Targets</button><button type="button" data-go="5">5 · Pico test</button><button type="button" data-go="6">6 · Results</button>
</nav>
<div data-slot="message"></div>
<section class="card" id="task1" data-task="1">
<h2>1. Carry forward the Practical 1 model</h2>
<p>Select your motor. Enter the gain and time constant you already measured in P1.</p>
<div class="fields"><label>Motor / gearbox version<select id="motorProfile"><option value="">Select your motor</option><option value="21.3">6 V · 280 RPM output · 21.3:1</option><option value="4.4">6 V · 1360 RPM output · 4.4:1</option></select></label><div data-field="supply"></div><div data-field="p1Gain"></div><div data-field="p1Tau"></div><div data-field="studyTarget"></div></div>
<p class="hint" id="motorSummary">Select the same motor used in Practical 1. Both profiles use 44 decoded motor-shaft counts per revolution; gearbox ratio is separate.</p>
<p class="hint" id="targetEquivalent">Choose an achievable speed agreed with the tutor.</p>
<div class="actions"><button id="prepareModel" type="button">Use my P1 model</button></div><div data-slot="p1Conversion"></div>
<p class="hint">K = K̄ × N × 60/(2π) × Vs; τ is unchanged. Voltage scaling assumes Vmotor ≈ Vs × duty. No identification test is repeated.</p>
</section>
<section class="card" id="task2" data-task="2" hidden>
<h2>2. Analyse and simulate P-only control</h2>
<p>Enter one base P gain. Compare 0.5×, 1× and 2× this gain, with I = D = 0.</p><div class="fields"><div data-field="studyKp"></div></div><div class="actions"><div data-slot="studyP"></div></div>
<p class="hint">Tₚ(s) = KKp / (τs + 1 + KKp). Higher P makes this ideal first-order response faster and reduces its offset. It has no overshoot, but finite P leaves an offset.</p>
<div id="studyMount2"></div><p><strong>Record:</strong> final speed, offset, response time and requested duty. Explain why P needs an error to maintain drive. No physical P trial is required.</p>
</section>
<section class="card" id="task3" data-task="3" hidden>
<h2>3. Add I and tune PI in simulation</h2>
<p>Keep P fixed initially and compare 0.5×, 1× and 2× an integral gain. D remains zero.</p>
<p>Fixed P gain: <strong id="fixedPValue">Choose P in section 2</strong> <button class="secondary compact" data-go="2">Change P</button></p>
<div class="fields"><div data-field="studyKi"></div></div><div class="actions"><div data-slot="studyPI"></div></div>
<p class="hint">Tₚᵢ(s) = K(Kp s + Ki) / [τs² + (1 + KKp)s + KKi]. Inspect the full response, including its zero.</p>
<div id="studyMount3"></div>
<p><strong>Record:</strong> the initial and chosen PI gains and why each adjustment helped. Check duty limits and sampled behaviour in MATLAB/Simulink before hardware; this comparison is the ideal continuous model only.</p>
<details><summary>Three tuning methods — task-sheet guidance</summary><p>Model-based analysis explains P/PI behaviour. Computational tuning adjusts or searches gains in simulation. Ziegler–Nichols is an applicability question here: the ideal model supplies neither a positive reaction-curve delay nor a finite positive ultimate gain. These are not three compulsory motor experiments.</p></details>
</section>
<section class="card" id="task4" data-task="4" hidden>
<h2>4. Speed requirements and measurement conventions</h2>
<table><tr><th>Measure</th><th>Target</th></tr><tr><td>Overshoot</td><td>≤5% of the commanded step</td></tr><tr><td>10–90% rise time</td><td>≤0.50 s</td></tr><tr><td>Target-centred settling time</td><td>≤1.00 s, with ≥2 s final in-band data</td></tr><tr><td>Final mean absolute error</td><td>≤max(2% of target, two speed-measurement quanta)</td></tr></table>
<p>The settling band is ±max(2% of the commanded change, 54.545 motor RPM) for the supplied 44-count encoder and 50 ms speed window. At 1000 RPM this is ±5.45%, not strict ±2%.</p>
<p>Measure from the command, not from the start of motion. Save startup delay, duty and failures. A faulted or incomplete recording cannot pass.</p>
</section>
<section class="card" id="task5" data-task="5" hidden>
<h2>5. Website and Pico workflow</h2>
<p><strong>Connect Pico → Apply configuration → enter reviewed gains → Arm &amp; run.</strong> Use the same target and limits for each trial.</p>
<p id="kitReadback" class="setup-summary">Connect the Pico, then apply the selected motor configuration while disarmed.</p>
<div class="actions"><div data-slot="applyConfig"></div></div>
<div class="fields hardware-fields"><div data-field="speedTarget"></div><div data-field="speedKp"></div><div data-field="speedKi"></div></div>
<p class="hint">Gains use fractional duty / motor RPM, exactly as in sections 2–3. D = 0; derivative filter = 0.020 s. Enter your reviewed candidate, not the reference-kit answer.</p>
<div class="actions"><div data-slot="runSpeed"></div></div>
<p class="hint">Each trial is finite (normally 10 s). STOP removes drive; allow coast-down. Diagnose a fault with the tutor before any restart.</p>
<details id="tutorSettings"><summary>Tutor settings — only change when instructed</summary><div class="fields"><div data-field="limit"></div><div data-field="duration"></div><div data-field="encsign"></div><div data-field="motorsign"></div><div data-field="speedlimit"></div></div><div data-slot="limitHint"></div><div class="actions"><div data-slot="readConfig"></div><div data-slot="saveConfig"></div></div><details><summary>Device readback and session log</summary><div data-slot="deviceInfo"></div><div data-slot="eventLog"></div></details></details>
<div id="traceMount5"></div>
</section>
<section class="card" id="task6" data-task="6" hidden>
<h2>6. Results and submission</h2>
<p><strong>Analyse response → Save CSV → refine → freeze gains → three fresh repeats.</strong> Save every attempt before starting another run. Re-load a saved CSV and check that the metrics agree.</p>
<div id="traceMount6"></div>
<p>Keep your P comparisons, initial/final PI simulations, hardware speed/reference/duty plots and result table. Explain P's offset, I's effect and differences between prediction and measurement. Do not resubmit P1 identification work.</p>
<a href="docs/practical2-speed-task.html#position">7. Optional position extension — MATLAB/Simulink only</a>
</section>
<div class="task-pager"><button class="secondary" id="previousTask">Back</button><span id="taskCounter">Task-sheet section 1 of 6</span><button id="nextTask">Next</button></div>
<details class="release-note"><summary>Instructor validation status</summary><p>Prior reported speed tests passed on one unloaded 6 V, 21.3:1 kit. The 4.4:1 kit is a separate motor profile, not a second physically validated kit. Native browser/Pico trials and physical USB removal require local testing. The original raw records and firmware are unchanged.</p><a href="docs/CODEX_SIMPLE_STUDENT_TEST.md">Codex test instructions</a></details>
<div id="speedStudy" hidden><p class="hint" id="studyKind">Simulation only</p><div data-slot="studyMessage"></div><div class="plot-wrap"><div data-slot="studyPlot"></div></div><div data-slot="studyTable"></div><div class="actions"><div data-slot="studyDownload"></div></div><p class="hint">Ideal model only: no friction, saturation or measurement noise. A duty warning is not a motor command. Save the current comparison before making another.</p></div>
<div id="liveEvidence" hidden><div class="values"><div class="value">Motor speed<div data-slot="motorValue"></div></div><div class="value">Output speed<div data-slot="outputValue"></div></div><div class="value">Applied duty<div data-slot="dutyValue"></div></div></div><div class="plot-wrap"><div data-slot="responseLabel"></div><div data-slot="responsePlot"></div></div><div class="plot-wrap"><p class="plot-label">Applied duty (%)</p><div data-slot="dutyPlot"></div></div><div class="actions"><div data-slot="analyseResponse"></div><div data-slot="saveCsv"></div><div data-slot="loadCsv"></div></div><div data-slot="runInfo"></div><div data-slot="metrics"></div><div data-slot="csvFile"></div></div>
</main>
'''
new = BeautifulSoup(layout, 'html.parser').main
# Keep the established controls and IDs: protocol, CSV and numerical code remain shared.
for slot in list(new.select('[data-field]')):
    ident = slot['data-field']; field = old.find(id=ident); assert field is not None, ident
    label = field.find_parent('label'); assert label is not None, ident
    slot.replace_with(label.extract())
for slot in list(new.select('[data-slot]')):
    ident = slot['data-slot']; node = old.find(id=ident); assert node is not None, ident
    slot.replace_with(node.extract())
# The original study container is no longer the visible study panel.
old.find(id='speedStudy')['id'] = 'legacySpeedStudy'
archive = s.new_tag('div', id='p2Compatibility', hidden=True, inert=True)
archive['aria-hidden'] = 'true'
# No nested main landmark and no duplicate IDs.
for node in list(old.contents): archive.append(node.extract())
s.body.find('footer').insert_before(new)
new.insert_after(archive)
s.body.find('header').find(class_='sub').string = 'Choose your motor, then follow the task sheet. P → PI → Pico test.'
s.body.find('footer').string = 'EE3600 / EE5610 · P2 student workflow · Same P2 UF2 for both motor versions · Speed control only'
new.find(id='speedTarget')['readonly'] = ''
for ident in ['gear','cpr','speedKd','speedTf']:
    s.find(id=ident)['readonly'] = ''
# Student-facing labels stay in the task sheet's motor-RPM / fractional-duty units.
for ident, label in [('p1Gain','P1 gain K̄ — output rad/s per volt'),('p1Tau','P1 time constant τ (s)'),('studyTarget','Target motor speed (RPM)'),('studyKp','Base P gain Kp (duty / RPM)'),('studyKi','Base I gain Ki (duty / RPM / s)')]:
    field = s.find(id=ident); parent = field.find_parent('label')
    for child in list(parent.contents):
        if child is not field: child.extract()
    parent.insert(0, label)
s.find(id='p1Conversion').string = 'Use the model measured on your selected motor. No gains or motor commands change when you prepare the model.'
s.find(id='message').string = 'Start in section 1. A Pico connection is needed only for the physical test in section 5.'
# Hide the duplicate conversion and optional design/diagnostic controls but retain core compatibility.
css = s.new_tag('style')
css.string = '''
main{max-width:1020px}.student-links{display:flex;gap:22px;flex-wrap:wrap;font-size:.92rem}.student-intro{margin:16px 0}.task-nav{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:16px 0}.task-nav button{background:#fff;color:#096b72;padding:12px 5px}.task-nav button[aria-current="step"]{background:#096b72;color:#fff}.task-pager{display:flex;align-items:center;justify-content:space-between;margin:18px 0;gap:10px}.compact{padding:6px 10px;margin-left:8px}.setup-summary{padding:10px;background:#f0f6f8}.release-note{font-size:.85rem;color:#536775;margin-top:22px}.hardware-fields{margin-top:18px}#message{margin:12px 0;padding:9px 12px;font-size:.9rem}#speedStudy{margin:18px 0}#liveEvidence{margin-top:18px}#p1Conversion{margin-top:14px}#p2Compatibility{display:none!important}#studyTable table{font-size:.8rem}.task-pager span{font-size:.85rem}.fields{grid-template-columns:repeat(2,minmax(0,1fr))}[data-task][hidden]{display:none!important}@media(max-width:650px){.task-nav{grid-template-columns:repeat(3,1fr)}.fields{grid-template-columns:1fr}.task-pager span{font-size:.75rem}header{padding:18px}main{padding:12px}}'''
s.head.append(css)
app = s.find('script', id='p2-app').string
assert app
# Store profile separately from measured model and device readback.
anchor = 'function p1Source(){'
a = app.index(anchor); b = app.index('\nfunction invalidateP1Conversion', a)
app = app[:a] + '''function selectedKit(){const key=$('motorProfile').value;return key==='21.3'?{id:'6V-280-21.3',ratio:21.3,rated_v:6,rated_output_rpm:280}:key==='4.4'?{id:'6V-1360-4.4',ratio:4.4,rated_v:6,rated_output_rpm:1360}:null;}
function p1Source(){const kit=selectedKit(),active=state.connected&&state.config;return{units:$('p1Units').value,gain:$('p1Gain').value,tau:$('p1Tau').value,gear:kit?kit.ratio:active?state.config.gear_ratio:$('gear').value,supply:kit?$('supply').value:active?state.config.supply_v:$('supply').value,settings_source:kit?'selected motor profile and declared supply':active?'active device settings':'entered setup values (device not connected)'};}
function assertKitConfiguration(cfg){const kit=selectedKit();if(!kit)throw Error('Select your motor in section 1 first.');if(Math.abs(cfg.gear_ratio-kit.ratio)>0.000001||cfg.cpr_motor!==44||Math.abs(cfg.supply_v-Number($('supply').value))>0.000001)throw Error('The Pico settings do not match your selected motor. Apply configuration while disarmed.');}
''' + app[b:]
old_read="function readConfigInputs(){return C.validateConfig(Object.fromEntries(Object.entries(configMap).map(([key,id])=>[key,$(id).value])));}"
assert old_read in app
app = app.replace(old_read,"function readConfigInputs(){const inputs=Object.fromEntries(Object.entries(configMap).map(([key,id])=>[key,$(id).value]));const kit=selectedKit();if(kit){inputs.gear_ratio=kit.ratio;inputs.cpr_motor=44;}return C.validateConfig(inputs);}")
old_cfg="if(!state.run||state.run.completed){for(const [key,id]of Object.entries(configMap))if(frame.value[key]!==undefined)$(id).value=frame.value[key];for(const [key,prefix]of [['pidspeed','speed'],['pidpos','position']])if(frame.value[key])for(const [k,suffix]of [['kp','Kp'],['ki','Ki'],['kd','Kd'],['tf','Tf']])if(frame.value[key][k]!==undefined)$(prefix+suffix).value=frame.value[key][k];}"
assert old_cfg in app
app = app.replace(old_cfg,"if(!state.run||state.run.completed){for(const [key,id]of Object.entries(configMap))if(frame.value[key]!==undefined&&!(selectedKit()&&['gear_ratio','cpr_motor','supply_v'].includes(key)))$(id).value=frame.value[key];} // Device readback does not overwrite the student's selected motor or gains.")
anchor="async function applyConfig(){assertReady();"
assert anchor in app
app=app.replace(anchor,anchor+"if(!selectedKit())throw Error('Select your motor in section 1 before applying configuration.');")
anchor="const cfg=activeConfig();const generation=++state.operation;"
assert anchor in app
app=app.replace(anchor,"const cfg=activeConfig();assertKitConfiguration(cfg);if(kind!=='speed')throw Error('This student page runs speed trials only.');const generation=++state.operation;")
anchor="const baseline=getBaseline(mode);"
assert anchor in app
app=app.replace(anchor,"if(mode==='SPEED'&&g.kd!==0)throw Error('Use P or PI with Kd = 0 for this practical.');"+anchor)
anchor="function refresh(){\n const fresh="
assert anchor in app
app=app.replace(anchor,"function refresh(){\n const editingLocked=state.busy||state.deviceState==='ARMED';['motorProfile','supply','p1Gain','p1Tau','studyTarget','limit','duration','encsign','motorsign','speedlimit','speedKp','speedKi','prepareModel'].forEach(id=>$(id).disabled=editingLocked);\n const fresh=")
anchor="$('deviceInfo').textContent=JSON.stringify({identity:state.info,capabilities:state.caps,settings:state.config},null,2);"
assert anchor in app
app=app.replace(anchor,anchor+"\n const kit=selectedKit(),cfg=state.config;const matched=!!(kit&&cfg&&Math.abs(cfg.gear_ratio-kit.ratio)<1e-6&&cfg.cpr_motor===44&&Math.abs(cfg.supply_v-Number($('supply').value))<1e-6);$('kitReadback').textContent=cfg?'Selected: '+(kit?kit.id:'none')+' | Pico readback: '+cfg.supply_v+' V, N='+cfg.gear_ratio+', '+cfg.cpr_motor+' counts/motor rev, limit '+cfg.duty_limit_pct+'%, trial '+cfg.duration_s+' s. '+(matched?'Profile matches.':'Apply the selected configuration before running.'):'Not connected. Choose your motor in section 1; connect here for the physical test.';$('runSpeed').disabled=$('runSpeed').disabled||!matched;")
app=app.replace("firmware:state.info,metrics:null};state.samples=[];", "firmware:state.info,kit_profile:selectedKit(),model_provenance:state.modelProvenance,metrics:null};state.samples=[];")
s.find('script', id='p2-app').string = app
script = s.new_tag('script', src='js/p2-student-flow.js')
s.body.append(script)
result=str(s).replace('<!-- P2-P-PI-SPEED-2026-10-26 -->','<!-- P2-P-PI-SPEED-2026-10-26 -->\n<!-- P2-SIMPLE-TASK-FLOW -->')
ids=re.findall(r'\bid="([^"]+)"',result)
assert len(ids)==len(set(ids)), 'Duplicate ID'
p.write_text(result,encoding='utf-8')
# Existing transport checks now explicitly select the kit, as a student must.
test=root/'tests/pico-interface.test.cjs'
t=test.read_text(encoding='utf-8')
anchor='await app.connect();'
assert anchor in t
t=t.replace(anchor,anchor+"\n elements.get('motorProfile').value='21.3';",1)
test.write_text(t,encoding='utf-8')
# Keep the approved P/PI task content; only clarify its two profiles and updated button sequence.
task=root/'docs/practical2-speed-task.html'
t=task.read_text(encoding='utf-8')
t=t.replace('Revised 26 October 2026','Interface aligned 27 October 2026')
t=t.replace('<section><h2>1. Carry forward the Practical 1 model</h2>', '<section><h2>1. Carry forward the Practical 1 model</h2><p><strong>Select your motor:</strong> 6 V / 280 RPM output / 21.3:1, or 6 V / 1360 RPM output / 4.4:1. Both use the same P2 UF2 and 44 decoded counts per motor revolution. The selector changes the gearbox conversion, not your measured model or controller gains.</p>')
t=t.replace('The website\'s analytical T<sub>c</sub> helper is an optional starting calculation, not a compulsory pole-placement exercise.','No extra time-constant helper or pole-choice exercise is required.')
a=t.index('<section><h2>5. Website and Pico workflow</h2>'); b=t.index('<p>Kp is duty fraction/RPM',a)
t=t[:a]+'''<section><h2>5. Website and Pico workflow</h2><p>The website sections 1–6 follow this sheet. Only one section is shown at a time; use Next/Back or the numbered section buttons. The motor selector is in section 1.</p><ol>
<li><strong>Section 1 — P1 model.</strong> Select your motor and actual supply, enter your own K̄ and τ, and choose the agreed target in motor RPM. Select <strong>Use my P1 model</strong>. The model is converted once for the following simulation sections; no gains are applied.</li>
<li><strong>Section 2 — P only.</strong> Enter a base P gain and compare 0.5×, 1× and 2× P. Save the simulated CSV and record the offset and speed of response.</li>
<li><strong>Section 3 — Add I.</strong> Keep the selected base P fixed; compare three I settings. Refine and justify your candidate. Use MATLAB/Simulink to check the declared limits and sampled behaviour before tutor review.</li>
<li><strong>Section 4 — Targets.</strong> Review the same response targets and encoder-aware band stated above.</li>
<li><strong>Section 5 — Pico test.</strong> Use desktop Chrome/Edge and the existing P2 UF2. Select <strong>Connect Pico</strong>, then <strong>Apply configuration</strong> while disarmed. The chosen profile sets N and motor CPR automatically; check the displayed readback and tutor-approved duty limit. Enter your reviewed Kp and Ki. D remains zero and the normal trial is 10 s.</li>
<li><strong>Arm &amp; run speed trial.</strong> Inspect speed and duty. STOP removes drive; allow coast-down. A fault requires tutor diagnosis, not an automatic retry.</li>
<li><strong>Section 6 — Results.</strong> Select <strong>Analyse response → Save CSV</strong>. Save before another trial. Stop before changing a gain; document each refinement.</li>
<li><strong>Freeze and repeat three times.</strong> Retain every attempt, reload saved P2 CSVs and check reproducible metrics. Do not change gains between final repeats.</li></ol>
''' +t[b:]
task.write_text(t,encoding='utf-8')
print('Built six task-sheet sections, two explicit motor profiles, and profile/readback interlocks. Firmware and metric calculations unchanged.')
