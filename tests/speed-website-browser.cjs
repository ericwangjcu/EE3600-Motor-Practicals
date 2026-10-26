'use strict';
// Real Chromium UI tests with SYNTHETIC data only. No Pico or motor is accessed.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),proof=path.join(root,'docs','website-speed-evidence');
const passed=[];let browser,server;
function ok(name){passed.push(name);console.log('PASS '+name);}
(async()=>{
 await fs.mkdir(proof,{recursive:true});
 server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
 for(let n=0;n<50;n++){try{if((await fetch('http://127.0.0.1:8765/practical2-control.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:8765/practical2-control.html');
 await page.locator('#speedStudy').waitFor();
 assert.equal(await page.locator('#optionalPosition').isVisible(),false);assert.equal(await page.locator('#runPosition').isVisible(),false);
 assert.equal(await page.locator('#runSpeed').isDisabled(),true);assert.equal(await page.locator('#speedKp').inputValue(),'0');assert.equal(await page.locator('#speedKi').inputValue(),'0');
 assert.equal(await page.locator('#supply').inputValue(),'6');assert.equal(await page.locator('#limit').getAttribute('max'),'100.000000');
 ok('Disconnected page: zero entered gains, no arming and no visible position controls');
 await page.locator('#p1Gain').fill('4.88');await page.locator('#p1Tau').fill('0.051');await page.locator('#convertP1').click();await page.locator('#useP1Model').click();
 const model=Number(await page.locator('#modelK').inputValue());assert.ok(Math.abs(model-4.88*21.3*60/(2*Math.PI)*6)<1e-7);assert.equal(await page.locator('#speedKp').inputValue(),'0');
 await page.locator('#studyUseModel').click();await page.locator('#studyKp').fill('0.0001284515583');await page.locator('#studyKi').fill('0.0010074632025');
 await page.locator('#studyP').click();assert.equal(await page.locator('#studyTable tbody tr').count(),3);assert.match(await page.locator('#studyMessage').innerText(),/P comparison/);
 await page.locator('#studyPI').click();assert.equal(await page.locator('#studyTable tbody tr').count(),3);assert.match(await page.locator('#studyMessage').innerText(),/Kp fixed/);assert.equal(await page.locator('#speedKp').inputValue(),'0');
 ok('P1 conversion and P/PI comparisons leave hardware gains unchanged');
 const simDownloadPromise=page.waitForEvent('download');await page.locator('#studyDownload').click();const simDownload=await simDownloadPromise;const simText=await fs.readFile(await simDownload.path(),'utf8');assert.ok(simText.startsWith('# SIMULATION ONLY'));assert.ok(simText.includes('requested_duty_fraction'));
 ok('Simulation CSV is explicitly labelled and contains the compared traces');
 await page.screenshot({path:path.join(proof,'page-top.png')});await page.locator('#speedStudy').screenshot({path:path.join(proof,'p-pi-comparison.png')});
 const csv=await page.evaluate(()=>{
   const samples=Array.from({length:501},(_,i)=>{const time=1000+i*20,y=i===0?0:1000*(1-Math.exp(-(time-1005)/200));return {run_id:'SYNTHETIC_BROWSER_TEST',host_received_iso:'',t_ms:time,t_unwrapped:time,state:'ARMED',mode:'SPEED',target:1000,n_motor_rpm:y,n_output_rpm:y/21.3,theta_output_deg:0,count:i,u_requested_pct:35,u_applied_pct:35,p_term_pct:5,i_term_pct:30,d_term_pct:0,fault:'NONE'};});
   const metadata={id:'SYNTHETIC_BROWSER_TEST',mode:'SPEED',completed:true,finish_reason:'Device disarmed / trial complete',arm_time:1005,reference_events:[],baseline:{reference:0,measured:0,samples:20},config:{supply_v:6,duty_limit_pct:100,cpr_motor:44,gear_ratio:21.3,encoder_sign:1,motor_sign:1,speed_limit_rpm:8000,travel_limit_deg:90,duration_s:10,speed_window_ms:50},synthetic:true};
   return Practical2Core.toCSV(samples,metadata);
 });
 await page.locator('#csvFile').setInputFiles({name:'SYNTHETIC-browser-test.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.getByRole('button',{name:'Analyse response',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('metrics').textContent.includes('Numerical targets met'));
 const before=await page.locator('#metrics').innerText();assert.match(before,/frames excluded from assessment: 1/);assert.doesNotMatch(before,/samples precede the command/);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Save CSV',exact:true}).click();const download=await downloadPromise,exported=await fs.readFile(await download.path(),'utf8');
 const roundTrip=await page.evaluate(text=>{const x=Practical2Core.fromCSV(text);return {count:x.samples.length,first:x.samples[0].t_unwrapped,command:x.metadata.arm_time,excluded:x.metadata.metrics[0].precommand_frames_excluded};},exported);
 assert.deepEqual(roundTrip,{count:501,first:1000,command:1005,excluded:1});
 await page.locator('#csvFile').setInputFiles({name:'SYNTHETIC-round-trip.csv',mimeType:'text/csv',buffer:Buffer.from(exported)});await page.locator('#analyseResponse').click();
 assert.equal(await page.locator('#metrics').innerText(),before);
 await fs.writeFile(path.join(proof,'SYNTHETIC-round-trip.csv'),exported);
 await page.locator('#metrics').screenshot({path:path.join(proof,'synthetic-csv-metrics.png')});
 ok('Actual Chromium import, assessment, CSV export and re-import agree for synthetic data; raw pre-command frame retained');
 const failed=exported.replace('Device disarmed / trial complete','Disconnected');await page.locator('#csvFile').setInputFiles({name:'SYNTHETIC-disconnected.csv',mimeType:'text/csv',buffer:Buffer.from(failed)});await page.locator('#analyseResponse').click();assert.match(await page.locator('#message').innerText(),/fault or incomplete communication/);
 ok('Importing a disconnected run does not erase its incomplete status');
 const incomplete=csv.replace('"completed":true','"completed":false');await page.locator('#csvFile').setInputFiles({name:'SYNTHETIC-incomplete.csv',mimeType:'text/csv',buffer:Buffer.from(incomplete)});await page.locator('#analyseResponse').click();assert.match(await page.locator('#message').innerText(),/does not establish a completed run/);
 ok('Incomplete original metadata cannot be promoted into a completed validation');
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:8765/practical2-control.html');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));await page.screenshot({path:path.join(proof,'page-mobile.png')});
 ok('Narrow viewport has no page-level horizontal overflow');
 const links=await page.locator('a[href]').evaluateAll(links=>links.map(a=>a.getAttribute('href')).filter(h=>h&&!/^(https?:|#|mailto:)/.test(h)));
 for(const link of new Set(links)){const res=await fetch(new URL(link,'http://127.0.0.1:8765/practical2-control.html'));assert.equal(res.status,200,link);}
 ok('Student-facing relative links, firmware and task sheet resolve');
 await page.goto('http://127.0.0.1:8765/docs/practical2-speed-task.html');assert.match(await page.locator('h1').innerText(),/P and PI/);assert.match(await page.locator('#position').innerText(),/simulation only/);
 assert.deepEqual(errors,[]);ok('Task sheet renders and pages have no uncaught JavaScript errors');
 const report={created_utc:new Date().toISOString(),scope:'Automated Chromium UI with synthetic records only; no Pico or physical motor',checks:passed,passed:passed.length,hardware_tested:false,physical_browser_trial:'PENDING',real_csv_replay:'PENDING: raw bench files not available to this runner',physical_usb_unplug:'PENDING'};
 await fs.writeFile(path.join(proof,'browser-results.json'),JSON.stringify(report,null,2)+'\n');
 const workflow=process.env.GITHUB_RUN_ID?'https://github.com/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+process.env.GITHUB_RUN_ID:'';
 const md='# P/PI speed website validation\n\nGenerated '+report.created_utc+'.\n\n'+(workflow?'Workflow: '+workflow+'\n\n':'')+'## Executed browser checks\n\n'+passed.map(x=>'- PASS: '+x).join('\n')+'\n\nThe workflow also runs the existing JavaScript/serial mock tests, new analytic/timestamp regressions, portable C controller checks and the unchanged UF2 validator. See workflow logs for their actual results.\n\n## Limits\n\nNo motor was connected to this runner. Native USB permissions, a physical browser-run trial, replay of the original bench files, and physical USB removal remain pending. The exported CSV and metrics screenshot here are deliberately SYNTHETIC tests, not new evidence of motor performance. Prior physical speed results are attributed to the coordinator-supplied report. Firmware, P1 and lecture slides are unchanged.\n';
 await fs.writeFile(path.join(root,'docs','website-speed-validation.md'),md);console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.kill();});
