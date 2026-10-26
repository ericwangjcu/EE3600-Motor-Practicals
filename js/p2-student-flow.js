/* Student presentation layer. The established P2 app remains the serial owner.
   Navigation, motor selection and model preparation never arm or write gains. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  if (!$('studentMain')) return;
  const profiles = {
    '21.3': {ratio:21.3, rpm:280, label:'6 V · 280 RPM output · 21.3:1'},
    '4.4': {ratio:4.4, rpm:1360, label:'6 V · 1360 RPM output · 4.4:1'}
  };
  let current = 1;
  function notice(text) { $('message').textContent = text; }
  function clearModel() {
    for (const id of ['modelK','modelTau','studyK','studyTau']) $(id).value = '';
    $('useP1Model').disabled = true;
    $('studyDownload').disabled = true;
    $('studyTable').innerHTML = '';
    window.P2SpeedStudy?.invalidate?.();
    $('p1Conversion').textContent = 'Use my P1 model again after changing the motor, model or supply.';
  }
  function summary() {
    const kit = profiles[$('motorProfile').value];
    $('motorSummary').textContent = kit ? kit.label + '. Encoder: 44 counts per motor revolution. Use the P1 gain and time constant measured on this motor.' : 'Select the same motor used in Practical 1. Both profiles use 44 decoded motor-shaft counts per revolution; gearbox ratio is separate.';
    const r = Number($('studyTarget').value);
    $('targetEquivalent').textContent = kit && Number.isFinite(r) && r > 0 ? r + ' motor RPM = ' + (r/kit.ratio).toFixed(2) + ' gearbox-output RPM. Choose an achievable tutor-approved target; the label speed is not a test command.' : 'Choose an achievable motor-RPM target agreed with the tutor.';
    $('fixedPValue').textContent = Number($('studyKp').value)>0 ? Number($('studyKp').value).toPrecision(6) + ' duty/RPM' : 'Choose a base P gain in section 2';
  }
  function show(n) {
    current = Math.max(1,Math.min(6,n));
    document.querySelectorAll('[data-task]').forEach(el=>{el.hidden=Number(el.dataset.task)!==current;});
    document.querySelectorAll('.task-nav [data-go]').forEach(el=>{if(Number(el.dataset.go)===current)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    $('previousTask').disabled = current===1;
    $('nextTask').disabled = current===6;
    $('taskCounter').textContent = 'Task-sheet section '+current+' of 6';
    $('speedStudy').hidden = ![2,3].includes(current);
    if ([2,3].includes(current)) $('studyMount'+current).appendChild($('speedStudy'));
    $('liveEvidence').hidden = ![5,6].includes(current);
    if ([5,6].includes(current)) $('traceMount'+current).appendChild($('liveEvidence'));
    summary();
    window.dispatchEvent(new Event('resize'));
  }
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>show(Number(el.dataset.go))));
  $('previousTask').addEventListener('click',()=>show(current-1));
  $('nextTask').addEventListener('click',()=>show(current+1));
  $('motorProfile').addEventListener('change',()=>{
    const kit=profiles[$('motorProfile').value];
    if (kit) { $('gear').value=kit.ratio; $('cpr').value=44; $('supply').value='6'; }
    for (const id of ['p1Gain','p1Tau','studyKp','studyKi']) $(id).value='';
    $('speedKp').value='0'; $('speedKi').value='0'; $('speedKd').value='0';
    clearModel();
    $('gear').dispatchEvent(new Event('change'));
    $('supply').dispatchEvent(new Event('change'));
    summary();
    notice('Motor selection changed locally. Enter this motor’s P1 values. Connect and Apply configuration in section 5 before a trial. No command or gain was sent.');
  });
  for (const id of ['p1Gain','p1Tau','supply']) $(id).addEventListener('change',clearModel);
  $('studyKp').addEventListener('input',summary);
  $('studyTarget').addEventListener('input',()=>{
    $('speedTarget').value=$('studyTarget').value;
    window.P2SpeedStudy?.invalidate?.();
    summary();
  });
  $('prepareModel').addEventListener('click',()=>{
    if (!profiles[$('motorProfile').value]) {notice('Select your motor first.');return;}
    clearModel();
    $('convertP1').click();
    if ($('useP1Model').disabled) return;
    $('useP1Model').click();
    if (!(Number($('modelK').value)>0 && Number($('modelTau').value)>0)) return;
    $('studyUseModel').click();
    $('studyLimit').value=$('limit').value;
    $('speedTarget').value=$('studyTarget').value;
    $('p1Conversion').textContent='Ready: G(s) = '+Number($('modelK').value).toPrecision(7)+' / ('+Number($('modelTau').value).toPrecision(5)+'s + 1), in motor RPM per duty fraction. The time constant is unchanged.';
    notice('P1 model ready for sections 2 and 3. Controller gains are unchanged; the motor has not been armed.');
  });
  $('studyP').addEventListener('click',()=>{$('studyKind').textContent='Last comparison: P only — simulation, not a motor trial';});
  $('studyPI').addEventListener('click',()=>{$('studyKind').textContent='Last comparison: PI with fixed P — simulation, not a motor trial';});
  $('limit').addEventListener('change',()=>{$('studyLimit').value=$('limit').value;window.P2SpeedStudy?.invalidate?.();});
  show(1);
})();
