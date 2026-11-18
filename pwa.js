import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";
const firebaseConfig = {
  "apiKey": "AIzaSyAvp_n3uPNg4gkG9BQU39OEXuARUCQBPg4",
  "authDomain": "daily-faith-27eb2.firebaseapp.com",
  "projectId": "daily-faith-27eb2",
  "storageBucket": "daily-faith-27eb2.firebasestorage.app",
  "messagingSenderId": "147411163183",
  "appId": "1:147411163183:web:38162d27a19e2f5115ceda",
  "measurementId": "G-30HTLM4DGG"
};
const vapidKey="BE3dynxB_Gx1EMgbVaRNeicHt_3NEktC73IEg52-pw8RzXxul2pMccsYZIZVWotnXwL5YoOEh5E2WXsN7yJdBBg";
const btn=document.getElementById("enableNotifications"),install=document.getElementById("installApp");
let deferred=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;install.hidden=false;});
install?.addEventListener("click",async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;install.hidden=true;}});
if(window.matchMedia("(display-mode:standalone)").matches||navigator.standalone){if(install)install.hidden=true;}
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(console.error));
btn?.addEventListener("click",async()=>{
 try{
  if(!window.isSecureContext||!("Notification" in window))throw Error("Notifications require a supported browser and HTTPS.");
  if(!(await isSupported()))throw Error("Push notifications are not supported in this browser.");
  btn.disabled=true;btn.textContent="Setting up…";
  const permission=await Notification.requestPermission();if(permission!=="granted")throw Error("Notification permission was not granted.");
  const app=initializeApp(firebaseConfig),messaging=getMessaging(app),registration=await navigator.serviceWorker.ready;
  const token=await getToken(messaging,{vapidKey,serviceWorkerRegistration:registration});if(!token)throw Error("Could not obtain notification token.");
  const response=await fetch("/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});if(!response.ok)throw Error("Could not save your notification subscription.");
  btn.textContent="✓ 8am reminder enabled";
 }catch(error){console.error(error);btn.disabled=false;btn.textContent="Enable 8am reminder";alert(error.message||"Could not enable notifications.");}
});
