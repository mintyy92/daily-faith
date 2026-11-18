const admin=require("firebase-admin");
function fb(){if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))});}return admin;}
module.exports=async(req,res)=>{
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.authorization!==`Bearer ${secret}`)return res.status(401).end("Unauthorized");
 const parts=new Intl.DateTimeFormat("en-AU",{timeZone:"Australia/Melbourne",hour:"2-digit",year:"numeric",month:"2-digit",day:"2-digit",hourCycle:"h23"}).formatToParts(new Date()),v=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 if(v.hour!=="08")return res.status(200).json({sent:false,reason:"Not 08:00 Melbourne"});
 const a=fb(),db=a.firestore(),date=`${v.year}-${v.month}-${v.day}`,lock=db.collection("dailyNotificationRuns").doc(date);
 try{await lock.create({status:"started",at:a.firestore.FieldValue.serverTimestamp()});}catch(e){if(e.code===6)return res.status(200).json({sent:false,reason:"Already processed today"});return res.status(500).end("Lock error");}
 try{
  const verses=[["Joshua 1:9","Be strong and courageous. Don't be afraid. Don't be discouraged, for Yahweh your God is with you wherever you go."],["Psalm 46:10","Be still, and know that I am God."],["Proverbs 3:5","Trust in Yahweh with all your heart, and don't lean on your own understanding."],["Philippians 4:13","I can do all things through Christ, who strengthens me."],["1 Peter 5:7","Casting all your worries on him, because he cares for you."],["Romans 12:12","Rejoicing in hope; enduring in troubles; continuing steadfastly in prayer."],["1 Corinthians 16:14","Let all that you do be done in love."]];
  const day=Math.floor(Date.UTC(+v.year,+v.month-1,+v.day)/86400000),verse=verses[((day%7)+7)%7],snap=await db.collection("pushTokens").where("active","==",true).get();let ok=0,failed=0;
  for(let i=0;i<snap.docs.length;i+=500){const docs=snap.docs.slice(i,i+500),tokens=docs.map(d=>d.get("token"));if(!tokens.length)continue;const result=await a.messaging().sendEachForMulticast({tokens,notification:{title:"Your verse for today · "+verse[0],body:verse[1]},data:{url:"/"},webpush:{fcmOptions:{link:"/"}}});ok+=result.successCount;failed+=result.failureCount;await Promise.all(docs.map((d,j)=>{const code=result.responses[j].error?.code;if(code==="messaging/registration-token-not-registered"||code==="messaging/invalid-registration-token")return d.ref.update({active:false});return Promise.resolve();}));}
  await lock.update({status:"complete",successCount:ok,failureCount:failed,completedAt:a.firestore.FieldValue.serverTimestamp()});return res.status(200).json({sent:true,date,successCount:ok,failureCount:failed});
 }catch(e){await lock.update({status:"failed",error:String(e).slice(0,400)});console.error(e);return res.status(500).json({error:"Send failed"});}
};
