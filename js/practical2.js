'use strict';
(() => {
  const $=id=>document.getElementById(id), M=PIDModel;
  const fields=['mode','target','kp','ki','kd','manual','limit','duration','gain','tau','load'];
  let config, state=M.initial(), running=false, rows=[], segmentRows=[], segment=0;
  let initialY=0, segmentStart=0, segmentReason='', timer=null, runId='', stepped=false;
  function settings(){
    if(!$('settings').reportValidity())return null;
    const c=Object.fromEntries(fields.map(k=>[k,k==='mode'?$(k).value:Number($(k).value)]));
    if(fields.some(k=>k!=='mode'&&!Number.isFinite(c[k])))return null;
    return c;
  }
  function beginSegment(reason){
    segment++;initialY=state.y;segmentStart=state.t;segmentReason=reason;
    segmentRows=[{t:state.t,y:state.y}];
  }
  function apply(e){
    if(e)e.preventDefault();const next=settings();if(!next)return;
    if(running){
      if(['mode','kp','ki','kd'].some(k=>config[k]!==next[k])){state.i=0;state.d=0;state.previousY=state.y;}
      config=next;if(stepped)beginSegment('Settings changed');
      $('runStatus').textContent='Settings applied; recording continues.';
    }else{config=next;$('runStatus').textContent='Settings ready for the next run.';}
    render();
  }
  function record(target){
    rows.push({run_id:runId,source:'simulation',segment,time_s:state.t,target_rpm:target,
      output_rpm:state.y,error_rpm:target-state.y,duty_percent:state.u||0,
      saturated:state.saturated?1:0,...Object.fromEntries(fields.map(k=>[k,config[k]]))});
    if(stepped)segmentRows.push({t:state.t,y:state.y});
  }
  function start(){
    const next=settings();if(!next)return;
    if(rows.length&&!confirm('Start a new run and replace the current recording? Download CSV first if you need it.'))return;
    config=next;state=M.initial();rows=[];segmentRows=[];segment=0;stepped=false;
    runId=new Date().toISOString();running=true;record(0);
    ['gain','tau','duration','start'].forEach(k=>$(k).disabled=true);
    $('stop').disabled=false;$('download').disabled=true;
    $('runStatus').textContent='Recording simulation. Input step at 1 s.';
    // Fixed simulation time; never catch up with large wall-clock time steps.
    timer=setInterval(tick,1000*M.DT);render();
  }
  function tick(){
    if(!running)return;
    if(!stepped&&state.t>=1-1e-9){stepped=true;beginSegment('Initial input step');}
    const active=stepped?config:{...config,target:0,manual:0,load:0};
    state=M.step(state,active);record(active.target);
    if(state.t>=config.duration-1e-9)stop('Run complete');
    if(rows.length%5===0)render();
  }
  function stop(reason='Stopped'){
    running=false;clearInterval(timer);timer=null;
    ['gain','tau','duration','start'].forEach(k=>$(k).disabled=false);
    $('stop').disabled=true;$('download').disabled=!rows.length;
    $('runStatus').textContent=reason+' — '+rows.length+' samples retained. Download CSV before starting another run.';render();
  }
  function download(){
    if(!rows.length)return;const keys=Object.keys(rows[0]);
    const csv=keys.join(',')+'\n'+rows.map(r=>keys.map(k=>typeof r[k]==='number'?Number(r[k].toFixed(6)):r[k]).join(',')).join('\n')+'\n';
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='EE3600_Practical2_'+runId.replace(/[:.]/g,'-')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function chart(id,series,unit){
    const cv=$(id),ctx=cv.getContext('2d'),d=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;
    cv.width=Math.round(W*d);cv.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);
    const L=60,R=15,T=18,B=36,w=W-L-R,h=H-T-B;
    if(w<=0)return;
    const end=Math.max(5,state.t),start=Math.max(0,end-20);
    const visible=rows.filter(r=>r.time_s>=start);
    const max=id==='dutyChart'?100:Math.max(10,...visible.flatMap(r=>series.map(s=>r[s.key])))*1.12;
    const X=t=>L+(t-start)/(end-start)*w,Y=v=>T+h-v/max*h;
    ctx.font='12px Arial';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const v=max*i/4,y=Y(v);ctx.strokeStyle='#e8eaed';ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(L+w,y);ctx.stroke();
      ctx.fillStyle='#5f6368';ctx.textAlign='right';ctx.fillText(v.toFixed(0),L-8,y+4);
      const t=start+(end-start)*i/4;ctx.textAlign='center';ctx.fillText(t.toFixed(1),X(t),H-20);
    }
    ctx.textAlign='left';ctx.fillText(unit,4,12);ctx.textAlign='center';ctx.fillText('Simulation time (s)',L+w/2,H-4);
    for(const s of series){ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.setLineDash(s.dash||[]);ctx.beginPath();visible.forEach((r,i)=>{const x=X(r.time_s),y=Y(r[s.key]);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();}ctx.setLineDash([]);
  }
  function render(){
    const last=rows.at(-1);$('speed').textContent=state.y.toFixed(1)+' rpm';
    $('reference').textContent=(last?.target_rpm||0).toFixed(1)+' rpm';$('duty').textContent=(state.u||0).toFixed(1)+'%';
    $('samples').textContent=String(rows.length);$('saturation').textContent=state.saturated?'Yes':'No';
    $('segmentLabel').textContent=segment?'Segment '+segment+' · '+segmentReason+' at '+segmentStart.toFixed(2)+' s':'Waiting for the first input step.';
    // Use recorded configuration after stopping, even if settings are edited for the next run.
    const m=M.metrics(segmentRows,last?.target_rpm||0,initialY);
    $('overshoot').textContent=m?m.overshoot.toFixed(1)+'%':'—';
    $('settling').textContent=m?(m.settling===null?'Not settled':m.settling.toFixed(2)+' s'):'—';
    $('error').textContent=m&&m.error!==null?m.error.toFixed(2)+' rpm':'—';
    chart('speedChart',[{key:'output_rpm',color:'#0b57d0'},{key:'target_rpm',color:'#137333',dash:[6,4]}],'rpm');
    chart('dutyChart',[{key:'duty_percent',color:'#8a5b00'}],'%');
  }
  $('settings').addEventListener('submit',apply);$('start').onclick=start;$('stop').onclick=()=>stop();$('download').onclick=download;
  window.addEventListener('resize',render);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop('Stopped because the tab was hidden');});
  config=settings();render();
})();
