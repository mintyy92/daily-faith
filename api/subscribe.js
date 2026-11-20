const admin=require("firebase-admin");
function fb(){if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))});}return admin;}
function valid(t){return typeof t==="string"&&/^([01]\\d|2[0-3]):[0-5]\\d$/.test(t)&&Number(t.slice(3))%15===0;}
module.exports=async(req,res)=>{
if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"});
try{
const{token,timezone,reminderTimes,reminderTime,active}=req.body||{};
if(typeof token!=="string"||token.trim().length<20)return res.status(400).json({ok:false,error:"Invalid notification token"});
const times=(Array.isArray(reminderTimes)?reminderTimes:(reminderTime?[reminderTime]:[])).slice().sort();
if(times.length<1||times.length>12||times.some(t=>!valid(t)))return res.status(400).json({ok:false,error:"Choose 1–12 times in 15-minute increments"});
const mins=t=>+t.slice(0,2)*60+ +t.slice(3);for(let i=1;i<times.length;i++)if(mins(times[i])-mins(times[i-1])<120)return res.status(400).json({ok:false,error:"Please leave at least two hours between each verse time"});
const zone=typeof timezone==="string"&&timezone.trim()?timezone.trim():"Australia/Melbourne";try{new Intl.DateTimeFormat("en-AU",{timeZone:zone});}catch{return res.status(400).json({ok:false,error:"Invalid timezone"});}
const a=fb(),db=a.firestore(),col=db.collection("pushTokens"),existing=await col.where("token","==",token.trim()).get(),stamp=a.firestore.FieldValue.serverTimestamp();
const payload={token:token.trim(),active:active!==false,reminderTimes:times,reminderTime:times[0],timezone:zone,platform:"android-app",packageName:"com.dailyfaith.app",updatedAt:stamp};
if(existing.empty)await col.add({...payload,createdAt:stamp});else{const docs=existing.docs.sort((x,y)=>(y.data().updatedAt?.toMillis?.()||0)-(x.data().updatedAt?.toMillis?.()||0)),main=docs[0],old=main.data(),oldTimes=(old.reminderTimes||[old.reminderTime]).filter(Boolean).sort();const changed=JSON.stringify(oldTimes)!==JSON.stringify(times)||old.timezone!==zone;const upd={...payload};if(changed)upd.lastSentSlots=a.firestore.FieldValue.delete();await main.ref.update(upd);await Promise.all(docs.slice(1).map(d=>d.ref.update({active:false,updatedAt:stamp}))); }
return res.status(200).json({ok:true,saved:true,active:active!==false,reminderTimes:times,timezone:zone,platform:"android-app",packageName:"com.dailyfaith.app"});
}catch(e){console.error("Subscription error:",e);return res.status(500).json({ok:false,error:"Could not save notification subscription"});}
};