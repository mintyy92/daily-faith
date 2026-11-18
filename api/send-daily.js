const admin=require("firebase-admin");
function fb(){if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))});}return admin;}
function localParts(date,timezone){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
const verses=[["Joshua 1:9","Be strong and courageous. Don't be afraid. Don't be discouraged, for Yahweh your God is with you wherever you go."],["Psalm 46:10","Be still, and know that I am God."],["Proverbs 3:5","Trust in Yahweh with all your heart, and don't lean on your own understanding."],["Philippians 4:13","I can do all things through Christ, who strengthens me."],["1 Peter 5:7","Casting all your worries on him, because he cares for you."],["Romans 12:12","Rejoicing in hope; enduring in troubles; continuing steadfastly in prayer."],["1 Corinthians 16:14","Let all that you do be done in love."]];
module.exports=async(req,res)=>{
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.authorization!==`Bearer ${secret}`)return res.status(401).end("Unauthorized");
 try{
  const a=fb(),db=a.firestore(),now=new Date(),snap=await db.collection("pushTokens").where("active","==",true).get();
  const groups=new Map();let due=0,invalid=0;
  for(const doc of snap.docs){const d=doc.data(),timezone=d.timezone||"Australia/Melbourne",reminderTime=d.reminderTime||"08:00";let p;try{p=localParts(now,timezone);}catch{await doc.ref.update({active:false,invalidTimezone:true});invalid++;continue;}
   const localDate=`${p.year}-${p.month}-${p.day}`,localTime=`${p.hour}:${p.minute}`;
   if(localTime<reminderTime||d.lastSentDate===localDate)continue;
   const day=Math.floor(Date.UTC(+p.year,+p.month-1,+p.day)/86400000),verse=verses[((day%7)+7)%7],key=verse[0]+"|"+verse[1];
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push({doc,token:d.token,localDate,verse});due++;
  }
  let sent=0,failed=0;
  for(const items of groups.values())for(let i=0;i<items.length;i+=500){const batch=items.slice(i,i+500),verse=batch[0].verse,result=await a.messaging().sendEachForMulticast({tokens:batch.map(x=>x.token),notification:{title:"Your verse for today · "+verse[0],body:verse[1]},data:{url:"/"},webpush:{fcmOptions:{link:"/"}}});
   const writes=[];batch.forEach((item,j)=>{const response=result.responses[j],code=response.error?.code;if(response.success){sent++;writes.push(item.doc.ref.update({lastSentDate:item.localDate,lastSentAt:a.firestore.FieldValue.serverTimestamp()}));}else{failed++;if(code==="messaging/registration-token-not-registered"||code==="messaging/invalid-registration-token")writes.push(item.doc.ref.update({active:false}));}});await Promise.all(writes);
  }
  return res.status(200).json({ok:true,checked:snap.size,due,sent,failed,invalid,checkedAt:now.toISOString()});
 }catch(e){console.error(e);return res.status(500).json({error:"Send failed"});}
};
