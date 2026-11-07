'use strict';
const $=s=>document.querySelector(s),app=$('#app'),tabs=$('#tabs');
const fa=s=>String(s).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const tm=m=>fa(pad(Math.floor(m/60)%24)+':'+pad(m%60));
const toM=h=>{const[a,b]=h.split(':').map(Number);return a*60+b};
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const dk=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const nowM=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const COL=['#5b5bf0','#16a34a','#f59e0b','#e11d48','#0ea5e9','#8b5cf6'];
let DB={cats:[],questions:[]},EX={},P=LS.get('amin_profile',null),view='home',quiz=null,tick=null,studyCat=null,studyQ='',studyN=40;
const ans=q=>q.a!=null?q.a:(EX[q.id]!=null?EX[q.id]:null);
const pool=()=>DB.questions.filter(q=>ans(q)!=null&&!q.d);

function theme(t){document.documentElement.dataset.theme=t;LS.set('amin_theme',t)}
theme(LS.get('amin_theme',matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

/* ---------- plan ---------- */
function plan(){
  const w=toM(P.wake),fs=toM(P.fs),fe=toM(P.fe);let s=toM(P.sleep);
  const free=fe-fs,dur=free<40?free:Math.min(45,Math.max(30,Math.round(free/3))),ts=fe-dur;
  if(s<=fe)s+=1440;
  const i=Math.floor(Date.now()/864e5)%6,c1=DB.cats[i],c2=DB.cats[(i+3)%6],B=[];
  const add=(a,b,t,sub,k,c)=>B.push({a,b,t,sub,k,c});
  add(w,fs,'کار و برنامه‌های شخصی',P.busy||'زمان پر',  'busy','#94a3b8');
  const rev=ts-fs>=40?10:0,main=ts-fs-rev;let t=fs;
  if(main>=70){const a=Math.round(main*.6/5)*5;add(t,t+a,'درسنامه: '+c1,'مطالعه و یادداشت‌برداری','study',COL[i]);add(t+a,t+main,'درسنامه: '+c2,'مطالعه و یادداشت‌برداری','study',COL[(i+3)%6])}
  else if(main>=15)add(t,t+main,'درسنامه: '+c1,'مطالعه و یادداشت‌برداری','study',COL[i]);
  if(rev)add(ts-rev,ts,'تمرین دستگرمی','۱۰ سؤال بدون استرس قبل از آزمون اصلی','warm','#f59e0b');
  add(ts,fe,'آزمون اصلی','فقط در همین بازه فعال است','test','#5b5bf0');
  add(fe,s,'استراحت و مرور سبک','نکات مهم امروز را یک‌بار مرور کن','rest','#0ea5e9');
  add(s,w+1440,'خواب','انرژی فردا از امشب ساخته می‌شود','sleep','#64748b');
  return{B,ts,fe,dur,c1,c2};
}
function status(){
  const p=plan(),n=nowM(),d=LS.get('amin_main_'+dk(),null);
  let k=d?'done':n<p.ts?'before':n<p.fe?'open':'expired';
  return{k,p,n,left:p.ts-n,close:p.fe-n};
}

/* ---------- shell ---------- */
const ICON={home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',test:'<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',study:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7M8 11h7"/>',me:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>'};
function nav(v){view=v;if(v!=='study'){studyCat=null;studyQ='';studyN=40}render();scrollTo(0,0)}
function render(){
  clearInterval(tick);
  if(!P&&view!=='setup')view='setup';
  tabs.className=(view==='setup'||view==='quiz'||(view==='result'&&!P))?'hide':'';
  if(P&&view!=='setup'&&view!=='quiz'){
    const T=[['home','امروز'],['test','آزمون'],['study','درسنامه'],['me','من']];
    tabs.innerHTML=T.map(([k,l])=>`<button class="${(view===k||(view==='result'&&k==='test'))?'on':''}" onclick="nav('${k}')"><svg viewBox="0 0 24 24">${ICON[k]}</svg>${l}</button>`).join('');
  }
  ({setup:vSetup,home:vHome,test:vTest,study:vStudy,me:vMe,quiz:vQuiz,result:vResult})[view]();
  if(view==='home'||view==='test')tick=setInterval(()=>{if(view==='home'||view==='test')render()},30000);
}

/* ---------- setup ---------- */
function vSetup(){
  const p=P||{name:'',wake:'06:30',sleep:'23:00',fs:'18:00',fe:'21:00',busy:''};
  app.innerHTML=`<div class="hero"><small>${P?'ویرایش مشخصات':'خوش آمدی'}</small><b>Amin Test</b><small>چند سؤال ساده؛ بعد برنامه روزانه‌ات آماده است.</small></div>
  <div class="card"><label>اسم تو</label><input id="n" value="${esc(p.name)}" placeholder="مثلاً امین">
  <div class="g2"><div><label>ساعت بیدار شدن</label><input id="w" type="time" value="${p.wake}"></div><div><label>ساعت خواب</label><input id="s" type="time" value="${p.sleep}"></div></div>
  <div class="g2"><div><label>شروع زمان آزاد</label><input id="fs" type="time" value="${p.fs}"></div><div><label>پایان زمان آزاد</label><input id="fe" type="time" value="${p.fe}"></div></div>
  <label>کار یا مشغولیت روزانه (اختیاری)</label><input id="b" value="${esc(p.busy)}" placeholder="مثلاً کار، دانشگاه، ...">
  <p class="note">آزمون اصلی هر روز در انتهای زمان آزاد تو برگزار می‌شود و بعد از آن بازه، منقضی می‌شود.</p>
  <p id="er" class="note" style="color:var(--no)"></p><button class="btn" onclick="saveSetup()">${P?'ذخیره':'ساخت برنامه من'}</button></div>`;
}
function saveSetup(){
  const g=i=>$('#'+i).value,n=g('n').trim(),er=$('#er');
  if(!n)return er.textContent='اسمت را وارد کن.';
  if(!g('w')||!g('s')||!g('fs')||!g('fe'))return er.textContent='همه ساعت‌ها را پر کن.';
  const w=toM(g('w')),fs=toM(g('fs')),fe=toM(g('fe'));
  if(!(w<=fs&&fs+30<=fe))return er.textContent='زمان آزاد باید بعد از بیدار شدن شروع شود و حداقل ۳۰ دقیقه باشد.';
  P={name:n,wake:g('w'),sleep:g('s'),fs:g('fs'),fe:g('fe'),busy:g('b').trim()};LS.set('amin_profile',P);nav('home');
}

/* ---------- home ---------- */
function stBox(S){
  const m={before:['pill wa','هنوز زود است',`آزمون اصلی ساعت ${tm(S.p.ts)} باز می‌شود (${fa(Math.max(0,S.left))} دقیقه دیگر)`],
  open:['pill ok','باز است',`تا ساعت ${tm(S.p.fe)} فرصت داری (${fa(S.close)} دقیقه مانده)`],
  expired:['pill no','منقضی شد','بازه امروز تمام شد؛ فردا دوباره. تمرین دستگرمی آزاد است.'],
  done:['pill ok','انجام شد','آزمون امروزت را داده‌ای. نتیجه را در تب آزمون ببین.']}[S.k];
  return `<span class="${m[0]}">${m[1]}</span><p class="note" style="margin:6px 0 0">${m[2]}</p>`;
}
function vHome(){
  const S=status(),n=S.n,hs=LS.get('amin_hist',[]).filter(h=>h.mode==='main'),avg=hs.length?Math.round(hs.reduce((a,h)=>a+h.net,0)/hs.length):null;
  app.innerHTML=`<div class="hero"><small>${new Date().toLocaleDateString('fa-IR',{weekday:'long',day:'numeric',month:'long'})}</small><b>سلام ${esc(P.name)} 👋</b><small>امروز تمرکزت: ${esc(S.p.c1)}</small></div>
  <div class="card"><div class="row sp"><h3>آزمون اصلی امروز</h3><span class="timer">${tm(S.p.ts)}–${tm(S.p.fe)}</span></div><div style="margin-top:8px">${stBox(S)}</div>
  <button class="btn" style="margin-top:12px" onclick="nav('test')">${S.k==='open'?'رفتن به آزمون':'بخش آزمون'}</button></div>
  ${avg!=null?`<div class="card row sp"><span>میانگین نمره آزمون‌های اصلی</span><b class="timer">${fa(avg)}٪</b></div>`:''}
  <h2>برنامه امروز</h2><div class="tl">${S.p.B.map(b=>`<div class="blk ${b.k==='test'?'test':''} ${((n>=b.a&&n<b.b)||(n+1440>=b.a&&n+1440<b.b))?'now':''}" style="--c:${b.c}"><div class="row sp"><b>${esc(b.t)}</b><small>${tm(b.a)}–${tm(b.b)}</small></div><small>${esc(b.sub)}</small></div>`).join('')}</div>
  <p class="note" style="text-align:center;margin-top:20px">ساخته‌شده توسط امیر حسین بابایی</p>`;
}

/* ---------- test hub ---------- */
function vTest(){
  const S=status(),hist=LS.get('amin_hist',[]).slice().reverse();
  const N=Math.max(10,Math.min(60,Math.round(S.p.dur*.6)));
  app.innerHTML=`<h2>آزمون</h2>
  <div class="card"><div class="row sp"><h3>آزمون اصلی</h3><span class="timer">${tm(S.p.ts)}–${tm(S.p.fe)}</span></div>
  <p class="note">${fa(N)} سؤال • فقط در بازه بالا • فقط یک‌بار در روز • نمره منفی ⅓ دارد</p>${stBox(S)}
  <button class="btn" style="margin-top:12px" ${S.k==='open'?'':'disabled'} onclick="startQuiz('main')">شروع آزمون اصلی</button></div>
  <div class="card"><h3>تمرین دستگرمی</h3><p class="note">۱۰ سؤال، بدون محدودیت زمان و با پاسخ فوری. هر وقت خواستی، بی‌نهایت بار.</p><button class="btn sec" onclick="startQuiz('practice')">شروع تمرین</button></div>
  <h2>سوابق</h2>${hist.length?hist.slice(0,15).map((h,i)=>`<div class="card row sp" onclick="showRes(${hist.length-1-i})"><div><b>${h.mode==='main'?'آزمون اصلی':'تمرین'}</b><div class="note">${new Date(h.t).toLocaleDateString('fa-IR',{month:'long',day:'numeric'})} • ${fa(h.c)} درست از ${fa(h.n)}</div></div><b class="timer">${fa(h.net)}٪</b></div>`).join(''):'<p class="note">هنوز آزمونی نداده‌ای.</p>'}`;
}

/* ---------- quiz ---------- */
function pick(n){
  const seen=new Set(LS.get('amin_seen',[])),by=DB.cats.map((_,i)=>shuf(pool().filter(q=>q.c===i)).sort((a,b)=>seen.has(a.id)-seen.has(b.id)));
  const out=[];for(let r=0;out.length<n;r++){let any=false;for(const l of by){if(l[r]&&out.length<n){out.push(l[r]);any=true}}if(!any)break}
  return shuf(out);
}
function startQuiz(mode){
  let n,end=null;
  if(mode==='main'){const S=status();if(S.k!=='open')return;n=Math.max(10,Math.min(60,Math.round(S.p.dur*.6)));end=Date.now()+S.close*60000-new Date().getSeconds()*1000;LS.set('amin_main_'+dk(),{started:Date.now()})}
  else n=10;
  const qs=pick(n);quiz={mode,ids:qs.map(q=>q.id),sel:qs.map(()=>null),i:0,end};LS.set('amin_cur',quiz);view='quiz';render();
}
function qOf(id){return DB.questions.find(q=>q.id===id)}
function vQuiz(){
  const q=qOf(quiz.ids[quiz.i]),n=quiz.ids.length,sel=quiz.sel[quiz.i],fb=quiz.mode==='practice'&&sel!=null,a=ans(q);
  app.innerHTML=`<div class="top"><div class="row sp"><b>${fa(quiz.i+1)} از ${fa(n)}</b>${quiz.end?'<span id="cd" class="timer"></span>':'<span class="pill">تمرین</span>'}</div><div class="bar" style="margin-top:8px"><i style="width:${(quiz.i+1)/n*100}%"></i></div></div>
  <div class="card"><p style="font-weight:700;margin-top:0">${esc(q.q)}</p>${q.o.map((o,k)=>`<button class="opt ${fb?(k===a?'ok':k===sel?'bad':''):(sel===k?'sel':'')}" onclick="choose(${k})">${fa(k+1)}) ${esc(o)}</button>`).join('')}</div>
  <div class="row"><button class="btn sec" ${quiz.i?'':'disabled'} onclick="go(-1)">قبلی</button>${quiz.i<n-1?'<button class="btn" onclick="go(1)">بعدی</button>':'<button class="btn" onclick="finish(false)">پایان</button>'}</div>
  ${quiz.i<n-1?'<p style="text-align:center"><button class="btn sec sm" onclick="finish(false)">پایان آزمون</button></p>':''}`;
  if(quiz.end){const u=()=>{const l=Math.max(0,Math.floor((quiz.end-Date.now())/1000)),e=$('#cd');if(!e)return clearInterval(tick);e.textContent=fa(pad(Math.floor(l/60))+':'+pad(l%60));e.className='timer'+(l<60?' low':'');if(l<=0){clearInterval(tick);finish(true)}};u();tick=setInterval(u,1000)}
}
function choose(k){if(quiz.mode==='practice'&&quiz.sel[quiz.i]!=null)return;quiz.sel[quiz.i]=quiz.sel[quiz.i]===k&&quiz.mode==='main'?null:k;LS.set('amin_cur',quiz);vQuiz()}
function go(d){quiz.i+=d;LS.set('amin_cur',quiz);vQuiz();scrollTo(0,0)}
function finish(auto){
  if(!auto&&quiz.sel.includes(null)&&!confirm('بعضی سؤال‌ها بی‌پاسخ مانده‌اند. آزمون تمام شود؟'))return;
  clearInterval(tick);let c=0,w=0,b=0;
  quiz.ids.forEach((id,i)=>{const s=quiz.sel[i];if(s==null)b++;else if(s===ans(qOf(id)))c++;else w++});
  const n=quiz.ids.length,r={t:Date.now(),mode:quiz.mode,n,c,w,b,pct:Math.round(c/n*100),net:Math.max(0,Math.round((c-w/3)/n*100)),ids:quiz.ids,sel:quiz.sel};
  const h=LS.get('amin_hist',[]);h.push(r);LS.set('amin_hist',h.slice(-60));
  LS.set('amin_seen',[...new Set([...LS.get('amin_seen',[]),...quiz.ids])]);
  if(quiz.mode==='main')LS.set('amin_main_'+dk(),{done:true,t:r.t});
  LS.del('amin_cur');quiz=null;showRes(h.length-1);
}
let RES=null;
function showRes(i){RES=LS.get('amin_hist',[])[i];view='result';render();scrollTo(0,0)}
function vResult(){
  const r=RES,g=r.net>=70?'عالی! ادامه بده 🔥':r.net>=50?'خوب است؛ با مرور بهتر هم می‌شود 💪':'نگران نباش؛ درسنامه را بخوان و دوباره تلاش کن 📚';
  app.innerHTML=`<div class="card"><p class="note" style="text-align:center;margin:0">${r.mode==='main'?'نتیجه آزمون اصلی':'نتیجه تمرین'}</p><div class="big">${fa(r.net)}٪</div><p style="text-align:center;margin:0 0 12px">${g}</p>
  <div class="stats"><div><b style="color:var(--ok)">${fa(r.c)}</b>درست</div><div><b style="color:var(--no)">${fa(r.w)}</b>غلط</div><div><b>${fa(r.b)}</b>بی‌پاسخ</div></div>
  <p class="note" style="text-align:center;margin-bottom:0">درصد ساده: ${fa(r.pct)}٪ • درصد با نمره منفی: ${fa(r.net)}٪</p></div>
  <h2>مرور پاسخ‌ها</h2>${r.ids.map((id,i)=>{const q=qOf(id),s=r.sel[i],a=ans(q);return `<div class="card"><p style="margin-top:0;font-weight:700">${fa(i+1)}. ${esc(q.q)}</p>${q.o.map((o,k)=>`<div class="opt ${k===a?'ok':k===s?'bad':''}">${fa(k+1)}) ${esc(o)}</div>`).join('')}${s==null?'<span class="pill wa">بی‌پاسخ</span>':''}</div>`}).join('')}
  <button class="btn" onclick="nav('home')">بازگشت</button>`;
}

/* ---------- study ---------- */
function vStudy(){
  if(studyCat==null){
    app.innerHTML=`<h2>درسنامه</h2><p class="note">همه سؤال‌ها با پاسخ، برای مطالعه.</p>`+DB.cats.map((c,i)=>{const L=DB.questions.filter(q=>q.c===i),A=L.filter(q=>ans(q)!=null).length;return `<div class="card" onclick="openCat(${i})"><div class="row sp"><h3>${esc(c)}</h3><span class="pill">${fa(L.length)} سؤال</span></div><div class="bar" style="margin:10px 0 4px"><i style="width:${A/L.length*100}%"></i></div><small class="note">${fa(A)} سؤال دارای پاسخ</small></div>`}).join('');
    return;
  }
  app.innerHTML=`<div class="top"><button class="btn sec sm" onclick="studyCat=null;studyQ='';studyN=40;render()">← دسته‌ها</button><input id="sq" style="margin-top:8px" placeholder="جستجو در سؤال‌ها..." value="${esc(studyQ)}" oninput="studyQ=this.value;studyN=40;drawList()"></div><h2>${esc(DB.cats[studyCat])}</h2><div id="lst"></div>`;
  drawList();
}
function openCat(i){studyCat=i;studyQ='';studyN=40;render();scrollTo(0,0)}
const norm=s=>String(s).replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u064b-\u0652]/g,'');
function drawList(){
  const k=norm(studyQ.trim()),L=DB.questions.filter(q=>q.c===studyCat&&(!k||norm(q.q+q.o.join(' ')).includes(k)));
  $('#lst').innerHTML=L.slice(0,studyN).map(q=>{const a=ans(q);return `<div class="card"><p style="margin-top:0;font-weight:700">${esc(q.q)}</p>${q.o.map((o,j)=>`<div class="opt ${j===a?'ok':''}">${fa(j+1)}) ${esc(o)}</div>`).join('')}${a==null?'<span class="pill wa">پاسخ هنوز ثبت نشده</span>':q.a==null?'<span class="pill">پاسخ تکمیلی (تأیید نشده)</span>':''}${q.e&&q.a!=null?`<div class="exp">${esc(q.e)}</div>`:''}</div>`}).join('')+(L.length>studyN?`<button class="btn sec" onclick="studyN+=40;drawList()">نمایش بیشتر (${fa(L.length-studyN)})</button>`:'')+(L.length?'':'<p class="note">موردی پیدا نشد.</p>');
}

/* ---------- me ---------- */
function vMe(){
  const dark=document.documentElement.dataset.theme==='dark';
  app.innerHTML=`<h2>من</h2><div class="card"><div class="row sp"><div><b>${esc(P.name)}</b><div class="note">بیدار ${tm(toM(P.wake))} • خواب ${tm(toM(P.sleep))} • زمان آزاد ${tm(toM(P.fs))}–${tm(toM(P.fe))}</div></div><button class="btn sm" onclick="view='setup';render()">ویرایش</button></div></div>
  <div class="card row sp"><span>تم تاریک</span><button class="btn sm" onclick="theme('${dark?'light':'dark'}');render()">${dark?'روشن کن ☀️':'تاریک کن 🌙'}</button></div>
  <div class="card"><h3>درباره ما</h3><p class="note">Amin Test برای آمادگی آزمون استخدامی ساخته شده: برنامه روزانه، آزمون در بازه مشخص، تمرین دستگرمی و درسنامه کامل.</p><p style="margin:0"><b>سازنده: امیر حسین بابایی</b></p></div>`;
}

/* ---------- boot ---------- */
(async()=>{
  try{DB=await (await fetch('questions.json')).json();EX=await (await fetch('answers_extra.json')).json()}catch(e){app.innerHTML='<div class="card">خطا در بارگذاری سؤال‌ها.</div>';return}
  const cur=LS.get('amin_cur',null);
  if(cur&&P){if(cur.end&&Date.now()>=cur.end||!cur.end&&false){quiz=cur;finish(true);return}quiz=cur;view='quiz'}
  render();
})();
