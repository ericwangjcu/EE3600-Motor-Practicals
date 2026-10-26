#!/usr/bin/env python3
"""One-time, checked migration of the existing P2 page; never edits firmware/P1."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'practical2-control.html'
s = p.read_text(encoding='utf-8')
MARK = 'P2-P-PI-SPEED-2026-10-26'
if MARK in s:
    print('P/PI page migration already applied.')
    raise SystemExit(0)

def replace(old, new, count=1):
    global s
    actual = s.count(old)
    if actual != count:
        raise RuntimeError(f'Expected {count} matches, found {actual}: {old[:100]}')
    s = s.replace(old, new)

replace('<title>EE3600 / EE5610 Practical 2 — Pico motor control</title>', '<title>EE3600 / EE5610 Practical 2 — P and PI speed control</title>\n<!-- '+MARK+' -->')
replace('Practical 2 · Pico motor control</h1>', 'Practical 2 · Speed control with P and PI</h1>')
replace('EE3600 / EE5610 · Required speed control · Optional position extension', 'EE3600 / EE5610 · Understand P offset · Add I · Validate speed on the Pico')
replace('Reuse your Practical 1 model, design and simulate the controller, then enter the gains in the hardware units below. The required task is speed control. Position control is optional.', 'Reuse your Practical 1 model. Compare P-only responses, hold P fixed while adding I in simulation, then test a reviewed PI candidate on the Pico. Freeze the final gains and record three fresh repeats. Do not repeat identification. Position is an optional simulation exercise only; physical position commands are disabled on this page.')
replace('href="docs/EE3600_Practical_2.pdf">Practical 2 task sheet (PDF)', 'href="docs/practical2-speed-task.html">Updated task sheet · read / print')
notice = re.search(r'<div class="notice"><strong>Bench test pending\.</strong>.*?</div>', s)
if not notice:
    raise RuntimeError('Old validation notice not found')
s = s[:notice.start()] + '<div class="notice"><strong>Validation scope.</strong> The supplied bench report records three passing speed trials on one unloaded 6 V kit at 1000 motor RPM. This revised website still needs a physical browser trial, CSV round-trip and USB-unplug check. Those checks are not established by software tests. The P1 fit is a starting model, not an exact prediction of the real motor. Do not use the failed position-controller settings.</div>' + s[notice.end():]
replace('<select id="supply"><option value="9">9 V</option><option value="6">6 V</option></select>', '<select id="supply"><option value="6">6 V</option><option value="9">9 V</option></select>')
replace('id="limit" type="number" value="60" min="1" max="66.6667"', 'id="limit" type="number" value="60" min="1" max="100"')
replace('At 9 V, the nominal 6 V duty ceiling is 66.67%. The initial limit is 60%.', 'Select the actual supply. A 100% ceiling was approved only for the reported 6 V bench; apply the tutor-approved limit for your kit. No minimum-duty clamp or starting boost is used.')
replace('id="optionalPosition">', 'id="optionalPosition" hidden inert aria-hidden="true">')
replace('<label>Position travel limit (± degrees)', '<label hidden>Position travel limit (± degrees)')
replace('<label>Position damping ζ', '<label hidden>Position damping ζ')
replace('<label>Position ω<sub>n</sub>', '<label hidden>Position ω<sub>n</sub>')
replace('<div class="value">Output position', '<div class="value" hidden>Output position')
replace('Position PD is an optional calculation using q = 6 / gear ratio. ', '')
replace('Speed bands use the larger of 2% of the step and two count/window quanta; position uses the larger of 2° and two output encoder counts, bθ = max(2°, 720/(CPR × N)). This gives 2° at N = 21.3 or about 3.72° at N = 4.4 when CPR = 44. The displayed band shows the resolution adjustment.', 'Speed bands use the larger of 2% of the commanded step and two count/window quanta. For 44 counts/motor revolution and a 50 ms window, the floor is ±54.545 motor RPM. At a 1000 RPM target that is ±5.45%, not strict ±2%. Command time is not shifted to the beginning of motion. Any excluded pre-command transition frames are counted; raw CSV data remain unchanged.')
replace('Optional diagnostics · PWM hold and step check', 'Tutor diagnostics · not a Practical 1 repeat')
replace('function raw(line){if(!state.writer)', "function raw(line){if(/^(?:MODE,POSITION(?:,|$)|TARGET(?:,|$)|PIDPOS(?:,|$)|ZERO(?:,|$))/.test(line))return Promise.reject(Error('Physical position control is disabled. Use the optional simulation exercise only.'));if(!state.writer)")
replace('async function startTrial(kind){assertReady();', "async function startTrial(kind){if(kind==='position')throw Error('Physical position control is disabled.');assertReady();")
replace("+'%. The configured limit must also respect the actual motor/current limits.';", "+'%. Use the tutor-approved limit: 100% was approved for the reported 6 V bench only. The supply entry is metadata, not a measurement. No minimum-duty boost is applied.';")
replace("function suggestions(){try{", "function suggestions(){try{") if False else None
begin = s.index('function suggestions(){')
end = s.index('\nfunction analyse(){', begin)
s = s[:begin] + """function suggestions(){try{
 const K=C.number($('modelK').value,'Plant gain K'),tau=C.number($('modelTau').value,'Time constant'),tc=C.number($('lambda').value,'Desired time constant Tc');
 if(K<=0||tau<=0||tc<=0)throw Error('Model values and desired time constant must be positive.');
 $('suggestions').textContent='Optional analytical PI starting values: Kp = '+fmt(tau/(K*tc),7)+', Ki = '+fmt(1/(K*tc),7)+', Kd = 0. These use nominal stable-pole cancellation; they are not automatically selected from the targets. Check the complete simulated response and applied-duty demand. Main exercise: compare P, then hold P fixed while varying I. Hardware gain fields have not changed.';
 }catch(e){message(e.message,true);}}
""" + s[end:]

# Retain the strict metrics primitive. Only explicitly selected, bounded
# pre-command transition samples are excluded from assessment, never raw data.
helper = """
  function assessmentSamples(rows,commandMs,maxTransitionMs=10){
    commandMs=number(commandMs,'Device command time');
    if(!rows.length)throw Error('No assessment samples.');
    rows.forEach((r,i)=>{if(!Number.isFinite(r.t_unwrapped)||(i&&r.t_unwrapped<=rows[i-1].t_unwrapped))throw Error('Non-increasing raw sample timestamps.');});
    const early=rows.filter(r=>r.t_unwrapped<commandMs);
    if(early.some(r=>commandMs-r.t_unwrapped>maxTransitionMs))throw Error('Pre-command sample exceeds the one-control-tick transition allowance.');
    const selected=rows.filter(r=>r.t_unwrapped>=commandMs);
    if(selected.length<5)throw Error('Insufficient post-command samples.');
    if(selected[0].t_unwrapped-commandMs>100)throw Error('First post-command sample is more than 100 ms late.');
    return {samples:selected,excluded:early.length,command_ms:commandMs};
  }
"""
replace('  root.Practical2Core={number,', helper+'  root.Practical2Core={assessmentSamples,number,')
old = "const event=(state.run.reference_events||[]).filter(e=>e.value===r1&&e.t_unwrapped<=part[0].t_unwrapped&&e.t_unwrapped>=part[0].t_unwrapped-100).at(-1);"
new = "const event=(state.run.reference_events||[]).filter(e=>e.value===r1&&e.t_unwrapped<=part[0].t_unwrapped+10&&e.t_unwrapped>=part[0].t_unwrapped-100).at(-1);"
replace(old,new)
replace("result=C.metrics(part.map(s=>({t:s.t_unwrapped/1000,y:s[valueKey]})),r0,r1,band,2,commandMs/1000);", "const selection=C.assessmentSamples(part,commandMs);\n   result=C.metrics(selection.samples.map(s=>({t:s.t_unwrapped/1000,y:s[valueKey]})),r0,r1,band,2,commandMs/1000);\n   result.precommand_frames_excluded=selection.excluded;")
replace('const saturated=part.filter(s=>Math.abs(s.u_applied_pct)>=Number(cfg.duty_limit_pct)-.05).length/part.length;', 'const saturated=selection.samples.filter(s=>Math.abs(s.u_applied_pct)>=Number(cfg.duty_limit_pct)-.05).length/selection.samples.length;')
replace("log('Response metrics calculated against commanded targets and provisional limits.');", "const excluded=results.reduce((n,r)=>n+(r.precommand_frames_excluded||0),0);\n $('metrics').innerHTML+='<p class=\"hint\">Pre-command transition frames excluded from assessment: '+excluded+'. All raw samples remain in the exported CSV. Time to 10% / 90% from command: '+results.map(r=>r.error?'unavailable':fmt(r.t10,4)+' / '+fmt(r.t90,4)+' s').join('; ')+'.</p>';\n log('Response metrics calculated against commanded targets. Excluded transition samples: '+excluded+'. Raw recording preserved.');")

# Add a speed-only study panel. It has no access to the serial transport.
panel = '''<section class="card wide" id="speedStudy"><h2>3 · Compare P, then add I — simulation only</h2>
<p>Use your converted model. First compare three proportional gains. Then keep P fixed and compare integral gains. These ideal continuous-model predictions do not include friction, sampling or actuator saturation; check the duty warning and the separate limited simulator before hardware use.</p>
<div class="fields">
<label>Plant K (motor RPM / duty)<input id="studyK" type="number" min="0" step="any" placeholder="Use converted P1 model"></label>
<label>Plant τ (s)<input id="studyTau" type="number" min="0" step="any" placeholder="Use P1 time constant"></label>
<label>Simulation reference (motor RPM)<input id="studyTarget" type="number" value="1000" min="1" step="any"></label>
<label>Comparison base Kp (duty / RPM)<input id="studyKp" type="number" min="0" step="any" placeholder="Choose Kp"></label>
<label>Comparison base Ki (duty / RPM / s)<input id="studyKi" type="number" min="0" step="any" placeholder="Choose Ki for the PI comparison"></label>
<label>Duty ceiling for demand check (%)<input id="studyLimit" type="number" value="100" min="1" max="100" step="any"></label>
</div><div class="actions"><button class="secondary" id="studyUseModel">Use model fields for simulation</button><button class="secondary" id="studyP">Compare P: 0.5×, 1×, 2× Kp</button><button class="secondary" id="studyPI">Compare PI: fixed P, 0.5×, 1×, 2× Ki</button><button class="secondary" id="studyDownload" disabled>Save simulated CSV</button></div>
<p class="hint">All simulations use motor RPM and fractional duty, matching the hardware gain fields. No hardware gains are filled automatically and no motor commands are sent. A prediction is not a reviewed hardware setting.</p>
<p class="hint"><strong>P:</strong> T(s) = KKp/(τs + 1 + KKp); τcl = τ/(1 + KKp); ess/r = 1/(1 + KKp). This ideal first-order P response has no overshoot but retains offset.<br><strong>PI:</strong> T(s) = K(Kp s + Ki)/[τs² + (1 + KKp)s + KKi]. The zero matters: inspect the complete response.</p>
<div id="studyMessage" role="status" class="hint">Enter your model and gains. No λ or pole choice is needed for this gain-effect comparison.</div>
<div class="plot-wrap"><canvas id="studyPlot" role="img" aria-label="Ideal P or PI speed comparison"></canvas></div><div id="studyTable" class="table-wrap"></div>
<details><summary>Three tuning methods — not three hardware experiments</summary><p>Model-based analysis: explain the P/PI equations and gain effects. Computational tuning: adjust or search simulated gains, then validate a reviewed candidate. Ziegler–Nichols: assess applicability; the ideal delay-free first-order model has neither a positive reaction-curve delay nor a finite positive ultimate gain. Do not invent these values or force physical oscillation.</p></details>
<p><a href="practical2.html">Open the separate limited simulator</a> · <a href="docs/practical2-speed-task.html#position">Optional position simulation exercise</a></p>
</section>'''
replace('<section class="card wide"><h2>3 · Speed control (required)</h2>', panel+'\n<section class="card wide"><h2>4 · Speed control (required)</h2>')
replace('<h2>4 · Live traces and results</h2>', '<h2>5 · Analyse, save and repeat</h2>')
replace('</style>', '[hidden]{display:none!important}.values{grid-template-columns:repeat(3,1fr)}#studyPlot{height:300px}.study-warn{color:#9b2828}.study-note{padding:10px;border-left:4px solid #096b72}@media(max-width:600px){.values{grid-template-columns:1fr}}\n</style>')
replace('</body>', '<script src="js/p2-speed-study.js"></script>\n</body>')
p.write_text(s,encoding='utf-8')

# Keep the legacy simulator and its tests intact; distinguish its actuator lag.
p = ROOT/'practical2.html'; sim=p.read_text(encoding='utf-8')
sim=sim.replace('PID Speed Simulation','P and PI Speed Simulation')
sim=sim.replace('Position control is optional.', 'Position is optional in simulation only; physical position control is disabled.')
sim=sim.replace('href="docs/EE3600_Practical_2.pdf">Task sheet (PDF)', 'href="docs/practical2-speed-task.html">Updated task sheet')
sim=sim.replace('<h2>1. Experiment settings</h2>', '<h2>1. Experiment settings</h2><p><strong>P then PI:</strong> set Ki = Kd = 0 and compare increasing Kp. Next hold Kp fixed and increase Ki; D is not required. The fixed 0.08 s actuator lag below means this is not the ideal first-order P loop. Use the <a href="practical2-control.html#speedStudy">ideal P/PI comparison</a> for the no-overshoot analytical result. Before hardware, check the limit and convert the simulator gains by 100 × N.</p>')
p.write_text(sim,encoding='utf-8')
# Change only the download-path contract in the original interface suite.
p=ROOT/'tests/pico-interface.test.cjs'; t=p.read_text(encoding='utf-8')
t=t.replace("'docs/EE3600_Practical_2.pdf'", "'docs/practical2-speed-task.html'")
p.write_text(t,encoding='utf-8')
print('Migrated P2 pages. P1 and every firmware file remain unchanged.')
