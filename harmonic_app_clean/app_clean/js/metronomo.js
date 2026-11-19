// MODULE: METRÓNOMO (Tab 2)
// ══════════════════════════════════════════════════════
(function(){
  const SHAPES=['C','A','G','E','D'];
  const NEAR={C:['A','D'],A:['C','G'],G:['A','E'],E:['G','D'],D:['E','C']};
  let cagedMode='endless',cagedShape='C',cagedDegree=1,prevShape=null;
  let cagedVisited=new Set(),cagedCompletedAll=false;
  let barsPerShape=2,currentBar=0,showArrows=true;
  let metroBpm=100,beatsPerBar=4,currentBeat=0,nextTime=0;
  let running=false,schedInterval=null,animFrame=null,beatQueue=[],lastBeat=-1;
  let currentMetroPanel='grados';
  // Histogram
  const counts=[0,0,0,0,0,0,0];
  let activeNum=-1,cycleShown=false,resetTotal=0,autoResetEnabled=false;

  // Build histogram
  const histogram=document.getElementById('histogram');
  for(let i=0;i<7;i++){
    const col=document.createElement('div');col.className='bar-col';
    col.innerHTML=`<div class="bar-count" id="mcnt${i+1}">0</div><div class="bar-track"><div class="bar-fill" id="mfill${i+1}"></div></div><div class="bar-label" id="mlbl${i+1}">${i+1}</div>`;
    histogram.appendChild(col);
  }

  function doReset(){counts.fill(0);activeNum=-1;cycleShown=false;document.getElementById('cycleBadge').classList.remove('visible');for(let i=0;i<7;i++){document.getElementById('mfill'+(i+1)).style.height='0%';document.getElementById('mcnt'+(i+1)).textContent='0';document.getElementById('mlbl'+(i+1)).className='bar-label';document.getElementById('mfill'+(i+1)).className='bar-fill';}}
  function updateHistogram(newActive){
    activeNum=newActive;const max=Math.max(...counts,1);
    for(let i=0;i<7;i++){const fill=document.getElementById('mfill'+(i+1));const cnt=document.getElementById('mcnt'+(i+1));const lbl=document.getElementById('mlbl'+(i+1));fill.style.height=Math.round(counts[i]/max*100)+'%';cnt.textContent=counts[i];const isA=(i+1)===activeNum;fill.className='bar-fill'+(isA?' active-num':'');lbl.className='bar-label'+(isA?' active-num':'');}
    const allHit=counts.every(c=>c>0);
    if(!cycleShown&&allHit){cycleShown=true;document.getElementById('cycleBadge').classList.add('visible');if(autoResetEnabled){setTimeout(()=>{resetTotal++;document.getElementById('resetCounter').textContent='×'+resetTotal;doReset();},800);}}
  }
  document.getElementById('metro-resetBtn').addEventListener('click',()=>{resetTotal=0;document.getElementById('resetCounter').textContent='×0';doReset();});
  document.getElementById('autoResetChk').addEventListener('change',function(){autoResetEnabled=this.checked;});

  // CAGED logic
  function getDirection(from,to){const fi=SHAPES.indexOf(from),ti=SHAPES.indexOf(to);if(fi===-1||ti===-1)return null;return ti===(fi+1)%5?'fwd':ti===(fi+4)%5?'bwd':null;}
  function nextCagedComplete(){
    if(cagedVisited.size>=35){cagedCompletedAll=true;document.getElementById('cagedCompleteBadge').classList.add('visible');return false;}
    let candidates=[];
    const tryShapes=sl=>{sl.forEach(s=>{for(let d=1;d<=7;d++){if(!cagedVisited.has(s+d))candidates.push({shape:s,degree:d});}});};
    tryShapes(NEAR[cagedShape]);if(candidates.length===0)tryShapes(SHAPES.filter(s=>s!==cagedShape));if(candidates.length===0)return false;
    const pick=candidates[Math.floor(Math.random()*candidates.length)];prevShape=cagedShape;cagedShape=pick.shape;cagedDegree=pick.degree;cagedVisited.add(cagedShape+cagedDegree);updateCagedGrid();return true;
  }
  function nextCagedEndless(){const nears=NEAR[cagedShape];prevShape=cagedShape;cagedShape=nears[Math.floor(Math.random()*nears.length)];const opts=[];for(let d=-2;d<=2;d++){const nd=cagedDegree+d;if(nd>=1&&nd<=7&&nd!==cagedDegree)opts.push(nd);}cagedDegree=opts[Math.floor(Math.random()*opts.length)]||cagedDegree;}
  function updateCagedDisplay(){
    const se=document.getElementById('cagedShape');se.textContent=cagedShape;se.classList.remove('pop');void se.offsetWidth;se.classList.add('pop');
    const de=document.getElementById('cagedDegree');de.textContent=cagedDegree;de.classList.remove('pop');void de.offsetWidth;de.classList.add('pop');
    document.getElementById('cagedSub').textContent='forma '+cagedShape+'  ·  grado '+cagedDegree;
    if(cagedMode==='complete'){updateCagedGrid();updateArrow();}
  }
  function updateArrow(){
    const aL=document.getElementById('cagedArrowLeft'),aR=document.getElementById('cagedArrowRight');
    aL.className='caged-arrow hidden';aR.className='caged-arrow hidden';
    if(!showArrows||prevShape===null||cagedMode!=='complete')return;
    const dir=getDirection(prevShape,cagedShape);
    if(dir==='fwd'){aR.className='caged-arrow fwd';aR.textContent='→';}
    else if(dir==='bwd'){aL.className='caged-arrow bwd';aL.textContent='←';}
  }
  function buildCagedGrid(){const wrap=document.getElementById('cagedProgressWrap');wrap.innerHTML='';if(cagedMode!=='complete')return;const header=document.createElement('div');header.className='caged-prog-header';SHAPES.forEach(s=>{const sp=document.createElement('span');sp.textContent=s;header.appendChild(sp);});wrap.appendChild(header);for(let d=1;d<=7;d++){const row=document.createElement('div');row.className='caged-prog-row';const lbl=document.createElement('div');lbl.className='caged-prog-label';lbl.textContent=d;row.appendChild(lbl);const cells=document.createElement('div');cells.className='caged-prog-cells';SHAPES.forEach(s=>{const cell=document.createElement('div');cell.className='caged-cell';cell.id='cc_'+s+d;cells.appendChild(cell);});row.appendChild(cells);wrap.appendChild(row);}}
  function updateCagedGrid(){SHAPES.forEach(s=>{for(let d=1;d<=7;d++){const cell=document.getElementById('cc_'+s+d);if(!cell)continue;const key=s+d,isCurrent=(s===cagedShape&&d===cagedDegree);cell.classList.remove('done','current');if(cagedVisited.has(key)&&!isCurrent)cell.classList.add('done');else if(isCurrent)cell.classList.add('current');}});}
  function initCagedSession(){cagedVisited=new Set();cagedCompletedAll=false;prevShape=null;document.getElementById('cagedCompleteBadge').classList.remove('visible');document.getElementById('cagedArrowLeft').className='caged-arrow hidden';document.getElementById('cagedArrowRight').className='caged-arrow hidden';cagedShape=SHAPES[Math.floor(Math.random()*5)];cagedDegree=Math.floor(Math.random()*7)+1;if(cagedMode==='complete')cagedVisited.add(cagedShape+cagedDegree);currentBar=0;buildCagedGrid();updateCagedDisplay();}
  function fireCaged(){if(cagedMode==='endless'){nextCagedEndless();updateCagedDisplay();}else{if(cagedCompletedAll)return;if(!nextCagedComplete())return;updateCagedDisplay();}}

  // Pendulum — estrella animada
  const pCanvas=document.getElementById('pendulumCanvas');
  const PW=220,PH=200,CX=110,CY=100,ARM=80;
  let pendAngle=0,pendVel=0,pendTarget=0,pendRunning=false,pendRaf=null,lastPendTime=null;
  let starAngle=0,starScale=1,starGlow=0,centerFlash=0,prevSide=0;
  const STAR_COLORS_M=['#C9A84C','#4a9eff','#D4537E','#4ade80','#EF9F27'];
  let starColorIdx=0;

  function setPendulumTarget(beat){pendTarget=((beat%2===0)?1:-1)*0.58;}

  function drawPendulum(ts){
    pendRaf=requestAnimationFrame(drawPendulum);
    const pCv=document.getElementById('pendulumCanvas');if(!pCv)return;
    pCv.width=PW;pCv.height=PH;
    const ctx=pCv.getContext('2d');
    const dt=lastPendTime?Math.min((ts-lastPendTime)/1000,.05):.016;lastPendTime=ts;
    if(pendRunning){
      const acc=-20*(pendAngle-pendTarget)-6*pendVel;pendVel+=acc*dt;pendAngle+=pendVel*dt;
      const side=pendAngle>0?1:-1;
      if(side!==prevSide){centerFlash=1;starColorIdx=(starColorIdx+1)%STAR_COLORS_M.length;}
      prevSide=side;
    } else {
      pendAngle+=(-pendAngle*10-pendVel*5)*dt;pendVel+=(-pendAngle*10-pendVel*5)*dt*.5;
      if(Math.abs(pendAngle)<.001&&Math.abs(pendVel)<.001){pendAngle=0;pendVel=0;}
    }
    centerFlash*=.85;starGlow*=.9;
    starAngle+=3+Math.abs(pendVel)*8;
    starScale=1+.12*Math.sin(ts*.002)+starGlow*.4+centerFlash*.3;
    const bobX=CX+Math.sin(pendAngle)*ARM;
    const bobY=CY-20+Math.cos(pendAngle)*ARM*.3;
    const speed=Math.abs(pendVel);
    const col=STAR_COLORS_M[starColorIdx];
    const colNext=STAR_COLORS_M[(starColorIdx+1)%STAR_COLORS_M.length];
    ctx.clearRect(0,0,PW,PH);
    // Guide lines
    ctx.beginPath();ctx.moveTo(CX,20);ctx.lineTo(CX,PH-20);ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.arc(CX,CY-20,ARM*.3,Math.PI*.2,Math.PI*.8);ctx.strokeStyle='rgba(255,255,255,.03)';ctx.lineWidth=1;ctx.stroke();
    // Arm
    const armGrad=ctx.createLinearGradient(CX,CY-20,bobX,bobY);
    armGrad.addColorStop(0,'rgba(100,100,100,.3)');armGrad.addColorStop(1,col+'80');
    ctx.beginPath();ctx.moveTo(CX,CY-20);ctx.lineTo(bobX,bobY);ctx.strokeStyle=armGrad;ctx.lineWidth=2;ctx.lineCap='round';ctx.stroke();
    // Pivot
    ctx.beginPath();ctx.arc(CX,CY-20,4,0,Math.PI*2);ctx.fillStyle='#3a3a38';ctx.fill();
    // Motion trail
    const trailN=Math.floor(speed*5);
    for(let i=trailN;i>0;i--){
      const ta=pendAngle-pendVel*dt*i*2;
      const tx=CX+Math.sin(ta)*ARM,ty=CY-20+Math.cos(ta)*ARM*.3;
      const alpha=.04*(1-i/trailN);
      ctx.beginPath();ctx.arc(tx,ty,14,0,Math.PI*2);
      ctx.fillStyle=col+(Math.floor(alpha*255).toString(16).padStart(2,'0'));ctx.fill();
    }
    // Center flash halo
    if(centerFlash>0.05){
      const halo=ctx.createRadialGradient(CX,PH/2,0,CX,PH/2,60*centerFlash);
      halo.addColorStop(0,col+(Math.floor(centerFlash*60).toString(16).padStart(2,'0')));
      halo.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath();ctx.arc(CX,PH/2,60*centerFlash,0,Math.PI*2);ctx.fillStyle=halo;ctx.fill();
    }
    // Rays
    const rayCount=8;
    for(let r=0;r<rayCount;r++){
      const rayAngle=(r/rayCount)*Math.PI*2+(starAngle*Math.PI/180);
      const rayLen=20+speed*6+starGlow*20;
      const x1=bobX+Math.cos(rayAngle)*(16*starScale);
      const y1=bobY+Math.sin(rayAngle)*(16*starScale);
      const rayGrad=ctx.createLinearGradient(x1,y1,bobX+Math.cos(rayAngle)*rayLen,bobY+Math.sin(rayAngle)*rayLen);
      rayGrad.addColorStop(0,col+'cc');rayGrad.addColorStop(1,col+'00');
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(bobX+Math.cos(rayAngle)*rayLen,bobY+Math.sin(rayAngle)*rayLen);
      ctx.strokeStyle=rayGrad;ctx.lineWidth=1.5+centerFlash*2;ctx.lineCap='round';ctx.stroke();
    }
    // Glow layers
    [40,25,14].forEach((gr,gi)=>{
      const glowR=gr*starScale*(1+centerFlash*.5);
      const alpha=[.08,.12,.2][gi]*(1+starGlow+centerFlash);
      const g2=ctx.createRadialGradient(bobX,bobY,0,bobX,bobY,glowR);
      g2.addColorStop(0,col+(Math.floor(Math.min(alpha*255,200)).toString(16).padStart(2,'0')));
      g2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath();ctx.arc(bobX,bobY,glowR,0,Math.PI*2);ctx.fillStyle=g2;ctx.fill();
    });
    // Star shape
    ctx.save();ctx.translate(bobX,bobY);ctx.rotate(starAngle*Math.PI/180);ctx.scale(starScale,starScale);
    const outerR=16,innerR=7,points=5;
    ctx.beginPath();
    for(let p=0;p<points*2;p++){const a=(p/points)*Math.PI-Math.PI/2;const rr=p%2===0?outerR:innerR;p===0?ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}
    ctx.closePath();
    const sg=ctx.createRadialGradient(0,-4,1,0,0,outerR);
    sg.addColorStop(0,'#fff');sg.addColorStop(.3,col);sg.addColorStop(1,colNext+'88');
    ctx.fillStyle=sg;ctx.shadowColor=col;ctx.shadowBlur=18+centerFlash*20;ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(-3,-5,4,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fill();
    ctx.restore();
  }
  pendRaf=requestAnimationFrame(drawPendulum);

  function buildMetroDots(){const bd=document.getElementById('metro-beatDots');bd.innerHTML='';for(let i=0;i<beatsPerBar;i++){const d=document.createElement('div');d.className='metro-dot';bd.appendChild(d);}}
  function updateMetroDot(beat){document.getElementById('metro-beatDots').querySelectorAll('.metro-dot').forEach((d,i)=>{d.classList.remove('active-beat','accent');if(i===beat)d.classList.add(beat===0?'accent':'active-beat');});}

  function beep(time,isAccent){
    const actx=ensureAudio();const o=actx.createOscillator(),g=actx.createGain();
    o.connect(g);g.connect(actx.destination);o.type='sine';o.frequency.value=isAccent?880:660;
    g.gain.setValueAtTime(isAccent?.6:.35,time);g.gain.exponentialRampToValueAtTime(.001,time+.06);o.start(time);o.stop(time+.07);
  }
  function schedule(){
    const actx=ensureAudio();const spb=60/metroBpm;
    while(nextTime<actx.currentTime+.1){beep(nextTime,currentBeat===0);beatQueue.push({time:nextTime,beat:currentBeat});currentBeat=(currentBeat+1)%beatsPerBar;nextTime+=spb;}
  }
  function fireRandom(){const n=Math.floor(Math.random()*7)+1;const el=document.getElementById('rndNum');el.textContent=n;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');counts[n-1]++;updateHistogram(n);}
  function drawLoop(){
    animFrame=requestAnimationFrame(drawLoop);
    const now=ensureAudio().currentTime;
    while(beatQueue.length&&beatQueue[0].time<=now){
      const{beat}=beatQueue.shift();updateMetroDot(beat);
      if(currentMetroPanel==='grados'){if(beat===0&&lastBeat!==0)fireRandom();}
      else{if(beat===0){currentBar++;if(currentBar>=barsPerShape){currentBar=0;fireCaged();}}}
      lastBeat=beat;setPendulumTarget(beat);triggerBeatVisual(beat===0);
    }
  }
  function start(){
    ensureAudio();
    if(currentMetroPanel==='caged')initCagedSession();
    currentBeat=0;nextTime=ensureAudio().currentTime+.05;beatQueue=[];lastBeat=-1;buildMetroDots();
    schedInterval=setInterval(schedule,25);animFrame=requestAnimationFrame(drawLoop);pendRunning=true;lastPendTime=null;running=true;
    const pb=document.getElementById('metro-playBtn');pb.innerHTML='&#9646;&#9646;';pb.classList.add('playing');
  }
  function stop(){clearInterval(schedInterval);cancelAnimationFrame(animFrame);beatQueue=[];running=false;lastBeat=-1;pendRunning=false;const pb=document.getElementById('metro-playBtn');pb.innerHTML='&#9654;';pb.classList.remove('playing');updateMetroDot(-1);}
  document.getElementById('metro-playBtn').addEventListener('click',()=>running?stop():start());
  document.getElementById('metro-bpmSlider').addEventListener('input',e=>{metroBpm=parseInt(e.target.value);document.getElementById('metro-bpmVal').textContent=metroBpm;});
  document.getElementById('metro-sigBtns').addEventListener('click',e=>{const b=e.target.closest('.metro-sig-btn');if(!b)return;document.querySelectorAll('.metro-sig-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');beatsPerBar=parseInt(b.dataset.beats);currentBeat=0;buildMetroDots();});
  document.querySelectorAll('.metro-mode-tab').forEach(tab=>{tab.addEventListener('click',()=>{if(running)stop();document.querySelectorAll('.metro-mode-tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.metro-panel').forEach(p=>p.classList.remove('active'));tab.classList.add('active');currentMetroPanel=tab.dataset.mpanel;document.getElementById('mpanel-'+currentMetroPanel).classList.add('active');if(currentMetroPanel==='caged'){buildCagedGrid();document.getElementById('cagedCompleteBadge').classList.remove('visible');}});});
  document.getElementById('dirToggle').addEventListener('click',function(){showArrows=!showArrows;this.textContent=showArrows?'flechas ✓':'flechas';this.classList.toggle('on',showArrows);updateArrow();});
  document.querySelectorAll('.caged-mode-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.caged-mode-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');cagedMode=btn.dataset.cmode;buildCagedGrid();document.getElementById('cagedCompleteBadge').classList.remove('visible');});});
  buildMetroDots();
})();

// ══════════════════════════════════════════════════════
