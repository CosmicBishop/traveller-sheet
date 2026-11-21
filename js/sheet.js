/* Traveller Sheet: the character sheet itself (characters, skills, feats, vis, armory, library, saves). */
const G=[
["Body","BDY","Δ",["Assault Rifles","Feat of Strength","Heavy Firearms","One-Handed","Shotguns","Swimming","Two-Handed","Unarmed"]],
["Dexterity","DEX","Λ",["Lockpicking","Pickpocket","Pistols","SMGs","Throwing"]],
["Agility","AGI","Φ",["Athletics","Dance","Dodge","Evasion","Stealth"]],
["Intelligence","INT","Ψ",["Accounting","Biology","Chemistry","Electronics","Energy Weapons","First Aid","Geology","Hacking","Mechanics","Physics","Zoology"]],
["Perception","PER","Ω",["Crossbows","Deep Search","Locate Trap","Photo & Film","Sniper Rifles"]],
["Willpower","WILL","Җ",["Interrogation","Intimidate","Perform","Persuasion/Fast Talk","Seduction"]]];
const DEF={name:"New character",level:1,attr:{Body:5,Dexterity:5,Agility:5,Intelligence:5,Perception:5,Willpower:5},pts:{},temp:{},feats:""};
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
// String() first: a number or list in imported data must never crash the sheet
const norm=s=>String(s??"").toLowerCase().replace(/[^a-z0-9]/g,"");
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
// Update a container to new HTML in place, keeping existing elements (and focus) where the structure matches
function morphKids(a,b){const ac=[...a.childNodes],bc=[...b.childNodes];
 bc.forEach((n,i)=>i<ac.length?morph(ac[i],n):a.appendChild(n));ac.slice(bc.length).forEach(n=>n.remove())}
function morph(a,b){
 if(a.nodeType!==b.nodeType||a.nodeName!==b.nodeName){a.replaceWith(b);return}
 if(a.nodeType!==1){if(a.nodeValue!==b.nodeValue)a.nodeValue=b.nodeValue;return}
 for(const{name}of[...a.attributes])if(!b.hasAttribute(name))a.removeAttribute(name);
 for(const{name,value}of[...b.attributes])if(a.getAttribute(name)!==value)a.setAttribute(name,value);
 const tv=a.tagName==="TEXTAREA"?b.textContent:null;// read before morphKids moves b's text node into a
 morphKids(a,b);
 if(a.tagName==="INPUT"){const v=b.getAttribute("value")??"";if(a.type==="checkbox")a.checked=b.hasAttribute("checked");else if(a.type!=="file"&&a.value!==v)a.value=v}
 // Once typed in, a textarea ignores its text content, so set what it shows directly
 else if(tv!==null){if(a.value!==tv)a.value=tv}
 else if(a.tagName==="SELECT")a.selectedIndex=Math.max(0,[...a.options].findIndex(o=>o.hasAttribute("selected")))}
function setHTML(el,html){const t=document.createElement("template");t.innerHTML=html;morphKids(el,t.content)}
const mult=n=>n>4?1+(n-4)*.085:n<4?Math.max(.1,1-(4-n)*.1):1;
const clamp=v=>Math.max(5,Math.min(90,v));
const n0=(x,d)=>x==null||isNaN(+x)?d:+x;
// Every character that comes in (storage, a file, pasted text, a share link) passes through fix(),
// which keeps only the expected types: numbers stay numbers and lists hold plain strings or clean objects.
// That stops a hand-edited or malicious file from breaking the sheet or slipping HTML into it.
const fin=(x,d=0)=>{const v=+x;return Number.isFinite(v)?v:d};
const strs=a=>Array.isArray(a)?a.filter(x=>x!=null&&typeof x!=="object").map(String):[];
const obj=o=>o&&typeof o==="object"&&!Array.isArray(o)?o:{};
const numMap=(o,f)=>Object.fromEntries(Object.entries(obj(o)).map(([k,v])=>[k,f(v)]).filter(([,v])=>v!==null));
const fix=o=>(o=obj(o),{name:String(o.name||"Unnamed"),level:Math.max(1,Math.floor(fin(o.level,1))||1),
 attr:{...Object.fromEntries(G.map(g=>[g[0],5])),...numMap(o.attr,v=>fin(v,5))},
 pts:numMap(o.pts,v=>{const n=Math.floor(fin(v));return n>0?n:null}),temp:numMap(o.temp,v=>fin(v)||null),
 feats:String(o.feats??""),career:String(o.career||""),origin:String(o.origin||""),
 got:{feat:strs(obj(o.got).feat),"origin-feature":strs(obj(o.got)["origin-feature"]),"career-feature":strs(obj(o.got)["career-feature"])},
 vis:Object.fromEntries(Object.entries(obj(o.vis)).filter(([,v])=>v&&typeof v==="object").map(([k,v])=>[k,{cur:Math.max(0,fin(v.cur)),max:Math.max(0,fin(v.max,25))}])),
 crucible:String(o.crucible||""),spells:strs(o.spells),
 diff:[-30,-20,-10,0,10,20,30].includes(+o.diff)?+o.diff:0,rolls:Array.isArray(o.rolls)?o.rolls.filter(x=>x&&typeof x==="object").slice(0,10):[],vf:Array.isArray(o.vf)?o.vf.filter(x=>["Aer","Aqua","Ignis","Ordo","Perditio","Terra"].includes(x)):[],hp:Math.max(0,fin(o.hp,0)),
 // maxHp is now the player's own adjustment on top of their origin's HP (default 0). Characters saved before
 // this change (no hpv) kept the old flat default of 20 there, which would now double-count, so it becomes 0.
 // (Any old value, not just 20, was a full max rather than an adjustment, so all of them start again at 0.)
 maxHp:o.hpv===2?fin(o.maxHp,0):0,hpv:2,
 barrier:Math.max(0,fin(o.barrier,0)),armorBase:fin(o.armorBase,0),chemBase:fin(o.chemBase,0),move:fin(o.move,0),init:fin(o.init,0),
 age:String(o.age||""),bg:String(o.bg||""),faction:String(o.faction||""),motive:String(o.motive||""),bio:String(o.bio||""),log:String(o.log||""),// Portraits are only ever embedded images; a web address in an imported file would make the sheet fetch another site
 portrait:/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(String(o.portrait||""))?String(o.portrait):"",showAll:!!o.showAll,
 wpn:(Array.isArray(o.wpn)?o.wpn:[]).filter(x=>x&&typeof x==="object"&&x.name!=null).map(x=>{const w={name:String(x.name),ammo:Math.max(0,Math.floor(fin(x.ammo)))};if(typeof x.type==="string")w.type=x.type;return w}),
 arm:strs(o.arm),conds:strs(o.conds),
 gear:(Array.isArray(o.gear)?o.gear:[]).filter(x=>x&&typeof x==="object").map(g=>g.link!=null?{link:String(g.link),qty:Math.max(0,fin(g.qty,1))}:{name:String(g.name||"Item"),qty:Math.max(0,fin(g.qty,1)),weight:Math.max(0,fin(g.weight))}),
 ammo:Object.fromEntries(Object.entries(o.ammo&&typeof o.ammo==="object"?o.ammo:{}).map(([k,v])=>[k,Math.max(0,Math.floor(+v)||0)])),
 cdur:Object.fromEntries(Object.entries(o.cdur&&typeof o.cdur==="object"?o.cdur:{}).map(([k,v])=>[k,Math.floor(+v)||0]).filter(([,v])=>v>0)),
 journal:Array.isArray(o.journal)?o.journal.filter(x=>x&&typeof x==="object").map(x=>({id:String(x.id||Date.now().toString(36)+Math.random().toString(36).slice(2,6)),
  title:String(x.title||"Untitled"),date:String(x.date||""),tags:String(x.tags||""),text:String(x.text||"")})):[]});
// Storage: an index of characters ("chars-v1") plus one key per character ("char-<id>").
// The old single-sheet key ("sheet-v1") is migrated on first run and left in place as a backup.
const LS={get(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}},
 set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
 del(k){try{localStorage.removeItem(k)}catch(e){}}};
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let IDX=LS.get("chars-v1");
if(!IDX||!Array.isArray(IDX.list)||!IDX.list.length){const old=LS.get("sheet-v1"),id=newId();IDX={cur:id,list:[{id,name:old&&old.name||""}]};if(old)LS.set("char-"+id,old)}
if(!IDX.list.some(c=>c.id===IDX.cur))IDX.cur=IDX.list[0].id;
const MEM={};// characters loaded this session, so switching still works if storage is blocked
let S;try{S=fix(LS.get("char-"+IDX.cur)||DEF)}catch(e){S=fix(DEF)}
MEM[IDX.cur]=S;
// The sheet may be open twice (say the installed app and a browser tab). Before writing the list of
// characters, pick up any another copy added, so neither copy drops the other's new characters.
// It also forgets characters the other copy deleted (their saved data is gone), except the one open here.
function mergeIndex(){const st=LS.get("chars-v1");if(!st||!Array.isArray(st.list))return false;let changed=false;
 st.list.forEach(c=>{if(c&&c.id&&!IDX.list.some(x=>x.id===c.id)&&LS.get("char-"+c.id)){IDX.list.push({id:c.id,name:String(c.name||"")});changed=true}});
 const keep=IDX.list.filter(c=>c.id===IDX.cur||LS.get("char-"+c.id)!==null);
 if(keep.length!==IDX.list.length){IDX.list=keep;changed=true}
 return changed}
const save=()=>{const c=IDX.list.find(c=>c.id===IDX.cur);if(c)c.name=S.name;MEM[IDX.cur]=S;mergeIndex();
 const ok=LS.set("char-"+IDX.cur,S)&&LS.set("chars-v1",IDX);$("#savewarn").hidden=ok};
window.addEventListener("storage",e=>{if(e.key==="chars-v1"&&mergeIndex())renderChars()});

// Shorthand names for bonuses, written the way the library exporter also accepts them
const BONUS_ALIAS={hp:"maxhp",barrier:"energybarrier",mecharmor:"mechanicalarmor",physicalarmor:"mechanicalarmor",chemarmor:"chemicalarmor",spellresistance:"chemicalarmor"};
const bkey=k=>{const q=norm(k);return BONUS_ALIAS[q]||q};
// noAuto leaves out the origin/career features that are granted automatically: their requirements are
// checked against stats without them, so a feature can never unlock itself with its own bonus
function bonuses(noAuto){const b={};
 S.feats.split("\n").forEach(l=>{const i=l.indexOf(":");if(i<0)return;
  l.slice(i+1).split(",").forEach(t=>{const m=t.trim().match(/^(.+?)\s*([+-]\s*\d+(?:\.\d+)?)$/);
   if(m){const k=bkey(m[1]);b[k]=(b[k]||0)+Number(m[2].replace(/\s/g,""))}})});
 const its=[...S.got.feat,...(noAuto?[]:[...gotNames("origin-feature"),...gotNames("career-feature")])].map(n=>L.all[norm(n)]);
 ["career","origin"].forEach(k=>its.push((L.by[k]||[]).find(x=>norm(x.name)===norm(S[k]))));
 S.arm.forEach(n=>its.push(L.all[norm(n)]));S.wpn.forEach(x=>its.push(L.all[norm(x.name)]));S.conds.forEach(n=>its.push(L.all[norm(n)]));
 its.forEach(it=>{for(const[k,v]of bonusEntries(it)){const q=bkey(k);b[q]=(b[q]||0)+v}});
 return b}
// The stats requirements are checked against: everything except auto-granted features (see above).
// Worked out fresh for each render, so it is never empty on the first load or left over from another character.
let REQ=null;
function reqStats(){const b=bonuses(true),attr={},skill={};
 G.forEach(([k,ab,,sk])=>{const e=(+S.attr[k]||0)+(b[norm(k)]||0)+(b[norm(ab)]||0),f=3*e,m=mult(e);attr[norm(k)]=attr[norm(ab)]=e;
  sk.forEach(n=>{const sb=(b[norm(n)]||0)+(n.includes("&")?b[norm(n.replace("&","and"))]||0:0),v=clamp(f+Math.floor((S.pts[n]||0)*m)+sb);
   skill[norm(n)]=skill[norm(n.replace("&","and"))]=v})});
 return{lvl:Math.max(1,Math.floor(S.level)||1),attr,skill}}
// Lines in the Features & Bonuses box that won't do anything, with the reason
const KNOWN=new Set(["maxhp","armor","mechanicalarmor","chemicalarmor","energybarrier","movement","initiative",...Object.keys(BONUS_ALIAS)]);
G.forEach(([k,ab,,sk])=>{KNOWN.add(norm(k));KNOWN.add(norm(ab));sk.forEach(n=>{KNOWN.add(norm(n));KNOWN.add(norm(n.replace("&","and")))})});
function featIssues(){const out=[];
 S.feats.split("\n").forEach((l,i)=>{if(!l.trim())return;const c=l.indexOf(":"),at=`Line ${i+1}: `;
  if(c<0){out.push(at+`no “:”, so it’s ignored. Write it as Name: ${l.trim()}`);return}
  l.slice(c+1).split(",").forEach(t=>{t=t.trim();if(!t)return;const m=t.match(/^(.+?)\s*([+-]\s*\d+(?:\.\d+)?)$/);
   if(!m)out.push(at+`“${t}” needs a + or − number, like +1`);
   else if(!KNOWN.has(norm(m[1])))out.push(at+`“${m[1].trim()}” isn’t an attribute or skill`)})});
 return out}
function renderFeatWarn(){const w=featIssues(),el=$("#fwarn");el.hidden=!w.length;
 el.innerHTML=w.slice(0,5).map(x=>"!! "+esc(x)).join("<br>")+(w.length>5?`<br>…and ${w.length-5} more`:"")}
// Bonuses from a library entry: a map (Body: 1, Stealth: -10) or a line ("Body +1, Stealth -10")
function bonusEntries(it){const o=it&&it.Bonuses;if(!o)return[];
 if(typeof o==="string")return o.split(",").map(t=>t.trim().match(/^(.+?)\s*([+-]\s*\d+(?:\.\d+)?)$/)).filter(Boolean).map(m=>[m[1].trim(),Number(m[2].replace(/\s/g,""))]);
 if(Array.isArray(o))return o.flatMap(x=>bonusEntries({Bonuses:x}));
 if(typeof o==="object")return Object.entries(o).map(([k,v])=>[k,Number(v)||0]).filter(([,v])=>v);return[]}
const bonTags=it=>{const e=bonusEntries(it);return e.length?`<div class="tags">${e.map(([n,v])=>`<span class="${v>0?"up":"dn"}">${esc(n)} ${v>0?"+":""}${v}</span>`).join("")}</div>`:""};

$("#stats").innerHTML=G.map(([k,ab])=>`<div class="pill"><b data-pct="${k}"></b><label>${ab} <input type="number" data-attr="${k}"><span data-bon="${k}"></span></label></div>`).join("");
$("#grid").innerHTML=G.map(([k,ab,sym,sk])=>`<div class="panel"><div class="ch"><span>${sym} ${k.toUpperCase()} · <span data-pct="${k}"></span></span><span>PTS | TEMP | EFF</span></div>`+
 sk.map(n=>`<div class="row" data-a="${k}" data-n="${esc(n)}"><span class="nm" role="button" tabindex="0"></span><input type="number" min="0" data-pts="${esc(n)}" placeholder="0" aria-label="${esc(n)} points"><input type="number" data-temp="${esc(n)}" placeholder="±0" aria-label="${esc(n)} temporary modifier"><span class="eff"></span></div>`).join("")+`</div>`).join("");

// Skill search: matches skill names, or an attribute name/abbreviation to show its whole group
function filterSkills(){const q=norm($("#sks").value);let total=0;
 $$("#grid > .panel").forEach(p=>{let any=0;p.querySelectorAll(".row").forEach(r=>{const g=G.find(x=>x[0]===r.dataset.a);
   const show=!q||norm(r.dataset.n).includes(q)||(q.length>=3&&norm(g[0]).startsWith(q))||norm(g[1])===q;r.hidden=!show;if(show)any++});
  p.hidden=!any;total+=any});
 $("#sknone").hidden=total>0}
$("#sks").addEventListener("input",filterSkills);
$("#sks").addEventListener("keydown",e=>{if(e.key==="Escape"){e.target.value="";filterSkills()}});
const sizeName=()=>{$("[data-name]").style.width=Math.max(8,S.name.length+1)*1.1+"ch"};
function fill(){$("[data-name]").value=S.name;sizeName();$("#diff").value=S.diff;$("[data-lvl]").value=S.level;$("#feats").value=S.feats;$$("[data-m]").forEach(i=>i.value=S[i.dataset.m]||"");
 $$("[data-attr]").forEach(i=>i.value=S.attr[i.dataset.attr]);
 $$("[data-pts]").forEach(i=>i.value=S.pts[i.dataset.pts]||"");
 $$("[data-temp]").forEach(i=>i.value=S.temp[i.dataset.temp]||"")}

function update(){calc(true);calc()}
function calc(dry){
 REQ=null;dedupeArmor();
 const b=bonuses(),lvl=Math.max(1,Math.floor(S.level)||1),cap=10+lvl*5,pool=120+(lvl-1)*40;let spent=0;const A={};CUR={lvl,attr:{},skill:{},fin:{}};
 G.forEach(([k,ab])=>{
  const bb=(b[norm(k)]||0)+(b[norm(ab)]||0),e=(+S.attr[k]||0)+bb,m=mult(e);
  A[k]={f:3*e,m};CUR.attr[norm(k)]=CUR.attr[norm(ab)]=e;
  $$(`[data-pct="${k}"]`).forEach(x=>x.textContent=Math.round(m*1000)/10+"%");
  const t=$(`[data-bon="${k}"]`);t.textContent=bb?`(${bb>0?"+":""}${bb})`:"";t.className=bb>0?"up":"dn"});
 $$(".row").forEach(r=>{
  const n=r.dataset.n,a=A[r.dataset.a],p=S.pts[n]||0,t=S.temp[n]||0,sb=(b[norm(n)]||0)+(n.includes("&")?b[norm(n.replace("&","and"))]||0:0);
  spent+=p;
  const D=S.diff,raw=a.f+Math.floor(p*a.m)+sb,base=clamp(raw),fin=clamp(raw+t+D);
  r._t=fin;CUR.skill[norm(n)]=CUR.skill[norm(n.replace("&","and"))]=base;CUR.fin[norm(n)]=CUR.fin[norm(n.replace("&","and"))]=fin;
  const nm=r.querySelector(".nm");
  nm.textContent=n+(sb?" ✦":"");
  nm.title=`Base ${a.f} + (${p} × ${Math.round(a.m*1000)/10}%)`+(sb?` ${sb>0?"+":""}${sb} bonus`:"")+(t?` ${t>0?"+":""}${t} temp`:"")+(D?` ${D>0?"+":""}${D} difficulty`:"")+` · d100 under ${fin}`;
  r.querySelector(".eff").innerHTML=base+(t||D?` <small class="${t+D>0?"up":t+D<0?"dn":""}">→${fin}</small>`:"");
  r.querySelector("[data-pts]").classList.toggle("dn",p>cap);
  r.querySelector("[data-temp]").className=t>0?"up":t<0?"dn":""});
 const pe=$("#pool");pe.textContent=`${spent} / ${pool}`;pe.className=spent>pool?"dn":spent===pool?"up":"";
 if(dry)return;
 renderPts(spent,pool);
 $("#cap").textContent=cap;const libN=Object.values(L.by).reduce((a,x)=>a+x.length,0);$("#lcount").textContent=libN?libN+" entries"+(LIBSRC?" · "+LIBSRC:""):"empty";renderFeats();renderVis();renderDossier();renderArmory();renderLog();renderJournal();
 save();renderChars();renderFeatWarn()}

function roll(r){
 const t=r._t,d=Math.floor(Math.random()*100)+1,ok=d<=t,el=$("#roll");
 el.style.display="block";
 el.innerHTML=`&gt; <b>${esc(r.dataset.n)}</b> ${d} ${ok?"≤":">"} ${t} · <b class="${ok?"up":"dn"}">${ok?"SUCCESS":"FAILURE"}</b>`;
 addRoll({n:r.dataset.n,d,v:t,ok,df:S.diff,k:"skill"})}

// Roll a dice expression like "2d6+3", "d8", "1d6+1d4-1". Trailing text ("2d6 fire") is kept as rest.
// Returns null when the text doesn't start with a dice expression.
function rollDice(expr){const m=String(expr).match(/^\s*((?:\d*d\d+|\d+)(?:\s*[+-]\s*(?:\d*d\d+|\d+))*)(.*)$/i);
 if(!m||!/d/i.test(m[1]))return null;let total=0;const parts=[];
 for(const[,sg,n,f,k]of m[1].replace(/\s+/g,"").matchAll(/([+-]?)(?:(\d*)d(\d+)|(\d+))/gi)){const neg=sg==="-",pre=neg?"−":parts.length?"+":"";
  if(f){const r=Array.from({length:Math.min(100,+n||1)},()=>1+Math.floor(Math.random()*Math.max(1,+f))),s=r.reduce((a,b)=>a+b,0);
   total+=neg?-s:s;parts.push(pre+"["+r.join(",")+"]")}
  else{total+=neg?-k:+k;parts.push(pre+k)}}
 return{total:Math.max(0,total),detail:parts.join(" "),rest:m[2].trim()}}
const dmgText=(expr,dm)=>`${expr}: ${dm.detail}`;
$("#dicef").addEventListener("submit",e=>{e.preventDefault();const v=$("#dice").value.trim(),out=$("#dicer");if(!v)return;
 const r=rollDice(v);
 if(!r||r.rest){out.className="dn";out.textContent="Try something like 3d6+2";return}
 out.className="";out.innerHTML=`<b class="up">${r.total}</b> <small>${esc(r.detail)}</small>`;
 addRoll({n:v,k:"dice",t:r.total,x:r.detail})});
const DIFFN={30:"Trivial",20:"Effortless",10:"Simple","-10":"Difficult","-20":"Challenging","-30":"Complicated"};
function addRoll(e){e.at=Date.now();S.rolls.unshift(e);S.rolls.length=Math.min(S.rolls.length,10);renderLog();save()}
function renderLog(){
 const dmg=e=>e.dmg!=null&&!isNaN(+e.dmg)?` · <b>${+e.dmg} dmg</b>`:"";
 const rows=S.rolls.map(e=>{
  if(e.k==="dice")return `<div class="rl"><span><b>[d] ${esc(e.n)}</b>${e.x?` <small>${esc(e.x)}</small>`:""}</span><b>${+e.t}</b></div>`;
  if(e.k==="cast")return `<div class="rl"><span><b>${esc(e.n)}</b>${dmg(e)}${e.x?` <small>${esc(e.x)}</small>`:""}</span><b class="up">CAST</b></div>`;
  const atk=e.k==="atk",ok=!!e.ok,df=+e.df||0;
  return `<div class="rl"><span><b>${esc(e.n)}</b> ${+e.d} ${ok?"≤":">"} ${+e.v}${df?` <small>${esc(DIFFN[df]||"")} ${df>0?"+":""}${df}</small>`:""}${dmg(e)}${e.x?` <small>${esc(e.x)}</small>`:""}</span><b class="${ok?"up":"dn"}">${atk?(ok?"HIT":"MISS"):(ok?"SUCCESS":"FAILURE")}</b></div>`}).join("");
 $$("[data-rlog]").forEach(el=>el.innerHTML=`<div class="ch"><span>ROLL LOG</span><span>${S.rolls.length?`<button data-rclear>Clear</button>`:"last 10"}</span></div>${rows||`<div class="sub" style="margin:0">Nothing yet. Roll a skill, attack, or cast a spell.</div>`}`)}
document.addEventListener("click",e=>{if(!e.target.closest("[data-rclear]"))return;S.rolls=[];renderLog();save()});

document.addEventListener("input",e=>{
 const t=e.target,d=t.dataset,v=parseFloat(t.value);
 if("name" in d){S.name=t.value;sizeName()}
 else if("lvl" in d){if(lvBase==null)lvBase=CUR.lvl;S.level=v>0?v:1}
 else if("attr" in d)S.attr[d.attr]=isNaN(v)?0:v;
 else if("pts" in d){if(v>0)S.pts[d.pts]=Math.floor(v);else delete S.pts[d.pts]}
 else if("temp" in d){if(v)S.temp[d.temp]=v;else delete S.temp[d.temp]}
 else if(t.id==="feats")S.feats=t.value;
 else return;
 update()});

document.addEventListener("click",e=>{
 const n=e.target.closest(".nm");
 if(n){roll(n.closest(".row"));return}
 const id=e.target.id,io=$("#io"),msg=$("#msg");
 if(id==="clr"){S.temp={};fill();update()}
 else if(id==="exp"){io.value=JSON.stringify(S,null,1);io.select();msg.textContent="Copy this text to keep or share the character."}
 else if(id==="imp"){let o;try{o=JSON.parse(io.value)}catch(err){msg.textContent="Couldn’t read that JSON. Paste an exported character or backup.";return}
  msg.textContent=importData(o,"the pasted text")}
 else if(id==="dl")msg.textContent="Downloaded "+download((S.name.replace(/[\\/:*?"<>|]+/g,"").trim()||"character")+".json",S)+"."
 else if(id==="bkall"){const list=allChars();
  msg.textContent="Downloaded "+download(`traveller-characters-${localDate()}.json`,{type:"traveller-backup",v:1,saved:new Date().toISOString(),characters:list},true)+` (${list.length} character${list.length===1?"":"s"}).`}
 else if(id==="share")shareLink().then(m=>msg.textContent=m)
 else if(id==="newc"){addChar(fix(DEF));msg.textContent="New character created."}
 else if(id==="dupc"){const o=fix(JSON.parse(JSON.stringify(S)));o.name=(S.name+" copy").slice(0,24);addChar(o);msg.textContent="Duplicated."}
 else if(id==="delc"){if(!confirm(`Delete ${S.name}? This can’t be undone unless you download it first.`))return;
  const was=S.name;LS.del("char-"+IDX.cur);delete MEM[IDX.cur];IDX.list=IDX.list.filter(c=>c.id!==IDX.cur);
  if(IDX.list.length)loadChar(IDX.list[0].id);else addChar(fix(DEF));msg.textContent=`Deleted ${was}.`}});

// Switch to a stored character without saving the current one first (callers save when needed)
function loadChar(id){IDX.cur=id;lvBase=null;let o;try{o=MEM[id]||fix(LS.get("char-"+id)||DEF)}catch(e){o=fix(DEF)}S=o;
 fsel=null;$("#atk").textContent="";$("#roll").style.display="none";fill();update()}
function addChar(o){if(IDX.list.some(c=>c.id===IDX.cur))save();const id=newId();IDX.list.push({id,name:o.name});MEM[id]=o;loadChar(id)}
function renderChars(){const o=IDX.list.map(c=>`<option value="${c.id}"${c.id===IDX.cur?" selected":""}>${esc((c.id===IDX.cur?S.name:c.name)||"Unnamed")}</option>`).join("");
 setHTML($("#chars"),o);setHTML($("#chars2"),o+`<option value="__new">+ New character…</option>`);
 $("#ccount").textContent=IDX.list.length+(IDX.list.length===1?" character":" characters");renderBackup()}

/* ---------- backups, restores and share links ---------- */
// Only Back up all counts towards the backup reminder; downloading one character doesn't save the others
function download(name,data,isBackup){const a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:"application/json"}));a.download=name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
 if(isBackup){LS.set("bk-v1",Date.now());renderBackup()}return name}
function allChars(){save();return IDX.list.map(c=>MEM[c.id]||fix(LS.get("char-"+c.id)||DEF))}
// Characters only live in this browser, so nudge towards a backup when there isn't a recent one
function renderBackup(){const el=$("#bkinfo");if(!el)return;const t=LS.get("bk-v1"),days=t?Math.floor((Date.now()-t)/864e5):null;
 el.textContent=t==null?"!! No backup yet. Characters live only in this browser, so Back up all now and then.":
  `Last backup: ${days===0?"today":days===1?"yesterday":days+" days ago"}`+(days>=14?". Time for a new one.":"");
 el.className="sub"+(t==null||days>=14?" dn":"")}
// A backup file adds every character in it (skipping exact copies already here); anything else is one character
function importData(o,label){
 if(o&&o.type==="traveller-backup"&&Array.isArray(o.characters)){save();
  const have=new Set(IDX.list.map(c=>JSON.stringify(MEM[c.id]||fix(LS.get("char-"+c.id)||DEF))));let n=0,skip=0,full=0;
  o.characters.forEach(c=>{let f;try{f=fix(c)}catch(e){return}if(have.has(JSON.stringify(f))){skip++;return}
   // A character that doesn't fit in storage isn't added at all, rather than reappearing blank after a reload
   const id=newId();if(!LS.set("char-"+id,f)){full++;return}IDX.list.push({id,name:f.name});MEM[id]=f;n++});
  LS.set("chars-v1",IDX);renderChars();
  return `Restored ${n} character${n===1?"":"s"} from ${label}.`+(skip?` Skipped ${skip} already here.`:"")+
   (full?` !! ${full} didn’t fit: this browser’s storage is full. Delete characters or portraits you don’t need, then open the backup again.`:"")}
 const c=fix(o);addChar(c);return `Opened ${c.name} as a new character.`}
// Share links carry one character (no portrait or roll log) compressed into the address after #c=
const b64enc=u8=>{let s="";for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
const b64dec=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function pack(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));
 if(window.CompressionStream){const st=new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));return "z"+b64enc(new Uint8Array(await new Response(st).arrayBuffer()))}
 return "j"+b64enc(bytes)}
async function unpack(str){const bytes=b64dec(str.slice(1));
 if(str[0]==="z"){const st=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return JSON.parse(await new Response(st).text())}
 return JSON.parse(new TextDecoder().decode(bytes))}
// The player's journal notes stay private: a share link carries the character, not their notes
async function shareLink(){const url=location.href.split("#")[0]+"#c="+await pack({...S,portrait:"",rolls:[],journal:[]});
 try{await navigator.clipboard.writeText(url);return `Share link for ${S.name} copied. Anyone who opens it can add the character, without its portrait or your journal notes. To move everything, use Back up all.`}
 catch(e){$("#io").value=url;$("#io").select();return "Couldn’t copy automatically, so the link is in the box below. Copy it from there."}}
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="chars2"&&t.value==="__new")addChar(fix(DEF));
 else if((t.id==="chars"||t.id==="chars2")&&t.value!==IDX.cur){save();loadChar(t.value);$("#msg").textContent=""}
 else if(t.id==="cfile"||t.id==="lfile"){const f=t.files[0];t.value="";if(!f)return;
  f.text().then(txt=>{if(t.id==="lfile"){$("#lib").value=txt;$("#loadlib").click();return}
   let o;try{o=JSON.parse(txt)}catch(err){$("#msg").textContent=`Couldn’t read ${f.name}. Is it an exported character or backup?`;return}
   $("#msg").textContent=importData(o,f.name)})}});

document.addEventListener("keydown",e=>{
 if((e.key==="Enter"||e.key===" ")&&e.target.classList&&e.target.classList.contains("nm")){e.preventDefault();roll(e.target.closest(".row"))}
 else if((e.key==="Enter"||e.key===" ")&&e.target.dataset&&e.target.dataset.sel){e.preventDefault();fsel=e.target.dataset.sel;renderFeats();const n=[...$$("[data-sel]")].find(x=>x.dataset.sel===fsel);if(n)n.focus()}});

/* library, feats and vis */
let L={by:{},all:{}},CUR={lvl:1,attr:{},skill:{},fin:{}},fk="feat",fsel=null,tab="char";
const KINDS=[["feat","Feats"],["origin-feature","Origin features"],["career-feature","Career features"]];
const EL=[["Aer","🜁","#e6c229"],["Aqua","🜄","#3b82f6"],["Ignis","🜂","#ef4444"],["Ordo","✺","#9aa5b8"],["Perditio","❖","#8b5cf6"],["Terra","🜃","#22c55e"]];
const nm=x=>{x=String(x).trim();return x.startsWith("[[")&&x.endsWith("]]")?x.slice(2,-2).split("|")[0].trim():x};
const cost=it=>it?Math.max(1,+it.Cost||1):1;
const featLeft=()=>Math.floor(CUR.lvl/2)-S.got.feat.reduce((s,n)=>s+cost(L.all[norm(n)]),0);
function renderPts(spent,pool){const fl=featLeft();
 $("#cpts").innerHTML=`<div class="tl" title="Skill points spent / available"><span>SKILL PTS</span><b class="${spent>pool?"dn":spent===pool?"up":""}">${spent} / ${pool}</b></div><div class="tl" title="Feat points remaining"><span>FEAT PTS</span><b class="${fl<0?"dn":""}">${fl}</b></div>${lvSummary()}`}
// Level-up note: what changed since the level was first edited (lvBase), until dismissed
let lvBase=null;
function lvSummary(){if(lvBase==null||lvBase===CUR.lvl)return"";const a=lvBase,b=CUR.lvl,d=b-a,s=d>0?"+":"−",n=Math.abs(d);
 const fe=Math.floor(b/2)-Math.floor(a/2),parts=[`${s}${n*40} skill pts`,`${s}${n*5} skill cap`];
 if(fe)parts.push(`${fe>0?"+":"−"}${Math.abs(fe)} feat pt${Math.abs(fe)>1?"s":""}`);
 const un=d>0?["origin","career"].flatMap(k=>{const p=(L.by[k]||[]).find(x=>norm(x.name)===norm(S[k]));
  return p?linked(k,p).filter(f=>{const r=num(f.Level_req);return r>a&&r<=b&&prereq(f).ok}).map(f=>f.name):[]}):[];
 return `<div class="lvup" role="status"><div class="tl"><b class="${d>0?"up":"dn"}">LVL ${a} → ${b}</b><button data-lvx aria-label="Dismiss level summary">×</button></div>${parts.join(" · ")}${un.length?`<br><span class="up">Unlocked:</span> ${un.map(esc).join(", ")}`:""}</div>`}
document.addEventListener("click",e=>{if(e.target.closest("[data-lvx]")){lvBase=null;update()}});
const vis=n=>S.vis[n]||(S.vis[n]={cur:0,max:25});
// Load a library, skipping entries that aren't objects or have no name. Returns {n: kept, skip: dropped}.
function setLib(o){if(!o||typeof o!=="object"||Array.isArray(o))throw new Error("Library must be a JSON object");
 const by={},all={};let n=0,skip=0;
 for(const[k,a]of Object.entries(o)){if(!Array.isArray(a))continue;
  by[k]=a.filter(i=>{const ok=i&&typeof i==="object"&&i.name!=null&&String(i.name).trim()!=="";if(!ok)skip++;return ok})
   .map(i=>typeof i.name==="string"?i:{...i,name:String(i.name)});
  // Journal entries only show on the Journal tab, so they never shadow a feat or item with the same name
  by[k].forEach(i=>{if(k!=="journal")all[norm(i.name)]=i;n++})}
 L={by,all};return{n,skip}}
function showTab(){$$("[data-tab]").forEach(x=>x.hidden=x.dataset.tab!==tab);$$("[data-go]").forEach(b=>b.classList.toggle("cur",b.dataset.go===tab));
 if(tab==="journal")renderJournal()}

/* ---------- journal: the GM's entries from the library (read-only) plus this character's own notes ---------- */
const JCATS=[["all","All"],["lore","Lore"],["quest","Quests"],["npc","NPCs"],["location","Locations"],["handout","Handouts"],["mine","My notes"]];
let jk="all",jsel=null;
// Which GM entries this browser has opened, so new ones are marked NEW (and counted on the tab)
const jseen=new Set(LS.get("jseen-v1")||[]);
const catOf=e=>{const c=norm(e.Category||"lore").replace(/s$/,"");return ["lore","quest","npc","location","handout"].includes(c)?c:"lore"};
const hasVal=v=>v!=null&&v!=="";
// Today's date where the player is (toISOString would give the UTC date, a day off in the evening)
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
function jEntries(){
 const gm=(L.by.journal||[]).map(e=>({key:"g:"+norm(e.name),gm:true,title:e.name,cat:catOf(e),catLabel:String(e.Category||"Lore"),
  session:e.Session,status:e.Status,text:String(e.Description||e.Effect||"")}))
  .sort((a,b)=>num(b.session,-1)-num(a.session,-1)||a.title.localeCompare(b.title));
 const mine=S.journal.map(n=>({key:"n:"+n.id,gm:false,title:n.title||"Untitled",cat:"mine",date:n.date,tags:n.tags,text:n.text,n}))
  .sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.title.localeCompare(b.title));
 return gm.concat(mine)}
function renderJournal(){
 const all=jEntries(),q=norm($("#jq").value||"");
 const cats=JCATS.filter(([k])=>k==="all"||k==="mine"||all.some(x=>x.cat===k));
 if(!cats.some(([k])=>k===jk))jk="all";
 const shown=all.filter(x=>(jk==="all"||x.cat===jk)&&(!q||norm(x.title+" "+x.text+" "+(x.tags||"")).includes(q)));
 if(!shown.some(x=>x.key===jsel))jsel=shown[0]?shown[0].key:null;
 const x=shown.find(x=>x.key===jsel);
 if(x&&x.gm&&tab==="journal"&&!jseen.has(x.key)){jseen.add(x.key);LS.set("jseen-v1",[...jseen])}
 const unseen=all.filter(x=>x.gm&&!jseen.has(x.key)).length;
 $("#jbadge").textContent=unseen?` (${unseen})`:"";
 $("#jk").innerHTML=cats.map(([k,l])=>`<button data-jk="${k}"${k===jk?' class="cur"':""}>${l}</button>`).join("");
 const fl=$("#jlist"),keep=fl.scrollTop;
 fl.innerHTML=shown.length?shown.map(x=>{
  const sub=x.gm?[x.catLabel,hasVal(x.session)?"S"+x.session:"",x.status||""].filter(Boolean).join(" · "):["My note",x.date||""].filter(Boolean).join(" · ");
  return `<div class="tank it${x.key===jsel?" sel":""}" data-jsel="${esc(x.key)}" role="button" tabindex="0" aria-pressed="${x.key===jsel}"><div class="tl"><span>${esc(x.title)}</span>${x.gm&&!jseen.has(x.key)?'<small class="new">NEW</small>':""}</div><small class="jsub">${esc(sub.toUpperCase())}</small></div>`}).join("")
  :`<div class="sub">${all.length?"Nothing matches.":"No entries yet. Your GM’s lore, quests and handouts appear here, and + New note adds your own."}</div>`;
 fl.scrollTop=keep;
 setHTML($("#jinfo"),!x?`<div class="tank"><div class="sub" style="margin:0">Select an entry to read it.</div></div>`
  :x.gm?`<div class="tank"><div class="tl"><b>${esc(x.title)}</b><small class="sub" style="margin:0">${esc(x.catLabel.toUpperCase())}</small></div><div class="tags">${[hasVal(x.session)?"Session "+x.session:"",x.status?"Status: "+x.status:"","From your GM"].filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join("")}</div><div class="sub">${esc(x.text||"No text.")}</div></div>`
  :`<div class="tank jedit"><label>Title <input type="text" data-jn="title" value="${esc(x.n.title)}" maxlength="80"></label><label>Date <input type="date" data-jn="date" value="${esc(x.n.date)}"></label><label>Tags <input type="text" data-jn="tags" value="${esc(x.n.tags)}" placeholder="npc, fort, clue"></label><textarea data-jn="text" rows="12" placeholder="What happened, who you met, what you owe…" aria-label="Note text">${esc(x.n.text)}</textarea><div class="btns"><button data-jdel>Delete note</button><span class="sub" style="margin:0">Saved with this character.</span></div></div>`)}
document.addEventListener("click",e=>{const k=e.target.closest("[data-jk]"),s=e.target.closest("[data-jsel]");
 if(k){jk=k.dataset.jk;renderJournal()}
 else if(s){jsel=s.dataset.jsel;renderJournal()}
 else if(e.target.closest("#jadd")){const n={id:newId(),title:"New note",date:localDate(),tags:"",text:""};
  S.journal.push(n);if(jk!=="all")jk="mine";$("#jq").value="";jsel="n:"+n.id;save();renderJournal();const t=$('#jinfo [data-jn="title"]');if(t){t.focus();t.select()}}
 else if(e.target.closest("[data-jdel]")){const n=S.journal.find(x=>"n:"+x.id===jsel);if(!n||!confirm(`Delete the note “${n.title}”? This can’t be undone.`))return;
  S.journal=S.journal.filter(x=>x!==n);jsel=null;save();renderJournal()}});
document.addEventListener("input",e=>{const f=e.target.dataset&&e.target.dataset.jn;
 if(f){const n=S.journal.find(x=>"n:"+x.id===jsel);if(!n)return;n[f]=e.target.value;save();
  // Keep the list entry in step without redrawing the editor being typed in
  const it=[...$$("#jlist [data-jsel]")].find(x=>x.dataset.jsel===jsel);
  if(it){it.querySelector(".tl span").textContent=n.title||"Untitled";it.querySelector(".jsub").textContent=("My note"+(n.date?" · "+n.date:"")).toUpperCase()}}
 else if(e.target.id==="jq")renderJournal()});
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.dataset&&e.target.dataset.jsel){e.preventDefault();jsel=e.target.dataset.jsel;renderJournal()}});

function prereq(it){const r=[];let ok=true;const add=(l,m)=>{r.push([l,m]);if(!m)ok=false};
 const R=REQ||(REQ=reqStats());
 for(const[k,v]of Object.entries(it)){if(!/_req$/i.test(k)||!v)continue;
  const w=k.slice(0,-4),q=norm(w),l=[].concat(v).map(nm);
  if(q==="level")add("Level "+v,R.lvl>=+v);
  else if(q==="career"||q==="origin")add(w+": "+l.join(" / "),l.some(x=>norm(x)===norm(S[q])));
  else if(q==="feat")l.forEach(x=>add("Feat: "+x,S.got.feat.some(y=>norm(y)===norm(x))));
  else if(q in R.attr)add(w+" "+v,R.attr[q]>=+v);
  else if(q in R.skill)add(w.replace(/_/g," ")+" "+v,R.skill[q]>=+v)}
 return{r,ok}}

function autoFeat(k2){const k=k2.split("-")[0],parent=(L.by[k]||[]).find(x=>norm(x.name)===norm(S[k]));
 return parent?linked(k,parent).filter(f=>prereq(f).ok):[]}
const gotNames=k2=>k2==="feat"?S.got.feat:autoFeat(k2).map(f=>f.name);

function renderFeats(){
 $("#fk").innerHTML=KINDS.map(([k,l])=>`<button data-fk="${k}"${k===fk?` class="cur"`:""}>${l}</button>`).join("");
 const auto=fk!=="feat",all=L.by[fk]||[],got=gotNames(fk),has=n=>got.some(x=>norm(x)===norm(n));
 const left=featLeft();
 $("#fpts").textContent=left;$("#fpts").className=left<0?"dn":"";
 const can=it=>has(it.name)||(!auto&&prereq(it).ok&&left>=cost(it));
 const items=S.showAll?all:all.filter(i=>has(i.name));
 $("#fall").checked=S.showAll;
 const fl=$("#flist"),keep=fl.dataset.kind===fk?fl.scrollTop:0;fl.dataset.kind=fk;
 $("#flist").innerHTML=items.length?items.map(it=>{const h=has(it.name),c=can(it);
  return `<div class="tank it${it.name===fsel?" sel":""}${c?"":" lock"}" data-sel="${esc(it.name)}" role="button" tabindex="0" aria-pressed="${it.name===fsel}"><div class="tl"><span>${esc(it.name)}</span><small class="${h?"up":""}">${h?"✓ ACQUIRED":c?"COST "+cost(it):"[LOCKED]"}</small></div></div>`}).join(""):`<div class="sub">${all.length?(auto?"None acquired yet. They’re granted automatically by your "+fk.split("-")[0]+" as you meet their requirements.":"No feats acquired yet.")+" Tick Show all to browse every entry.":"Nothing here yet. Load your library on the Settings tab."}</div>`;
 fl.scrollTop=keep;
 const it=items.find(i=>i.name===fsel);
 $("#finfo").innerHTML=it?`<div class="tank"><div class="tl"><b>${esc(it.name)}</b>${fk==="feat"&&!has(it.name)?`<small class="sub" style="margin:0">Cost ${cost(it)}</small>`:""}</div><div class="tags">${prereq(it).r.map(([l,m])=>`<span class="${m?"up":"dn"}">${m?"✓":"!!"} ${esc(l)}</span>`).join("")||`<span>No prerequisites</span>`}</div><div class="sub">${esc(it.Description||it.Effect||"No description.")}</div>${auto?`<div class="sub ${has(it.name)?"up":""}" style="margin-top:10px">${has(it.name)?"✓ Acquired. Granted by your "+fk.split("-")[0]+".":"LOCKED: Granted automatically once your "+fk.split("-")[0]+" and the requirements above match."}</div>`:`<div class="btns"><button data-act="${has(it.name)?"drop":"take"}" data-it="${esc(it.name)}"${can(it)?"":" disabled"}>${has(it.name)?"× Remove":can(it)?"✓ Acquire":"Locked"}</button></div>`}</div>`:`<div class="tank"><div class="sub" style="margin:0">Select an entry to read it.</div></div>`}

function renderVis(){
 const VF=S.vf,matchVF=sp=>!VF.length||EL.some(([n])=>VF.includes(n)&&+sp[n+"_Cost"]>0);
 $("#cname").textContent="Crucible: "+(S.crucible||"none");
 $("#cruc").innerHTML=`<option value="">Equip crucible…</option>`+(L.by.crucible||[]).map(c=>`<option>${esc(c.name)}</option>`).join("");
 $("#learn").innerHTML=`<option value="">+ Learn spell…${VF.length?" (filtered)":""}</option>`+(L.by.spell||[]).filter(x=>!S.spells.some(y=>norm(y)===norm(x.name))&&matchVF(x)).map(x=>`<option>${esc(x.name)}</option>`).join("");
 setHTML($("#vtanks"),EL.map(([n,y,c])=>{const v=vis(n),pc=v.max>0?Math.min(100,Math.max(0,v.cur/v.max*100)):0;
  return `<div class="tank"><div class="tl"><span style="color:${c}">${y} ${n}</span><span><input type="number" data-vis="${n}" data-f="cur" value="${v.cur}" aria-label="${n} current"> / <input type="number" data-vis="${n}" data-f="max" value="${v.max}" aria-label="${n} max"></span></div><div class="bar"><i style="width:${pc}%;background:${c}"></i></div><div class="btns">${[-5,-1,1,5].map(x=>`<button data-vd="${x}" data-el="${n}">${x>0?"+":""}${x}</button>`).join("")}</div></div>`}).join(""));
 const known=S.spells.map(n=>L.all[norm(n)]).filter(Boolean);
 const shown=known.filter(matchVF);
 $("#vfilter").innerHTML=`<b>Filter</b>`+EL.map(([n,y,c])=>`<button data-vf="${n}" aria-pressed="${VF.includes(n)}" class="${VF.includes(n)?"cur":""}" style="color:${c}">${y} ${n}</button>`).join("")+(VF.length?`<button data-vf="">Clear</button><span class="sub" style="margin:0">${shown.length} of ${known.length}</span>`:"");
 $("#vspells").innerHTML=shown.map(sp=>{
  const cs=EL.filter(([n])=>+sp[n+"_Cost"]>0),ok=cs.every(([n])=>vis(n).cur>=+sp[n+"_Cost"]);
  return `<div class="tank${ok?"":" lock"}"><div class="tl"><b>${esc(sp.name)} <small>${esc([sp.School,sp.Tier!=null?"T"+sp.Tier:""].filter(Boolean).join(" · "))}</small></b><span><button data-cast="${esc(sp.name)}"${ok?"":" disabled"}>${ok?"Cast":"No vis"}</button> <button data-forget="${esc(sp.name)}" aria-label="Forget ${esc(sp.name)}">×</button></span></div><div class="sub">${esc(sp.Description||"")}</div><div class="tags">${cs.length?cs.map(([n,y,c])=>`<span style="color:${vis(n).cur>=+sp[n+"_Cost"]?c:"var(--bad)"}">${y} ${sp[n+"_Cost"]} ${n}</span>`).join(""):"<span>Cantrip · 0 vis</span>"}</div></div>`}).join("")||`<div class="sub">${known.length?"No known spells match the filter.":"No known spells. Load your library, then pick one under Learn spell."}</div>`}

document.addEventListener("click",e=>{const g=e.target.closest("[data-vf]");if(!g)return;const v=g.dataset.vf;
 S.vf=!v?[]:S.vf.includes(v)?S.vf.filter(x=>x!==v):[...S.vf,v];save();renderVis()});

document.addEventListener("click",e=>{
 const g=e.target.closest("[data-go],[data-fk],[data-sel],[data-act],[data-vd],[data-cast],[data-forget],#refill,#loadlib");if(!g)return;
 const d=g.dataset;
 if(d.go){tab=d.go;showTab()}
 else if(d.fk){fk=d.fk;fsel=null;renderFeats()}
 else if(d.sel){fsel=d.sel;renderFeats()}
 else if(d.act&&fk==="feat"){const a=S.got[fk];S.got[fk]=d.act==="take"?(a.some(x=>norm(x)===norm(d.it))?a:[...a,d.it]):a.filter(x=>norm(x)!==norm(d.it));update()}
 else if(d.vd){const v=vis(d.el);v.cur=Math.max(0,Math.min(v.max,v.cur+ +d.vd));update()}
 else if(d.cast){const sp=L.all[norm(d.cast)];if(!sp)return;const paid=[];
  EL.forEach(([n])=>{const c=+sp[n+"_Cost"]||0;if(c){vis(n).cur=Math.max(0,vis(n).cur-c);paid.push(c+" "+n)}});
  const dm=sp.Damage?rollDice(sp.Damage):null;
  addRoll({n:sp.name,k:"cast",dmg:dm?dm.total:null,x:[paid.join(", ")||"0 vis",sp.Damage?(dm?dmgText(sp.Damage,dm):"DMG "+sp.Damage):""].filter(Boolean).join(" · ")});
  update()}
 else if(d.forget){S.spells=S.spells.filter(x=>norm(x)!==norm(d.forget));update()}
 else if(g.id==="refill"){EL.forEach(([n])=>{vis(n).cur=vis(n).max});update()}
 else if(g.id==="loadlib"){const m=$("#lmsg");
  let o,r;try{o=JSON.parse($("#lib").value);r=setLib(o)}catch(err){m.textContent="Couldn’t read that JSON. Paste the exporter output.";return}
  LIBSRC="loaded by hand";
  let kept=true;try{localStorage.setItem("lib-v1",JSON.stringify(o))}catch(x){kept=false}
  update();m.textContent=`Loaded ${r.n} ${r.n===1?"entry":"entries"}.`+(r.skip?` Skipped ${r.skip} without a name.`:"")+(kept?"":" Couldn’t store it in this browser (too big or storage blocked), so load it again next time.")}});

document.addEventListener("change",e=>{
 const t=e.target,d=t.dataset;
 if(t.id==="diff"){S.diff=+t.value;update()}
 else if(d.vis){const v=vis(d.vis);v[d.f]=Math.max(0,+t.value||0);if(v.cur>v.max)v.cur=v.max;update()}
 else if(t.id==="learn"&&t.value){S.spells.push(t.value);update()}
 else if(t.id==="cruc"&&t.value){const c=(L.by.crucible||[]).find(x=>x.name===t.value);
  if(c){S.crucible=c.name;EL.forEach(([n])=>{const v=vis(n);v.max=+c["Vis_"+n+"_Max"]||0;if(v.cur>v.max)v.cur=v.max});update()}}});

document.addEventListener("change",e=>{if(e.target.id==="fall"){S.showAll=e.target.checked;save();renderFeats();return}const d=e.target.dataset;if(d.pick){S[d.pick]=e.target.value.trim();
 // Choosing an origin sets the HP pool, so start the character at full health for it
 // (only when the origin is in the library: without it the max is unknown, and HP must be left alone)
 if(d.pick==="origin"&&originOf()){const prev=S.hp;S.hp=hpMax();hpChanged(prev)}update()}});
document.addEventListener("change",e=>{const sl=e.target.dataset.aslot;if(!sl)return;S.arm=S.arm.filter(n=>slotOf(n)!==sl);if(e.target.value)S.arm.push(e.target.value);update()});
document.addEventListener("click",e=>{const g=e.target.closest("[data-open]");if(!g)return;
 const[k,n]=g.dataset.open.split("|");fk=k;fsel=n;if(!gotNames(k).some(x=>norm(x)===norm(n)))S.showAll=true;tab="feats";showTab();renderFeats();window.scrollTo(0,0)});

const num=(x,d=0)=>{const v=Number(x);return x==null||x===""||isNaN(v)?d:v};
const W=n=>L.all[norm(n)];
const opts=(label,arr)=>`<option value="">${label}</option>`+arr.map(c=>`<option>${esc(c.name)}</option>`).join("");

// Dropping to 0 HP adds Dying (the library's entry if it has one); healing above 0 clears it.
// Only reacts to the change itself, so you can still clear Dying by hand while at 0.
function hpChanged(prev){const now=S.hp,isD=n=>norm(n)==="dying";
 if(prev>0&&now<=0&&!S.conds.some(isD))S.conds.push(((L.by.condition||[]).find(c=>isD(c.name))||{name:"Dying"}).name);
 else if(prev<=0&&now>0){S.conds.filter(isD).forEach(n=>delete S.cdur[n]);S.conds=S.conds.filter(n=>!isD(n))}}
// Max HP = the origin's HP + Max HP bonuses (feats, gear, conditions…) + the player's own adjustment.
// A new character with no origin has 0, and isn't treated as dying.
const originOf=()=>(L.by.origin||[]).find(x=>norm(x.name)===norm(S.origin));
function hpParts(b=bonuses()){const o=originOf(),org=num(o&&o.HP),bon=b.maxhp||0;return{org,bon,adj:S.maxHp,max:Math.max(0,org+bon+S.maxHp)}}
const hpMax=b=>hpParts(b).max;
// When the chosen origin isn't in the library (opened offline as a file, library not loaded yet, origin renamed)
// the true max is unknown, so HP changes are only kept from going below 0, never cut down to a wrong max.
const hpKnown=()=>!S.origin||!!originOf();
const hpCap=()=>hpKnown()?hpMax():Infinity;
const capHp=v=>Math.max(0,Math.min(hpCap(),v));
// The Energy Barrier only exists when something grants it (an "Energy Barrier +N" bonus); otherwise its maximum is 0
const barrierMax=(b=bonuses())=>Math.max(0,b.energybarrier||0);
// Two kinds of armor: Mechanical stops physical harm, Chemical resists spells.
// Library armor gives Mechanical through "Armor" and Chemical through "Chemical"; bonuses name either one.
function armorTotals(b=bonuses()){
 const mech=S.armorBase+S.arm.reduce((a,n)=>a+num((W(n)||{}).Armor),0)+(b.mechanicalarmor||0)+(b.armor||0);
 const chem=S.chemBase+S.arm.reduce((a,n)=>a+num((W(n)||{}).Chemical),0)+(b.chemicalarmor||0);
 return{mech,chem}}
function renderDossier(){
 // With the origin missing from the library the max is unknown: show the stored HP and "?" instead of 0 / 0
 const b=bonuses(),hpP=hpParts(b),known=hpKnown(),maxE=hpP.max,hp=known?Math.max(0,Math.min(maxE,S.hp)):S.hp,pc=known?(maxE?hp/maxE*100:0):100,col=pc<=25?"var(--bad)":pc<=50?"#d9822b":"var(--ok)";
 const{mech,chem}=armorTotals(b);
 const ico=d=>`<svg class="ico" viewBox="0 0 24 24" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
 const P=[["Mechanical armor (physical)",ico("M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z")+" MECH","armorBase",mech,""],
  ["Chemical armor (spell resistance)",ico("M9 2.5h6M10 2.5v6L4.5 18.5A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.8-3L14 8.5v-6M7 14.5h10")+" CHEM","chemBase",chem,""],
  // Movement = the origin's Starting Movement + Movement bonuses + the player's own base value (default 0)
  ["Movement",ico("M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3")+" MOVEMENT","move",num((originOf()||{}).Movement)+S.move+(b.movement||0)," hex"],
  ["Initiative",ico("M13 2 4 14h7l-1 8 9-12h-7z")+" INITIATIVE","init",S.init+(b.initiative||0),""]];
 const fromOrigin=k=>k==="move"&&originOf()&&num(originOf().Movement)?`${esc(originOf().name)} ${num(originOf().Movement)} + `:"";
 setHTML($("#cpills"),P.map(([l,ab,k,t,u])=>`<div class="pill" title="${l}: ${fromOrigin(k)}base ${S[k]}, total ${t}${u}"><b>${t}${u}</b><label>${ab} <input type="number" data-c="${k}" value="${S[k]}" aria-label="${l} base"></label></div>`).join(""));
 // Dying at 0 HP once there is an HP pool; with an unknown max, go by the Dying condition the character already has
 const down=known?maxE>0&&hp<=0:S.hp<=0&&S.conds.some(n=>norm(n)==="dying");$("#hp").classList.toggle("down",down);$("#dying").hidden=!down;
 const sgn=v=>(v<0?"−":"+")+Math.abs(v);
 setHTML($("#hp"),`<div class="tl">${down?`<b class="dn">** DYING **</b>`:`<b>HP</b>`}<span><input type="number" data-hp="hp" value="${hp}" aria-label="Current HP"> / <b>${known?maxE:"?"}</b></span></div><div class="bar"><i style="width:${pc}%;background:${col}"></i></div><div class="btns">${[-5,-1,1,5].map(x=>`<button data-hd="${x}">${x>0?"+":""}${x}</button>`).join("")}</div>`+
  `<div class="sub hpsum">${originOf()?`Max ${maxE} = ${esc(originOf().name)} ${hpP.org}`:(S.origin?"This origin isn’t in the library, so it adds no HP.":"No origin yet: pick one to set your HP.")+` Max ${maxE} =`}${hpP.bon?` ${sgn(hpP.bon)} bonuses`:""} <label>adjust <input type="number" data-hp="maxHp" value="${S.maxHp}" aria-label="Max HP adjustment"></label></div>`);
 const bMax=barrierMax(b),bCur=Math.max(0,Math.min(bMax,S.barrier)),bpc=bMax?bCur/bMax*100:0;
 setHTML($("#barrier"),`<div class="tl"><b>ENERGY BARRIER</b><span><input type="number" data-barrier value="${bCur}" min="0" max="${bMax}" aria-label="Current energy barrier"${bMax?"":" disabled"}> / <b>${bMax}</b></span></div><div class="bar barrier"><i style="width:${bpc}%"></i></div>`+
  (bMax?`<div class="btns">${[-5,-1,1,5].map(x=>`<button data-bd="${x}">${x>0?"+":""}${x}</button>`).join("")}<button data-bd="full">Recharge</button></div>`:`<div class="sub">None yet. Armor, weapons, feats, conditions or your origin can grant one with an Energy Barrier bonus.</div>`));
 setHTML($("#cpick"),[["origin","Origin"],["career","Career"]].map(([k,l])=>pickCard(k,l)).join(""));
 $("#pimg").hidden=!S.portrait;$("#pnone").hidden=!!S.portrait;if(S.portrait&&$("#pimg").getAttribute("src")!==S.portrait)$("#pimg").src=S.portrait}

function linked(k,it){const fk2=k+"-feature",pool=L.by[fk2]||[],named=[].concat(it.Features||[]).map(nm).map(norm);
 return pool.filter(f=>named.includes(norm(f.name))||Object.entries(f).some(([kk,v])=>/_req$/i.test(kk)&&norm(kk.slice(0,-4))===k&&[].concat(v).map(nm).some(x=>norm(x)===norm(it.name))))
  .sort((a,b)=>num(a.Level_req)-num(b.Level_req)||a.name.localeCompare(b.name))}
function pickCard(k,l){
 const list=L.by[k]||[],it=list.find(x=>norm(x.name)===norm(S[k]));
 const ctl=list.length?`<select data-pick="${k}" aria-label="${l}"><option value="">Choose ${k==="origin"?"an origin":"a career"}…</option>${list.map(c=>`<option${it&&c.name===it.name?" selected":""}>${esc(c.name)}</option>`).join("")}${S[k]&&!it?`<option selected>${esc(S[k])}</option>`:""}</select>`
  :`<input type="text" data-pick="${k}" value="${esc(S[k])}" placeholder="Type one" aria-label="${l}">`;
 let body;
 if(!list.length)body=`<div class="sub">Load your library on the Settings tab to pick from your ${k}s.</div>`;
 else if(!it)body=`<div class="sub">${S[k]?"Not in your library, so no bonuses apply.":`Pick ${k==="origin"?"an origin":"a career"} to see its details.`}</div>`;
 else{const bon=bonusEntries(it),fs=linked(k,it),fk2=k+"-feature";
  body=`${it.Description?`<div class="sub lore">${esc(it.Description)}</div>`:""}${bon.length?`<div class="tags">${bon.map(([n,v])=>`<span class="${+v>0?"up":"dn"}">${esc(n)} ${+v>0?"+":""}${+v}</span>`).join("")}</div>`:""}`+
   (fs.length?`<div class="flinks">${fs.map(f=>{const ok=prereq(f).ok;
    return `<button class="fl${ok?"":" lock"}" data-open="${fk2}|${esc(f.name)}"><span>${esc(f.name)}</span><small class="${ok?"up":""}">${ok?"✓ acquired":f.Level_req?"Lv "+esc(f.Level_req):"locked"}</small></button>`}).join("")}</div>`:"")}
 return `<div class="tank"><div class="tl"><b>${l}</b>${ctl}</div>${body}</div>`}

const SLOTS=["Head","Torso","Arms","Hands","Legs","Feet"];
const SLOTWORDS={Head:"head helmet helm hat hood mask cap visor",Torso:"torso chest body vest cuirass breastplate jacket coat shirt suit plate mail",
 Arms:"arms arm bracer bracers vambrace vambraces sleeves shoulder shoulders pauldron pauldrons",Hands:"hands hand glove gloves gauntlet gauntlets",
 Legs:"legs leg greaves pants trousers leggings cuisses",Feet:"feet foot boot boots shoe shoes sabaton sabatons"};
function slotOf(n){const it=W(n)||{},f=it.Slot||it.slot||it.Type||"",words=s=>String(s).toLowerCase().split(/[^a-z]+/);
 for(const src of [f,n])for(const w of words(src))for(const sl of SLOTS)if(SLOTWORDS[sl].split(" ").includes(w))return sl;
 return "Torso"}
const AMMO=["Small Ammo","Standard Ammo","Rockets","Bolts","VIS Cell"];
// A weapon's ammo type from the library (Ammo / Ammo_Type / AmmoType / Caliber), matched to AMMO when it can be
function libAmmo(it){let v=it&&(it.Ammo??it.Ammo_Type??it.AmmoType??it.Caliber);if(Array.isArray(v))v=v[0];
 if(typeof v!=="string"||!v.trim())return"";const s=nm(v);return AMMO.find(a=>norm(a)===norm(s))||s}
// The type the sheet uses: the player's pick on the card ("" = untracked), else the library's
const wtype=x=>x.type!==undefined?x.type:libAmmo(W(x.name));
const ammoTypes=()=>{const s=new Set(AMMO);Object.keys(S.ammo).forEach(k=>s.add(k));S.wpn.forEach(x=>{const t=wtype(x);if(t)s.add(t)});return[...s]};
const magPer=mx=>mx<=30?1:Math.max(5,Math.ceil(mx/150)*5);
const BUL=`<svg viewBox="0 0 10 30" aria-hidden="true"><path d="M5 1C8 4.5 8.5 8 8.5 11.5h-7C1.5 8 2 4.5 5 1Z"/><rect x="1.5" y="12.5" width="7" height="13" rx=".6"/><rect x="1" y="26.5" width="8" height="2.5" rx=".6"/></svg>`;
function mag(i,ammo,mx){const per=magPer(mx),n=Math.ceil(mx/per);let h="";
 for(let k=1;k<=n;k++){const top=Math.min(mx,k*per),st=ammo>=top?"live":ammo>(k-1)*per?"part":"spent";
  h+=`<button class="shot ${st}" data-shot="${i}|${k}" aria-label="Set to ${top} rounds">${BUL}</button>`}
 return `<div class="mag" role="group" aria-label="Magazine: ${ammo} of ${mx} rounds">${h}</div>`}
// One piece per slot. Only drop a second piece when both are known library items: without the library
// (opened offline as a file, or before it has loaded) every unknown name guesses "Torso", and must not be deleted.
// Runs at the start of every calc, before anything counts armor, so the totals never include a duplicate.
function dedupeArmor(){const seen={};S.arm=S.arm.filter(n=>{const sl=slotOf(n);if(seen[sl])return !(W(n)&&W(seen[sl]));seen[sl]=n;return true})}
function renderArmory(){
 let wt=0;
 const bySlot={};S.arm.forEach(n=>{const sl=slotOf(n);if(!bySlot[sl])bySlot[sl]=n});
 let armSum=0,chemSum=0;
 setHTML($("#aslots"),SLOTS.map(sl=>{const n=bySlot[sl],it=n?W(n)||{}:{},w=num(it.Weight),av=num(it.Armor),cv=num(it.Chemical);if(n){wt+=w;armSum+=av;chemSum+=cv}
  const list=(L.by.armor||[]).filter(a=>slotOf(a.name)===sl);
  return `<div class="tank aslot${n?" on":""}"><div class="tl"><b>${sl}</b><small class="sub" style="margin:0">${n?`+${av} MECH${cv?` · +${cv} CHEM`:""} · ${w} lb`:"empty"}</small></div>
   <select data-aslot="${sl}" aria-label="${sl} armor"><option value="">${list.length?"— Nothing —":"— None in library —"}</option>${list.map(a=>`<option${a.name===n?" selected":""}>${esc(a.name)}</option>`).join("")}${n&&!list.some(a=>a.name===n)?`<option selected>${esc(n)}</option>`:""}</select>
   ${it.Notes?`<div class="sub">${esc(it.Notes)}</div>`:""}${bonTags(it)}</div>`}).join(""));
 $("#armtot").textContent=`+${armSum} mechanical · +${chemSum} chemical from gear`;
 const wpns=S.wpn.map((x,i)=>{const it=W(x.name)||{},mx=num(it.MaxAmmo),w=num(it.Weight),fire=mx>0,empty=fire&&x.ammo<=0,sk=it.Skill||"One-Handed";wt+=w;
  const ty=fire?wtype(x):"",sp=ty?num(S.ammo[ty]):0,full=x.ammo>=mx,dry=ty&&sp<=0&&!full;
  return `<div class="tank"><div class="tl"><b>${esc(x.name)}</b><span>${w} lb <button data-un="wpn" data-i="${i}" aria-label="Unequip ${esc(x.name)}">×</button></span></div><div class="sub">${esc(sk)} (${CUR.fin[norm(sk)]??`<b class="dn" title="No skill called ${esc(sk)} on this sheet">?</b>`}) · DMG ${esc(it.Damage||"—")}${it.Range?" · RNG "+esc(it.Range):""}</div>${it.Notes?`<div class="sub">${esc(it.Notes)}</div>`:""}${bonTags(it)}${fire?mag(i,x.ammo,mx):""}<div class="tl" style="margin-top:6px;flex-wrap:wrap"><button data-atk="${i}"${empty?" disabled":""} style="white-space:nowrap">${empty?"Empty, reload":fire?"Fire & roll":"Strike & roll"}</button>${fire?`<span class="sub" style="margin:0;white-space:nowrap"><b class="${empty?"dn":""}">${x.ammo}</b> / ${mx}${magPer(mx)>1?` <small>(each ▮ = ${magPer(mx)})</small>`:""} <button data-rl="${i}"${full||dry?" disabled":""}>${dry?"No spare ammo":"↻ Reload"}</button></span>`:""}</div>`+
   (fire?`<div class="tl wammo" style="margin-top:6px"><label class="sub" style="margin:0">Ammo <select data-wtype="${i}" aria-label="${esc(x.name)} ammo type"><option value=""${ty?"":" selected"}>— untracked —</option>${ammoTypes().map(t=>`<option${t===ty?" selected":""}>${esc(t)}</option>`).join("")}</select></label><span class="sub" style="margin:0">${ty?`<b class="${sp?"":"dn"}">${sp}</b> spare`:"free reloads"}</span></div>`:"")+`</div>`}).join("");
 const used={};S.wpn.forEach(x=>{const t=wtype(x);if(t&&num((W(x.name)||{}).MaxAmmo)>0)(used[t]=used[t]||[]).push(x.name)});
 setHTML($("#ammo"),ammoTypes().map(t=>`<div class="tank${used[t]?" on":""}"><div class="tl"><b>${esc(t)}</b><input type="number" min="0" data-ammotype="${esc(t)}" value="${num(S.ammo[t])}" aria-label="${esc(t)} spare rounds"></div><div class="btns">${[-10,-1,1,10].map(v=>`<button data-ad="${v}" data-at="${esc(t)}" aria-label="${v>0?"Add":"Remove"} ${Math.abs(v)} ${esc(t)}">${v>0?"+":""}${v}</button>`).join("")}</div>${used[t]?`<div class="sub">${used[t].map(esc).join(", ")}</div>`:""}</div>`).join(""));
 const gear=S.gear.map((g,i)=>{const it=g.link?W(g.link)||{}:g,uw=g.link?num(it.Weight):num(g.weight),q=num(g.qty,1);wt+=uw*q;
  return `<div class="tank"><div class="tl">${g.link?`<b>${esc(g.link)}</b>`:`<input type="text" data-gi="${i}" data-gf="name" value="${esc(g.name||"Item")}" aria-label="Item name">`}<span>× <input type="number" data-gi="${i}" data-gf="qty" value="${q}" aria-label="Quantity"> ${g.link?uw+" lb":`<input type="number" data-gi="${i}" data-gf="weight" value="${uw}" aria-label="Unit weight"> lb`} <button data-un="gear" data-i="${i}" aria-label="Remove item">×</button></span></div>${it.Notes?`<div class="sub">${esc(it.Notes)}</div>`:""}</div>`}).join("");
 const conds=S.conds.map((n,i)=>{const it=W(n)||{},r=S.cdur[n],dy=norm(n)==="dying";
  return `<div class="tank${dy?" down":""}"><div class="tl"><b class="dn">${dy?"**":"!!"} ${esc(n)}</b><span><label class="sub" style="margin:0" title="Rounds left. Leave blank to last until cleared.">RND <input type="number" min="0" data-cdur="${esc(n)}" value="${r||""}" placeholder="∞" aria-label="${esc(n)} rounds left"></label> <button data-un="cond" data-i="${i}" aria-label="Clear ${esc(n)}">×</button></span></div><div class="sub">${esc(it.Effect||it.Description||(dy?"At 0 HP. Healing above 0 clears this.":""))}</div>${bonTags(it)}</div>`}).join("");
 const mx=Math.max(10,num(CUR.attr.body)*10),over=wt>mx,pc=Math.min(100,wt/mx*100);
 $("#load").textContent=`${over?"!! Overburdened ":""}${Math.round(wt*10)/10} / ${mx} lb`;$("#load").className=over?"dn":"";
 $("#loadbar").style.width=pc+"%";$("#loadbar").style.background=over?"var(--bad)":pc>80?"#d9822b":"var(--ok)";
 setHTML($("#conds"),conds||`<div class="sub">No active conditions.</div>`);
 setHTML($("#wpns"),wpns||`<div class="sub">No weapons equipped.</div>`);
 setHTML($("#gear"),gear||`<div class="sub">No items.</div>`);
 $("#addcond").innerHTML=opts("+ Apply condition…",(L.by.condition||[]).filter(c=>!S.conds.some(x=>norm(x)===norm(c.name))));
 $("#addwpn").innerHTML=opts("+ Equip weapon…",L.by.weapon||[]);
 $("#additem").innerHTML=opts("+ Add item…",L.by.item||[])}

document.addEventListener("click",e=>{
 const g=e.target.closest("[data-hd],[data-bd],[data-un],[data-atk],[data-rl],[data-shot],[data-ad],#addcustom,#nextr");if(!g)return;
 if(g.id==="nextr"){const gone=[];
  S.conds=S.conds.filter(n=>{if(!S.cdur[n])return true;if(--S.cdur[n]>0)return true;delete S.cdur[n];gone.push(n);return false});
  $("#rmsg").textContent=gone.length?`Round passed. ${gone.join(", ")} wore off.`:"Round passed.";update();return}
 const d=g.dataset,i=+d.i;
 if(d.hd){const prev=S.hp;S.hp=capHp(Math.min(hpCap(),prev)+ +d.hd);hpChanged(prev);update()}
 else if(d.bd){const m=barrierMax();S.barrier=d.bd==="full"?m:Math.max(0,Math.min(m,Math.min(m,S.barrier)+ +d.bd));update()}
 else if(d.un){
  // Unequipping a tracked weapon puts its loaded rounds back in the pool
  if(d.un==="cond")delete S.cdur[S.conds[i]];
  if(d.un==="wpn"){const x=S.wpn[i],ty=wtype(x);if(ty&&x.ammo>0&&num((W(x.name)||{}).MaxAmmo)>0)S.ammo[ty]=num(S.ammo[ty])+x.ammo}
  ({arm:S.arm,wpn:S.wpn,gear:S.gear,cond:S.conds})[d.un].splice(i,1);update()}
 else if(d.ad){S.ammo[d.at]=Math.max(0,num(S.ammo[d.at])+ +d.ad);update()}
 else if(d.shot){const[wi,k]=d.shot.split("|").map(Number),x=S.wpn[wi],mx=num((W(x.name)||{}).MaxAmmo),per=magPer(mx),top=Math.min(mx,k*per);x.ammo=x.ammo===top?(k-1)*per:top;update()}
 else if(d.rl){const x=S.wpn[+d.rl],mx=num((W(x.name)||{}).MaxAmmo),ty=wtype(x),need=Math.max(0,mx-x.ammo);
  if(!ty){x.ammo=mx;$("#atk").textContent=`↻ ${x.name} reloaded.`}
  else{const take=Math.min(need,num(S.ammo[ty]));if(!take){$("#atk").textContent=`!! No spare ${ty} for ${x.name}.`;return}
   x.ammo+=take;S.ammo[ty]=num(S.ammo[ty])-take;
   $("#atk").textContent=`↻ ${x.name} loaded ${take} ${ty}${take<need?`, ${need-take} short`:""}. ${S.ammo[ty]} left.`}
  update()}
 else if(d.atk!==undefined){const x=S.wpn[+d.atk],it=W(x.name)||{},sk=it.Skill||"One-Handed",t=CUR.fin[norm(sk)];
  if(t==null){$("#atk").innerHTML=`!! <b>${esc(x.name)}</b>: no skill called “${esc(sk)}”. Check the weapon’s Skill field.`;return}
  if(num(it.MaxAmmo)>0){if(x.ammo<=0)return;x.ammo--}
  const r=Math.floor(Math.random()*100)+1,ok=r<=t;
  const dm=ok&&it.Damage?rollDice(it.Damage):null;
  addRoll({n:x.name+" ["+sk+"]",d:r,v:t,ok,df:S.diff,k:"atk",dmg:dm?dm.total:null,x:ok&&it.Damage?(dm?dmgText(it.Damage,dm):"DMG "+it.Damage):""});
  $("#atk").innerHTML=`&gt;&gt; <b>${esc(x.name)}</b> [${esc(sk)}] ${r} ${ok?"≤":">"} ${t} · <b class="${ok?"up":"dn"}">${ok?"HIT":"MISS"}</b>`+
   (ok?(dm?` · <b>${dm.total} dmg</b>${dm.rest?" "+esc(dm.rest):""} <small>${esc(it.Damage)}: ${esc(dm.detail)}</small>`:` (${esc(it.Damage||"—")})`):"");
  update()}
 else if(g.id==="addcustom"){S.gear.push({name:"Field ration / salvage",qty:1,weight:1});update()}});

document.addEventListener("change",e=>{
 const t=e.target,d=t.dataset,id=t.id;
 if(d.c){S[d.c]=num(t.value);update()}
 // An emptied box means "no change", not 0 HP (which would also mark the character Dying)
 else if(d.hp){if(t.value.trim()===""){update();return}const prev=S.hp;S[d.hp]=d.hp==="maxHp"?Math.round(num(t.value,0)):capHp(num(t.value));if(d.hp==="hp")hpChanged(prev);update()}
 else if(d.barrier!==undefined){S.barrier=Math.max(0,Math.min(barrierMax(),num(t.value)));update()}
 else if(d.cdur!==undefined){const v=Math.floor(num(t.value));if(v>0)S.cdur[d.cdur]=v;else delete S.cdur[d.cdur];update()}
 else if(d.ammotype!==undefined){S.ammo[d.ammotype]=Math.max(0,Math.floor(num(t.value)));update()}
 else if(d.wtype!==undefined){S.wpn[+d.wtype].type=t.value;update()}
 else if(d.gi!==undefined){const g=S.gear[+d.gi];if(d.gf==="name")g.name=t.value.trim()||"Item";else g[d.gf]=Math.max(0,num(t.value));update()}
 else if(t.value&&["addcond","addwpn","additem"].includes(id)){
  if(id==="addcond"){S.conds.push(t.value);const it=W(t.value)||{},r=Math.floor(num(it.Duration??it.Rounds));if(r>0)S.cdur[t.value]=r}
  else if(id==="addwpn"){
   // A weapon whose library entry names its ammo type is loaded from the pool; others come loaded
   const mx=num((W(t.value)||{}).MaxAmmo),x={name:t.value,ammo:mx},ty=mx>0?wtype(x):"";
   if(ty){const take=Math.min(mx,num(S.ammo[ty]));x.ammo=take;S.ammo[ty]=num(S.ammo[ty])-take}
   S.wpn.push(x)}
  else S.gear.push({link:t.value,qty:1});
  update()}});

document.addEventListener("input",e=>{const t=e.target;if(t.dataset.m){S[t.dataset.m]=t.value;save()}});

$("#pfile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,420/Math.max(im.width,im.height)),c=document.createElement("canvas");
  c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);
  S.portrait=c.toDataURL("image/jpeg",.8);update()};im.src=r.result};r.readAsDataURL(f)});

let LIBSRC="";
try{setLib(JSON.parse(localStorage.getItem("lib-v1")||"{}"));if(Object.keys(L.all).length)LIBSRC="saved in this browser"}catch(e){}
showTab();
fill();update();

// The GM's library.json, published next to this page, loads on every open so everyone has the latest.
// The copy saved in this browser is the fallback when offline or opened from a file.
(async function(){if(!/^https?:$/.test(location.protocol))return;
 try{const r=await fetch("library.json",{cache:"no-cache"});if(!r.ok)return;const o=JSON.parse(await r.text());
  let prev=null;try{prev=localStorage.getItem("lib-v1")}catch(e){}
  const res=setLib(o),now=JSON.stringify(o);LIBSRC="from the site";try{localStorage.setItem("lib-v1",now)}catch(e){}
  update();if(prev&&prev!=="{}"&&prev!==now)$("#lmsg").textContent=`Library updated from the site: ${res.n} entries.`}catch(e){}})();

// Opening a share link (…#c=…) offers to add that character, on load or when pasted into a sheet that's already open
async function openShare(){const m=location.hash.match(/^#c=(.+)$/);if(!m)return;history.replaceState(null,"",location.pathname+location.search);
 let c;try{c=fix(await unpack(m[1]))}catch(e){alert(m[1][0]==="z"&&!window.DecompressionStream?"This browser is too old to open share links. Update it, or ask for a backup file instead.":"That share link is damaged or incomplete.");return}
 if(confirm(`Add the shared character "${c.name}" to this sheet?`)){addChar(c);$("#msg").textContent=`Added ${c.name} from a share link.`}}
openShare();window.addEventListener("hashchange",openShare);

// Installable and usable offline (see sw.js); only on the website, not when opened as a file
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))navigator.serviceWorker.register("sw.js").catch(()=>{});
