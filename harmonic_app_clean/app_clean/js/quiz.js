// MODULE: QUIZ CAGED — encuentra la nota dentro de cada forma
// ══════════════════════════════════════════════════════
window.QuizCaged=(function(){
  // Mismas 5 formas que harmonic.js (tonalidad de C, [string, fret, semitono])
  const POS_DATA=[
    {name:'C',color:'#4a9eff',notes:[[5,0,4],[5,1,5],[5,3,7],[4,2,11],[4,3,0],[3,0,2],[3,2,4],[3,3,5],[2,0,7],[2,2,9],[2,4,11],[1,0,11],[1,1,0],[1,3,2],[0,0,4],[0,1,5],[0,3,7]]},
    {name:'A',color:'#4ade80',notes:[[5,3,7],[5,5,9],[4,2,11],[4,3,0],[4,5,2],[3,3,5],[3,5,7],[2,2,9],[2,4,11],[2,5,0],[1,3,2],[1,5,4],[0,3,7],[0,5,9]]},
    {name:'G',color:'#C9A84C',notes:[[5,5,9],[5,7,11],[5,8,0],[4,5,2],[4,7,4],[4,8,5],[3,5,7],[3,7,9],[2,4,11],[2,5,0],[2,7,2],[1,5,4],[1,6,5],[1,8,7],[0,5,9],[0,7,11],[0,8,0]]},
    {name:'E',color:'#EF9F27',notes:[[5,8,0],[5,10,2],[4,7,4],[4,8,5],[4,10,7],[3,7,9],[3,9,11],[3,10,0],[2,7,2],[2,9,4],[2,10,5],[1,8,7],[1,10,9],[0,8,0],[0,10,2]]},
    {name:'D',color:'#D4537E',notes:[[5,10,2],[5,12,4],[4,10,7],[4,12,9],[3,9,11],[3,10,0],[3,12,2],[2,9,4],[2,10,5],[2,12,7],[1,10,9],[1,12,11],[1,13,0],[0,10,2],[0,12,4]]}
  ];
  const SHAPE_ORDER=['C','A','G','E','D'];
  const FRET_PAD=2; // margen de trastes alrededor del rango de la forma

  let shapeIdx=0,running=false;
  let targetNote=null,targetCells=[],hits=0,total=0,streak=0;
  let lastResult=null; // {strIdx,fret,correct}
  let canvasMeta=null;

  function currentPos(){return POS_DATA[shapeIdx];}

  function fretRange(pos){
    const frets=pos.notes.map(n=>n[1]);
    return{min:Math.max(0,Math.min(...frets)-FRET_PAD),max:Math.max(...frets)+FRET_PAD};
  }

  function pickTarget(){
    const pos=currentPos();
    // Elegir una nota (semitono) presente en la forma actual
    const semitones=[...new Set(pos.notes.map(n=>n[2]))];
    const semi=semitones[Math.floor(Math.random()*semitones.length)];
    targetNote=noteName(semi);
    targetCells=pos.notes.filter(n=>n[2]===semi).map(([s,f])=>({str:s,fret:f}));
    lastResult=null;
    const tn=document.getElementById('quizTargetNote');
    tn.textContent=targetNote;tn.classList.remove('pop');void tn.offsetWidth;tn.classList.add('pop');
    const fb=document.getElementById('quizFeedback');
    fb.textContent='toca la casilla correcta en el diapasón';fb.className='quiz-feedback';
    document.getElementById('quizShapeBadge').textContent=pos.name;
    draw();
  }

  function updateScore(){
    document.getElementById('quizScore').textContent=hits+' / '+total;
    document.getElementById('quizStreak').textContent='racha: '+streak;
  }

  function nextShape(){shapeIdx=(shapeIdx+1)%SHAPE_ORDER.length;}

  function handleAnswer(strIdx,fret){
    if(!running||!targetNote)return;
    total++;
    const correct=targetCells.some(c=>c.str===strIdx&&c.fret===fret);
    lastResult={strIdx,fret,correct};
    const fb=document.getElementById('quizFeedback');
    if(correct){
      hits++;streak++;
      fb.textContent='✓ correcto — '+targetNote;fb.className='quiz-feedback correct';
      if(streak>0&&streak%4===0)nextShape();
      updateScore();draw();
      setTimeout(()=>{if(running)pickTarget();},650);
    }else{
      streak=0;
      fb.textContent='✗ esa no era — la correcta se marca en verde';fb.className='quiz-feedback wrong';
      updateScore();draw();
      setTimeout(()=>{if(running)pickTarget();},1100);
    }
  }

  function draw(){
    const canvas=document.getElementById('quizCanvas');
    if(!canvas)return;
    const DPR=window.devicePixelRatio||1;
    const W=Math.max(360,canvas.parentElement.clientWidth-16);
    const H=190;
    canvas.width=W*DPR;canvas.height=H*DPR;
    canvas.style.width=W+'px';canvas.style.height=H+'px';
    const ctx=canvas.getContext('2d');ctx.scale(DPR,DPR);ctx.clearRect(0,0,W,H);

    const pos=currentPos();
    const range=fretRange(pos);
    const nFrets=range.max-range.min;
    const PAD_L=34,PAD_R=12,PAD_T=28,PAD_B=30;
    const{fretW,strH}=drawFretboardBase(ctx,W,H,PAD_L,PAD_R,PAD_T,PAD_B);
    // drawFretboardBase dibuja FRET_COUNT trastes completos; reescalamos visualmente solo el rango usado.
    // En vez de reusar esa base genérica (pensada para 24 trastes), dibujamos un mástil propio acotado al rango.
    ctx.clearRect(0,0,W,H);
    const fw=(W-PAD_L-PAD_R)/nFrets,sh=(H-PAD_T-PAD_B)/(STRING_COUNT-1);
    const wood=ctx.createLinearGradient(PAD_L,0,W-PAD_R,0);wood.addColorStop(0,'#1a120a');wood.addColorStop(.5,'#221508');wood.addColorStop(1,'#1a120a');
    ctx.fillStyle=wood;ctx.beginPath();ctx.roundRect(PAD_L,PAD_T-6,W-PAD_L-PAD_R,H-PAD_T-PAD_B+12,4);ctx.fill();
    for(let f=0;f<=nFrets;f++){
      const realFret=range.min+f;
      const x=PAD_L+f*fw;
      ctx.beginPath();ctx.moveTo(x,PAD_T-6);ctx.lineTo(x,H-PAD_B+6);
      ctx.strokeStyle=realFret===0?'#c0a060':'#4a4a48';ctx.lineWidth=realFret===0?3:.8;ctx.stroke();
    }
    [3,5,7,9,12,15,17,19,21,24].forEach(f=>{
      if(f<range.min||f>range.max)return;
      const x=PAD_L+(f-range.min-.5)*fw;
      if(f===12||f===24){[H/2-10,H/2+10].forEach(y=>{ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#3a3220';ctx.fill();});}
      else{ctx.beginPath();ctx.arc(x,H/2,3,0,Math.PI*2);ctx.fillStyle='#3a3220';ctx.fill();}
      ctx.fillStyle='#5a5040';ctx.font='7px JetBrains Mono';ctx.textAlign='center';ctx.fillText(f,x,H-PAD_B+22);
    });
    for(let s=0;s<STRING_COUNT;s++){
      const y=PAD_T+s*sh;
      ctx.beginPath();ctx.moveTo(PAD_L,y);ctx.lineTo(W-PAD_R,y);
      ctx.strokeStyle=`rgba(200,180,120,${.3+s*.1})`;ctx.lineWidth=.5+s*.3;ctx.stroke();
    }
    ctx.font='8px JetBrains Mono';ctx.textAlign='center';
    STRINGS_DISPLAY.forEach((midi,s)=>{ctx.fillStyle='#7a7060';ctx.fillText(NOTES[midi%12],PAD_L-16,PAD_T+s*sh+3);});

    // Celdas clicables invisibles + feedback visual
    canvasMeta={W,H,PAD_L,fw,sh,PAD_T,range};

    if(lastResult){
      // marcar la elección del usuario
      const{strIdx,fret,correct}=lastResult;
      if(fret>=range.min&&fret<=range.max){
        const x=PAD_L+(fret-range.min-.5)*fw,y=PAD_T+strIdx*sh;
        ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);
        ctx.fillStyle=correct?'#2a4':'#a33';ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.stroke();
      }
      if(!correct){
        // mostrar todas las posiciones correctas en verde
        targetCells.forEach(c=>{
          if(c.fret<range.min||c.fret>range.max)return;
          const x=PAD_L+(c.fret-range.min-.5)*fw,y=PAD_T+c.str*sh;
          ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);
          ctx.fillStyle='#1a3a1a';ctx.fill();ctx.strokeStyle='#4ade80';ctx.lineWidth=1.5;ctx.stroke();
        });
      }
    }
  }

  function onCanvasClick(e){
    if(!running||!canvasMeta)return;
    const canvas=document.getElementById('quizCanvas');
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    const{PAD_L,fw,sh,PAD_T,range}=canvasMeta;
    let bestStr=-1,bestFret=-1,bestDist=Infinity;
    for(let s=0;s<STRING_COUNT;s++){
      for(let f=range.min;f<=range.max;f++){
        const cx=PAD_L+(f-range.min-.5)*fw,cy=PAD_T+s*sh;
        const d=Math.hypot(cx-x,cy-y);
        if(d<bestDist){bestDist=d;bestStr=s;bestFret=f;}
      }
    }
    if(bestDist<18)handleAnswer(bestStr,bestFret);
  }

  function start(){
    running=true;shapeIdx=0;hits=0;total=0;streak=0;
    updateScore();
    const pb=document.getElementById('quizPlayBtn');pb.innerHTML='&#9646;&#9646;';pb.classList.add('playing');
    pickTarget();
  }
  function stop(){
    running=false;
    const pb=document.getElementById('quizPlayBtn');pb.innerHTML='&#9654;';pb.classList.remove('playing');
    document.getElementById('quizFeedback').textContent='toca play para empezar';
    document.getElementById('quizFeedback').className='quiz-feedback';
    document.getElementById('quizTargetNote').textContent='—';
    targetNote=null;lastResult=null;draw();
  }
  function reset(){stop();hits=0;total=0;streak=0;updateScore();}
  function skip(){if(!running)return;nextShape();pickTarget();}

  document.getElementById('quizPlayBtn').addEventListener('click',()=>running?stop():start());
  document.getElementById('quizResetBtn').addEventListener('click',reset);
  document.getElementById('quizSkipBtn').addEventListener('click',skip);
  document.getElementById('quizCanvas').addEventListener('click',onCanvasClick);
  window.addEventListener('resize',()=>{if(document.getElementById('panel-quiz').classList.contains('active'))draw();});

  draw();updateScore();

  return{resize:draw};
})();
