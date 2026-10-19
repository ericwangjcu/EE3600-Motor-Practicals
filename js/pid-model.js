/* Educational simulation only. Output speed in gearbox-shaft rpm, u in %. */
(function(root){
  const DT=0.02, clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function initial(){return {t:0,y:0,drive:0,i:0,d:0,previousY:0};}
  function step(s,c){
    const e=c.target-s.y;
    // Filter derivative of measurement, avoiding a derivative kick on setpoint steps.
    const d=s.d+DT/(0.06+DT)*((s.y-s.previousY)/DT-s.d);
    const p=c.kp*e, derivative=-c.kd*d;
    let integral=c.ki===0?0:s.i;
    const candidate=integral+c.ki*e*DT;
    const raw=p+candidate+derivative;
    // Conditional integration: allow unwinding but reject integration into saturation.
    if(c.mode==='closed' && ((raw>=0&&raw<=c.limit)||(raw>c.limit&&e<0)||(raw<0&&e>0)))integral=candidate;
    if(c.mode==='open')integral=0;
    const requested=c.mode==='open'?c.manual:p+integral+derivative;
    const u=clamp(requested,0,c.limit);
    const drive=s.drive+(u-s.drive)*(1-Math.exp(-DT/0.08));
    const equilibrium=Math.max(0,c.gain*drive-c.load);
    const y=s.y+(equilibrium-s.y)*(1-Math.exp(-DT/c.tau));
    return {t:s.t+DT,y,drive,i:integral,d,previousY:s.y,u,p,derivative,error:c.target-y,saturated:requested<0||requested>c.limit};
  }
  function metrics(rows,target,initialY){
    if(rows.length<2)return null;
    const start=rows[0].t,end=rows.at(-1).t,amplitude=target-initialY;
    if(Math.abs(amplitude)<1e-9)return null;
    const direction=Math.sign(amplitude),band=0.02*Math.abs(amplitude);
    const overshoot=Math.max(0,...rows.map(r=>direction*(r.y-target)))/Math.abs(amplitude)*100;
    const lastOutside=rows.findLastIndex(r=>Math.abs(r.y-target)>band);
    const inBand=rows[lastOutside+1];
    const settling=inBand&&end-inBand.t>=1?inBand.t-start:null;
    const tail=rows.filter(r=>r.t>=end-2);
    const error=end-start>=3?target-tail.reduce((a,r)=>a+r.y,0)/tail.length:null;
    return {overshoot,settling,error,band};
  }
  const api={DT,initial,step,metrics};root.PIDModel=api;
  if(typeof module==='object')module.exports=api;
})(globalThis);
