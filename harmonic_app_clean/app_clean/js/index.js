// ══════════════════════════════════════════════════════
// BACKGROUND PARTICLES
// ══════════════════════════════════════════════════════
(function initBg(){
  const bgCanvas=document.getElementById('bgCanvas');
  const bgCtx=bgCanvas.getContext('2d');
  let particles=[],beatPulse=0,ripples=[];
  const PCOLS=[[201,168,76],[74,158,255],[212,83,126],[74,222,128],[239,159,39]];
  function resize(){bgCanvas.width=window.innerWidth;bgCanvas.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize);
  function spawnParticle(){
    const col=PCOLS[Math.floor(Math.random()*PCOLS.length)];
    return{x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,
      r:1+Math.random()*2.5,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,
      baseAlpha:.05+Math.random()*.18,col,phase:Math.random()*Math.PI*2,speed:.003+Math.random()*.006};
  }
  for(let i=0;i<90;i++)particles.push(spawnParticle());
  function spawnRipple(accent){
    ripples.push({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,
      r:0,alpha:accent?.22:.1,col:accent?[201,168,76]:PCOLS[Math.floor(Math.random()*PCOLS.length)],speed:accent?2.2:1.5});
  }
  function bgLoop(){
    requestAnimationFrame(bgLoop);
    const W=bgCanvas.width,H=bgCanvas.height;
    bgCtx.clearRect(0,0,W,H);
    beatPulse*=.88;
    ripples=ripples.filter(rp=>rp.alpha>.005);
    ripples.forEach(rp=>{rp.r+=rp.speed+beatPulse*2;rp.alpha*=.93;const[r,g,b]=rp.col;bgCtx.beginPath();bgCtx.arc(rp.x,rp.y,rp.r,0,Math.PI*2);bgCtx.strokeStyle=`rgba(${r},${g},${b},${rp.alpha})`;bgCtx.lineWidth=1.5;bgCtx.stroke();});
    const t=performance.now()*.001;
    particles.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;if(p.y<-10)p.y=H+10;if(p.y>H+10)p.y=-10;
      const breath=Math.sin(t*p.speed*30+p.phase)*.5+.5;
      const a=p.baseAlpha*(.5+breath*.5)+beatPulse*.25;
      const radius=p.r*(1+beatPulse*.6);
      const[r,g,b]=p.col;
      const grad=bgCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*3);
      grad.addColorStop(0,`rgba(${r},${g},${b},${a})`);grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
      bgCtx.beginPath();bgCtx.arc(p.x,p.y,radius*3,0,Math.PI*2);bgCtx.fillStyle=grad;bgCtx.fill();
    });
  }
  bgLoop();
  window.triggerBeatVisual=function(accent,sx,sy){
    beatPulse=accent?.75:.35;spawnRipple(accent);if(accent)spawnRipple(accent);
    if(window.Stars)window.Stars.poke(accent,sx,sy);
  };
})();

// ══════════════════════════════════════════════════════
// STAR SYSTEM — física real, colisiones, sin límite
// ══════════════════════════════════════════════════════
window.Stars=(function(){
  const STAR_COLORS=['#C9A84C','#4a9eff','#D4537E','#4ade80','#EF9F27','#fff','#c084fc'];
  let stars=[],sparks=[];
  let starGlobalSize=26,starGlobalSpeed=8,starGlobalShape='★',starGlobalSpin='normal';

  // Canvas de sparks
  const sc=document.createElement('canvas');
  sc.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9;';
  document.body.appendChild(sc);
  const sCtx=sc.getContext('2d');
  function resizeSC(){sc.width=window.innerWidth;sc.height=Math.max(window.innerHeight,document.documentElement.scrollHeight);}
  resizeSC();window.addEventListener('resize',resizeSC);

  function spawnSparks(x,y,col,n){
    for(let i=0;i<(n||14);i++){
      const a=Math.random()*Math.PI*2,spd=2+Math.random()*7;
      sparks.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:.025+Math.random()*.04,r:1.5+Math.random()*3,col});
    }
  }
  function updateSparks(){
    sCtx.clearRect(0,0,sc.width,sc.height);
    sparks=sparks.filter(sp=>{
      sp.x+=sp.vx;sp.y+=sp.vy;sp.vy+=.1;sp.vx*=.97;sp.vy*=.97;sp.life-=sp.decay;
      if(sp.life<=0)return false;
      sCtx.globalAlpha=sp.life;sCtx.fillStyle=sp.col;
      sCtx.beginPath();sCtx.arc(sp.x,sp.y,sp.r*sp.life,0,Math.PI*2);sCtx.fill();
      return true;
    });
    sCtx.globalAlpha=1;
  }

  function getSpinBase(){return starGlobalSpin==='fast'?4:starGlobalSpin==='slow'?.4:starGlobalSpin==='none'?0:1.5;}

  function createStar(){
    const W=window.innerWidth,H=window.innerHeight;
    const el=document.createElement('div');
    el.className='star-el';el.textContent=starGlobalShape;el.style.fontSize=starGlobalSize+'px';
    document.body.appendChild(el);
    const spd=(2+Math.random()*3)*(starGlobalSpeed/5);
    const angle=Math.random()*Math.PI*2;
    const colIdx=Math.floor(Math.random()*STAR_COLORS.length);
    const star={el,colIdx,col:STAR_COLORS[colIdx],
      x:starGlobalSize+Math.random()*(W-starGlobalSize*2),
      y:starGlobalSize+Math.random()*(H-starGlobalSize*2),
      vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,
      r:starGlobalSize*0.6,mass:.8+Math.random()*.4,
      angle:Math.random()*360,spin:getSpinBase(),
      beat:0,phase:Math.random()*Math.PI*2,dragging:false,dragOX:0,dragOY:0};

    // Click: shockwave + sparks + color/forma random
    el.addEventListener('click',e=>{
      e.stopPropagation();
      const cx=star.x+starGlobalSize/2,cy=star.y+starGlobalSize/2;
      stars.forEach(s=>{
        if(s===star)return;
        const dx=(s.x+starGlobalSize/2)-cx,dy=(s.y+starGlobalSize/2)-cy;
        const dist=Math.sqrt(dx*dx+dy*dy)||1;
        const force=Math.min(700/dist,20);
        s.vx+=dx/dist*force;s.vy+=dy/dist*force;s.beat=Math.max(s.beat,.6);
      });
      spawnSparks(cx,cy,star.col,28);
      star.colIdx=(star.colIdx+1+Math.floor(Math.random()*(STAR_COLORS.length-1)))%STAR_COLORS.length;
      star.col=STAR_COLORS[star.colIdx];el.style.color=star.col;
      const shapes=['★','✦','✸','♦','✺','✿','❋','⬟'];
      el.textContent=shapes[Math.floor(Math.random()*shapes.length)];
      star.spin=getSpinBase()*9;star.beat=1;
    });
    el.addEventListener('mousedown',e=>{star.dragging=true;star.dragOX=e.clientX-star.x;star.dragOY=e.clientY-star.y;el.style.cursor='grabbing';e.stopPropagation();});
    el.addEventListener('touchstart',e=>{star.dragging=true;star.dragOX=e.touches[0].clientX-star.x;star.dragOY=e.touches[0].clientY-star.y;e.stopPropagation();},{passive:true});
    stars.push(star);updateCount();return star;
  }

  window.addEventListener('mousemove',e=>{stars.forEach(s=>{if(s.dragging){s.vx=e.clientX-s.dragOX-s.x;s.vy=e.clientY-s.dragOY-s.y;s.x=e.clientX-s.dragOX;s.y=e.clientY-s.dragOY;}});});
  window.addEventListener('mouseup',()=>stars.forEach(s=>{if(s.dragging){s.dragging=false;s.el.style.cursor='grab';}}));
  window.addEventListener('touchmove',e=>{stars.forEach(s=>{if(s.dragging){s.vx=e.touches[0].clientX-s.dragOX-s.x;s.vy=e.touches[0].clientY-s.dragOY-s.y;s.x=e.touches[0].clientX-s.dragOX;s.y=e.touches[0].clientY-s.dragOY;}});},{passive:true});
  window.addEventListener('touchend',()=>stars.forEach(s=>{s.dragging=false;}));

  function removeStar(){if(!stars.length)return;const s=stars.pop();s.el.remove();updateCount();}
  function clearAllStars(){stars.forEach(s=>s.el.remove());stars=[];updateCount();}
  function updateCount(){const el=document.getElementById('starCountDisplay');if(el)el.textContent='★'.repeat(Math.min(stars.length,8))+(stars.length>8?'+':'');}
  function updateAppearance(){const sb=getSpinBase();stars.forEach(s=>{s.el.textContent=starGlobalShape;s.el.style.fontSize=starGlobalSize+'px';s.r=starGlobalSize*.6;s.spin=sb;});}

  function poke(accent,sx,sy){
    stars.forEach(s=>{
      s.beat=accent?1:.4;
      if(sx!=null){
        const dx=(s.x+starGlobalSize/2)-sx,dy=(s.y+starGlobalSize/2)-sy;
        const dist=Math.sqrt(dx*dx+dy*dy)||1;
        const f=(accent?5:2.5)*(220/Math.max(dist,50));
        s.vx+=dx/dist*f;s.vy+=dy/dist*f;
      }
    });
  }

  function starsLoop(t){
    requestAnimationFrame(starsLoop);
    updateSparks();
    const W=window.innerWidth,H=Math.max(window.innerHeight,document.documentElement.scrollHeight);
    const maxSpd=starGlobalSpeed*3;
    // Colisiones
    for(let i=0;i<stars.length;i++){
      for(let j=i+1;j<stars.length;j++){
        const a=stars[i],b=stars[j];
        const sz=a.r+b.r;
        const dx=(b.x+starGlobalSize/2)-(a.x+starGlobalSize/2);
        const dy=(b.y+starGlobalSize/2)-(a.y+starGlobalSize/2);
        const dist=Math.sqrt(dx*dx+dy*dy)||.001;
        if(dist<sz){
          const nx=dx/dist,ny=dy/dist;
          const relV=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
          if(relV>0){
            const imp=relV*1.15;
            const tot=a.mass+b.mass;
            a.vx-=imp*b.mass*nx/tot*2;a.vy-=imp*b.mass*ny/tot*2;
            b.vx+=imp*a.mass*nx/tot*2;b.vy+=imp*a.mass*ny/tot*2;
            const mx=(a.x+b.x)/2+starGlobalSize/2,my=(a.y+b.y)/2+starGlobalSize/2;
            if(Math.random()<.5)spawnSparks(mx,my,a.col,7);
            a.beat=Math.max(a.beat,.5);b.beat=Math.max(b.beat,.5);
          }
          const ov=(sz-dist)/2+1;
          a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;
        }
      }
    }
    stars.forEach(s=>{
      if(s.dragging)return;
      s.beat*=.83;
      const spd=Math.sqrt(s.vx*s.vx+s.vy*s.vy);
      if(spd>maxSpd){s.vx=s.vx/spd*maxSpd;s.vy=s.vy/spd*maxSpd;}
      s.x+=s.vx;s.y+=s.vy;
      // Rebote en todos los bordes reales con micro-boost
      const BW=window.innerWidth, BH=Math.max(window.innerHeight,document.documentElement.scrollHeight);
      if(s.x<0){s.x=0;s.vx=Math.abs(s.vx)*(1.04+Math.random()*.06);}
      if(s.x>BW-starGlobalSize){s.x=BW-starGlobalSize;s.vx=-Math.abs(s.vx)*(1.04+Math.random()*.06);}
      if(s.y<0){s.y=0;s.vy=Math.abs(s.vy)*(1.04+Math.random()*.06);}
      if(s.y>BH-starGlobalSize){s.y=BH-starGlobalSize;s.vy=-Math.abs(s.vy)*(1.04+Math.random()*.06);}
      s.spin+=(getSpinBase()-s.spin)*.07;
      s.angle+=s.spin*(1+s.beat*4);
      const breathe=1+.12*Math.sin(t*.001+s.phase);
      const scale=breathe+s.beat*.65;
      s.el.style.transform=`translate(${s.x}px,${s.y}px) rotate(${s.angle}deg) scale(${scale})`;
      s.el.style.color=s.col;
      s.el.style.filter=`drop-shadow(0 0 ${5+s.beat*16}px ${s.col}) drop-shadow(0 0 ${2+s.beat*5}px #fff8)`;
    });
  }
  requestAnimationFrame(starsLoop);

  document.getElementById('starOptionsBtn').addEventListener('click',()=>{document.getElementById('starOverlay').classList.toggle('open');document.getElementById('starOptionsBtn').classList.toggle('active');});
  document.getElementById('starModalClose').addEventListener('click',()=>{document.getElementById('starOverlay').classList.remove('open');document.getElementById('starOptionsBtn').classList.remove('active');});
  document.getElementById('starOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('starOverlay')){document.getElementById('starOverlay').classList.remove('open');document.getElementById('starOptionsBtn').classList.remove('active');}});
  // Sin límite
  document.getElementById('starAdd').addEventListener('click',()=>createStar());
  document.getElementById('starRemove').addEventListener('click',removeStar);
  document.getElementById('starClear').addEventListener('click',clearAllStars);
  document.getElementById('starSizeSlider').addEventListener('input',e=>{starGlobalSize=parseInt(e.target.value);document.getElementById('starSizeVal').textContent=starGlobalSize;updateAppearance();});
  document.getElementById('starSpeedSlider').addEventListener('input',e=>{
    starGlobalSpeed=parseInt(e.target.value);document.getElementById('starSpeedVal').textContent=starGlobalSpeed;
    stars.forEach(s=>{const spd=(2+Math.random()*3)*(starGlobalSpeed/5);const a=Math.atan2(s.vy,s.vx);s.vx=Math.cos(a)*spd;s.vy=Math.sin(a)*spd;});
  });
  document.getElementById('starShapeBtns').addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(!b)return;document.querySelectorAll('#starShapeBtns .sm-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');starGlobalShape=b.dataset.shape;stars.forEach(s=>s.el.textContent=starGlobalShape);});
  document.getElementById('starSpinBtns').addEventListener('click',e=>{const b=e.target.closest('[data-spin]');if(!b)return;document.querySelectorAll('#starSpinBtns .sm-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');starGlobalSpin=b.dataset.spin;updateAppearance();});
  return{poke,createStar,removeStar,clearAllStars};
})();

// ══════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════
document.querySelectorAll('.main-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.main-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    const panel=document.getElementById('panel-'+tab.dataset.tab);
    if(panel)panel.classList.add('active');
    // Redraw canvases when switching to hf tab
    if(tab.dataset.tab==='hf'){drawHFFretboard();drawHFCaged();}
    if(tab.dataset.tab==='quiz'&&window.QuizCaged)window.QuizCaged.resize();
  });
});

// ══════════════════════════════════════════════════════