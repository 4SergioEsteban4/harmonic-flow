// MODULE: HARMONIC FLOW (Tab 1)
// ══════════════════════════════════════════════════════
(function(){
  let tonic='C',mode='major',useSevenths=false;
  let hfBpm=80,beatsPerBar=4,barsPerChord=2;
  let currentDegree=0,running=false;
  let pendingChoice=null,autoChoice=null;
  let history=[],barsDone=0,beatInBar=0;
  let nextTime=0,schedInterval=null,animFrame=null,beatQueue=[];
  const fretShow={root:true,third:true,fifth:true,seventh:true,link:false};
  let scaleActivePosIdx=null,scaleShowNonScale=true;

  const POS_DATA_C=[
    {name:'C',color:'#4a9eff',notes:[[5,0,4],[5,1,5],[5,3,7],[4,2,11],[4,3,0],[3,0,2],[3,2,4],[3,3,5],[2,0,7],[2,2,9],[2,4,11],[1,0,11],[1,1,0],[1,3,2],[0,0,4],[0,1,5],[0,3,7]]},
    {name:'A',color:'#4ade80',notes:[[5,3,7],[5,5,9],[4,2,11],[4,3,0],[4,5,2],[3,3,5],[3,5,7],[2,2,9],[2,4,11],[2,5,0],[1,3,2],[1,5,4],[0,3,7],[0,5,9]]},
    {name:'G',color:'#C9A84C',notes:[[5,5,9],[5,7,11],[5,8,0],[4,5,2],[4,7,4],[4,8,5],[3,5,7],[3,7,9],[2,4,11],[2,5,0],[2,7,2],[1,5,4],[1,6,5],[1,8,7],[0,5,9],[0,7,11],[0,8,0]]},
    {name:'E',color:'#EF9F27',notes:[[5,8,0],[5,10,2],[4,7,4],[4,8,5],[4,10,7],[3,7,9],[3,9,11],[3,10,0],[2,7,2],[2,9,4],[2,10,5],[1,8,7],[1,10,9],[0,8,0],[0,10,2]]},
    {name:'D',color:'#D4537E',notes:[[5,10,2],[5,12,4],[4,10,7],[4,12,9],[3,9,11],[3,10,0],[3,12,2],[2,9,4],[2,10,5],[2,12,7],[1,10,9],[1,12,11],[1,13,0],[0,10,2],[0,12,4]]}
  ];

  function getCurrentChordData(deg){return getChordData(tonic,mode,deg,useSevenths);}
  function getLinkNotes(fromDeg,toDeg){return commonNotes(getCurrentChordData(fromDeg).notes,getCurrentChordData(toDeg).notes);}

  function beep(time,accent){
    const actx=ensureAudio();
    const o=actx.createOscillator(),g=actx.createGain(),f=actx.createBiquadFilter();
    f.type='lowpass';f.frequency.value=accent?2200:1400;
    o.connect(f);f.connect(g);g.connect(actx.destination);
    o.type='triangle';o.frequency.value=accent?1050:700;
    const vol=accent?.55:.3;
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(vol,time+.003);g.gain.exponentialRampToValueAtTime(.001,time+.08);
    o.start(time);o.stop(time+.09);
  }

  function linkNotePills(notes){return notes.map((n,i)=>{const c=LINK_COLORS[i%LINK_COLORS.length];return`<span class="link-note" style="color:${c};border-color:${c};background:${c}18">${n}</span>`;}).join('');}

  function setChord(degree,prev){
    currentDegree=degree;
    const cd=getCurrentChordData(degree);
    const cr=document.getElementById('chordRoman');
    cr.textContent=cd.roman;cr.classList.remove('pop','glow','flash');void cr.offsetWidth;cr.classList.add('pop','glow','flash');
    setTimeout(()=>cr.classList.remove('glow'),600);
    document.getElementById('chordQuality').textContent=qualityLabel(cd.quality);
    document.getElementById('chordNotes').textContent=cd.notes.join(' – ');
    const cb=document.getElementById('chordBadge');cb.textContent=useSevenths?'séptima':'tríada';cb.className='chord-type-badge '+(useSevenths?'seventh':'triad');
    const linkRow=document.getElementById('linkRow');
    if(prev!==null&&prev!==undefined){
      const links=getLinkNotes(prev,degree);
      const prevRoman=SCALE_DATA[mode].roman[prev];
      if(links.length>0){linkRow.innerHTML=`<span style="font-size:11px;color:var(--muted);">${prevRoman}</span><span class="link-arrow">→</span><div style="display:flex;gap:5px;flex-wrap:wrap;">${linkNotePills(links)}</div><span class="link-label">${links.length===1?'nota común':`${links.length} notas comunes`}</span>`;}
      else{linkRow.innerHTML=`<span style="font-size:18px;color:var(--dim);">∅</span><span class="link-none">sin nota común</span>`;}
    }
    history.push(cd.roman);
    document.getElementById('historyRow').textContent=history.slice(-12).join(' → ');
    updateNextCard();drawHFFretboard();
  }

  function updateNextCard(){
    const nexts=SCALE_DATA[mode].next[currentDegree];
    if(!pendingChoice)autoChoice=nexts[Math.floor(Math.random()*nexts.length)];
    const chosen=pendingChoice!==null?pendingChoice:autoChoice;
    const cd=getCurrentChordData(chosen);
    document.getElementById('nextRoman').textContent=cd.roman;
    document.getElementById('nextQuality').textContent=qualityLabel(cd.quality);
    document.getElementById('nextNotesPreview').textContent=cd.notes.join(' – ');
    document.getElementById('nextCard').classList.toggle('locked',pendingChoice!==null);
    renderPickerGrid();
  }

  function renderPickerGrid(){
    const pg=document.getElementById('pickerGrid');pg.innerHTML='';
    const nexts=SCALE_DATA[mode].next[currentDegree];
    nexts.forEach(n=>{const cd=getCurrentChordData(n);const btn=document.createElement('button');btn.className='pick-btn'+(n===pendingChoice?' chosen':'');btn.dataset.degree=n;btn.innerHTML=`<span class="pb-roman">${cd.roman}</span><span class="pb-sub">${qualityLabel(cd.quality)}</span>`;pg.appendChild(btn);});
  }

  document.getElementById('nextChangeBtn').addEventListener('click',()=>{document.getElementById('nextPicker').classList.toggle('open');});
  document.getElementById('pickerGrid').addEventListener('click',e=>{const btn=e.target.closest('.pick-btn');if(!btn)return;pendingChoice=parseInt(btn.dataset.degree);autoChoice=null;document.getElementById('nextPicker').classList.remove('open');updateNextCard();});

  function buildBeatDots(){const bd=document.getElementById('hf-beatDots');bd.innerHTML='';for(let i=0;i<beatsPerBar;i++){const d=document.createElement('div');d.className='bdot';bd.appendChild(d);}}
  function updateBeatDots(beat){document.getElementById('hf-beatDots').querySelectorAll('.bdot').forEach((d,i)=>{d.classList.remove('on','acc');if(i===beat)d.classList.add(beat===0?'acc':'on');});if(beat>=0)triggerBeatVisual(beat===0);}
  function updateProgress(){
    const total=barsPerChord*beatsPerBar,done=barsDone*beatsPerBar+beatInBar;
    const pf=document.getElementById('hf-progFill');pf.style.width=Math.min(100,Math.round(done/total*100))+'%';pf.className='prog-fill'+(barsDone>=barsPerChord-1?' last-bar':'');
    document.getElementById('hf-barsTxt').textContent=`${barsDone+1}/${barsPerChord}`;
    document.getElementById('nextCard').classList.toggle('urgent',barsDone>=barsPerChord-1&&pendingChoice===null);
  }

  function schedule(){
    const actx=ensureAudio();const spb=60/hfBpm;
    while(nextTime<actx.currentTime+.12){
      beep(nextTime,beatInBar===0);
      const isLast=(beatInBar===beatsPerBar-1&&barsDone===barsPerChord-1);
      beatQueue.push({time:nextTime,beat:beatInBar,bar:barsDone,isLast});
      beatInBar=(beatInBar+1)%beatsPerBar;if(beatInBar===0)barsDone=(barsDone+1)%barsPerChord;
      nextTime+=spb;
    }
  }
  function drawLoop(){
    animFrame=requestAnimationFrame(drawLoop);
    const now=ensureAudio().currentTime;
    while(beatQueue.length&&beatQueue[0].time<=now){
      const ev=beatQueue.shift();updateBeatDots(ev.beat);updateProgress();
      if(ev.isLast){
        const nexts=SCALE_DATA[mode].next[currentDegree];const prev=currentDegree;
        const chosen=(pendingChoice!==null&&nexts.includes(pendingChoice))?pendingChoice:(autoChoice!==null?autoChoice:nexts[Math.floor(Math.random()*nexts.length)]);
        pendingChoice=null;autoChoice=null;barsDone=0;beatInBar=0;document.getElementById('nextCard').classList.remove('urgent');setChord(chosen,prev);
      }
    }
  }
  function start(){
    ensureAudio();const s=[0,3,4][Math.floor(Math.random()*3)];
    setChord(s,null);document.getElementById('linkRow').innerHTML='<span class="link-none">—</span>';
    barsDone=0;beatInBar=0;nextTime=ensureAudio().currentTime+.05;
    beatQueue=[];buildBeatDots();schedInterval=setInterval(schedule,25);animFrame=requestAnimationFrame(drawLoop);
    running=true;const pb=document.getElementById('hf-playBtn');pb.innerHTML='&#9646;&#9646;';pb.classList.add('playing');
  }
  function stop(){
    clearInterval(schedInterval);cancelAnimationFrame(animFrame);beatQueue=[];running=false;
    const pb=document.getElementById('hf-playBtn');pb.innerHTML='&#9654;';pb.classList.remove('playing');
    updateBeatDots(-1);document.getElementById('hf-progFill').style.width='0%';document.getElementById('hf-barsTxt').textContent='';
    document.getElementById('nextCard').classList.remove('urgent');
  }
  function resetAll(){
    stop();history=[];document.getElementById('historyRow').textContent='—';
    document.getElementById('chordRoman').textContent='—';document.getElementById('chordQuality').textContent='—';document.getElementById('chordNotes').textContent='—';
    document.getElementById('chordBadge').className='chord-type-badge triad';document.getElementById('chordBadge').textContent='tríada';
    document.getElementById('linkRow').innerHTML='<div class="link-none">toca play para empezar</div>';
    document.getElementById('nextRoman').textContent='—';document.getElementById('nextQuality').textContent='';document.getElementById('nextNotesPreview').textContent='';
    pendingChoice=null;autoChoice=null;currentDegree=0;document.getElementById('nextPicker').classList.remove('open');drawHFFretboard();
  }

  document.getElementById('hf-playBtn').addEventListener('click',()=>running?stop():start());
  document.getElementById('hf-resetBtn').addEventListener('click',resetAll);
  document.getElementById('hf-bpmSlider').addEventListener('input',e=>{hfBpm=parseInt(e.target.value);document.getElementById('hf-bpmVal').textContent=hfBpm;});
  document.getElementById('hf-barsSlider').addEventListener('input',e=>{barsPerChord=parseInt(e.target.value);document.getElementById('hf-barsVal').textContent=barsPerChord;});
  document.getElementById('hf-sigBtns').addEventListener('click',e=>{const b=e.target.closest('.sig-btn');if(!b)return;document.querySelectorAll('#hf-sigBtns .sig-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');beatsPerBar=parseInt(b.dataset.beats);buildBeatDots();});
  document.getElementById('tonicSel').addEventListener('change',e=>{tonic=e.target.value;if(running)stop();history=[];drawHFFretboard();drawHFCaged();});
  document.getElementById('modeSel').addEventListener('change',e=>{mode=e.target.value;if(running)stop();history=[];drawHFCaged();});
  document.getElementById('triadBtn').addEventListener('click',()=>{useSevenths=false;document.getElementById('triadBtn').classList.add('active');document.getElementById('seventhBtn').classList.remove('active');if(running)setChord(currentDegree,null);else drawHFFretboard();drawHFCaged();});
  document.getElementById('seventhBtn').addEventListener('click',()=>{useSevenths=true;document.getElementById('seventhBtn').classList.add('active');document.getElementById('triadBtn').classList.remove('active');if(running)setChord(currentDegree,null);else drawHFFretboard();drawHFCaged();});
  document.getElementById('fretOpts').addEventListener('click',e=>{const b=e.target.closest('.fret-opt');if(!b)return;const t=b.dataset.type;fretShow[t]=!fretShow[t];b.classList.toggle('active',fretShow[t]);drawHFFretboard();});

  // Tap tempo
  let tapTimes=[];
  document.getElementById('tapBtn').addEventListener('click',()=>{const now=performance.now();tapTimes=tapTimes.filter(t=>now-t<3000);tapTimes.push(now);if(tapTimes.length>=2){const avg=tapTimes.slice(1).reduce((s,t,i)=>s+(t-tapTimes[i]),0)/(tapTimes.length-1);hfBpm=Math.max(40,Math.min(200,Math.round(60000/avg)));document.getElementById('hf-bpmSlider').value=hfBpm;document.getElementById('hf-bpmVal').textContent=hfBpm;}});

  // Scale position controls
  document.getElementById('scalePosAll').addEventListener('click',()=>{scaleActivePosIdx=null;document.querySelectorAll('.scale-pos-controls .fret-opt').forEach(b=>b.classList.remove('active'));document.getElementById('scalePosAll').classList.add('active');if(scaleShowNonScale)document.getElementById('scalePosNonScale').classList.add('active');drawHFCaged();});
  document.querySelectorAll('[data-pos]').forEach(btn=>{btn.addEventListener('click',()=>{const p=parseInt(btn.dataset.pos);scaleActivePosIdx=(scaleActivePosIdx===p?null:p);document.querySelectorAll('.scale-pos-controls .fret-opt:not(#scalePosAll):not(#scalePosNonScale)').forEach(b=>b.classList.remove('active'));if(scaleActivePosIdx!==null)btn.classList.add('active');else document.getElementById('scalePosAll').classList.add('active');drawHFCaged();});});
  document.getElementById('scalePosNonScale').addEventListener('click',()=>{scaleShowNonScale=!scaleShowNonScale;document.getElementById('scalePosNonScale').classList.toggle('active',scaleShowNonScale);drawHFCaged();});

  window.drawHFFretboard=function(){
    const canvas=document.getElementById('hf-fretboard');
    const W=Math.max(400,canvas.parentElement.clientWidth-8);
    const H=170;canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
    const{fretW,strH}=drawFretboardBase(ctx,W,H,30,10,20,26);
    if(!running&&history.length===0)return;
    const cd=getCurrentChordData(currentDegree);
    let linkColorMap={};
    if(fretShow.link&&history.length>=2){const prevDeg=SCALE_DATA[mode].roman.indexOf(history[history.length-2]);if(prevDeg>=0){const lns=getLinkNotes(prevDeg,currentDegree);lns.forEach((n,i)=>{linkColorMap[n]=LINK_COLORS[i%LINK_COLORS.length];});}}
    STRINGS_DISPLAY.forEach((openMidi,strIdx)=>{
      for(let fret=0;fret<=FRET_COUNT;fret++){
        const noteN=NOTES[(openMidi+fret)%12];
        let color=null;
        if(fretShow.root&&noteN===cd.notes[0])color=ROLE_COLORS.root;
        else if(fretShow.third&&cd.notes[1]&&noteN===cd.notes[1])color=ROLE_COLORS.third;
        else if(fretShow.fifth&&cd.notes[2]&&noteN===cd.notes[2])color=ROLE_COLORS.fifth;
        else if(fretShow.seventh&&cd.notes[3]&&noteN===cd.notes[3])color=ROLE_COLORS.seventh;
        if(fretShow.link&&linkColorMap[noteN])color=linkColorMap[noteN];
        if(!color)continue;
        const x=30+(fret===0?-.5:fret-.5)*fretW,y=20+strIdx*strH;
        ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle='#0e0e0d';ctx.font='bold 6px JetBrains Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(noteN,x,y);ctx.textBaseline='alphabetic';
      }
    });
  };

  window.drawHFCaged=function(){
    const canvas=document.getElementById('hf-cagedCanvas');
    const W=Math.max(400,canvas.parentElement.clientWidth-8);
    const SHOW_FRETS=14,H=170;canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
    const PAD_L=34,PAD_R=12,PAD_T=28,PAD_B=30;
    const fretW=(W-PAD_L-PAD_R)/SHOW_FRETS,strH=(H-PAD_T-PAD_B)/(STRING_COUNT-1);
    const wood=ctx.createLinearGradient(PAD_L,0,W-PAD_R,0);wood.addColorStop(0,'#1a120a');wood.addColorStop(.5,'#221508');wood.addColorStop(1,'#1a120a');
    ctx.fillStyle=wood;ctx.beginPath();ctx.roundRect(PAD_L,PAD_T-6,W-PAD_L-PAD_R,H-PAD_T-PAD_B+12,4);ctx.fill();
    for(let f=0;f<=SHOW_FRETS;f++){const x=PAD_L+f*fretW;ctx.beginPath();ctx.moveTo(x,PAD_T-6);ctx.lineTo(x,H-PAD_B+6);ctx.strokeStyle=f===0?'#c0a060':'#4a4a48';ctx.lineWidth=f===0?3:.8;ctx.stroke();}
    [3,5,7,9,12].forEach(f=>{if(f>SHOW_FRETS)return;const x=PAD_L+(f-.5)*fretW;if(f===12){[H/2-10,H/2+10].forEach(y=>{ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#3a3220';ctx.fill();});}else{ctx.beginPath();ctx.arc(x,H/2,3,0,Math.PI*2);ctx.fillStyle='#3a3220';ctx.fill();}ctx.fillStyle='#5a5040';ctx.font='7px JetBrains Mono';ctx.textAlign='center';ctx.fillText(f,x,H-PAD_B+22);});
    for(let s=0;s<STRING_COUNT;s++){const y=PAD_T+s*strH;ctx.beginPath();ctx.moveTo(PAD_L,y);ctx.lineTo(W-PAD_R,y);ctx.strokeStyle=`rgba(200,180,120,${.3+s*.1})`;ctx.lineWidth=.5+s*.3;ctx.stroke();}
    ctx.font='8px JetBrains Mono';ctx.textAlign='center';STRINGS_DISPLAY.forEach((midi,s)=>{ctx.fillStyle='#7a7060';ctx.fillText(NOTES[midi%12],PAD_L-16,PAD_T+s*strH+3);});
    const tonicOffset=noteIdx(tonic);
    const scaleNotes=new Set(MAJ_INTERVALS.map(i=>(tonicOffset+i)%12));
    const posToShow=scaleActivePosIdx!==null?[POS_DATA_C[scaleActivePosIdx]]:POS_DATA_C;
    const dotMap={};
    posToShow.forEach(pos=>{pos.notes.forEach(([str,fretC,semi])=>{const newFret=fretC+tonicOffset;if(newFret>SHOW_FRETS||newFret<0)return;const key=`${str},${newFret}`;dotMap[key]={color:pos.color,isRoot:semi===0,semi,pos:pos.name};});});
    if(scaleShowNonScale){STRINGS_DISPLAY.forEach((openMidi,strIdx)=>{for(let f=0;f<=SHOW_FRETS;f++){const pitch=(openMidi+f)%12;if(!scaleNotes.has(pitch)){const key=`${strIdx},${f}`;if(!dotMap[key])dotMap[key]={color:'#2a2828',isRoot:false,semi:-1,nonScale:true};}}});}
    Object.entries(dotMap).forEach(([key,d])=>{
      const[strIdx,f]=key.split(',').map(Number);if(f>SHOW_FRETS||f<0)return;
      const x=PAD_L+(f===0?-.5:f-.5)*fretW,y=PAD_T+strIdx*strH;
      if(d.nonScale){ctx.fillStyle='#1e1e1c';ctx.strokeStyle='#333330';ctx.lineWidth=0.5;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.stroke();return;}
      const isRoot=d.isRoot,rr=isRoot?7:5.5;
      if(isRoot){ctx.shadowColor='#ff3333';ctx.shadowBlur=12;ctx.fillStyle='#cc2222';ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.stroke();}
      else{ctx.shadowColor=d.color;ctx.shadowBlur=6;ctx.fillStyle='#111110';ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=d.color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.stroke();}
      const pitch=(STRINGS_DISPLAY[strIdx]+f)%12;const semi_from_tonic=((pitch-tonicOffset)%12+12)%12;const label=intervalLabel(semi_from_tonic);
      ctx.fillStyle=isRoot?'#fff':'#ccc';ctx.font=`bold ${isRoot?6:5.5}px JetBrains Mono`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y);ctx.textBaseline='alphabetic';
    });
    posToShow.forEach(pos=>{const shiftedFrets=pos.notes.map(([s,f])=>f+tonicOffset).filter(f=>f>=0&&f<=SHOW_FRETS);if(!shiftedFrets.length)return;const midF=(Math.min(...shiftedFrets)+Math.max(...shiftedFrets))/2;const x=PAD_L+(midF+.5)*fretW;ctx.fillStyle=pos.color;ctx.font='bold 9px JetBrains Mono';ctx.textAlign='center';ctx.fillText(pos.name,x,PAD_T-12);});
  };

  buildBeatDots();drawHFFretboard();drawHFCaged();
  window.addEventListener('resize',()=>{if(document.getElementById('panel-hf').classList.contains('active')){drawHFFretboard();drawHFCaged();}});

  // ── BIBLIOTECA ──────────────────────────────────────────
  // Estado: acorde A y B con notas custom y tipo personalizable
  let libTonic='C', libMode='major';
  let libSelA=null, libSelB=null;
  // Tipos disponibles de acorde
  const CHORD_TYPES=['maj','min','dim','aug','sus2','sus4','maj7','min7','dom7','m7b5','maj9','min9'];
  const CHORD_TYPE_LABELS={maj:'Mayor',min:'Menor',dim:'Dismin.',aug:'Aum.',sus2:'Sus2',sus4:'Sus4',maj7:'Maj7',min7:'Min7',dom7:'Dom7',m7b5:'m7b5',maj9:'Maj9',min9:'Min9'};
  const CHORD_TYPE_INTERVALS={maj:[0,4,7],min:[0,3,7],dim:[0,3,6],aug:[0,4,8],sus2:[0,2,7],sus4:[0,5,7],maj7:[0,4,7,11],min7:[0,3,7,10],dom7:[0,4,7,10],m7b5:[0,3,6,10],maj9:[0,4,7,11,14],min9:[0,3,7,10,14]};
  // Estado custom por acorde
  let libCustomA={typeOverride:null, extraNotes:new Set(), activeNotes:null};
  let libCustomB={typeOverride:null, extraNotes:new Set(), activeNotes:null};
  const libFretShow={root:true,third:true,fifth:true,seventh:true,link:true,scale:false};
  document.getElementById('libFretShowBtns').addEventListener('click',e=>{const b=e.target.closest('.fret-opt');if(!b)return;const t=b.dataset.type;libFretShow[t]=!libFretShow[t];b.classList.toggle('active',libFretShow[t]);updateLibDetail();});

  function openLib(){
    document.getElementById('libOverlay').classList.add('open');
    document.getElementById('libBtn').classList.add('active');
    libTonic=tonic;libMode=mode;
    document.getElementById('libTonicSel').value=libTonic;
    document.getElementById('libModeSel').value=libMode;
    libSelA=null;libSelB=null;
    libCustomA={typeOverride:null,extraNotes:new Set(),activeNotes:null};
    libCustomB={typeOverride:null,extraNotes:new Set(),activeNotes:null};
    populateChromaticSelects();
    renderLibGrid();updateLibDetail();
  }
  function closeLib(){document.getElementById('libOverlay').classList.remove('open');document.getElementById('libBtn').classList.remove('active');}
  document.getElementById('libBtn').addEventListener('click',openLib);
  document.getElementById('libClose').addEventListener('click',closeLib);
  document.getElementById('libOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('libOverlay'))closeLib();});
  document.getElementById('libTonicSel').addEventListener('change',e=>{libTonic=e.target.value;libSelA=null;libSelB=null;libCustomA={typeOverride:null,extraNotes:new Set(),activeNotes:null};libCustomB={typeOverride:null,extraNotes:new Set(),activeNotes:null};populateChromaticSelects();renderLibGrid();updateLibDetail();});
  document.getElementById('libModeSel').addEventListener('change',e=>{libMode=e.target.value;libSelA=null;libSelB=null;libCustomA={typeOverride:null,extraNotes:new Set(),activeNotes:null};libCustomB={typeOverride:null,extraNotes:new Set(),activeNotes:null};renderLibGrid();updateLibDetail();});

  // Populate chromatic note selects
  function populateChromaticSelects(){
    ['libAddNoteA','libAddNoteB'].forEach(id=>{
      const sel=document.getElementById(id);
      sel.innerHTML='<option value="">+ nota cromática</option>';
      NOTES.forEach(n=>{const opt=document.createElement('option');opt.value=n;opt.textContent=n;sel.appendChild(opt);});
    });
  }

  document.getElementById('libAddNoteA').addEventListener('change',e=>{
    const n=e.target.value;if(!n)return;libCustomA.extraNotes.add(n);e.target.value='';
    if(libCustomA.activeNotes) libCustomA.activeNotes.add(n);
    updateLibDetail();
  });
  document.getElementById('libAddNoteB').addEventListener('change',e=>{
    const n=e.target.value;if(!n)return;libCustomB.extraNotes.add(n);e.target.value='';
    if(libCustomB.activeNotes) libCustomB.activeNotes.add(n);
    updateLibDetail();
  });

  // Get effective notes for a side (A or B)
  function getEffectiveNotes(deg, custom){
    const libScale=libMode==='major'?MAJOR_SCALE:MINOR_SCALE;
    const rootMidi=(noteIdx(libTonic)+libScale[deg])%12;
    const type=custom.typeOverride||getQuality(libMode,deg,false);
    const baseIntervals=CHORD_TYPE_INTERVALS[type]||[0,4,7];
    const baseNotes=baseIntervals.map(iv=>noteName((rootMidi+iv)%12));
    // Active notes: if custom.activeNotes is set use that, else all base notes
    const active=custom.activeNotes||new Set(baseNotes);
    // Add extra chromatic notes
    custom.extraNotes.forEach(n=>active.add(n));
    return{rootNote:noteName(rootMidi), type, baseNotes, activeNotes:active};
  }

  // Get scale notes for degree root
  function getDegreeRoot(deg){
    const libScale=libMode==='major'?MAJOR_SCALE:MINOR_SCALE;
    return noteName((noteIdx(libTonic)+libScale[deg])%12);
  }

  function renderLibGrid(){
    const grid=document.getElementById('libGrid');grid.innerHTML='';
    for(let deg=0;deg<7;deg++){
      const cd=getChordData(libTonic,libMode,deg,false);
      const isA=libSelA===deg,isB=libSelB===deg;
      const card=document.createElement('div');
      card.className='lib-card'+(isA?' selected-a':isB?' selected-b':'');
      card.dataset.deg=deg;
      card.innerHTML=`<div class="lib-roman" style="color:${isA?'var(--blue)':isB?'var(--pink)':'var(--text)'}">${cd.roman}</div><div class="lib-quality">${qualityLabel(cd.quality)}</div><div style="font-size:9px;color:var(--gold);margin-top:2px">${cd.notes.join(' ')}</div>`;
      card.addEventListener('click',()=>{
        if(libSelA===deg){libSelA=null;libCustomA={typeOverride:null,extraNotes:new Set(),activeNotes:null};}
        else if(libSelB===deg){libSelB=null;libCustomB={typeOverride:null,extraNotes:new Set(),activeNotes:null};}
        else if(libSelA===null){libSelA=deg;libCustomA={typeOverride:null,extraNotes:new Set(),activeNotes:null};}
        else if(libSelB===null){libSelB=deg;libCustomB={typeOverride:null,extraNotes:new Set(),activeNotes:null};}
        else{libSelA=libSelB;libCustomA=Object.assign({},libCustomB,{extraNotes:new Set(libCustomB.extraNotes),activeNotes:libCustomB.activeNotes?new Set(libCustomB.activeNotes):null});libSelB=deg;libCustomB={typeOverride:null,extraNotes:new Set(),activeNotes:null};}
        renderLibGrid();updateLibDetail();
      });
      grid.appendChild(card);
    }
  }

  // renderTypeButtons removed

  const NOTE_PILL_COLORS=['#C9A84C','#4a9eff','#D4537E','#4ade80','#EF9F27','#c084fc','#f97316','#06b6d4','#e05a5a','#84cc16','#f472b6','#38bdf8'];

  function renderNotesPicker(containerId, deg, custom, side){
    const cont=document.getElementById(containerId);
    cont.innerHTML='';
    const libScale=libMode==='major'?MAJOR_SCALE:MINOR_SCALE;
    const rootMidi=(noteIdx(libTonic)+libScale[deg])%12;
    const defQ=getQuality(libMode,deg,false);
    const defIntervals=CHORD_TYPE_INTERVALS[defQ]||[0,4,7];
    const defNotes=defIntervals.map(iv=>noteName((rootMidi+iv)%12));
    const scaleNotes=libMode==='major'
      ?MAJOR_SCALE.map(iv=>noteName((noteIdx(libTonic)+iv)%12))
      :MINOR_SCALE.map(iv=>noteName((noteIdx(libTonic)+iv)%12));
    const allNotes=[...new Set([...scaleNotes,...custom.extraNotes])];
    if(!custom.activeNotes) custom.activeNotes=new Set(defNotes);

    // Solo 1 acorde seleccionado = cada nota activa tiene su propio color
    const isSolo=(libSelA===null || libSelB===null);
    const activeList=[...custom.activeNotes];

    allNotes.forEach(n=>{
      const isBase=defNotes.includes(n);
      const isActive=custom.activeNotes.has(n);
      const colorIdx=activeList.indexOf(n);
      const noteCol=isSolo && isActive && colorIdx>=0
        ? NOTE_PILL_COLORS[colorIdx % NOTE_PILL_COLORS.length]
        : null;

      const btn=document.createElement('button');
      btn.className='sm-btn';

      if(isActive && noteCol){
        btn.style.cssText=`font-size:10px;padding:3px 8px;border-color:${noteCol};color:${noteCol};background:${noteCol}18;font-family:'JetBrains Mono',monospace;`;
      } else if(isActive){
        btn.style.cssText='font-size:10px;padding:3px 8px;border-color:var(--border2);color:var(--text);background:var(--s3);font-family:\'JetBrains Mono\',monospace;';
      } else {
        btn.style.cssText=`font-size:10px;padding:3px 8px;opacity:${isBase?'.5':'.35'};font-family:'JetBrains Mono',monospace;`;
      }

      btn.title=isBase?'nota del acorde':'nota de la escala';
      btn.textContent=n;
      btn.addEventListener('click',()=>{
        if(custom.activeNotes.has(n)) custom.activeNotes.delete(n);
        else custom.activeNotes.add(n);
        updateLibDetail();
      });
      cont.appendChild(btn);
    });
  }

  function updateLibDetail(){
    const detail=document.getElementById('libDetail');
    if(libSelA===null&&libSelB===null){detail.style.display='none';drawLibFretboard([],[],[]);return;}
    detail.style.display='flex';

    const libScale=libMode==='major'?MAJOR_SCALE:MINOR_SCALE;

    // Acorde A
    if(libSelA!==null){
      document.getElementById('libBoxA').style.display='';
      const ef=getEffectiveNotes(libSelA,libCustomA);
      const roman=getChordData(libTonic,libMode,libSelA,false).roman;
      document.getElementById('libNameA').textContent=roman;
      document.getElementById('libSubA').textContent=(CHORD_TYPE_LABELS[ef.type]||ef.type);
      renderNotesPicker('libNotesPickerA',libSelA,libCustomA,'A');
      const finalNotes=[...libCustomA.activeNotes];
      document.getElementById('libFinalNotesA').textContent=finalNotes.join(' – ');
    } else {document.getElementById('libBoxA').style.display='none';}

    // Acorde B
    if(libSelB!==null){
      document.getElementById('libBoxB').style.display='';
      const ef=getEffectiveNotes(libSelB,libCustomB);
      const roman=getChordData(libTonic,libMode,libSelB,false).roman;
      document.getElementById('libNameB').textContent=roman;
      document.getElementById('libSubB').textContent=(CHORD_TYPE_LABELS[ef.type]||ef.type);
      renderNotesPicker('libNotesPickerB',libSelB,libCustomB,'B');
      const finalNotes=[...libCustomB.activeNotes];
      document.getElementById('libFinalNotesB').textContent=finalNotes.join(' – ');
    } else {document.getElementById('libBoxB').style.display='none';}

    // Notas en común
    const linkPanel=document.getElementById('libLinkPanel');
    const notesA=libSelA!==null&&libCustomA.activeNotes?[...libCustomA.activeNotes]:[];
    const notesB=libSelB!==null&&libCustomB.activeNotes?[...libCustomB.activeNotes]:[];
    if(libSelA!==null&&libSelB!==null){
      linkPanel.style.display='';
      const common=notesA.filter(n=>notesB.includes(n));
      const linkNotesEl=document.getElementById('libLinkNotes');
      const linkDesc=document.getElementById('libLinkDesc');
      if(common.length>0){
        linkNotesEl.innerHTML=common.map((n,i)=>{const c=LINK_COLORS[i%LINK_COLORS.length];return`<span class="link-note" style="color:${c};border-color:${c};background:${c}18;padding:2px 6px;border-radius:6px;border:.5px solid;font-size:12px;font-weight:600">${n}</span>`;}).join('');
        linkDesc.textContent=common.length===1?'1 nota de enlace':common.length+' notas en común';
      } else {
        linkNotesEl.innerHTML='<span class="lib-link-empty">∅ sin notas en común</span>';
        linkDesc.textContent='movimiento cromático';
      }
    } else {linkPanel.style.display='none';}

    drawLibFretboard(notesA, notesB, notesA.filter(n=>notesB.includes(n)));
  }

  function drawLibFretboard(notesA, notesB, common){
    const canvas=document.getElementById('libFretboard');
    const modal=canvas.closest('.modal');
    const W=Math.max(400,(modal?modal.clientWidth-48:600));
    const H=170;canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
    if(!notesA.length&&!notesB.length)return;
    const{fretW,strH}=drawFretboardBase(ctx,W,H,30,10,20,26);
    const PAD_L=30,PAD_T=20;
    const libScale=libMode==='major'?MAJOR_SCALE:MINOR_SCALE;
    const diatonicNotes=libScale.map(iv=>noteName((noteIdx(libTonic)+iv)%12));
    const commonSet=new Set(common);
    const isSolo=libSelB===null||libSelA===null;
    // Assign distinct colors per note when solo
    const soloNotes=libSelA!==null?notesA:notesB;
    STRINGS_DISPLAY.forEach((openMidi,strIdx)=>{
      for(let fret=0;fret<=FRET_COUNT;fret++){
        const noteN=NOTES[(openMidi+fret)%12];
        let color=null,r=6,alpha=1;
        if(isSolo){
          // One chord: each note gets its own color
          const ni=soloNotes.indexOf(noteN);
          if(ni>=0){color=NOTE_PILL_COLORS[ni%NOTE_PILL_COLORS.length];r=6;alpha=1;}
          else{continue;}
        } else {
          // Two chords
          if(libFretShow.link&&commonSet.has(noteN)){
            const ci=[...commonSet].indexOf(noteN);
            color=LINK_COLORS[ci%LINK_COLORS.length];r=7;alpha=1;
          } else if(notesA.includes(noteN)&&notesB.includes(noteN)){
            color='#C9A84C';r=6;alpha=.9;
          } else if(notesA.includes(noteN)){
            color='#4a9eff';r=6;alpha=1;
          } else if(notesB.includes(noteN)){
            color='#D4537E';r=6;alpha=1;
          } else {continue;}
        }
        const x=PAD_L+(fret===0?-.5:fret-.5)*fretW,y=PAD_T+strIdx*strH;
        ctx.globalAlpha=alpha;ctx.shadowColor=color;ctx.shadowBlur=r>4?10:3;
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
        if(r>=5){ctx.fillStyle='#0e0e0d';ctx.font='bold 6px JetBrains Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(noteN,x,y);ctx.textBaseline='alphabetic';}
      }
    });
  }
})();

// ══════════════════════════════════════════════════════