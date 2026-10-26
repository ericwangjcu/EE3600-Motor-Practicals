"""Build the P/PI teaching revision without changing the Pico firmware or P1.
Run on the known baseline once. Output changes are ordinary repository files.
"""
from pathlib import Path
import re
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[1]
p = root / 'practical2-control.html'
text = p.read_text(encoding='utf-8')
if 'PPI-1 hardware page' in text:
    print('PPI-1 hardware page already generated')
    raise SystemExit(0)
assert 'id="p2-core"' in text and 'id="optionalPosition"' in text
soup = BeautifulSoup(text, 'html.parser')
soup.title.string = 'EE3600 / EE5610 Practical 2 — Speed control with P and PI'
soup.h1.string = 'Practical 2 · Speed control with P and PI'
soup.select_one('header .sub').string = 'EE3600 / EE5610 · Reuse P1 → compare P → add I → test and explain'
files = soup.find('h2', string='Practical 2 files and workflow').parent
files.find('p').string = 'Use your existing P1 model. Explain the P-only offset in simulation, add integral action, then validate a reviewed P/PI speed controller on the Pico. Position is simulation-only and is not a bench task.'
files.select_one('.hint').string = 'The new P / PI simulator and this hardware page both use motor-shaft RPM and fractional duty. No gain conversion is needed between these two pages, but sampling and model assumptions must still be checked. No gains are transferred automatically. Legacy percent duty / output-RPM gains must be divided by 100 × N before use here.'
for a in soup.find_all('a', href='practical2.html'):
    a['href'] = 'practical2-ppi.html'
    a.string = 'P / PI speed simulation'
for a in soup.find_all('a', href='docs/EE3600_Practical_2.pdf'):
    a.string = 'P / PI task sheet (PDF)'
files.select_one('.actions').append(BeautifulSoup('<a class="buttonlink secondary" href="docs/practical2-student.html">Task sheet online / print</a>', 'html.parser'))
notice = soup.select_one('main > .notice')
notice.clear()
notice.append(BeautifulSoup('<strong>Speed bench evidence, not universal gains.</strong> The instructor reports three passing numerical speed repeats at 6 V and 1000 motor RPM on one unloaded kit. The revised native browser workflow and physical USB-unplug check still require local verification. Use your tutor-approved supply and limits. The 3 A supply rating is not a measured motor current or a configured current limit. No position hardware trials.', 'html.parser'))
soup.select_one('#supply').find('option', value='6')['selected'] = ''
soup.select_one('#limit')['value'] = '100'
soup.select_one('#limit')['max'] = '100'
soup.select_one('#limitHint').string = '6 V teaching-kit preset: 100% is a ceiling, not a minimum duty. Confirm this limit with the tutor for your kit.'
soup.select_one('#lambda')['value'] = '0.20'
# Retain legacy protocol fields, but retire all student-facing position controls.
# The explicit startTrial guard below also rejects any position actuation request.
for id_ in ['optionalPosition']:
    tag = soup.select_one('#'+id_)
    tag['hidden'] = ''
    tag['inert'] = ''
    tag['aria-hidden'] = 'true'
for id_ in ['zeta','wn','travel']:
    soup.select_one('#'+id_).parent['hidden'] = ''
soup.select_one('#positionValue').parent['hidden'] = ''
soup.select_one('style').string += '\n[hidden]{display:none!important}.values{grid-template-columns:repeat(3,1fr)}\n'
for h in soup.find_all('h2'):
    if h.get_text().startswith('3 · Speed control'):
        h.string = '3 · Speed control (required) — enter reviewed P / PI gains'
model = soup.select_one('#optionalDesign')
model.select_one('summary').string = 'Optional analytical PI starting-gain helper'
model.select_one('.hint').string = 'Optional shortcut only. The main task is to compare P and PI in simulation. Tc is the desired closed-loop time constant, not a new motor measurement. The formulas assume the nominal first-order plant without saturation.'
soup.select_one('#suggestions').string = 'Kp = τ/(K Tc), Ki = 1/(K Tc), Kd = 0. Tc = 0.20 s predicts a 0.439 s rise and 0.782 s nominal 2% settling time. Review simulation and duty before entering any gains.'
# Explain D without requiring it. Existing firmware and protocol remain intact.
soup.select_one('#speedKd').parent.insert_before(BeautifulSoup('<p class="hint">Start with Kd = 0. D is not required for this practical. Use the same Kp initially when comparing P-only and PI in simulation.</p>', 'html.parser'))
soup.select_one('#speedTarget').parent.insert_before(BeautifulSoup('<p class="hint">Freeze the target and operating conditions before comparing hardware trials. Stop and save each run before editing gains. The model examples are not validated gains for every kit.</p>', 'html.parser'))
# Student workflow is visible above the gain fields; no repeated P1 exercises.
workflow = BeautifulSoup('<section class="card wide"><h2>Student workflow</h2><ol><li>Connect and apply the tutor-approved hardware settings.</li><li>Convert the saved P1 model; compare P-only and PI in the simulator.</li><li>Enter reviewed gains, run a finite speed trial, then analyse and save CSV.</li><li>Refine one setting at a time. Freeze final gains and run three fresh repeats.</li><li>Load one exported CSV and check that its metrics agree. Explain P offset, I action and model mismatch.</li></ol><p class="hint">All students compare P and PI. Analytical/computational routes are alternatives, not three compulsory hardware exercises. Ziegler–Nichols requires a suitable different process response; do not force this motor into sustained oscillation.</p></section>', 'html.parser')
soup.select_one('.grid').insert(0, workflow)
text = str(soup)
# Keep core/controller mathematics and safety thresholds unchanged.
text = text.replace('async function startTrial(kind){assertReady();', "async function startTrial(kind){if(kind==='position')throw Error('Position hardware control is excluded from Practical 2. Use simulation only.');assertReady();")
start = text.index('function suggestions(){')
end = text.index('function analyse(){', start)
text = text[:start] + '''function suggestions(){try{
 const K=C.number($('modelK').value,'Plant gain K'),tau=C.number($('modelTau').value,'τ'),tc=C.number($('lambda').value,'Desired time constant Tc');
 if(K<=0||tau<=0||tc<=0)throw Error('K, τ and Tc must be positive.');
 $('suggestions').innerHTML='<p><strong>Initial speed PI:</strong> Kp = '+fmt(tau/(K*tc),8)+', Ki = '+fmt(1/(K*tc),8)+', Kd = 0.</p><p>Nominal 10–90% rise = '+fmt(Math.log(9)*tc,4)+' s; 2% settling = '+fmt(Math.log(50)*tc,4)+' s. These are model predictions, not measured performance.</p><p class="hint">Compare P-only (Ki = 0) and PI in simulation first. Exact stable-pole cancellation is only nominal. Gains have not been applied or changed.</p>';
 }catch(e){message(e.message,true);}}
''' + text[end:]
# Preserve completion/fault provenance on CSV reload. An unfinished export stays unfinished.
old = "completed:true,finish_reason:'CSV loaded; no hardware run'"
assert old in text
text = text.replace(old, "completed:imported.metadata.completed===true,finish_reason:imported.metadata.finish_reason||'CSV loaded; completion not established',imported_from:f.name")
# One bounded selector handles only <= one control tick of stale transition telemetry.
# Raw samples, timestamp values, event times and strict metric core are untouched.
core_end = '  root.Practical2Core={'
helper = '''  function postCommandSamples(samples,commandMs,maxTransitionMs=10){
    if(!Number.isFinite(commandMs))throw Error('A finite device command timestamp is required.');
    for(let i=0;i<samples.length;i++)if(!Number.isFinite(samples[i].t_unwrapped)||(i&&samples[i].t_unwrapped<=samples[i-1].t_unwrapped))throw Error('Non-increasing raw assessment timestamps.');
    const excluded=samples.filter(s=>s.t_unwrapped<commandMs);
    if(excluded.some(s=>commandMs-s.t_unwrapped>maxTransitionMs))throw Error('Pre-command samples exceed one control tick; inspect the raw run.');
    const kept=samples.filter(s=>s.t_unwrapped>=commandMs);
    if(!kept.length||kept[0].t_unwrapped-commandMs>100)throw Error('Missing response samples immediately after the command.');
    return {samples:kept,excluded_count:excluded.length,excluded_timestamps:excluded.map(s=>s.t_unwrapped)};
  }
'''
assert core_end in text
text = text.replace(core_end,helper+core_end.replace('{','{postCommandSamples,'),1)
old = "const event=(state.run.reference_events||[]).filter(e=>e.value===r1&&e.t_unwrapped<=part[0].t_unwrapped&&e.t_unwrapped>=part[0].t_unwrapped-100).at(-1);"
new = "const events=(state.run.reference_events||[]).filter(e=>e.value===r1&&e.t_unwrapped<=part[0].t_unwrapped+10&&e.t_unwrapped>=part[0].t_unwrapped-100);if(index>0&&events.length!==1)throw Error('Missing or ambiguous device reference event.');const event=events.at(-1);"
assert old in text
text = text.replace(old,new)
old = "const commandMs=index===0?(state.run.arm_time??part[0].t_unwrapped):(event?.t_unwrapped??part[0].t_unwrapped);"
new = "const commandMs=index===0?state.run.arm_time:event?.t_unwrapped;const selection=C.postCommandSamples(part,commandMs);const assessed=selection.samples;"
assert old in text
text = text.replace(old,new)
text = text.replace("result=C.metrics(part.map(s=>({t:s.t_unwrapped/1000,y:s[valueKey]}))", "result=C.metrics(assessed.map(s=>({t:s.t_unwrapped/1000,y:s[valueKey]}))")
text = text.replace("const saturated=part.filter(s=>Math.abs(s.u_applied_pct)>=Number(cfg.duty_limit_pct)-.05).length/part.length;", "const saturated=assessed.filter(s=>Math.abs(s.u_applied_pct)>=Number(cfg.duty_limit_pct)-.05).length/assessed.length;")
text = text.replace("result={...result,saturation_fraction:", "result={...result,excluded_precommand:selection.excluded_count,excluded_timestamps:selection.excluded_timestamps,command_time_ms:commandMs,saturation_fraction:")
# Show transition exclusions and t10; keep all raw rows in export.
needle = "log('Response metrics calculated against commanded targets and provisional limits.');"
addition = "$('metrics').innerHTML += '<p class=\"hint\">Startup and timestamp audit: '+results.map(r=>r.error?'Assessment incomplete':('t10 = '+fmt(r.t10,4)+' s from command; excluded pre-command frames = '+r.excluded_precommand+' (raw CSV preserved)')).join('; ')+'</p>';"
assert needle in text
text = text.replace(needle,addition+'\n '+needle)
# Add context without silently moving gains between windows or touching hardware.
text = text.replace("const baseline=getBaseline(mode);", "const baseline=getBaseline(mode);")
text = text.replace("kind,mode,created:new Date().toISOString(),", "kind,mode,website_revision:'PPI-1',model_provenance:state.modelProvenance,created:new Date().toISOString(),")
text = text.replace('</body>', '<!-- PPI-1 hardware page: position UI retired; firmware unchanged. -->\n</body>')
p.write_text(text,encoding='utf-8')
# Shared pure core for the simulator and regression tests.
core = re.search(r'<script id="p2-core">([\s\S]*?)</script>', text).group(1)
(root/'js/practical2-core.js').write_text(core,encoding='utf-8')
# Update only integration expectations which intentionally changed in this release.
test = root/'tests/pico-interface.test.cjs'
s = test.read_text(encoding='utf-8')
s = s.replace('assert.match(html,/href="practical2\\.html"/);', 'assert.match(html,/href="practical2-ppi\\.html"/);')
# The historical simulator retains the 100 N conversion guidance; it is not the main simulator.
test.write_text(s,encoding='utf-8')
print('Built PPI-1 hardware page; core maths, firmware and P1 unchanged')
