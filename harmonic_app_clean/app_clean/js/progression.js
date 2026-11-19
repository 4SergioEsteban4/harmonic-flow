// MODULE: PROGRESIONES (Tab 3)
// ══════════════════════════════════════════════════════
(function(){
  const SCALES={
    major:{roman:['I','ii','iii','IV','V','vi','vii°'],quality:['maj','min','min','maj','maj','min','dim'],next:{0:[3,4,5,1,6],1:[4,5,0],2:[5,3,1],3:[4,1,5,0],4:[0,5,2],5:[3,1,4],6:[0,4]}},
    minor:{roman:['i','ii°','III','iv','v','VI','VII'],quality:['min','dim','maj','min','min','maj','maj'],next:{0:[3,4,6,5,1],1:[4,5,0],2:[5,6,0],3:[4,1,0,6],4:[0,6,3],5:[3,0,4],6:[0,3,5]}}
  };
  const MOODS={happy:{scale:'major',starts:[0,3,4]},sad:{scale:'minor',starts:[0,5,3]},tense:{scale:'minor',starts:[4,1,6]},epic:{scale:'major',starts:[0,4,5]},jazzy:{scale:'major',starts:[1,4,0]},random:{scale:'random',starts:[0,1,2,3,4,5,6]}};
  let mood='happy',scalePref='major',scale=SCALES.major;
  let prBpm=90,barsPerChord=2,beatsPerBar=4;
  let running=false,currentDegree=0;
  let history=[],visited=new Set(),cycleDone=false;
  let barsDone=0,beatInBar=0,nextTime=0,schedInterval=null,animFrame=null,beatQueue=[];
  let pendingChoice=null,autoChoice=null;

  function resolveScale(){if(scalePref==='random')return Math.random()<.5?SCALES.major:SCALES.minor;return SCALES[scalePref];}
  function applyMood(m){mood=m;const cfg=MOODS[m];scalePref=cfg.scale;document.querySelectorAll('#pr-scaleBtns .scale-btn').forEach(b=>b.classList.toggle('active',b.dataset.scale===scalePref));scale=resolveScale();const s=cfg.starts[Math.floor(Math.random()*cfg.starts.length)];setDegree(s,false);}
  function setDegree(d,addHistory){
    currentDegree=d;
    if(addHistory){visited.add(d);history.push(scale.roman[d]);document.getElementById('pr-progHistory').textContent=history.slice(-9).join(' → ');if(!cycleDone&&visited.size===7){cycleDone=true;document.getElementById('pr-cycleBadge').classList.add('on');}barsDone=0;beatInBar=0;}
    const display=document.getElementById('pr-chordDisplay');display.textContent=String(d+1);display.classList.remove('pop');void display.offsetWidth;display.classList.add('pop');
    document.getElementById('pr-chordName').textContent=scale.roman[d]+' — '+scale.quality[d];
    renderNextButtons();
  }
  function renderNextButtons(){
    const grid=document.getElementById('pr-nextGrid');grid.innerHTML='';
    const nexts=scale.next[currentDegree];
    nexts.forEach(n=>{const btn=document.createElement('button');btn.className='next-deg-btn';btn.dataset.degree=String(n);btn.innerHTML=String(n+1)+'<span class="sub">'+scale.roman[n]+'</span><span class="auto-tag">auto</span>';grid.appendChild(btn);});
  }
  document.getElementById('pr-nextGrid').addEventListener('click',function(e){
    const btn=e.target.closest('.next-deg-btn');if(!btn||!btn.closest('#pr-nextGrid'))return;
    const deg=parseInt(btn.dataset.degree);pendingChoice=deg;autoChoice=null;
    document.getElementById('pr-nextGrid').querySelectorAll('.next-deg-btn').forEach(b=>{b.classList.remove('auto-default','urgent');b.style.borderColor=b===btn?'var(--blue)':'';b.style.background=b===btn?'#1c2a3a':'';});
  });
  function buildBeats(){const br=document.getElementById('pr-beatRow');br.innerHTML='';for(let i=0;i<beatsPerBar;i++){const d=document.createElement('div');d.className='prog-dot';br.appendChild(d);}}
  function updateDots(beat){document.getElementById('pr-beatRow').querySelectorAll('.prog-dot').forEach((d,i)=>{d.classList.remove('on','acc');if(i===beat)d.classList.add(beat===0?'acc':'on');});}
  function updateProgress(){const total=barsPerChord*beatsPerBar,done=barsDone*beatsPerBar+beatInBar;const pct=Math.min(100,Math.round((done/total)*100));const fill=document.getElementById('pr-progFill');fill.style.width=pct+'%';fill.className='prog-progress-fill'+(barsDone>=barsPerChord-1?' accent-bar':'');document.getElementById('pr-barsCounter').textContent='compás '+(barsDone+1)+' / '+barsPerChord;}
  function setUrgent(on){if(on&&pendingChoice===null){const nexts=scale.next[currentDegree];autoChoice=nexts[Math.floor(Math.random()*nexts.length)];}if(!on)autoChoice=null;document.getElementById('pr-nextGrid').querySelectorAll('.next-deg-btn').forEach(b=>{const deg=parseInt(b.dataset.degree);b.classList.toggle('urgent',on&&deg!==autoChoice);b.classList.toggle('auto-default',on&&deg===autoChoice&&pendingChoice===null);});}
  function beep(time,isAccent){const actx=ensureAudio();const o=actx.createOscillator(),g=actx.createGain();o.connect(g);g.connect(actx.destination);o.type='sine';o.frequency.value=isAccent?880:660;g.gain.setValueAtTime(isAccent?.5:.3,time);g.gain.exponentialRampToValueAtTime(.001,time+.06);o.start(time);o.stop(time+.07);}

  // ── Estado de sonido ──────────────────────────────────
  let chordSound='strum';
  let soundTonic='C';
  const NOTE_FREQS_PR={C:130.81,'C#':138.59,D:146.83,Eb:155.56,E:164.81,F:174.61,'F#':185,G:196,Ab:207.65,A:220,Bb:233.08,B:246.94};
  const CHORD_SOUND_INTERVALS_PR={maj:[0,4,7],min:[0,3,7],dim:[0,3,6],maj7:[0,4,7,11],min7:[0,3,7,10],dom7:[0,4,7,10],m7b5:[0,3,6,10]};

  function playChord(degree, type){
    if(chordSound==='off') return;
    const actx=ensureAudio();
    const scaleArr=(scalePref==='major'||scale===SCALES.major)?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];
    const tonicFreq=NOTE_FREQS_PR[soundTonic]||130.81;
    const rootSemi=scaleArr[degree]||0;
    const rootFreq=tonicFreq*Math.pow(2,rootSemi/12);
    const intervals=CHORD_SOUND_INTERVALS_PR[type]||[0,4,7];
    const now=actx.currentTime;
    if(chordSound==='strum'){
      intervals.forEach((semi,i)=>{
        const freq=rootFreq*Math.pow(2,semi/12);
        const delay=i*0.045;
        const o=actx.createOscillator(),g=actx.createGain(),f=actx.createBiquadFilter();
        f.type='lowpass';f.frequency.value=1800;
        o.connect(f);f.connect(g);g.connect(actx.destination);
        o.type='triangle';o.frequency.value=freq;
        g.gain.setValueAtTime(0,now+delay);
        g.gain.linearRampToValueAtTime(0.17,now+delay+0.01);
        g.gain.exponentialRampToValueAtTime(0.001,now+delay+1.1);
        o.start(now+delay);o.stop(now+delay+1.2);
      });
    } else if(chordSound==='arp'){
      const spb=60/prBpm;
      intervals.forEach((semi,i)=>{
        const freq=rootFreq*Math.pow(2,semi/12);
        const delay=i*(spb*0.15);
        const o=actx.createOscillator(),g=actx.createGain();
        o.connect(g);g.connect(actx.destination);
        o.type='sine';o.frequency.value=freq;
        g.gain.setValueAtTime(0,now+delay);
        g.gain.linearRampToValueAtTime(0.2,now+delay+0.01);
        g.gain.exponentialRampToValueAtTime(0.001,now+delay+0.5);
        o.start(now+delay);o.stop(now+delay+0.55);
      });
    }
  }

  function schedule(){const actx=ensureAudio();const spb=60/prBpm;while(nextTime<actx.currentTime+.12){beep(nextTime,beatInBar===0);const isLast=(beatInBar===beatsPerBar-1&&barsDone===barsPerChord-1);beatQueue.push({time:nextTime,beat:beatInBar,bar:barsDone,isLast});beatInBar=(beatInBar+1)%beatsPerBar;if(beatInBar===0)barsDone=(barsDone+1)%barsPerChord;nextTime+=spb;}}
  function drawLoop(){
    animFrame=requestAnimationFrame(drawLoop);const now=ensureAudio().currentTime;
    while(beatQueue.length&&beatQueue[0].time<=now){
      const ev=beatQueue.shift();updateDots(ev.beat);updateProgress();triggerBeatVisual(ev.beat===0);
      if(ev.beat===beatsPerBar-2&&ev.bar===barsPerChord-1)setUrgent(true);
      if(ev.isLast){const nexts=scale.next[currentDegree];const chosen=(pendingChoice!==null&&nexts.includes(pendingChoice))?pendingChoice:(autoChoice!==null?autoChoice:nexts[Math.floor(Math.random()*nexts.length)]);pendingChoice=null;autoChoice=null;setUrgent(false);setDegree(chosen,true);if(chordSound!=='off')playChord(chosen,scale.quality[chosen]);}
    }
  }
  function start(){
    ensureAudio();
    if(history.length===0){scale=resolveScale();const cfg=MOODS[mood];const s=cfg.starts[Math.floor(Math.random()*cfg.starts.length)];currentDegree=s;visited.add(s);history=[scale.roman[s]];document.getElementById('pr-progHistory').textContent=history[0];document.getElementById('pr-chordDisplay').textContent=String(s+1);document.getElementById('pr-chordName').textContent=scale.roman[s]+' — '+scale.quality[s];renderNextButtons();}
    barsDone=0;beatInBar=0;nextTime=ensureAudio().currentTime+.05;beatQueue=[];buildBeats();
    schedInterval=setInterval(schedule,25);animFrame=requestAnimationFrame(drawLoop);running=true;
    const pb=document.getElementById('pr-playBtn');pb.innerHTML='&#9646;&#9646;';pb.classList.add('playing');
  }
  function stop(){clearInterval(schedInterval);cancelAnimationFrame(animFrame);beatQueue=[];running=false;setUrgent(false);const pb=document.getElementById('pr-playBtn');pb.innerHTML='&#9654;';pb.classList.remove('playing');updateDots(-1);document.getElementById('pr-progFill').style.width='0%';document.getElementById('pr-barsCounter').textContent='';}
  document.getElementById('pr-bpmSlider').addEventListener('input',e=>{prBpm=parseInt(e.target.value);document.getElementById('pr-bpmVal').textContent=prBpm;});
  document.getElementById('pr-barsSlider').addEventListener('input',e=>{barsPerChord=parseInt(e.target.value);document.getElementById('pr-barsVal').textContent=barsPerChord;});
  document.getElementById('pr-moodRow').addEventListener('click',e=>{const b=e.target.closest('.mood-btn');if(!b)return;document.querySelectorAll('.mood-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');applyMood(b.dataset.mood);});
  document.getElementById('pr-scaleBtns').addEventListener('click',e=>{const b=e.target.closest('.scale-btn');if(!b)return;document.querySelectorAll('#pr-scaleBtns .scale-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');scalePref=b.dataset.scale;scale=resolveScale();setDegree(currentDegree,false);});
  document.getElementById('pr-newProgBtn').addEventListener('click',()=>{stop();history=[];visited.clear();cycleDone=false;pendingChoice=null;autoChoice=null;document.getElementById('pr-cycleBadge').classList.remove('on');document.getElementById('pr-progHistory').textContent='—';barsDone=0;beatInBar=0;applyMood(mood);});
  document.getElementById('pr-playBtn').addEventListener('click',()=>running?stop():start());
  buildBeats();applyMood('happy');

  function buildTonicRow(){
    const wrap=document.getElementById('pr-tonicRow');if(!wrap)return;
    wrap.innerHTML='';
    const label=document.createElement('span');label.style.cssText='font-size:11px;color:var(--muted);margin-right:4px;';label.textContent='tónica:';wrap.appendChild(label);
    ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'].forEach(n=>{
      const btn=document.createElement('button');btn.className='tag-btn'+(n===soundTonic?' active':'');
      btn.style.cssText='font-size:10px;padding:3px 8px;';btn.textContent=n;
      btn.addEventListener('click',()=>{soundTonic=n;wrap.querySelectorAll('.tag-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');});
      wrap.appendChild(btn);
    });
  }

  function buildSoundRow(){
    const wrap=document.getElementById('pr-soundRow');if(!wrap)return;
    wrap.innerHTML='';
    const label=document.createElement('span');label.style.cssText='font-size:11px;color:var(--muted);margin-right:4px;';label.textContent='acorde:';wrap.appendChild(label);
    [['off','apagado'],['strum','rasgueo'],['arp','arpegio']].forEach(([val,lbl])=>{
      const btn=document.createElement('button');btn.className='tag-btn'+(chordSound===val?' active':'');
      btn.style.cssText='font-size:10px;padding:3px 10px;';btn.textContent=lbl;
      btn.addEventListener('click',()=>{chordSound=val;wrap.querySelectorAll('.tag-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');if(val!=='off')playChord(currentDegree,scale.quality[currentDegree]);});
      wrap.appendChild(btn);
    });
  }

  buildBeats();applyMood('happy');buildTonicRow();buildSoundRow();
})();