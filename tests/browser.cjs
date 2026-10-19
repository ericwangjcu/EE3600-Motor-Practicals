const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   const serial=new EventTarget();window.serialCommands=[];
   serial.requestPort=async()=>{
     const p=new EventTarget();
     p.open=async()=>{
       p.readable=new ReadableStream({start(c){window.encoderStream=c;}});
       p.writable=new WritableStream({write(v){window.serialCommands.push(new TextDecoder().decode(v).trim());}});
     };
     p.close=async()=>{};return p;
   };
   Object.defineProperty(navigator,'serial',{value:serial,configurable:true});
 });
 await page.goto('http://127.0.0.1:8000/practical2.html');
 await page.clock.install();
 await page.locator('#start').click();await page.clock.runFor(6000);
 assert.ok(parseFloat(await page.locator('#speed').innerText())>145);
 assert.equal(await page.locator('#gain').isDisabled(),true);
 await page.locator('#target').fill('100');await page.locator('#apply').click();await page.clock.runFor(5000);
 assert.match(await page.locator('#segmentLabel').innerText(),/Segment 2/);
 assert.ok(Math.abs(parseFloat(await page.locator('#speed').innerText())-100)<2);
 await page.locator('#stop').click();const count=await page.locator('#samples').innerText();await page.clock.runFor(1000);assert.equal(await page.locator('#samples').innerText(),count);
 const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise;
 const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
 const csv=Buffer.concat(chunks).toString();assert.match(csv,/source,segment,time_s/);assert.match(csv,/,simulation,2,/);assert.equal(csv.trim().split('\n').length,Number(count)+1);
 await page.locator('#tau').fill('0');await page.locator('#start').click();assert.equal(await page.locator('#stop').isDisabled(),true);
 await page.locator('#tau').fill('.35');page.on('dialog',d=>d.accept());await page.locator('#start').click();await page.clock.runFor(200);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.match(await page.locator('#runStatus').innerText(),/tab was hidden/);
 // Fixed allowlist, telemetry scale, stale telemetry, stream disconnect and reconnect.
 await page.locator('#connect').click();await page.clock.runFor(1200);
 assert.deepEqual(await page.evaluate(()=>window.serialCommands),['STOP','HELLO','CPR,44','ENCSIGN,1','STREAM,ON','STATUS']);
 await page.evaluate(()=>window.encoderStream.enqueue(new TextEncoder().encode('DATA2,123,0,0,0,0,213,0,0,0,0,0,0,0,44\r\n')));
 await page.waitForTimeout(10);assert.match(await page.locator('#encoderReading').innerText(),/Output 10.0 rpm/);
 await page.clock.runFor(2000);assert.match(await page.locator('#encoderReading').innerText(),/stale/);
 await page.evaluate(()=>window.encoderStream.error(new Error('USB unplug')));await page.waitForTimeout(10);
 assert.match(await page.locator('#serialStatus').innerText(),/disconnected/);
 await page.locator('#connect').click();await page.clock.runFor(1200);await page.locator('#connect').click();assert.match(await page.locator('#serialStatus').innerText(),/Disconnected/);
 // Produce an informative screenshot after a clean complete simulated response.
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{value:false,configurable:true}));
 await page.locator('#target').fill('150');await page.locator('#start').click();await page.clock.runFor(31000);
 assert.match(await page.locator('#runStatus').innerText(),/Run complete/);
 await page.screenshot({path:'/tmp/practical2-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/practical2-mobile.png',fullPage:true});
 await page.goto('http://127.0.0.1:8000/docs/practical2-student.html');assert.ok(await page.locator('h1').isVisible());
 await page.goto('http://127.0.0.1:8000/index.html');assert.equal(await page.locator('h1').innerText(),'Practical 1 — DC Motor Identification');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: simulation, segments, CSV, validation, hidden-tab stop, serial mock/unplug/reconnect, responsive layout, P1 load');
})().catch(e=>{console.error(e);process.exit(1)});
