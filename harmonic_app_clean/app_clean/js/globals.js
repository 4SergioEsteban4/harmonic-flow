// MUSIC THEORY (shared)
// ══════════════════════════════════════════════════════
const NOTES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const MAJOR_SCALE=[0,2,4,5,7,9,11];
const MINOR_SCALE=[0,2,3,5,7,8,10];
const MAJ_INTERVALS=[0,2,4,5,7,9,11];
const SCALE_DATA={
  major:{triads:['maj','min','min','maj','maj','min','dim'],sevenths:['maj7','min7','min7','maj7','dom7','min7','m7b5'],roman:['I','ii','iii','IV','V','vi','vii°'],next:{0:[3,4,5,1,6],1:[4,5,0],2:[5,3,1],3:[4,1,5,0],4:[0,5,2],5:[3,1,4],6:[0,4]}},
  minor:{triads:['min','dim','maj','min','min','maj','maj'],sevenths:['min7','m7b5','maj7','min7','min7','maj7','dom7'],roman:['i','ii°','III','iv','v','VI','VII'],next:{0:[3,4,6,5,1],1:[4,5,0],2:[5,6,0],3:[4,1,0,6],4:[0,6,3],5:[3,0,4],6:[0,3,5]}}
};
const CHORD_INTERVALS={maj:[0,4,7],maj7:[0,4,7,11],min:[0,3,7],min7:[0,3,7,10],dim:[0,3,6],m7b5:[0,3,6,10],dom7:[0,4,7,10]};
const LINK_COLORS=['#4a9eff','#4ade80','#EF9F27','#e05a5a'];
const ROLE_COLORS={root:'#C9A84C',third:'#4a9eff',fifth:'#4ade80',seventh:'#EF9F27'};
const OPEN_STRINGS=[40,45,50,55,59,64];
const STRINGS_DISPLAY=[...OPEN_STRINGS].reverse();
const FRET_COUNT=24,STRING_COUNT=6;
const FRET_MARKS=[3,5,7,9,12,15,17,19,21,24],DOUBLE_MARKS=[12,24];

function noteIdx(n){return NOTES.indexOf(n);}
function noteName(i){return NOTES[((i%12)+12)%12];}
function getQuality(md,deg,sev){return sev?SCALE_DATA[md].sevenths[deg]:SCALE_DATA[md].triads[deg];}
function qualityLabel(q){const m={maj:'Mayor',min:'Menor',dim:'Disminuido',maj7:'Mayor 7ª',min7:'Menor 7ª',dom7:'Dom. 7ª',m7b5:'Semi-dim.'};return m[q]||q;}
function commonNotes(a,b){return a.filter(n=>b.includes(n));}
function getChordData(tn,md,deg,sev){
  const scale=md==='major'?MAJOR_SCALE:MINOR_SCALE;
  const q=getQuality(md,deg,sev);
  const root=(noteIdx(tn)+scale[deg])%12;
  const ivs=sev?(CHORD_INTERVALS[q]||[0,4,7,10]):(CHORD_INTERVALS[q]?CHORD_INTERVALS[q].slice(0,3):[0,4,7]);
  return{roman:SCALE_DATA[md].roman[deg],quality:q,notes:ivs.map(i=>noteName((root+i)%12)),root:noteName(root),degree:deg};
}
function intervalLabel(semi){return['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'][semi]||'';}

// Shared AudioContext
let sharedACtx=null;
function ensureAudio(){if(!sharedACtx)sharedACtx=new(window.AudioContext||window.webkitAudioContext)();if(sharedACtx.state==='suspended')sharedACtx.resume();return sharedACtx;}

// ══════════════════════════════════════════════════════
// FRETBOARD HELPERS
// ══════════════════════════════════════════════════════
function drawFretboardBase(ctx,W,H,PAD_L,PAD_R,PAD_T,PAD_B){
  const fretW=(W-PAD_L-PAD_R)/FRET_COUNT,strH=(H-PAD_T-PAD_B)/(STRING_COUNT-1);
  const wood=ctx.createLinearGradient(PAD_L,0,W-PAD_R,0);wood.addColorStop(0,'#1a120a');wood.addColorStop(.5,'#221508');wood.addColorStop(1,'#1a120a');
  ctx.fillStyle=wood;ctx.beginPath();ctx.roundRect(PAD_L,PAD_T-6,W-PAD_L-PAD_R,H-PAD_T-PAD_B+12,4);ctx.fill();
  for(let f=0;f<=FRET_COUNT;f++){const x=PAD_L+f*fretW;ctx.beginPath();ctx.moveTo(x,PAD_T-6);ctx.lineTo(x,H-PAD_B+6);ctx.strokeStyle=f===0?'#c0a060':'#4a4a48';ctx.lineWidth=f===0?3:.8;ctx.stroke();}
  FRET_MARKS.forEach(f=>{const x=PAD_L+(f-.5)*fretW;if(DOUBLE_MARKS.includes(f)){[H/2-11,H/2+11].forEach(y=>{ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fillStyle='#3a3220';ctx.fill();ctx.strokeStyle='#5a5040';ctx.lineWidth=.5;ctx.stroke();});}else{ctx.beginPath();ctx.arc(x,H/2,3.5,0,Math.PI*2);ctx.fillStyle='#3a3220';ctx.fill();ctx.strokeStyle='#5a5040';ctx.lineWidth=.5;ctx.stroke();}ctx.fillStyle='#5a5040';ctx.font='7px JetBrains Mono';ctx.textAlign='center';ctx.fillText(f,x,H-PAD_B+20);});
  for(let s=0;s<STRING_COUNT;s++){const y=PAD_T+s*strH;ctx.beginPath();ctx.moveTo(PAD_L,y);ctx.lineTo(W-PAD_R,y);ctx.strokeStyle=`rgba(200,180,120,${.35+s*.1})`;ctx.lineWidth=.5+s*.32;ctx.stroke();}
  ctx.font='8px JetBrains Mono';ctx.textAlign='center';STRINGS_DISPLAY.forEach((midi,s)=>{ctx.fillStyle='#7a7060';ctx.fillText(NOTES[midi%12],PAD_L-16,PAD_T+s*strH+3);});
  return{fretW,strH};
}

// ══════════════════════════════════════════════════════
