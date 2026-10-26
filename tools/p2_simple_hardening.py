#!/usr/bin/env python3
from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'practical2-control.html';t=p.read_text()
old="function invalidateP1Conversion(){state.p1Conversion=null;$('useP1Model').disabled=true;}"
new="function invalidateP1Conversion(){state.p1Conversion=null;state.modelProvenance=null;$('useP1Model').disabled=true;}"
assert old in t or new in t
t=t.replace(old,new)
p.write_text(t)
p=r/'tests/speed-study.test.cjs';t=p.read_text()
old='/<details[^>]*id="optionalPosition"[^>]*hidden[^>]*inert/'
new='/<details(?=[^>]*id="optionalPosition")(?=[^>]*\\bhidden)(?=[^>]*\\binert)[^>]*>/'
assert old in t or new in t
t=t.replace(old,new)
p.write_text(t)
# Fully consume download responses. An unconsumed binary response triggered
# Node 22's undici Parser.finish assert(!this.paused), not a page failure.
p=r/'tests/speed-website-browser.cjs';t=p.read_text()
old="if((await fetch('http://127.0.0.1:8765/practical2-control.html')).ok)break;"
new="const probe=await fetch('http://127.0.0.1:8765/practical2-control.html');await probe.arrayBuffer();if(probe.ok)break;"
assert old in t or new in t
t=t.replace(old,new)
old="const res=await fetch(new URL(link,'http://127.0.0.1:8765/practical2-control.html'));assert.equal(res.status,200,link);"
new="const res=await page.request.get(new URL(link,'http://127.0.0.1:8765/practical2-control.html').href);assert.equal(res.status(),200,link);assert.ok((await res.body()).length>0,link+' has a nonempty response');await res.dispose();"
assert old in t or new in t
t=t.replace(old,new)
p.write_text(t)
print('Stale model provenance cleared; hidden+inert assertions retained; link checks consume full responses.')
