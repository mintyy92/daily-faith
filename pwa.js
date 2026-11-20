
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvp_n3uPN4gK9BQU39OEXuARUCQBPQG4",
  authDomain: "daily-faith-27eb2.firebaseapp.com",
  projectId: "daily-faith-27eb2",
  storageBucket: "daily-faith-27eb2.firebasestorage.app",
  messagingSenderId: "147411163183",
  appId: "1:147411163183:web:38162d27a19e2f5115ceda",
  measurementId: "G-30HTLM4DGG"
};

const vapidKey = "BE3dynxB_Gx1EMgbVaRNeicHt_3NEktC73IEg52-pw8RzXxul2pMccsYZIZVWotnXwL5YoOEh5E2WXsN7yJdBBg";

const btn=document.getElementById("enableNotifications");
const install=document.getElementById("installApp");
const count=document.getElementById("verseCount");
const wrap=document.getElementById("scheduleTimes");
const enabled=document.getElementById("reminderEnabled");
const save=document.getElementById("saveReminder");
const status=document.getElementById("reminderStatus");

const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"Australia/Melbourne";

let deferred=null;
let app=null;
let messaging=null;
let token=null;

function say(t,c=""){
  status.textContent=t;
  status.className="reminder-status "+c;
}

function valid(t){
  return typeof t==="string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(t) &&
    Number(t.slice(3))%15===0;
}

function validate(ts){
  if(ts.length<1||ts.length>12||ts.some(t=>!valid(t))){
    throw Error("Choose 1–12 reminder times in 15-minute increments.");
  }

  const sorted=[...ts].sort();
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));

  for(let i=1;i<sorted.length;i++){
    if(minutes(sorted[i])-minutes(sorted[i-1])<120){
      throw Error("Please leave at least two hours between reminder times.");
    }
  }

  return sorted;
}

function render(ts){
  wrap.innerHTML="";

  ts.forEach((t,i)=>{
    const row=document.createElement("div");
    row.className="schedule-time-row";

    const label=document.createElement("label");
    label.textContent="Reminder "+(i+1);
    label.htmlFor="verseTime"+i;

    const input=document.createElement("input");
    input.type="time";
    input.step="900";
    input.id="verseTime"+i;
    input.value=t;

    row.append(label,input);
    wrap.append(row);
  });
}

function getTimes(){
  return [...wrap.querySelectorAll('input[type="time"]')].map(x=>x.value);
}

function load(){
  let saved=null;

  try{
    saved=JSON.parse(localStorage.getItem("dailyFaithReminder")||"null");
  }catch{}

  const times=saved?.times?.length
    ? saved.times
    : (saved?.time?[saved.time]:["08:00","18:00"]);

  count.value=String(times.length);
  render(times);

  if(saved){
    enabled.checked=saved.enabled===true;
  }

  btn.textContent=enabled.checked
    ?"✓ Reminder enabled"
    :"Enable reminders";
}

load();

count.addEventListener("change",()=>{
  const old=getTimes();

  const defaults=[
    "08:00","10:30","13:00","15:30",
    "18:00","20:30","07:00","09:30",
    "12:00","14:30","17:00","19:30"
  ];

  const next=Array.from(
    {length:Number(count.value)},
    (_,i)=>old[i]||defaults[i]
  );

  render(next);
});

enabled.addEventListener("change",()=>{
  btn.textContent=enabled.checked
    ?"✓ Reminder enabled"
    :"Enable reminders";
});

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  deferred=e;
  install.hidden=false;
});

install.addEventListener("click",async()=>{
  if(deferred){
    deferred.prompt();
    await deferred.userChoice;
    deferred=null;
    install.hidden=true;
  }
});

if(
  matchMedia("(display-mode:standalone)").matches||
  navigator.standalone
){
  install.hidden=true;
}

if("serviceWorker"in navigator){
  addEventListener("load",()=>{
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .catch(console.error);
  });
}

async function pushToken(){
  if(!isSecureContext||!("Notification"in window)){
    throw Error("Notifications require HTTPS and a supported browser.");
  }

  if(!(await isSupported())){
    throw Error("Push notifications are not supported in this browser.");
  }

  if(
    Notification.permission!=="granted"&&
    await Notification.requestPermission()!=="granted"
  ){
    throw Error("Please allow notifications first.");
  }

  if(!app){
    app=initializeApp(firebaseConfig);
    messaging=getMessaging(app);
  }

  const reg=await navigator.serviceWorker.ready;

  token=token||await getToken(messaging,{
    vapidKey,
    serviceWorkerRegistration:reg
  });

  if(!token){
    throw Error("Could not obtain your notification token.");
  }

  return token;
}

async function saveSettings(){
  const times=validate(getTimes());
  const push=await pushToken();
  const active=enabled.checked;

  const response=await fetch("/api/subscribe",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      token:push,
      timezone,
      reminderTimes:times,
      active
    })
  });

  const data=await response.json().catch(()=>({}));

  if(!response.ok||data.saved!==true){
    throw Error(
      data.error||
      "The server did not confirm that your schedule was saved."
    );
  }

  localStorage.setItem(
    "dailyFaithReminder",
    JSON.stringify({
      times,
      enabled:active
    })
  );

  btn.textContent=active
    ?"✓ Reminder enabled"
    :"Enable reminders";

  say(
    active
      ?`${times.length} daily reminders saved.`
      :"Daily verse reminders turned off.",
    "success"
  );

  window.dispatchEvent(new Event("dailyfaithschedulechange"));
}

save.addEventListener("click",async()=>{
  save.disabled=true;

  try{
    await saveSettings();
  }catch(error){
    say(error.message||"Could not save schedule.","error");
  }finally{
    save.disabled=false;
  }
});

btn.addEventListener("click",async()=>{
  document.getElementById("reminderSettings").scrollIntoView({
    behavior:"smooth",
    block:"center"
  });

  enabled.checked=true;
  btn.disabled=true;

  try{
    await saveSettings();
  }catch(error){
    say(error.message||"Could not save schedule.","error");
  }finally{
    btn.disabled=false;
  }
});
