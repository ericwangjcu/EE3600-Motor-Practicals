#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'tests/pico-interface.test.cjs'
s=p.read_text(encoding='utf-8')
old="check('P1 UI: analytic position conversion uses the same active gear, ignoring unapplied edits',()=>{const q=Number(elements.get('suggestions').innerHTML.match(/q = ([\\d.eE+-]+)/)[1]);close(q,6/21.3,1e-5);assert.equal(sent.length,beforeConversion);});"
new="check('P1 UI: optional speed PI helper changes no gains or motor commands',()=>{assert.match(elements.get('suggestions').textContent,/Optional analytical PI starting values/);assert.equal(Number(elements.get('speedKp').value),0);assert.equal(sent.length,beforeConversion);});"
if old in s:
    s=s.replace(old,new)
elif new not in s:
    raise RuntimeError('Unexpected original suggestion test')
old="check('Transport: ZERO clears old-angle history before another position baseline',()=>{assert.equal(sent.at(-1),'ZERO');assert.equal(app.state.history.length,0);});"
new="check('Transport: hidden ZERO cannot send a position command on the speed-only page',()=>{assert.equal(sent.includes('ZERO'),false);assert.ok(app.state.history.length>0);assert.match(elements.get('message').textContent,/position control is disabled/i);});"
if old in s:
    s=s.replace(old,new)
elif new not in s:
    raise RuntimeError('Unexpected original ZERO test')
p.write_text(s,encoding='utf-8')
p=root/'practical2-control.html';s=p.read_text(encoding='utf-8')
old="completed:true,finish_reason:'CSV loaded; no hardware run'"
new="completed:true,replay_only:true,source_completed:imported.metadata.completed,finish_reason:imported.metadata.finish_reason||'Imported CSV; completeness not established'"
if old in s:
    s=s.replace(old,new)
elif new not in s:
    raise RuntimeError('Unexpected CSV loading implementation')
old="if(!state.run.completed)throw Error('Finish the trial before analysing its response.');"
new=old+"\n if(state.run.replay_only&&state.run.source_completed!==true)throw Error('Imported metadata does not establish a completed run. Preserve the CSV for review.');"
if 'Imported metadata does not establish a completed run.' not in s:
    if old not in s:raise RuntimeError('Missing completed-run check')
    s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
print('Updated speed-only test contracts and CSV provenance guard.')
