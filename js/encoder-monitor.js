'use strict';
/* Monitor only. No arbitrary command entry and no motor-control command path. */
(() => {
  const $=id=>document.getElementById(id);
  let session=null,busy=false,lastReceived=0;
  const log=s=>{$('console').textContent=($('console').textContent+s+'\n').slice(-8000);};
  const status=s=>{$('serialStatus').textContent=s;};
  function reset(){
    $('connect').textContent='Connect Pico (monitor only)';$('gearRatio').disabled=false;$('encSign').disabled=false;
    $('encoderReading').textContent='Encoder: —';lastReceived=0;
  }
  async function cleanup(s,message){
    if(!s)return;
    if(s.closing)return s.closing;
    s.active=false;if(session===s){session=null;reset();status(message);}
    s.closing=(async()=>{
      try{await s.reader?.cancel();}catch{}
      try{s.reader?.releaseLock();}catch{}
      try{s.writer?.releaseLock();}catch{}
      try{await s.port.close();}catch{}
    })();return s.closing;
  }
  async function read(s){
    const decoder=new TextDecoder();let rx='';
    try{
      while(s.active){
        const {value,done}=await s.reader.read();if(done)break;
        rx+=decoder.decode(value,{stream:true}).replace(/\0/g,'');
        if(rx.length>8192)throw new Error('Oversized serial frame');
        let i;while((i=rx.indexOf('\n'))>=0){
          const line=rx.slice(0,i).replace(/\r/g,'').trim();rx=rx.slice(i+1);
          const r=parseEncoderLine(line);
          if(r&&s.active){lastReceived=performance.now();$('encoderReading').textContent='Output '+(r.rpm/s.ratio).toFixed(1)+' rpm · Motor '+r.rpm.toFixed(1)+' rpm · Count '+r.count;status('Encoder telemetry received — monitor only.');}
          else if(line&&!line.startsWith('DATA2,'))log(line);
        }
      }
    }catch(e){if(s.active)log('Read stopped: '+e.message);}
    finally{try{s.reader.releaseLock();}catch{} await cleanup(s,'Pico disconnected.');}
  }
  async function connect(){
    if(busy)return;busy=true;$('connect').disabled=true;
    try{
      if(session){await cleanup(session,'Disconnected.');return;}
      if(!navigator.serial){status('Web Serial unavailable. Use desktop Chrome/Edge over HTTPS or localhost.');return;}
      const port=await navigator.serial.requestPort();
      const s={port,active:true,ratio:Number($('gearRatio').value)};session=s;
      try{
        await port.open({baudRate:115200});s.writer=port.writable.getWriter();s.reader=port.readable.getReader();
        $('gearRatio').disabled=true;$('encSign').disabled=true;$('connect').textContent='Disconnect Pico';
        status('Connected; waiting for encoder telemetry.');read(s);
        // Same initialization as Practical 1. STOP is not a verified physical emergency stop.
        const commands=['STOP','HELLO','CPR,44','ENCSIGN,'+$('encSign').value,'STREAM,ON','STATUS'];
        await new Promise(r=>setTimeout(r,200));
        for(const cmd of commands){if(!s.active)break;await s.writer.write(new TextEncoder().encode(cmd+'\r\n'));log('> '+cmd);await new Promise(r=>setTimeout(r,80));}
      }catch(e){await cleanup(s,'Connection failed: '+e.message);}
    }catch(e){status('Connection cancelled or unavailable: '+e.message);}
    finally{busy=false;$('connect').disabled=false;}
  }
  $('connect').onclick=connect;
  navigator.serial?.addEventListener('disconnect',e=>{if(session&&e.target===session.port)cleanup(session,'USB disconnected.');});
  setInterval(()=>{if(session&&lastReceived&&performance.now()-lastReceived>1500){$('encoderReading').textContent='Encoder: stale — no recent samples';status('No recent telemetry. Check the Pico connection.');}},500);
})();
