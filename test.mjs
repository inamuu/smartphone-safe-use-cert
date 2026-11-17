import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const published=JSON.parse(fs.readFileSync(new URL('./published.json',import.meta.url),'utf8'));
const built=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const source=built.match(/<script id="course-app">([\s\S]*?)<\/script>/)[1].replace(/window.addEventListener\('hashchange',route\);\nroute\(\);/, '');
assert.ok(!/__HERO__|__LESSONS__|__CHAPTERS__/.test(built));
for(const chapter of published){
const chapterData=chapter===1?{lessons:JSON.parse(fs.readFileSync(new URL('./lessons.json',import.meta.url),'utf8'))}:JSON.parse(fs.readFileSync(new URL(`./chapter${chapter}.json`,import.meta.url),'utf8'));
const lessonsData=chapterData.lessons;
const sandbox = {URLSearchParams,location:{search:`?chapter=${chapter}`},localStorage:{getItem:()=>null},document:{getElementById:()=>({addEventListener:()=>{}})},console};
vm.createContext(sandbox);vm.runInContext(source, sandbox);
const run = s => vm.runInContext(s, sandbox);
assert.equal(run('lessons.length'),8);
assert.equal(run('lessons.filter(s=>s.check).length'),3);
assert.equal(run('questions.length'),16);
assert.equal(run('chapterNumber'),chapter);
if(chapter>=3){assert.ok(chapterData.sources.length>0);for(let i=0;i<8;i++)assert.equal(run(`questions.filter(q=>q.slide===${i}).length`),2);}
assert.equal(run('new Set(questions.map(q=>q.id)).size'),16);
assert.ok(run('questions.every(q=>q.answer>=0&&q.answer<q.options.length&&q.slide>=0&&q.slide<lessons.length)'));
for(let trial=0;trial<100;trial++){
  run('var generated=createExam()');
  assert.equal(run('generated.length'),10);
  assert.equal(run('new Set(generated.map(q=>q.id)).size'),10);
  assert.equal(run('generated.filter(q=>q.critical).length'),1);
  assert.ok(run('generated.every(q=>q.options[q.answer]===questions.find(o=>o.id===q.id).options[questions.find(o=>o.id===q.id).answer])'));
  assert.ok(run('grade(generated,generated.map(q=>q.answer)).passed'));
  assert.equal(run('grade(generated,generated.map(q=>q.critical?(q.answer+1)%3:q.answer)).passed'),false);
  assert.ok(run('var a=generated.map(q=>q.answer); var i=generated.findIndex(q=>!q.critical);a[i]=(a[i]+1)%3; grade(generated,a).passed'));
  assert.equal(run('var a=generated.map(q=>q.answer); var non=generated.map((q,i)=>q.critical?-1:i).filter(i=>i>=0); a[non[0]]=(a[non[0]]+1)%3;a[non[1]]=(a[non[1]]+1)%3;grade(generated,a).passed'),false);
}
assert.equal(run('sanitizeState({version:1,slide:999}).slide'),7);
assert.equal(run('sanitizeState({version:1,slide:-4}).slide'),0);
assert.equal(run('sanitizeState({version:99,learned:true}).learned'),false);
assert.equal(run('sanitizeState({version:1,rules:{minutes:"60",end:"99:99",place:"living",help:"parent"}}).rules'),null);
assert.equal(run('sanitizeState({version:1,rules:{minutes:"60",end:"20:30",place:"living",help:"parent"}}).rules.end'),'20:30');

assert.equal(new Set(lessonsData.map(s=>`${s.image}:${s.imagePanel??''}`)).size,8);
for(const lesson of lessonsData){if(chapter>=3){assert.ok(Number.isInteger(lesson.imagePanel)&&lesson.imagePanel>=0&&lesson.imagePanel<8);assert.ok(lesson.body.length+lesson.body2.length>=200);assert.equal(lesson.actions.length,3);}assert.ok(fs.statSync(new URL(lesson.image,import.meta.url)).size>0);assert.ok(lesson.imageAlt&&lesson.caption&&lesson.explanationTitle);}
assert.ok(built.includes('data:image/jpeg;base64,/9j/'));
assert.ok(!/<script[^>]+src=|https:\/\/fonts\./.test(built));
console.log(`Chapter ${chapter}:`);
console.log('PASS: curriculum, 100 randomized exams, answer mapping, pass boundaries, critical questions, storage validation, build and eight distinct lesson assets');
// Exercise rendering and delegated actions without a browser or third-party dependencies.
const elements={};
const dom={innerHTML:'',focus:()=>{},insertAdjacentHTML:()=>{},querySelector:()=>({focus:()=>{}}),addEventListener:(event,fn)=>{dom[event]=fn;}};
const element=id=>elements[id]||(elements[id]={textContent:'',style:{},addEventListener:()=>{}});
const localData=new Map();
const ui={URLSearchParams,console,Date,FormData,confirm:()=>true,localStorage:{getItem:k=>localData.get(k)||null,setItem:(k,v)=>localData.set(k,v)},document:{title:'',getElementById:id=>id==='main'?dom:element(id),querySelectorAll:()=>[]},location:{hash:'#/',search:`?chapter=${chapter}`},window:{scrollTo:()=>{},addEventListener:()=>{}}};
vm.createContext(ui);vm.runInContext(source,ui);
const page=s=>vm.runInContext(s,ui);
page('route()');assert.ok(dom.innerHTML.includes('スマホと、'));
page('location.hash="#/test";route()');assert.ok(dom.innerHTML.includes('まずは、お話を'));
page('location.hash="#/learn";route()');assert.ok(dom.innerHTML.includes('1 / 8'));
const click=(dataset,key)=>dom.click({target:{closest:selector=>selector===`[data-${key}]`?{dataset}:null}});
for(let slide=0;slide<8;slide++){
  assert.equal(page('state.slide'),slide);
  assert.ok(dom.innerHTML.includes(lessonsData[slide].image));
  assert.ok(dom.innerHTML.includes(lessonsData[slide].example.title));
  assert.ok(dom.innerHTML.includes(lessonsData[slide].actionTitle));
  if(page('!!lessons[state.slide].check')){
    click({action:'next-slide'},'action');assert.equal(page('state.slide'),slide);
  assert.ok(dom.innerHTML.includes(lessonsData[slide].image));
  assert.ok(dom.innerHTML.includes(lessonsData[slide].example.title));
  assert.ok(dom.innerHTML.includes(lessonsData[slide].actionTitle));
    const correct=page('lessons[state.slide].check.answer');
    click({choice:String((correct+1)%3)},'choice');
    assert.ok(dom.innerHTML.includes('もう一度、考えてみよう。'));
    click({choice:String(correct)},'choice');
    assert.ok(dom.innerHTML.includes('その考え方でOK！'));
  }
  click({action:'next-slide'},'action');
}
assert.ok(page('state.learned'));page('location.hash="#/test";route()');assert.ok(dom.innerHTML.includes('テストをはじめる'));
click({action:'start-exam'},'action');assert.ok(page('!!exam'));
click({action:'next-question'},'action');assert.equal(page('exam.index'),0);
for(let i=0;i<10;i++){
  click({answer:String(page('exam.items[exam.index].answer'))},'answer');
  click({action:'next-question'},'action');
}
assert.ok(page('result.passed'));assert.equal(page('state.attempts.length'),1);assert.ok(dom.innerHTML.includes(`第${chapter}章、合格！`));
page('location.hash="#/family";route()');assert.ok(dom.innerHTML.includes('親子で話し合って確認'));
page('location.hash="#/about";route()');assert.ok(dom.innerHTML.includes('記録とプライバシー'));
click({action:'reset'},'action');assert.equal(page('state.learned'),false);assert.equal(page('state.attempts.length'),0);
assert.ok(localData.size===1);
// Chapters use separate keys; old chapter 1 records remain valid.
assert.equal(page('STORAGE_KEY'),chapter===1?'smartphone-safe-use-cert:v1':`smartphone-safe-use-cert:chapter${chapter}:v1`);
assert.equal(page('sanitizeState({version:1,slide:7,learned:true,attempts:[{correct:10,passed:true,at:"2026-11-16"}]}).attempts.length'),1);
assert.ok(!dom.innerHTML.includes('__CHAPTERS__'));
const oldRecord={version:1,slide:7,learned:true,attempts:[{correct:10,passed:true,at:'2026-11-16'}],rules:{minutes:'60',end:'20:30',place:'living',help:'parent'}};
localData.clear();localData.set('smartphone-safe-use-cert:v1',JSON.stringify(oldRecord));
assert.equal(page('load().rules.end'),'20:30');
assert.equal(page('load().learned'),chapter===1);
page('state=load();state.slide=2;save()');
assert.equal(JSON.parse(localData.get('smartphone-safe-use-cert:v1')).slide,chapter===1?2:7);
page('location.hash="#/";route()');
assert.ok(dom.innerHTML.includes('?chapter=1#/learn'));assert.ok(dom.innerHTML.includes('?chapter=2#/learn'));
assert.ok(dom.innerHTML.includes(`残り${24-published.length}章`));
page('location.hash="#/about";route()');click({action:'reset'},'action');
assert.equal(page('state.rules.end'),'20:30');
assert.equal(page('state.slide'),0);
for(const n of published){assert.equal(page(`chapterStorageKey(${n})`),n===1?'smartphone-safe-use-cert:v1':`smartphone-safe-use-cert:chapter${n}:v1`);}
// Stale learning tabs must not overwrite a newer shared family draft.
localData.set('smartphone-safe-use-cert:family:v1',JSON.stringify({...oldRecord.rules,end:'19:45'}));
page('save()');assert.equal(JSON.parse(localData.get('smartphone-safe-use-cert:family:v1')).end,'19:45');
page('renderFamily()');assert.equal(page('state.rules.end'),'19:45');
// A damaged shared draft must not discard valid chapter progress.
page('state.slide=4;save()');localData.set('smartphone-safe-use-cert:family:v1','broken json');
assert.equal(page('load().slide'),4);
console.log('PASS: home, learning gate, all slides and wrong-answer retry, quiz gate, full-score result, family/about screens, record reset');

}
