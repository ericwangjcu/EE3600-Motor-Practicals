/* P/PI learning panel. Pure continuous-model predictions; no serial access. */
'use strict';
(function(root){
  const finite=(v,name)=>{if(v===null||v===undefined||String(v).trim()==='')throw Error(name+' is required.');const n=Number(v);if(!Number.isFinite(n))throw Error(name+' must be finite.');return n;};
  function response(K,tau,kp,ki,r,duration=10,dt=.002){
    [K,tau,kp,ki,r,duration,dt].forEach(x=>{if(!Number.isFinite(x))throw Error('Nonfinite simulation input.');});
    if(K<=0||tau<=0||kp<0||ki<0||r<=0||duration<3||duration>60||dt<=0||duration/dt>100000)throw Error('Invalid model, gains, reference or observation duration.');
    const samples=[],z0=-r,v0=K*kp*r/tau,a=(1+K*kp)/(2*tau),w2=K*ki/tau,disc=a*a-w2;
    for(let j=0;j<=Math.round(duration/dt);j++){
      const t=j*dt;let y,dy;
      if(ki===0){const rate=(1+K*kp)/tau,final=r*K*kp/(1+K*kp),ex=Math.exp(-rate*t);y=final*(1-ex);dy=final*rate*ex;}
      else if(Math.abs(disc)<1e-12*Math.max(1,a*a,w2)){const b=v0+a*z0,ex=Math.exp(-a*t);y=r+(z0+b*t)*ex;dy=(b-a*(z0+b*t))*ex;}
      else if(disc>0){const d=Math.sqrt(disc),p1=-w2/(a+d),p2=-a-d,b1=(v0-p2*z0)/(p1-p2),b2=z0-b1;const e1=Math.exp(p1*t),e2=Math.exp(p2*t);y=r+b1*e1+b2*e2;dy=b1*p1*e1+b2*p2*e2;}
      else{const b=Math.sqrt(-disc),c=(v0+a*z0)/b,ct=Math.cos(b*t),st=Math.sin(b*t),ex=Math.exp(-a*t);y=r+ex*(z0*ct+c*st);dy=ex*((-a*z0+b*c)*ct+(-a*c-b*z0)*st);}
      const u=(tau*dy+y)/K;
      if(!Number.isFinite(y)||!Number.isFinite(u))throw Error('Numerical range exceeded. Choose smaller gains.');
      samples.push({t,y,u});
    }
    return {K,tau,kp,ki,target:r,samples,final:ki>0?r:r*K*kp/(1+K*kp),p_time_constant:ki===0?tau/(1+K*kp):null};
  }
  const api={response};root.P2SpeedStudy=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document==='undefined'||!document.getElementById('speedStudy'))return;
  const $=id=>document.getElementById(id),f=(x,n=4)=>x===null||x===undefined?'Not reached':Number(x).toPrecision(n);
  let runs=[];
  function notify(text){$('studyMessage').textContent=text;}
  function getInputs(pi){const K=finite($('studyK').value,'Plant K'),tau=finite($('studyTau').value,'Plant tau'),kp=finite($('studyKp').value,'Base Kp'),ki=pi?finite($('studyKi').value,'Base Ki'):0,r=finite($('studyTarget').value,'Reference'),limit=finite($('studyLimit').value,'Demand-check ceiling')/100;if(kp<=0||(pi&&ki<=0)||limit<=0||limit>1)throw Error('Use positive comparison gains and a duty ceiling between 1% and 100%.');return {K,tau,kp,ki,r,limit};}
  function draw(){const canvas=$('studyPlot'),rect=canvas.getBoundingClientRect(),ratio=window.devicePixelRatio||1,w=Math.max(300,rect.width),h=300;canvas.width=w*ratio;canvas.height=h*ratio;const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);if(!runs.length)return;const xmin=0,xmax=2,ref=runs[0].target;let ymax=ref*1.1;runs.forEach(run=>run.samples.filter(s=>s.t<=xmax).forEach(s=>ymax=Math.max(ymax,s.y*1.08)));const X=x=>65+x/xmax*(w-85),Y=y=>h-35-y/ymax*(h-70);ctx.font='12px system-ui';ctx.lineWidth=1;for(let j=0;j<=4;j++){const y=ymax*j/4;ctx.strokeStyle='#d8e2e8';ctx.beginPath();ctx.moveTo(65,Y(y));ctx.lineTo(w-20,Y(y));ctx.stroke();ctx.fillStyle='#344c5b';ctx.textAlign='right';ctx.fillText(y.toFixed(0),57,Y(y)+4);ctx.textAlign='center';ctx.fillText((j*xmax/4).toFixed(1),X(j*xmax/4),h-13);}ctx.strokeStyle='#333';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(65,Y(ref));ctx.lineTo(w-20,Y(ref));ctx.stroke();ctx.setLineDash([]);const colors=['#176a94','#af5720','#26734b'];runs.forEach((run,i)=>{ctx.strokeStyle=colors[i];ctx.lineWidth=2;ctx.beginPath();run.samples.filter(s=>s.t<=xmax).forEach((s,j)=>j?ctx.lineTo(X(s.t),Y(s.y)):ctx.moveTo(X(s.t),Y(s.y)));ctx.stroke();ctx.fillStyle=colors[i];ctx.textAlign='left';ctx.fillText(['0.5×','1×','2×'][i],70+i*95,18);});ctx.fillStyle='#344c5b';ctx.fillText('Motor RPM · first 2 s of a 10 s simulation',65,40);}
  function compare(pi){try{const x=getInputs(pi),C=root.Practical2Core;if(!C)throw Error('Shared response assessment code is missing.');runs=[.5,1,2].map(mult=>response(x.K,x.tau,pi?x.kp:x.kp*mult,pi?x.ki*mult:0,x.r));runs.forEach(run=>{run.metrics=C.metrics(run.samples,0,x.r,.02*x.r,2,0);run.peak_duty=Math.max(...run.samples.map(s=>Math.abs(s.u)));run.exceeds_limit=run.peak_duty>x.limit+1e-8;});
    $('studyTable').innerHTML='<table><thead><tr><th>Kp</th><th>Ki</th><th>Ideal final RPM / offset</th><th>Overshoot</th><th>10–90% of target</th><th>Strict 2% target settling</th><th>Peak requested duty</th></tr></thead><tbody>'+runs.map(run=>'<tr><td>'+f(run.kp,6)+'</td><td>'+f(run.ki,6)+'</td><td>'+f(run.final,6)+' / '+f(run.target-run.final,5)+'</td><td>'+f(run.metrics.overshoot_pct)+'%</td><td>'+f(run.metrics.rise_s)+' s</td><td>'+f(run.metrics.settling_s)+' s</td><td class="'+(run.exceeds_limit?'study-warn':'')+'">'+f(100*run.peak_duty)+'%'+(run.exceeds_limit?' — exceeds declared ceiling':'')+'</td></tr>').join('')+'</tbody></table><p class="hint">Simulation only. Gains use fractional duty / motor RPM. Table timing is relative to the commanded target, not an incorrect achieved final value. P may never reach 90% of the target; its time constant and achieved-final-value rise time are separate analytical quantities. Demand above the ceiling makes this ideal prediction infeasible without re-simulating with limits. No hardware pass is inferred.</p>';
    notify(pi?'PI comparison: Kp fixed; Ki varied. Check the complete response, zero and requested duty. Save the comparison and justify your choice.':'P comparison: Ki = Kd = 0. The ideal response is monotonic; higher P reduces but does not eliminate the offset.');$('studyDownload').disabled=false;draw();
  }catch(e){notify(e.message);}}
  $('studyUseModel').addEventListener('click',()=>{try{const K=finite($('modelK').value,'Converted plant gain'),tau=finite($('modelTau').value,'P1 time constant');if(K<=0||tau<=0)throw Error('Convert and use your P1 model first.');$('studyK').value=K;$('studyTau').value=tau;notify('Model copied for simulation. No controller gains or motor commands changed.');}catch(e){notify(e.message);}});
  $('studyP').addEventListener('click',()=>compare(false));$('studyPI').addEventListener('click',()=>compare(true));
  $('studyDownload').addEventListener('click',()=>{if(!runs.length)return;const lines=['# SIMULATION ONLY; ideal continuous P/PI response; no hardware measurements','case,K_motor_rpm_per_duty,tau_s,Kp,Ki,time_s,reference_motor_rpm,simulated_motor_rpm,requested_duty_fraction'];runs.forEach((run,i)=>run.samples.forEach(s=>lines.push([i+1,run.K,run.tau,run.kp,run.ki,s.t,run.target,s.y,s.u].join(','))));const link=document.createElement('a'),url=URL.createObjectURL(new Blob([lines.join('\n')+'\n'],{type:'text/csv'}));link.href=url;link.download='P2-simulated-P-PI-comparison.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  window.addEventListener('resize',draw);
})(typeof globalThis!=='undefined'?globalThis:this);
