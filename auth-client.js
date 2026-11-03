(function(){
"use strict";
const API="https://lingua-academy-api.dilshan7878787.workers.dev/api/v1";
const tokenKey="lingua-session-token";
const token=()=>sessionStorage.getItem(tokenKey);
async function call(path,method,body){
 const headers={"content-type":"application/json"};
 if(token())headers.authorization="Bearer "+token();
 const response=await fetch(API+path,{method,headers,body:body?JSON.stringify(body):undefined});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.message||data.error||"Request failed");
 return data;
}
function message(text,error){
 const node=document.getElementById("authStatus");
 if(node){node.textContent=text;node.style.color=error?"#b42318":"#5267e8";}
}
function setSignedIn(email){
 const label=document.getElementById("accountLabel");
 const button=document.getElementById("accountButton");
 if(label)label.textContent=email||"My Learning Profile";
 if(button)button.textContent=email?"Sign out":"Sign in";
}
async function syncProgress(){
 const state=JSON.parse(localStorage.getItem("lingua-progress")||"{}");
 const remote=await call("/learner/progress/sync","POST",{lessons:[],saved_words:[]});
 const completed=[...(state.completed||[])];
 for(const item of remote.lessons||[]){
  if(item.status==="completed"){
   const n=Number(String(item.lesson_id).replace("lesson-",""));
   if(Number.isInteger(n)&&!completed.includes(n))completed.push(n);
  }
 }
 const saved=[...new Set([...(state.savedDictionaryWords||[]),...(remote.saved_words||[]).map(x=>x.dictionary_entry_id)])];
 state.completed=completed.sort((a,b)=>a-b);
 state.savedDictionaryWords=saved;
 localStorage.setItem("lingua-progress",JSON.stringify(state));
 const lessons=completed.map(n=>({lesson_id:"lesson-"+n,status:"completed",best_score:null}));
 await call("/learner/progress/sync","POST",{lessons,saved_words:saved});
 if(typeof window.render==="function")window.render();
 if(typeof window.renderDictionaryExtras==="function")window.renderDictionaryExtras();
}
async function sendCode(){
 const email=document.getElementById("authEmail").value.trim();
 if(!email){message("Email address එක ඇතුළත් කරන්න.",true);return;}
 try{
  await call("/auth/learner/otp/request","POST",{email});
  document.getElementById("otpArea").hidden=false;
  document.getElementById("verifyOtp").hidden=false;
  document.getElementById("requestOtp").textContent="Resend OTP";
  message("Email එකට code එකක් යැව්වා නම් විනාඩි 10ක් ඇතුළත ලැබේ. Inbox / Spam පරීක්ෂා කරන්න.");
 }catch(e){message(e.message,true);}
}
async function verifyCode(){
 const email=document.getElementById("authEmail").value.trim();
 const code=document.getElementById("authCode").value.trim();
 if(!/^[0-9]{6}$/.test(code)){message("අංක 6ක code එක ඇතුළත් කරන්න.",true);return;}
 try{
  const result=await call("/auth/learner/otp/verify","POST",{email,code});
  sessionStorage.setItem(tokenKey,result.token);
  setSignedIn(result.user.email);
  message("Sign in සාර්ථකයි. ඔබගේ පරණ progress එක sync කරනවා.");
  await syncProgress();
  setTimeout(()=>document.getElementById("authPanel").classList.remove("open"),700);
 }catch(e){message(e.message,true);}
}
async function signOut(){
 try{await call("/auth/logout","POST",{});}catch(e){}
 sessionStorage.removeItem(tokenKey);
 setSignedIn("");
 message("Sign out වුණා. මේ browser එකේ local progress එක තවමත් තියෙනවා.");
 document.getElementById("authPanel").classList.add("open");
}
let syncTimer=null;
function scheduleSync(){if(syncTimer)clearTimeout(syncTimer);syncTimer=setTimeout(()=>{if(token())window.linguaCloudSync().catch(e=>console.warn("Cloud sync pending",e.message));},1500);}
function init(){
 const button=document.getElementById("accountButton");
 if(!button)return;
 button.addEventListener("click",()=>token()?signOut():document.getElementById("authPanel").classList.add("open"));
 document.getElementById("requestOtp").addEventListener("click",sendCode);
 document.getElementById("verifyOtp").addEventListener("click",verifyCode);
 document.getElementById("closeAuth").addEventListener("click",()=>document.getElementById("authPanel").classList.remove("open"));
 if(token()){setSignedIn("Signed in");syncProgress().catch(e=>console.warn("Cloud sync pending",e.message));}
 window.queueLinguaCloudSync=scheduleSync;
 window.linguaCloudSync=async function(){
  if(!token())return;
  const state=JSON.parse(localStorage.getItem("lingua-progress")||"{}");
  const lessons=(state.completed||[]).map(n=>({lesson_id:"lesson-"+n,status:"completed",best_score:null}));
  await call("/learner/progress/sync","POST",{lessons,saved_words:state.savedDictionaryWords||[]});
 };
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();