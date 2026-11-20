/* =====================================================================
   CRT LAYER: display settings, boot screen, power switch, teletype text,
   afterglow, signal glitches, monitor bezel and sound. Only changes how
   the sheet looks and sounds; it reads S (character) and L (library).
   ===================================================================== */
(function(){
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),root=document.documentElement;
const RM=matchMedia("(prefers-reduced-motion: reduce)");
const sleepFor=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- settings (per browser) ---------- */
const DEF={skin:"crt",theme:"auto",font:"plex",dice:true,ascii:true,ph:"green",scan:true,glass:true,glow:true,tty:true,boot:true,glitch:false,bezel:false,sound:false,vol:40,kb:1,kc:1};
// Every effect below only runs in the Terminal look
const crt=()=>O.skin==="crt";
let O;try{O={...DEF,...JSON.parse(localStorage.getItem("crt-v1")||"{}")}}catch(e){O={...DEF}}
const saveO=()=>{try{localStorage.setItem("crt-v1",JSON.stringify(O))}catch(e){}};
const PH={green:"GREEN PHOSPHOR (P1)",amber:"AMBER PHOSPHOR (P3)",white:"WHITE PHOSPHOR (P4)"};

/* ---------- sound: everything is synthesised, nothing is downloaded ---------- */
const sound=(()=>{let ctx=null,master=null,hum=null;
 function ensure(){if(!O.sound||!crt())return null;
  if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ctx=new AC();master=ctx.createGain();master.connect(ctx.destination)}
  if(ctx.state==="suspended")ctx.resume();master.gain.value=O.vol/100*.6;return ctx}
 function startHum(){if(hum||root.classList.contains("off")||!ensure())return;
  const mk=(f,v)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f;g.gain.value=v;o.connect(g);g.connect(master);o.start();return{o,g}};
  const a=mk(60,.02),b=mk(120,.008),c=mk(15734,.003);   // mains hum, its harmonic, and the flyback whine
  hum={stop(){[a,b,c].forEach(x=>{try{x.o.stop()}catch(e){}x.g.disconnect()})}}}
 function stopHum(){if(hum){hum.stop();hum=null}}
 function click(){if(!ensure())return;const n=Math.floor(ctx.sampleRate*.018),buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,5);
  const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=buf;f.type="bandpass";f.frequency.value=1800+Math.random()*1400;f.Q.value=1.4;g.gain.value=.55;
  s.connect(f);f.connect(g);g.connect(master);s.start()}
 function degauss(){if(!ensure())return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain(),z=ctx.createOscillator(),zg=ctx.createGain();
  o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(36,t+.9);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.9,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+1.1);
  z.type="sawtooth";z.frequency.value=120;zg.gain.setValueAtTime(.1,t);zg.gain.exponentialRampToValueAtTime(.0001,t+.8);
  o.connect(g);g.connect(master);z.connect(zg);zg.connect(master);o.start(t);z.start(t);o.stop(t+1.2);z.stop(t+.9)}
 function sync(){if(!O.sound||!crt()){stopHum();return}if(ctx){master.gain.value=O.vol/100*.6;startHum()}}
 return{ensure,startHum,stopHum,click,degauss,sync,ready:()=>!!ctx}})();
// Browsers only allow audio after a click or key press, so sound starts on the first one
const unlock=()=>{if(O.sound&&crt()&&!sound.ready()){sound.ensure();sound.startHum()}};
document.addEventListener("pointerdown",unlock,true);document.addEventListener("keydown",unlock,true);
document.addEventListener("pointerdown",e=>{if(O.sound&&e.target.closest("button,.btn,.nm,[role=button],select,input[type=checkbox]"))sound.click()});
document.addEventListener("keydown",e=>{if(O.sound&&e.key.length===1&&e.target.matches&&e.target.matches("input,textarea"))sound.click()});

/* ---------- monitor bezel: wraps the screen, holds the power light and knobs ---------- */
const wrap=$(".wrap"),bez=document.createElement("div");bez.className="bezel";wrap.before(bez);bez.append(wrap);
bez.insertAdjacentHTML("beforeend",`<div class="bezel-bar"><span class="badge">Traveller-80 · Monochrome</span>
 <span class="knobs"><label class="knob">Brightness<input type="range" min="0.6" max="1.4" step="0.02" data-opt="kb" aria-label="Screen brightness"></label>
 <label class="knob">Contrast<input type="range" min="0.6" max="1.6" step="0.02" data-opt="kc" aria-label="Screen contrast"></label></span>
 <span><span class="pwrled" aria-hidden="true"></span><button id="pwr3">Power</button></span></div>`);

function apply(){
 if(crt())root.dataset.skin="crt";else delete root.dataset.skin;
 if(O.theme==="light"||O.theme==="dark")root.dataset.theme=O.theme;else delete root.dataset.theme;
 root.dataset.phosphor=O.ph;root.dataset.font=O.font;root.classList.toggle("no-scan",!O.scan);root.classList.toggle("fx-glass",!!O.glass);root.classList.toggle("fx-bezel",!!O.bezel);
 root.style.setProperty("--knob-b",O.kb);root.style.setProperty("--knob-c",O.kc);
 $$("[data-opt]").forEach(i=>{const v=O[i.dataset.opt];if(i.type==="checkbox")i.checked=!!v;else if(String(i.value)!==String(v))i.value=v});
 sound.sync();if(typeof renderAscii==="function")renderAscii()}
function onOpt(e){const t=e.target,k=t.dataset&&t.dataset.opt;if(!k)return;
 O[k]=t.type==="checkbox"?t.checked:t.tagName==="SELECT"?t.value:+t.value;apply();saveO();
 if(k==="skin"){
  // Leaving the terminal: stop anything mid-flight. Entering it: switch the screen on
  if(!crt()){root.classList.remove("off","powering");wrap.inert=false;$$(".tty-on").forEach(stopTyping);$$(".flash").forEach(x=>x.classList.remove("flash"))}
  else if(O.boot&&!RM.matches)boot();else replayWrap()}
 if(k==="sound"&&O.sound){sound.ensure();sound.degauss();sound.startHum()}
 if(k==="glitch"&&O.glitch)glitch();
 if(k==="tty"&&!O.tty)$$(".tty-on").forEach(stopTyping)}
document.addEventListener("change",onOpt);
document.addEventListener("input",e=>{if(e.target.type==="range")onOpt(e)});

/* ---------- boot screen ---------- */
let booting=null;
function boot(){if(booting)return booting;
 const el=$("#boot"),pre=el.querySelector("pre");let stop=false;
 booting=new Promise(done=>{
  const finish=()=>{if(stop)return;stop=true;el.classList.remove("on");document.removeEventListener("keydown",skip,true);el.removeEventListener("click",skip);booting=null;replayWrap();done()};
  const skip=e=>{e.preventDefault();e.stopPropagation();finish()};
  document.addEventListener("keydown",skip,true);el.addEventListener("click",skip);
  el.classList.add("on");pre.textContent="";sound.degauss();
  const lib=typeof L!=="undefined"&&L.all?Object.keys(L.all).length:0,who=(typeof S!=="undefined"&&S.name||"UNNAMED").toUpperCase();
  const fast=RM.matches,wait=ms=>fast?Promise.resolve():sleepFor(ms);
  (async()=>{const put=s=>{pre.textContent+=s},base=()=>pre.textContent;
   put("TRAVELLER SYSTEMS   BIOS v2.04   (C) 1983\n\n");await wait(220);if(stop)return;
   put("CPU    8088-2 @ 4.77 MHz ............ OK\n");await wait(160);if(stop)return;
   const b0=base();for(let k=0;k<=640;k+=32){pre.textContent=b0+`MEMORY ${String(k).padStart(3," ")}K `+(k===640?"OK\n":"");await wait(18);if(stop)return}
   put(`VIDEO  MONOCHROME / ${PH[O.ph]}\n`);await wait(160);if(stop)return;
   put(`LIB    ${lib} ${lib===1?"ENTRY":"ENTRIES"} IN STORE\n\n`);await wait(160);if(stop)return;
   const b1=base();for(let k=0;k<=20;k++){pre.textContent=b1+"LOADING CHARSHEET.EXE  ["+"#".repeat(k)+".".repeat(20-k)+"]\n";await wait(22);if(stop)return}
   put(`\nOPERATIVE  ${who}\nREADY.\n> `);await wait(fast?0:520);finish()})()});
 return booting}
function replayWrap(){wrap.style.animation="none";void wrap.offsetWidth;wrap.style.animation=""}

/* ---------- power switch ---------- */
function powerOff(){if(root.classList.contains("off")||root.classList.contains("powering"))return;
 root.classList.add("powering");sound.stopHum();
 setTimeout(()=>{root.classList.remove("powering");root.classList.add("off");wrap.inert=true;$("#pwron").focus()},RM.matches?0:560)}
function powerOn(){if(!root.classList.contains("off"))return;root.classList.remove("off");wrap.inert=false;
 if(O.sound)sound.startHum();
 if(O.boot)boot();else{sound.degauss();replayWrap()}}
document.addEventListener("click",e=>{const id=e.target.closest("button")&&e.target.closest("button").id;
 if(id==="pwr"||id==="pwr2"||id==="pwr3")powerOff();
 else if(id==="pwron")powerOn();
 else if(id==="reboot")boot();
 else if(id==="optreset"){O={...DEF,skin:O.skin,theme:O.theme,sound:O.sound,vol:O.vol};apply();saveO()}});

/* ---------- teletype: roll results print out a character at a time ---------- */
// Timers rather than animation frames, so text still finishes printing in a background tab
function stopTyping(el){const j=el._tty;if(!j)return;clearTimeout(j.id);j.restore();el._tty=null;el.classList.remove("tty-on")}
function typeOut(el){if(!crt()||!O.tty||RM.matches)return;stopTyping(el);
 const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];while(w.nextNode())nodes.push(w.currentNode);
 const full=nodes.map(n=>n.nodeValue),total=full.reduce((a,s)=>a+s.length,0);if(!total)return;
 nodes.forEach(n=>n.nodeValue="");el.classList.add("tty-on");
 const dur=Math.min(650,total*16),t0=performance.now(),job={id:0,last:0,restore:()=>nodes.forEach((n,i)=>n.nodeValue=full[i])};el._tty=job;
 // While the dice are still tumbling, the result waits for them to land
 const frame=()=>{if(el._tty!==job)return;const start=Math.max(t0,tumbleUntil),shown=Math.min(total,Math.max(0,Math.ceil((performance.now()-start)/dur*total)));let left=shown;
  nodes.forEach((n,i)=>{const take=Math.max(0,Math.min(full[i].length,left));n.nodeValue=full[i].slice(0,take);left-=take});
  if(O.sound&&Math.floor(shown/4)>Math.floor(job.last/4))sound.click();job.last=shown;
  if(shown<total)job.id=setTimeout(frame,16);else{el._tty=null;el.classList.remove("tty-on")}};
 job.id=setTimeout(frame,16)}
const ttyMo=new MutationObserver(recs=>new Set(recs.map(r=>r.target)).forEach(typeOut));
["#roll","#atk","#dicer","#rmsg","#msg","#lmsg"].forEach(s=>{const el=$(s);if(el)ttyMo.observe(el,{childList:true})});
// The roll log re-renders often; only a new top entry prints out
// A new top entry is also a new roll, so the dice tumble for it
let lastRoll=null;
const logMo=new MutationObserver(recs=>{let fresh=false;new Set(recs.map(r=>r.target)).forEach(el=>{const row=el.querySelector(".rl"),t=row?row.textContent:"";
 if(t!==el._first){el._first=t;if(row){fresh=true;typeOut(row)}}});
 const top=typeof S!=="undefined"&&S.rolls[0];if(fresh&&top&&top!==lastRoll){lastRoll=top;tumble(top)}});
$$("[data-rlog]").forEach(el=>{const r=el.querySelector(".rl");el._first=r?r.textContent:"";logMo.observe(el,{childList:true})});
// Switching tabs draws the new section in from the top, like a slow refresh
document.addEventListener("click",e=>{if(!e.target.closest("[data-go],[data-open]")||!crt()||!O.tty||RM.matches)return;
 $$("[data-tab]").forEach(el=>{if(el.hidden)return;el.classList.remove("drawin");void el.offsetWidth;el.classList.add("drawin")})});

/* ---------- rolling dice: an ASCII die tumbles in a tray, then lands on the result ---------- */
let tumbleUntil=0;
const tray=document.createElement("div");tray.id="dicetray";tray.setAttribute("aria-hidden","true");tray.innerHTML="<pre></pre>";document.body.append(tray);
const center=(s,w)=>{s=String(s).slice(0,w);const l=Math.floor((w-s.length)/2);return " ".repeat(l)+s+" ".repeat(w-s.length-l)};
const PIPS=[["       ","   o   ","       "],["  o    ","       ","    o  "],["  o    ","   o   ","    o  "],["  o o  ","       ","  o o  "],["  o o  ","   o   ","  o o  "],["  o o  ","  o o  ","  o o  "]];
const DIE={
 box:(a,b,c)=>[" .-------. "," |"+a+"| "," |"+b+"| "," |"+c+"| "," '-------' "],
 tilt:()=>["   .-----. ","  / o   /| "," '-----' o| "," |  o  | / "," '-----'/  "],
 diamond:n=>["     /\\    ","   /    \\  "," <"+center(n,7)+">  ","   \\    /  ","     \\/    "],
 side:()=>["  .-----.  "," /     /|  ",".-----. o| ","| o o | /  ","'-----'/   "]};
const rnd=n=>1+Math.floor(Math.random()*n);
// What to show when the die lands, from the roll log entry sheet.js just added
function landing(e){
 if(e.k==="dice")return{n:e.t,a:"TOTAL",b:""};
 if(e.k==="cast")return e.dmg==null?null:{n:e.dmg,a:"DAMAGE",b:""};
 const ok=!!e.ok,atk=e.k==="atk";
 return{n:e.d,a:`${e.d} ${ok?"<=":">"} ${e.v}`,b:atk?(ok?"HIT":"MISS")+(e.dmg!=null?` ${e.dmg} DMG`:""):(ok?"SUCCESS":"FAILURE"),bad:!ok}}
function tumble(e){if(!crt()||!O.dice||RM.matches)return;const L=landing(e);if(!L)return;
 const pre=tray.firstChild,big=e.k==="dice"||e.k==="cast"?99:100,frames=[];
 for(let i=0;i<9;i++){const k=i%4;frames.push(k===0?DIE.box(...PIPS[rnd(6)-1]):k===1?DIE.tilt():k===2?DIE.diamond(rnd(big)):DIE.side())}
 const step=70,dur=frames.length*step;tumbleUntil=performance.now()+dur;
 clearTimeout(tray._t);tray.className="on rolling";let i=0;
 const next=()=>{if(i<frames.length){pre.textContent=frames[i++].join("\n");tray.style.setProperty("--jx",(Math.random()*10-5)+"px");tray.style.setProperty("--jr",(Math.random()*16-8)+"deg");
   if(O.sound)sound.click();tray._t=setTimeout(next,step);return}
  // Landed: the result face, with the verdict underneath
  pre.textContent=DIE.box("       ",center(L.n,7),"       ").join("\n")+"\n"+center(L.a,11)+(L.b?"\n"+center(L.b,11):"");
  tray.className="on landed"+(L.bad?" bad":"");tray._t=setTimeout(()=>{tray.className="";},1700)};
 next()}

/* ---------- ASCII portraits: the uploaded portrait redrawn in characters ---------- */
const port=$(".port"),apre=document.createElement("pre");apre.className="asciiport";apre.setAttribute("aria-hidden","true");port.prepend(apre);
const RAMP=" .,:;-=+*#%@";let asciiFor=null;
function renderAscii(){const src=typeof S!=="undefined"?S.portrait:"",want=crt()&&O.ascii&&!!src;
 port.classList.toggle("has-ascii",want);root.classList.toggle("fx-ascii",want);if(!want||src===asciiFor)return fitAscii();asciiFor=src;
 const im=new Image();im.onload=()=>{if(asciiFor!==src)return;const cols=48,rows=Math.max(8,Math.round(cols*im.height/im.width*.55));
  const c=document.createElement("canvas");c.width=cols;c.height=rows;const x=c.getContext("2d");x.drawImage(im,0,0,cols,rows);
  const d=x.getImageData(0,0,cols,rows).data,Ls=[];let lo=255,hi=0;
  for(let p=0;p<d.length;p+=4){const l=.299*d[p]+.587*d[p+1]+.114*d[p+2];Ls.push(l);if(l<lo)lo=l;if(l>hi)hi=l}
  let s="";for(let y=0;y<rows;y++){for(let q=0;q<cols;q++){const v=(Ls[y*cols+q]-lo)/Math.max(1,hi-lo);s+=RAMP[Math.min(RAMP.length-1,Math.floor(v*RAMP.length))]}s+="\n"}
  apre.textContent=s;apre.dataset.cols=cols;fitAscii()};im.src=src}
// Size the characters so the art fills the portrait frame's width
function fitAscii(){if(!port.classList.contains("has-ascii"))return;const w=port.clientWidth,cols=+apre.dataset.cols||48;if(w)apre.style.fontSize=(w/(cols*.6))+"px"}
new ResizeObserver(fitAscii).observe(port);

/* ---------- afterglow: a changed number flashes bright, then fades ---------- */
const GLOW=".eff,.pill b,.pts b,#pool,#fpts,#cap,#load,#armtot,.tl b,[data-pct],#m-name,#m-lvl,#m-oc,#m-hp";
const lastText=new WeakMap(),pend=new Set();let raf=0;
const glowMo=new MutationObserver(recs=>{
 for(const r of recs){let el=r.target.nodeType===3?r.target.parentElement:r.target;el=el&&el.closest&&el.closest(GLOW);if(el)pend.add(el)}
 if(!raf)raf=setTimeout(()=>{raf=0;pend.forEach(el=>{const t=el.textContent;
  if(crt()&&O.glow&&!RM.matches&&lastText.has(el)&&lastText.get(el)!==t){el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash")}
  lastText.set(el,t)});pend.clear()})});
$$(GLOW).forEach(el=>lastText.set(el,el.textContent));
glowMo.observe(wrap,{childList:true,characterData:true,subtree:true});

/* ---------- signal glitches, every 20 to 40 seconds ---------- */
function glitch(){if(RM.matches||root.classList.contains("off"))return;const band=$(".crt-band");
 band.style.top=(8+Math.random()*80)+"vh";band.classList.add("on");wrap.classList.remove("glitch");void wrap.offsetWidth;wrap.classList.add("glitch");
 if(O.sound)sound.click();setTimeout(()=>{band.classList.remove("on");wrap.classList.remove("glitch")},300)}
(function schedule(){setTimeout(()=>{if(crt()&&O.glitch&&!document.hidden)glitch();schedule()},20000+Math.random()*20000)})();

/* ---------- MOTD banner, kept in step with the open character ---------- */
const el=id=>document.getElementById(id),pad=n=>String(n).padStart(2,"0");
function tick(){const d=new Date(),c=typeof S!=="undefined"?S:null;renderAscii();
 el("m-date").textContent=`${d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${d.getFullYear()}`;
 if(!c)return;
 const set=(id,v)=>{v=String(v);if(el(id).textContent!==v)el(id).textContent=v};
 set("m-name",(c.name||"UNNAMED").toUpperCase());set("m-lvl",c.level);
 set("m-oc",`${c.origin||"—"} / ${c.career||"—"}`);set("m-hp",`${c.hp} / ${c.maxHp}${c.hp<=0?"  ** DYING **":""}`)}

/* ---------- start ---------- */
apply();tick();setInterval(tick,1000);
let seen=false;try{seen=!!sessionStorage.getItem("crt-booted");sessionStorage.setItem("crt-booted","1")}catch(e){}
if(crt()&&O.boot&&!seen&&!RM.matches)boot();
})();
