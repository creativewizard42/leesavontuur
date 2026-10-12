"""Audit generated activity audio and exercise real controls using Vite modules.
Real MP3 ended events run at 8x to check control flow, not pronunciation.
Requires Python Playwright, Chromium and npm dependencies. No child profile data.
"""
import json
import argparse
import os
import signal
import socket
import subprocess
import time
import urllib.request
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--chromium',default='/usr/bin/chromium')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
server=subprocess.Popen(['npm','run','dev','--','--host','127.0.0.1','--port',str(port),'--strictPort'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
import atexit
atexit.register(lambda: os.killpg(server.pid,signal.SIGTERM) if server.poll() is None else None)
origin=f'http://127.0.0.1:{port}'
for attempt in range(100):
 try:
  urllib.request.urlopen(origin,timeout=1).close();break
 except OSError: time.sleep(.1)
else: raise RuntimeError('Vite failed to start')
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=args.chromium,args=['--no-sandbox'])
 page=b.new_page()
 page.goto(origin)
 page.locator('h1').click()
 result=page.evaluate('''async()=>{
 const {createFreshProfile}=await import('/src/core/SaveSystem.ts');
 const {createSkillState}=await import('/src/core/Mastery.ts');
 const {planSession,flattenPlan}=await import('/src/core/SessionPlanner.ts');
 const {createSeededRng}=await import('/src/core/rng.ts');
 const c=await import('/src/content/index.ts');
 const {readingPractice,generateSightWord}=await import('/src/learning/Reading.ts');
 const ph=await import('/src/learning/Phonology.ts');
 const all=[];
 for(let n=0;n<=41;n++) {
  const profile=createFreshProfile(0,()=>.5); profile.unlockedGraphemes=c.graphemes.slice(0,n).map(g=>g.id);
  const keys=['PH.RHYME','PH.SYLLABLE','FN.FIRST_SOUND','FN.LAST_SOUND','FN.COUNT','DE.VC','DE.CVC','DE.CVVC','DE.CCVC','DE.CVCC','DE.CCVCC','AN.CVC','SY.CVC','ZI.SIMPLE',...c.sightWords.map(s=>s.id),...profile.unlockedGraphemes.flatMap(g=>['LK.'+g+'.SOUND','LK.'+g+'.RECOGNIZE'])];
  if(n>0) for(const k of keys) profile.skills[k]=createSkillState({mastery:.95,accuracy:.95,attempts:20,correct:20,consecutiveCorrect:6,sessionsSeen:3});
  if(n===41) all.push(...c.sightWords.map(sw=>generateSightWord(profile,sw.id,createSeededRng(1))));
  for(let seed=1;seed<=4;seed++) all.push(...flattenPlan(planSession(profile,createSeededRng(seed))));
  all.push(...readingPractice(profile,7,createSeededRng(1)),...readingPractice(profile,8,createSeededRng(1)));
 }
 all.push(...ph.generate({skillId:'PH.RHYME',difficulty:'C',count:10,rng:createSeededRng(1)}));
 window.auditItems=all;
 const {instructionSequence,feedbackSequence}=await import('/src/ui/audioPrompts.ts');
 const {checkAnswer}=await import('/src/learning/answer.ts');
 const bySrc=new Map();
 for(const item of all){
  const add=x=>{if(x?.src) bySrc.set(x.src,{key:x.key,item:item.id});};
  const vars={sound:item.metadata?.targetGrapheme,letter:item.metadata?.targetGrapheme,word:item.metadata?.word};
  const prompt=item.prompt.audio ? instructionSequence(item.prompt.audio.key,vars) : [];
  if(prompt.length)prompt.forEach(add);else add(item.prompt.audio);
  item.options.forEach(o=>add(o.audio));
  for(const x of Object.values(item.metadata??{})){if(x&&typeof x==='object') {if(Array.isArray(x)) x.forEach(add);else add(x);}}
  for(const o of item.options) for(let attempt=1;attempt<=3;attempt++){
   const a=checkAnswer(item,{optionId:o.id,attempt});feedbackSequence(a.feedbackKey,a.feedbackVars).forEach(add);
  }
 }
 const missing=[];
 for(const [src,detail] of bySrc){const r=await fetch(src);if(!r.ok||r.headers.get('content-type')?.includes('text/html'))missing.push({src,...detail,status:r.status});}
 return {items:all.length,kinds:[...new Set(all.map(i=>i.kind))],sources:bySrc.size,missing};
}''')
 print(json.dumps(result,ensure_ascii=False,indent=2),flush=True)
 assert not result['missing'], 'Missing runtime audio'
 # One representative per kind, direction, and introduction, plus each letter.
 result=page.evaluate('''async()=>{
 const {createActivityView}=await import('/src/ui/components/ActivityView.ts');
 const {createAppAudio}=await import('/src/ui/audioClips.ts');
 const audio=createAppAudio({speech:null});
 const real=HTMLMediaElement.prototype.play;let pending=0;let starts=0;
 HTMLMediaElement.prototype.play=function(){this.playbackRate=8;pending++;starts++;let ended=false;const finish=()=>{if(!ended){pending--;ended=true;}};this.addEventListener('ended',finish,{once:true});this.addEventListener('pause',finish,{once:true});return real.call(this).catch(e=>{finish();throw e;});};
 const cases=new Map();for(const item of window.auditItems){if(item.kind==='beloning')continue;const key=[item.kind,item.metadata?.direction,item.metadata?.introduction,item.metadata?.responseMode,item.kind==='letterklank'?'':item.skillId].join(':');if(!cases.has(key)) cases.set(key,item);}
 const failures=[];let passed=0;const host=document.createElement('main');document.body.replaceChildren(host);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function settle(){for(let n=0;n<300;n++){await wait(25);if(!pending){await wait(50);if(!pending)return;}}throw Error('audio did not settle');}
 for(const route of ['correct','model']) for(const [key,item] of cases){let done=false;let start=performance.now();const view=createActivityView({item,audio,sessionNumber:1,now:()=>performance.now()+1000,onEvent:()=>{},onDone:()=>{done=true;}});host.append(view.element);
 try{await settle();if(host.querySelector('[data-audio-fallback]'))throw Error('fallback after prompt');
 if(item.metadata?.introduction){if(!done)throw Error('intro did not finish');passed++;continue;}
 for(const ear of host.querySelectorAll('[data-listen-id]')){const before=starts;ear.click();await settle();if(starts<=before)throw Error('ear button did not start audio');}
 if(item.kind==='verhaallezen'){host.querySelector('[data-action="reading-ready"]').click();await settle();}
 await wait(510);const wrong=item.options.find(o=>o.id!==item.targetId);if(wrong){host.querySelector('[data-option-id="'+wrong.id+'"]').click();await settle();if(host.querySelector('[data-audio-fallback]'))throw Error('fallback after wrong answer');}
 if(route==='model' && wrong){for(let attempt=2;attempt<=3;attempt++){host.querySelector('[data-option-id="'+wrong.id+'"]').click();await settle();}}else{host.querySelector('[data-option-id="'+item.targetId+'"]').click();await settle();}
 if(!done)throw Error('answer route did not finish');if(host.querySelector('[data-audio-fallback]'))throw Error('fallback after answer route');passed++;
 }catch(e){failures.push({route,key,id:item.id,error:String(e)});}finally{view.destroy();host.replaceChildren();}
 }
 return {cases:cases.size*2,passed,failures};
}''')
 print(json.dumps(result,ensure_ascii=False,indent=2),flush=True)
 assert not result['failures'], 'Activity failures'
 b.close()
