const admin=require("firebase-admin");
function fb(){if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))});}return admin;}
function parts(date,zone){return Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date).map(p=>[p.type,p.value]));}
const verses=[
["Joshua 1:9","Haven't I commanded you? Be strong and courageous. Don't be afraid. Don't be discouraged, for Yahweh your God is with you wherever you go."],
["Psalm 46:10","Be still, and know that I am God."],
["Proverbs 3:5","Trust in Yahweh with all your heart, and don't lean on your own understanding."],
["Philippians 4:13","I can do all things through Christ, who strengthens me."],
["1 Peter 5:7","Casting all your worries on him, because he cares for you."],
["Romans 12:12","rejoicing in hope; enduring in troubles; continuing steadfastly in prayer;"],
["1 Corinthians 16:14","Let all that you do be done in love."]
];
module.exports=async(req,res)=>{
const secret=process.env.CRON_SECRET;if(!secret||req.headers.authorization!==`Bearer ${secret}`)return res.status(401).end("Unauthorized");
try{
const a=fb(),db=a.firestore(),now=new Date(),snap=await db.collection("pushTokens").where("active","==",true).get(),docs=snap.docs.filter(d=>{const x=d.data();return x.platform==="android-app"&&x.packageName==="com.dailyfaith.app";});
let due=0,sent=0,failed=0,invalid=0;const groups=new Map();
for(const doc of docs){const d=doc.data(),zone=d.timezone||"Australia/Melbourne";let p;try{p=parts(now,zone);}catch{await doc.ref.update({active:false,invalidTimezone:true});invalid++;continue;}
const date=`${p.year}-${p.month}-${p.day}`,clock=`${p.hour}:${p.minute}`,times=(d.reminderTimes?.length?d.reminderTimes:[d.reminderTime||"08:00"]).slice().sort(),day=Math.floor(Date.UTC(+p.year,+p.month-1,+p.day)/86400000),sentMap=d.lastSentSlots||{};
for(let i=0;i<times.length;i++){const time=times[i],slot=`${date}_${time}`;if(clock<time||sentMap[slot])continue;const v=verses[((day+i)%verses.length+verses.length)%verses.length],key=v[0]+"|"+v[1];if(!groups.has(key))groups.set(key,[]);groups.get(key).push({doc,token:d.token,slot,verse:v});due++;}}
for(const items of groups.values())for(let i=0;i<items.length;i+=500){const batch=items.slice(i,i+500),v=batch[0].verse,result=await a.messaging().sendEachForMulticast({tokens:batch.map(x=>x.token),notification:{title:v[0],body:v[1]},data:{url:"/"},webpush:{fcmOptions:{link:"/"}}}),byDoc=new Map();
batch.forEach((x,j)=>{const r=result.responses[j];if(r.success){sent++;if(!byDoc.has(x.doc.id))byDoc.set(x.doc.id,{ref:x.doc.ref,slots:[]});byDoc.get(x.doc.id).slots.push(x.slot);}else{failed++;const c=r.error?.code;if(c==="messaging/registration-token-not-registered"||c==="messaging/invalid-registration-token")byDoc.set(x.doc.id,{ref:x.doc.ref,invalid:true});}});
await Promise.all([...byDoc.values()].map(async x=>{if(x.invalid)return x.ref.update({active:false});const latest=await x.ref.get(),old=latest.data()?.lastSentSlots||{},next={...old};x.slots.forEach(s=>next[s]=true);return x.ref.update({lastSentSlots:next,lastSentAt:a.firestore.FieldValue.serverTimestamp()});}));}
return res.status(200).json({ok:true,checked:snap.size,appSubscriptions:docs.length,ignoredNonAppSubscriptions:snap.size-docs.length,due,sent,failed,invalid,checkedAt:now.toISOString()});
}catch(e){console.error(e);return res.status(500).json({error:"Send failed"});}
};