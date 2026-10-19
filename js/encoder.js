/* DATA2 fields and CPR convention reused from Practical 1. */
(function(root){
  function parseEncoderLine(line){
    if(!line.startsWith('DATA2,'))return null;
    const f=line.split(',');
    if(f.length<15 || [1,6,14].some(i=>f[i].trim()===''))return null;
    const r={ms:Number(f[1]),rpm:Number(f[6]),count:Number(f[14])};
    return Object.values(r).every(Number.isFinite)?r:null;
  }
  root.parseEncoderLine=parseEncoderLine;
  if(typeof module==='object')module.exports={parseEncoderLine};
})(globalThis);
