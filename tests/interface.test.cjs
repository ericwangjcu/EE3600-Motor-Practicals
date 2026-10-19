// Headless DOM contract tests: exercise the actual UI scripts without a browser.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const defaults={mode:'closed',target:'150',kp:'.3',ki:'.8',kd:'0',manual:'53.57',limit:'100',duration:'30',gain:'2.8',tau:'.35',load:'0',gearRatio:'21.3',encSign:'1'};
 const elements={},intervals=new Map(),events={},downloads=[];let nextId=0;
 const canvas=new Proxy({},{get:()=>()=>{}});
 const element=id=>elements[id]??=( {value:defaults[id]||'',disabled:false,textContent:'',clientWidth:900,clientHeight:300,
  addEventListener(name,fn){this[name]=fn},reportValidity(){return Object.entries(defaults).every(([k])=>k==='mode'||Number.isFinite(Number(element(k).value)))&&Number(element('tau').value)>=.05;},getContext(){return canvas}});
 const document={getElementById:element,hidden:false,addEventListener(k,f){events[k]=f},createElement(){return {click(){downloads.push(this)}}}};
 const sandbox={document,console,TextEncoder,TextDecoder,Blob,URL:{createObjectURL:b=>{sandbox.blob=b;return 'blob:test'},revokeObjectURL(){}},confirm:()=>true,performance:{now:()=>sandbox.now},now:0,navigator:{},setInterval:fn=>{intervals.set(++nextId,fn);return nextId},clearInterval:id=>intervals.delete(id),setTimeout:fn=>{fn();return 1},window:{devicePixelRatio:1,addEventListener(){}}};
 vm.createContext(sandbox);for(const f of ['encoder.js','pid-model.js','practical2.js'])vm.runInContext(fs.readFileSync(__dirname+'/../js/'+f,'utf8'),sandbox);
 const tick=n=>{for(let i=0;i<n;i++)for(const fn of [...intervals.values()])fn()};
 return {element,document,events,sandbox,tick,downloads};
}
test('UI records, changes segments, exports full CSV and completes a run',async()=>{
 const f=fixture(),el=f.element;el('start').onclick();f.tick(300);assert.ok(parseFloat(el('speed').textContent)>145);assert.equal(el('gain').disabled,true);
 el('target').value='100';el('settings').submit({preventDefault(){}});f.tick(250);assert.match(el('segmentLabel').textContent,/Segment 2/);assert.ok(Math.abs(parseFloat(el('speed').textContent)-100)<2);
 el('stop').onclick();const count=el('samples').textContent;f.tick(10);assert.equal(el('samples').textContent,count);el('download').onclick();const csv=await f.sandbox.blob.text();assert.equal(csv.trim().split('\n').length,Number(count)+1);assert.match(csv,/,simulation,2,/);
 el('start').onclick();f.tick(1500);assert.match(el('runStatus').textContent,/Run complete/);assert.equal(el('start').disabled,false);assert.equal(el('stop').disabled,true);
});
test('invalid plant value blocks start and hidden tab retains data',()=>{const f=fixture(),el=f.element;el('tau').value='0';el('start').onclick();assert.equal(el('samples').textContent,'0');el('tau').value='.35';el('start').onclick();f.tick(100);f.document.hidden=true;f.events.visibilitychange();assert.match(el('runStatus').textContent,/tab was hidden/);assert.equal(el('download').disabled,false)});
test('monitor initialization allowlist, parser, stream loss and reconnect',async()=>{
 const f=fixture(),el=f.element,commands=[];let controller;
 f.sandbox.navigator.serial={addEventListener(){},requestPort:async()=>({open:async()=>{},close:async()=>{},readable:new ReadableStream({start(c){controller=c}}),writable:new WritableStream({write(v){commands.push(new TextDecoder().decode(v).trim())}})})};
 vm.runInContext(fs.readFileSync(__dirname+'/../js/encoder-monitor.js','utf8'),f.sandbox);
 await el('connect').onclick();assert.deepEqual(commands,['STOP','HELLO','CPR,44','ENCSIGN,1','STREAM,ON','STATUS']);controller.enqueue(new TextEncoder().encode('DATA2,100,0,0,0,0,213,0,0,0,0,0,0,0,44\n'));await new Promise(setImmediate);assert.match(el('encoderReading').textContent,/Output 10.0 rpm/);
 controller.error(new Error('USB lost'));await new Promise(setImmediate);assert.match(el('serialStatus').textContent,/disconnected/);assert.equal(el('gearRatio').disabled,false);
 await el('connect').onclick();assert.equal(commands.length,12);await el('connect').onclick();assert.match(el('serialStatus').textContent,/Disconnected/);
});
