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
print('Stale model provenance cleared; hidden+inert assertions retained independently of HTML attribute order.')
