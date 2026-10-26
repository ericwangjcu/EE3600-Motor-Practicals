#!/usr/bin/env python3
from pathlib import Path
r=Path(__file__).resolve().parents[1]
# Clear stale simulation evidence when its model changes. Numerical solver unchanged.
p=r/'js/p2-speed-study.js'; t=p.read_text()
if 'api.invalidate=' not in t:
    old='  let runs=[];'
    assert old in t
    t=t.replace(old,"  let runs=[];\n  api.invalidate=()=>{runs=[];$('studyDownload').disabled=true;$('studyTable').innerHTML='';const canvas=$('studyPlot');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);};")
    p.write_text(t)
# Add actual command-transport checks for BOTH profile selections using the existing mock device.
p=r/'tests/pico-interface.test.cjs';t=p.read_text()
if 'TWO_MOTOR_FLOW_REGRESSION' not in t:
    anchor=' const start=sent.length;await app.guarded(()=>app.startTrial(\'speed\'));'
    assert anchor in t
    block='''
 // TWO_MOTOR_FLOW_REGRESSION: synthetic serial device, not physical evidence.
 elements.get('motorProfile').value='4.4';
 const armsBeforeMismatch=sent.filter(x=>x==='ARM').length;
 await assert.rejects(()=>app.startTrial('speed'),/settings do not match/);
 check('Two motors: stale 21.3 device config cannot arm selected 4.4 profile',()=>assert.equal(sent.filter(x=>x==='ARM').length,armsBeforeMismatch));
 await app.guarded(app.applyConfig);
 check('Two motors: selected 4.4 profile sends GEAR=4.4 and CPR=44, not an output CPR',()=>{assert.ok(sent.includes('GEAR,4.4'));assert.equal(app.state.config.gear_ratio,4.4);assert.equal(app.state.config.cpr_motor,44);});
 for(let i=0;i<30;i++)telemetry();await new Promise(r=>setTimeout(r,5));
 await app.guarded(()=>app.startTrial('speed'));await new Promise(r=>setTimeout(r,5));
 check('Two motors: a 4.4 speed trial preserves its own run profile and metadata',()=>{assert.equal(app.state.run.config.gear_ratio,4.4);assert.equal(app.state.run.kit_profile.id,'6V-1360-4.4');assert.equal(app.state.deviceState,'ARMED');});
 await app.stop('Synthetic profile test completed');await new Promise(r=>setTimeout(r,5));
 for(let i=0;i<30;i++)telemetry();await new Promise(r=>setTimeout(r,5));
 elements.get('motorProfile').value='21.3';await app.guarded(app.applyConfig);
 check('Two motors: applying 21.3 again does not rewrite prior hardware metadata',()=>{assert.equal(app.state.config.gear_ratio,21.3);assert.equal(app.state.run.config.gear_ratio,4.4);});
 for(let i=0;i<30;i++)telemetry();await new Promise(r=>setTimeout(r,5));
'''
    t=t.replace(anchor,block+anchor)
    p.write_text(t)
# Adapt the existing real Chromium checks to the student's visible controls, not hidden shortcuts.
p=r/'tests/speed-website-browser.cjs';t=p.read_text()
if 'SIMPLE_STUDENT_FLOW_BROWSER' not in t:
    t=t.replace(" await page.locator('#speedStudy').waitFor();"," // SIMPLE_STUDENT_FLOW_BROWSER\n await page.locator('#studentMain').waitFor();\n assert.equal(await page.locator('[data-task]:visible').count(),1);\n assert.equal(await page.locator('#task1').isVisible(),true);\n assert.equal(await page.locator('#motorProfile option').count(),3);\n assert.equal(await page.locator('#optionalDesign').isVisible(),false);\n assert.equal(await page.locator('#optionalDiagnostics').isVisible(),false);\n assert.equal(await page.locator('#cpr').isVisible(),false);\n assert.equal(await page.locator('#gear').isVisible(),false);\n ok('Only the task-sheet section is shown; two motor choices; diagnostics and duplicate model fields hidden');")
    old=" await page.locator('#p1Gain').fill('4.88');await page.locator('#p1Tau').fill('0.051');await page.locator('#convertP1').click();await page.locator('#useP1Model').click();"
    assert old in t
    t=t.replace(old,"""
 await page.locator('#motorProfile').selectOption('4.4');
 await page.locator('#p1Gain').fill('4.88');await page.locator('#p1Tau').fill('0.051');await page.locator('#prepareModel').click();
 const fast=Number(await page.locator('#modelK').inputValue());assert.ok(Math.abs(fast-4.88*4.4*60/(2*Math.PI)*6)<1e-7);assert.equal(await page.locator('#cpr').inputValue(),'44');
 assert.match(await page.locator('#targetEquivalent').innerText(),/227.27/);assert.equal(await page.locator('#modelTau').inputValue(),'0.051');
 await page.locator('.task-nav [data-go="2"]').click();await page.locator('#studyKp').fill('0.0001');await page.locator('#studyP').click();assert.equal(await page.locator('#studyTable tbody tr').count(),3);
 await page.locator('.task-nav [data-go="3"]').click();await page.locator('#studyKi').fill('0.001');await page.locator('#studyPI').click();assert.equal(await page.locator('#studyTable tbody tr').count(),3);
 assert.equal(await page.locator('#speedKp').inputValue(),'0');
 ok('4.4 kit: correct model conversion, output-speed label and P/PI comparison without changing hardware gains');
 await page.locator('.task-nav [data-go="1"]').click();await page.locator('#motorProfile').selectOption('21.3');
 assert.equal(await page.locator('#p1Gain').inputValue(),'');assert.equal(await page.locator('#p1Tau').inputValue(),'');assert.equal(await page.locator('#studyK').inputValue(),'');assert.equal(await page.locator('#studyDownload').isDisabled(),true);assert.equal(await page.locator('#speedKp').inputValue(),'0');
 ok('Switching motors clears previous model/design fields instead of reusing another kit’s measured values');
 await page.locator('#p1Gain').fill('4.88');await page.locator('#p1Tau').fill('0.051');await page.locator('#prepareModel').click();
 assert.match(await page.locator('#targetEquivalent').innerText(),/46.95/);
""")
    old=" await page.locator('#studyUseModel').click();await page.locator('#studyKp').fill('0.0001284515583');await page.locator('#studyKi').fill('0.0010074632025');"
    assert old in t
    t=t.replace(old," await page.locator('.task-nav [data-go=\"2\"]').click();await page.locator('#studyKp').fill('0.0001284515583');")
    old=" await page.locator('#studyPI').click();assert.equal(await page.locator('#studyTable tbody tr').count(),3);assert.match"
    assert old in t
    t=t.replace(old," await page.locator('.task-nav [data-go=\"3\"]').click();await page.locator('#studyKi').fill('0.0010074632025');await page.locator('#studyPI').click();assert.equal(await page.locator('#studyTable tbody tr').count(),3);assert.match")
    t=t.replace(" await page.screenshot({path:path.join(proof,'page-top.png')});await page.locator('#speedStudy').screenshot({path:path.join(proof,'p-pi-comparison.png')});", " await page.locator('#task3').screenshot({path:path.join(proof,'p-pi-comparison.png')});await page.locator('.task-nav [data-go=\"1\"]').click();await page.screenshot({path:path.join(proof,'page-top.png')});await page.locator('.task-nav [data-go=\"6\"]').click();")
    t=t.replace("await page.goto('http://127.0.0.1:8765/practical2-control.html');assert.ok", "await page.goto('http://127.0.0.1:8765/practical2-control.html');assert.ok")
    anchor=" ok('Narrow viewport has no page-level horizontal overflow');"
    assert anchor in t
    t=t.replace(anchor,anchor+"\n for(const section of [2,3,4,5,6,1]){await page.locator('.task-nav [data-go=\"'+section+'\"]').click();assert.equal(await page.locator('[data-task]:visible').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}ok('Every task-sheet section stays usable on a narrow screen');")
    t=t.replace("# P/PI speed website validation", "# Simplified two-motor P/PI website validation")
    t=t.replace("scope:'Automated Chromium UI with synthetic records only; no Pico or physical motor'", "scope:'Two motor profiles, task-sheet UI and synthetic CSVs in Chromium; no physical motor'")
    p.write_text(t)
print('Added two-profile transport checks and task-sheet browser navigation while retaining fault/timestamp/CSV checks.')
