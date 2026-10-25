#!/usr/bin/env node
'use strict';
// Offline software checks only. All traces and the serial device below are synthetic.
// No USB hardware is accessed, and these tests do not establish motor validation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','practical2-control.html'),'utf8');
const coreSource=html.match(/<script id="p2-core">([\s\S]*?)<\/script>/)[1];
const appSource=html.match(/<script id="p2-app">([\s\S]*?)<\/script>/)[1];
const coreContext=vm.createContext({});vm.runInContext(coreSource,coreContext);const C=coreContext.Practical2Core;
let passed=0;
function check(name,fn){fn();passed++;process.stdout.write('PASS '+name+'\n');}
function close(a,b,tol=1e-6){assert.ok(Math.abs(a-b)<=tol,`${a} differs from ${b}`);}
function points(r0,r1,tau=.2,duration=5){return Array.from({length:Math.round(duration/.01)+1},(_,i)=>({t:i*.01,y:r0+(r1-r0)*(1-Math.exp(-i*.01/tau))}));}
const cfg={supply_v:9,duty_limit_pct:60,cpr_motor:44,gear_ratio:21.3,encoder_sign:1,motor_sign:1,speed_limit_rpm:8000,travel_limit_deg:270,duration_s:10};
check('Protocol: correct mapping of fractional duty telemetry and signed counts',()=>{const f=C.parseFrame('DATA,1234,ARMED,SPEED,1000,983.2,46.1596,-12.5,-37,20.125,20.125,2.1,18.025,0,NONE');assert.equal(f.count,-37);assert.equal(f.u_requested_pct,20.125);assert.equal(f.n_motor_rpm,983.2);assert.equal(f.d_term_pct,0);});
check('Protocol: reject missing, nonfinite, fractional-count and invalid-state fields',()=>{for(const s of ['DATA,1','DATA,1234,ARMED,SPEED,1000,NaN,0,0,1,0,0,0,0,0,NONE','DATA,1234,ARMED,SPEED,1000,0,0,0,1.5,0,0,0,0,0,NONE','DATA,1234,BOGUS,SPEED,1000,0,0,0,1,0,0,0,0,0,NONE'])assert.throws(()=>C.parseFrame(s));});
check('Protocol: CONFIG JSON and unrelated INFO lines remain distinct',()=>{assert.equal(C.parseFrame('CONFIG,{"duration_s":10}').value.duration_s,10);assert.equal(C.parseFrame('INFO,PINS,M1=GP3/GP2').fields[0],'PINS');assert.throws(()=>C.parseFrame('CONFIG,not-json'));});
check('Timestamps: support legacy wrap, new 64-bit time, and reject backward reset',()=>{const clock=new C.DeviceClock();close(clock.add(4294967290),4294967290);close(clock.add(5),4294967301);const long=new C.DeviceClock();close(long.add(5000000000),5000000000);assert.throws(()=>long.add(12));});
check('Configuration: 9 V ceiling and explicit finite numeric values',()=>{assert.equal(C.validateConfig(cfg).duty_limit_pct,60);assert.throws(()=>C.validateConfig({...cfg,duty_limit_pct:90}));assert.throws(()=>C.validateConfig({...cfg,cpr_motor:''}));assert.throws(()=>C.validateConfig({...cfg,gear_ratio:Infinity}));assert.equal(C.validateConfig({...cfg,supply_v:6,duty_limit_pct:100}).duty_limit_pct,100);});
check('Configuration: rounded firmware ceiling is clamped to the exact nominal cap',()=>{close(C.validateConfig({...cfg,duty_limit_pct:66.66667}).duty_limit_pct,600/9);assert.throws(()=>C.validateConfig({...cfg,duty_limit_pct:66.67}));});
check('Configuration: firmware bounds are matched by host validation',()=>{assert.throws(()=>C.validateConfig({...cfg,speed_limit_rpm:20001}));assert.throws(()=>C.validateConfig({...cfg,travel_limit_deg:721}));assert.throws(()=>C.validateConfig({...cfg,gear_ratio:1001}));assert.throws(()=>C.gains({kp:11,ki:0,kd:0,tf:.02}));assert.throws(()=>C.gains({kp:0,ki:0,kd:0,tf:.02}));});
check('Arming: requires a compatible, fresh, idle, disarmed connection',()=>{const s={connected:true,compatible:true,state:'DISARMED',fresh:true,busy:false};assert.equal(C.canArm(s),true);for(const patch of [{connected:false},{compatible:false},{state:'FAULT'},{state:'ARMED'},{fresh:false},{busy:true}])assert.equal(C.canArm({...s,...patch}),false);});
check('Analytic design: motor-RPM/output-degree conversion and PI cancellation',()=>{const a=C.analytic(10000,.2,.4,.8,5,20);close(a.q,.3);close(a.speed.kp,.00005);close(a.speed.ki,.00025);close(a.position.kp,5/3000);close(a.position.kd,.6/3000);});
check('Analytic design: preserve negative PD derivative as an infeasible result',()=>{const a=C.analytic(10000,.1,.2,.8,1,20);assert.ok(a.position.kd<0);assert.throws(()=>C.analytic(0,.1,.2,.8,1,20));});
check('P1 conversion: one output revolution/s/V gives the correct motor-RPM/duty gain',()=>{const m=C.convertP1Model('output_rad_s_per_v',2*Math.PI,.25,21.3,6);close(m.K,7668);close(m.tau,.25);});
check('P1 conversion: 4.4 and 21.3 gearboxes change gain but leave the same tau',()=>{const a=C.convertP1Model('output_rad_s_per_v',2*Math.PI,.25,4.4,6),b=C.convertP1Model('output_rad_s_per_v',2*Math.PI,.25,21.3,6);close(a.K,1584);close(a.tau,b.tau);close(6*a.K/4.4,2160);close(6*b.K/21.3,2160);});
check('P1 conversion: changing declared supply from 6 V to 9 V scales gain by 1.5 only',()=>{const a=C.convertP1Model('output_rad_s_per_v',3,.12,21.3,6),b=C.convertP1Model('output_rad_s_per_v',3,.12,21.3,9);close(b.K/a.K,1.5);close(b.tau,a.tau);});
check('P1 conversion: already-native gain is not multiplied a second time',()=>{const m=C.convertP1Model('motor_rpm_per_duty',6500,.17,21.3,9);close(m.K,6500);close(m.tau,.17);assert.equal(m.factor,1);});
check('P1 conversion: unknown units and invalid model/config values are refused',()=>{for(const args of [['unknown',1,.2,21.3,9],['output_rad_s_per_v',0,.2,21.3,9],['output_rad_s_per_v',1,0,21.3,9],['output_rad_s_per_v',1,.2,0,9],['output_rad_s_per_v',1,.2,21.3,Infinity]])assert.throws(()=>C.convertP1Model(...args));});
check('Metrics: rising offset response uses requested target and correct rise/settle',()=>{const m=C.metrics(points(200,1200,.2),200,1200,20,2);close(m.rise_s,Math.log(9)*.2,.001);close(m.settling_s,-Math.log(.02)*.2,.01);close(m.overshoot_pct,0);assert.ok(m.final_mae<.001);});
check('Metrics: falling step has positive rise time and correct overshoot sign',()=>{const p=points(100,20,.2),m=C.metrics(p,100,20,1.6,2);close(m.rise_s,Math.log(9)*.2,.001);p[110].y=15;close(C.metrics(p,100,20,1.6,2).overshoot_pct,6.25);});
check('Metrics: wrong final value cannot masquerade as settled',()=>{const p=points(0,80,.2),m=C.metrics(p,0,100,2,2);assert.equal(m.settling_s,null);assert.ok(m.final_mae>19.9);assert.equal(m.rise_s,null);});
check('Metrics: a final point inside band is insufficient; dwell is mandatory',()=>{const p=points(0,100,.2,.7),m=C.metrics(p,0,100,5,2);assert.equal(m.settling_s,null);assert.equal(m.final_mae,null);});
check('Metrics: absolute errors cannot cancel as signed bias can',()=>{const p=Array.from({length:501},(_,i)=>({t:i*.01,y:100+(i%2?2:-2)}));const m=C.metrics(p,0,100,3,2);close(m.final_mae,2);assert.ok(Math.abs(m.final_bias)<.02);});
check('Metrics: command event determines elapsed settling time',()=>{const p=points(0,100,.2).map(p=>({...p,t:p.t+10}));const a=C.metrics(p,0,100,2,2,9.98),b=C.metrics(p,0,100,2,2,10);close(a.settling_s-b.settling_s,.02);assert.throws(()=>C.metrics(p,0,100,2,2,10.1));});
check('Metrics: unresolved early crossing and corrupt time are reported',()=>{const p=points(0,100,.01).slice(2);assert.equal(C.metrics(p,0,100,2,2).rise_s,null);const q=points(0,100);q[10].t=q[9].t;assert.throws(()=>C.metrics(q,0,100,2));});
check('Targets: speed uses two resolution quanta; 21.3 gearbox position band is 2 degrees',()=>{const s=C.targets('SPEED',0,1000,44,21.3,50);close(s.speed_quantum,27.272727,1e-5);close(s.band,54.545454,1e-5);const p=C.targets('POSITION',0,90,44,21.3);assert.equal(p.band,2);assert.equal(p.resolution_adjusted,false);});
check('Targets: 4.4 gearbox uses the displayed two-count band instead of automatic failure',()=>{const p=C.targets('POSITION',0,90,44,4.4);close(p.band,3.71900826446,1e-10);close(p.mae,p.band);assert.equal(p.resolution_adjusted,true);assert.equal(C.meetsTargets({overshoot_pct:0,rise_s:.4,settling_s:1,final_mae:3},p),true);});
check('Targets: unresolved/missing result never passes',()=>{const t=C.targets('SPEED',0,1000,44,21.3);assert.equal(C.meetsTargets({overshoot_pct:0,rise_s:.4,settling_s:.8,final_mae:1},t),true);assert.equal(C.meetsTargets({overshoot_pct:0,rise_s:null,settling_s:.8,final_mae:1},t),false);});
function syntheticStep(sign=1){return Array.from({length:351},(_,i)=>{const t=i*.02,after=t>=2,n=sign*(after?2000+2000*(1-Math.exp(-(t-2)/.2)):2000);return{run_id:'SYNTHETIC_TEST_ONLY',host_received_iso:'',t_ms:i*20,t_unwrapped:i*20,state:'ARMED',mode:'OPEN',target:sign*(after?40:20),n_motor_rpm:n,n_output_rpm:n/21.3,theta_output_deg:0,count:i,u_requested_pct:sign*(after?40:20),u_applied_pct:sign*(after?40:20),p_term_pct:0,i_term_pct:0,d_term_pct:0,fault:'NONE'};});}
check('Identification: positive and negative synthetic steps recover K and tau',()=>{for(const sign of [1,-1]){const m=C.identify(syntheticStep(sign));close(m.K,10000,.01);close(m.tau,.2,.002);}});
check('Identification: rejected non-steady and insufficient steps cannot produce gains',()=>{const wrong=syntheticStep().map((s,i)=>({...s,n_motor_rpm:s.n_motor_rpm+(i>300?(i-300)*100:0)}));assert.throws(()=>C.identify(wrong));assert.throws(()=>C.identify(syntheticStep().slice(0,105)));const multiple=syntheticStep();multiple[200].target=30;assert.throws(()=>C.identify(multiple));});
check('CSV: generated recordings round-trip metadata and all measured fields',()=>{const samples=syntheticStep(),metadata={id:'SYNTHETIC_TEST_ONLY',baseline:{reference:0,measured:0},note:'comma, quote " kept'};const result=C.fromCSV(C.toCSV(samples,metadata));assert.equal(result.samples.length,samples.length);assert.equal(result.samples[100].count,100);close(result.samples[120].n_motor_rpm,samples[120].n_motor_rpm);assert.equal(result.metadata.note,metadata.note);});
check('CSV: invalid columns and corrupt telemetry are refused',()=>{assert.throws(()=>C.fromCSV('t_ms,n_motor_rpm\n1,1\n'));assert.throws(()=>C.fromCSV(C.toCSV(syntheticStep()).replace('ARMED,OPEN','BROKEN,OPEN')));});

// Integration contracts: route selection and gain units must remain explicit.
check('Site: both practical pages link to separate simulation and hardware routes',()=>{
 const p1=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const sim=fs.readFileSync(path.join(__dirname,'..','practical2.html'),'utf8');
 for(const page of [p1,sim])assert.match(page,/href="practical2-control\.html"/);
 assert.match(p1,/href="practical2\.html"/);assert.match(html,/href="practical2\.html"/);
 assert.match(sim,/Simulation mode — no motor commands/);assert.doesNotMatch(sim,/Hardware PID unavailable/);
});
check('Site: hardware entry exposes raw gains and leaves position and helper collapsed',()=>{
 assert.match(html,/Speed control \(required\)/);
 for(const id of ['optionalPosition','optionalDesign']){
  const tag=html.match(new RegExp('<details[^>]*id="'+id+'"[^>]*>'))?.[0];assert.ok(tag);assert.doesNotMatch(tag,/\bopen(?:[\s=>])/);
 }
 for(const id of ['speedKp','speedKi','speedKd'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/Desired speed time constant Tc/);assert.doesNotMatch(html,/Speed λ/);
});
check('Site: gain-unit differences and the 100 N factor are explicit on both routes',()=>{
 const sim=fs.readFileSync(path.join(__dirname,'..','practical2.html'),'utf8');
 for(const page of [html,sim]){assert.match(page,/100 × N/);assert.match(page,/fractional duty/);assert.match(page,/percent duty/);assert.match(page,/No gains (?:are transferred|transfer) automatically/);}
});
check('Site: hardware downloads use the published Practical 2 paths',()=>{
 for(const link of ['firmware/EE3600_Practical_2_Pico.uf2','docs/EE3600_Practical_2.pdf','docs/practical2-hardware.md'])assert.ok(html.includes('href="'+link+'"'));
});

// Exercise the actual browser app using a small DOM and newline-serial simulator.
// This checks integration ordering and interleaved wire messages, not just helpers.
async function transportTests(){
 const elements=new Map();
 for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const tag=match[0],id=match[1],value=tag.match(/\bvalue="([^"]*)"/)?.[1]||'';elements.set(id,{id,value,disabled:false,style:{},textContent:'',innerHTML:'',listeners:{},attrs:tag,addEventListener(type,fn){this.listeners[type]=fn;},getBoundingClientRect(){return{width:900,height:id==='dutyPlot'?150:260};},getContext(){return new Proxy({},{get:()=>()=>{}});},click(){this.listeners.click?.();}});}
 for(const [id,value]of [['supply','9'],['encsign','1'],['motorsign','1'],['p1Units','output_rad_s_per_v']])elements.get(id).value=value;
 const intervals=[];let ticks=1000,readController,portOpen=false,dropArmConfirmation=false,failStopWrite=false;const sent=[];
 const device={...cfg,state:'DISARMED',mode:'OPEN',target:0,pidspeed:{kp:0,ki:0,kd:0,tf:.02},pidpos:{kp:0,ki:0,kd:0,tf:.02},control_hz:100,telemetry_hz:50,speed_window_ms:50,heartbeat_timeout_ms:1000,calibration:'assumed',fault:'NONE'};
 function emit(line){readController.enqueue(new TextEncoder().encode(line+'\n'));}
 function telemetry(){ticks+=20;emit(['DATA',ticks,device.state,device.mode,device.target,0,0,0,0,0,0,0,0,0,device.fault].join(','));}
 const firmwareFields={SUPPLY:'supply_v',LIMIT:'duty_limit_pct',CPR:'cpr_motor',GEAR:'gear_ratio',ENCSIGN:'encoder_sign',MOTORSIGN:'motor_sign',SPEEDLIMIT:'speed_limit_rpm',TRAVEL:'travel_limit_deg',DURATION:'duration_s'};
 const fakePort={async open(){portOpen=true;},async close(){portOpen=false;},readable:new ReadableStream({start(c){readController=c;}}),writable:new WritableStream({write(bytes){const line=new TextDecoder().decode(bytes).trim();sent.push(line);const [cmd,...args]=line.split(',');if(cmd==='STOP'&&failStopWrite)throw Error('Synthetic transport failure on STOP');
  if(cmd==='HELLO'){emit('INFO,EE3600_P2,1.0.0');emit('CAPS,SPEED_PID=1,POSITION_PID=1,STREAM_CONTROL=1,ARM_REQUIRED=1,GAINS_DUTY_FRACTION=1,CONTROL_HZ=100,TELEMETRY_HZ=50');emit('INFO,PINS,M1=GP3/GP2,ENC=GP26/GP27');emit('CONFIG,'+JSON.stringify(device));}
  else if(cmd==='STATUS')emit('CONFIG,'+JSON.stringify(device));
  else if(cmd==='STOP'){device.state='DISARMED';device.fault='NONE';telemetry();}
  else if(cmd==='MODE'){device.mode=args[0];emit('CONFIG,'+JSON.stringify(device));}
  else if(cmd==='PIDSPEED'||cmd==='PIDPOS'){device[cmd==='PIDSPEED'?'pidspeed':'pidpos']=Object.fromEntries(['kp','ki','kd','tf'].map((k,i)=>[k,Number(args[i])]));emit('CONFIG,'+JSON.stringify(device));}
  else if(firmwareFields[cmd]){device[firmwareFields[cmd]]=Number(args[0]);emit('CONFIG,'+JSON.stringify(device));}
  else if(['PWM','SPEED','TARGET'].includes(cmd)){device.target=Number(args[0]);emit('EVENT,REFERENCE,'+ticks+','+device.target);}
  else if(cmd==='ARM'){device.state='ARMED';if(dropArmConfirmation)return;emit('EVENT,ARMED,'+ticks);telemetry();}
  emit('ACK,'+cmd);
 }})};
 const sandbox={console,TextEncoder,TextDecoder,ReadableStream,WritableStream,Blob,URL,Date,Math,Number,JSON,Promise,setTimeout,clearTimeout,setInterval:(fn,ms)=>{const x={fn,ms};intervals.push(x);return x;},clearInterval:x=>{if(x)x.cancelled=true;},requestAnimationFrame:()=>0,navigator:{serial:{requestPort:async()=>fakePort}},document:{getElementById:id=>elements.get(id),querySelectorAll:query=>Array.from(elements.values()).filter(e=>e.attrs.includes(query.slice(1,-1))),createElement:()=>({click(){}})},window:{devicePixelRatio:1,addEventListener(){}}};
 sandbox.globalThis=sandbox;const ctx=vm.createContext(sandbox);vm.runInContext(coreSource,ctx);
 const instrumented=appSource.replace(/\}\)\(\);\s*$/,"globalThis.__test={state,received,connect,disconnect,guarded,startTrial,stop,applyConfig,analyse,refresh};})();");assert.notEqual(instrumented,appSource);
 vm.runInContext(instrumented,ctx);const app=ctx.__test;
 await app.connect();
 check('Transport: connect starts with STOP, accepts interleaved pin INFO and never arms',()=>{assert.equal(portOpen,true);assert.equal(sent[0],'STOP');assert.equal(app.state.compatible,true);assert.equal(sent.includes('ARM'),false);assert.ok(sent.includes('HELLO')&&sent.includes('STREAM,P2'));});
 const beforeConversion=sent.length;elements.get('gear').value='4.4';elements.get('p1Gain').value=String(2*Math.PI);elements.get('p1Tau').value='.25';elements.get('convertP1').listeners.click();
 check('P1 UI: conversion preview does not populate model fields, apply gains or send commands',()=>{assert.equal(elements.get('modelK').value,'');assert.equal(Number(elements.get('speedKp').value),0);assert.equal(sent.length,beforeConversion);assert.equal(elements.get('useP1Model').disabled,false);});
 elements.get('useP1Model').listeners.click();
 check('P1 UI: explicit Use converted model copies only K/tau using active device N/Vs',()=>{close(Number(elements.get('modelK').value),11502);close(Number(elements.get('modelTau').value),.25);assert.equal(Number(elements.get('speedKp').value),0);assert.equal(Number(elements.get('positionKp').value),0);assert.equal(sent.length,beforeConversion);});
 elements.get('suggestBtn').listeners.click();
 check('P1 UI: analytic position conversion uses the same active gear, ignoring unapplied edits',()=>{const q=Number(elements.get('suggestions').innerHTML.match(/q = ([\d.eE+-]+)/)[1]);close(q,6/21.3,1e-5);assert.equal(sent.length,beforeConversion);});
 elements.get('gear').value='21.3';
 for(let i=0;i<30;i++)telemetry();await new Promise(r=>setTimeout(r,5));
 await app.guarded(app.applyConfig);
 check('Transport: configuration is acknowledged/read back and old-coordinate history cleared',()=>{assert.ok(sent.includes('SUPPLY,9'));assert.ok(sent.includes('CPR,44'));assert.equal(app.state.config.gear_ratio,21.3);assert.equal(sent.includes('ARM'),false);assert.equal(app.state.history.length,0);});
 for(let i=0;i<30;i++)telemetry();await new Promise(r=>setTimeout(r,5));
 elements.get('zeroBtn').listeners.click();await new Promise(r=>setTimeout(r,5));
 check('Transport: ZERO clears old-angle history before another position baseline',()=>{assert.equal(sent.at(-1),'ZERO');assert.equal(app.state.history.length,0);});
 for(let i=0;i<30;i++)telemetry();await new Promise(r=>setTimeout(r,5));
 elements.get('speedKp').value='0.0001';elements.get('speedKi').value='0.0002';elements.get('speedKd').value='0';elements.get('speedTf').value='0.02';
 const start=sent.length;await app.guarded(()=>app.startTrial('speed'));await new Promise(r=>setTimeout(r,5));
 check('Transport: explicit speed run applies mode, duration, gains, reference, then ARM',()=>{const seq=sent.slice(start).filter(x=>x!=='PING'&&x!=='STATUS');assert.equal(seq[0],'MODE,SPEED');assert.ok(seq[1].startsWith('DURATION,'));assert.ok(seq[2].startsWith('PIDSPEED,'));assert.equal(seq[3],'SPEED,1000');assert.equal(seq[4],'ARM');assert.equal(app.state.deviceState,'ARMED');assert.ok(Number.isFinite(app.state.run.arm_time));assert.equal(app.state.run.config.pidspeed.kp,.0001);});
 const beforePing=sent.length;intervals.find(x=>x.ms===200).fn();await new Promise(r=>setTimeout(r,5));
 check('Transport: 200 ms heartbeat sends PING without changing gains/reference',()=>{assert.deepEqual(sent.slice(beforePing),['PING']);});
 app.state.lastReceive=Date.now()-2000;intervals.find(x=>x.ms===250).fn();await new Promise(r=>setTimeout(r,5));
 check('Transport: stale telemetry causes STOP and ends the recorded run',()=>{assert.equal(sent.at(-1),'STOP');assert.equal(app.state.run.completed,true);assert.equal(device.state,'DISARMED');});
 for(let i=0;i<30;i++)telemetry();await new Promise(r=>setTimeout(r,5));dropArmConfirmation=true;
 await app.guarded(()=>app.startTrial('speed'));await new Promise(r=>setTimeout(r,5));
 check('Transport: lost ARM acknowledgement triggers STOP even without ARMED telemetry',()=>{assert.equal(sent.at(-1),'STOP');assert.equal(device.state,'DISARMED');assert.equal(app.state.armAttempted,false);});
 dropArmConfirmation=false;
 const armCount=sent.filter(x=>x==='ARM').length;app.received('INFO,OTHER_FIRMWARE,1.0');app.state.compatible=false;
 await assert.rejects(()=>app.startTrial('speed'));
 check('Transport: unknown compatibility cannot issue a new ARM',()=>{assert.equal(sent.filter(x=>x==='ARM').length,armCount);});
 failStopWrite=true;await app.stop('Synthetic stop-path test');
 check('Transport: STOP write failure cancels heartbeat and releases the port',()=>{assert.equal(portOpen,false);assert.equal(app.state.connected,false);assert.equal(app.state.compatible,false);assert.equal(sent.at(-1),'STOP');assert.equal(intervals.find(x=>x.ms===200).cancelled,true);});
}
transportTests().then(()=>process.stdout.write(`\n${passed} offline checks passed. No physical hardware was tested.\n`)).catch(error=>{console.error(error);process.exitCode=1;});
