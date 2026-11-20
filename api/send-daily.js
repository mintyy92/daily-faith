
const admin=require("firebase-admin");

function fb(){
  if(!admin.apps.length){
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if(!raw)throw Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");

    admin.initializeApp({
      credential:admin.credential.cert(JSON.parse(raw))
    });
  }

  return admin;
}

function parts(date,zone){
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA",{
      timeZone:zone,
      year:"numeric",
      month:"2-digit",
      day:"2-digit",
      hour:"2-digit",
      minute:"2-digit",
      hourCycle:"h23"
    }).formatToParts(date).map(p=>[p.type,p.value])
  );
}

const verses=[
[
"Joshua 1:9",
"Haven't I commanded you? Be strong and courageous. Don't be afraid. Don't be discouraged, for Yahweh your God is with you wherever you go."
],
[
"Psalm 46:10",
"Be still, and know that I am God."
],
[
"Proverbs 3:5",
"Trust in Yahweh with all your heart, and don't lean on your own understanding."
],
[
"Philippians 4:13",
"I can do all things through Christ, who strengthens me."
],
[
"1 Peter 5:7",
"Casting all your worries on him, because he cares for you."
],
[
"Romans 12:12",
"rejoicing in hope; enduring in troubles; continuing steadfastly in prayer;"
],
[
"1 Corinthians 16:14",
"Let all that you do be done in love."
]
];

/* Same calculation as app.js:
   midnight reset, new verse every 120 minutes. */
function verseForScheduledTime(time){
  const [hour,minute]=time.split(":").map(Number);
  const block=Math.floor((hour*60+minute)/120);

  return verses[block%verses.length];
}

module.exports=async(req,res)=>{
  const secret=process.env.CRON_SECRET;

  if(
    !secret||
    req.headers.authorization!==`Bearer ${secret}`
  ){
    return res.status(401).end("Unauthorized");
  }

  try{
    const a=fb();
    const db=a.firestore();
    const now=new Date();

    const snap=await db
      .collection("pushTokens")
      .where("active","==",true)
      .get();

    const docs=snap.docs.filter(d=>{
      const x=d.data();

      return x.platform==="android-app"&&
        x.packageName==="com.dailyfaith.app";
    });

    let due=0;
    let sent=0;
    let failed=0;
    let invalid=0;

    const groups=new Map();

    for(const doc of docs){
      const d=doc.data();
      const zone=d.timezone||"Australia/Melbourne";

      let p;

      try{
        p=parts(now,zone);
      }catch{
        await doc.ref.update({
          active:false,
          invalidTimezone:true
        });

        invalid++;
        continue;
      }

      const date=`${p.year}-${p.month}-${p.day}`;
      const clock=`${p.hour}:${p.minute}`;

      const times=(
        d.reminderTimes?.length
          ?d.reminderTimes
          :[d.reminderTime||"08:00"]
      ).slice().sort();

      const sentMap=d.lastSentSlots||{};

      for(const time of times){
        const slot=`${date}_${time}`;

        if(clock<time||sentMap[slot])continue;

        // Use the verse assigned to the reminder's selected time.
        const verse=verseForScheduledTime(time);
        const key=verse[0]+"|"+verse[1];

        if(!groups.has(key)){
          groups.set(key,[]);
        }

        groups.get(key).push({
          doc,
          token:d.token,
          slot,
          verse
        });

        due++;
      }
    }

    for(const items of groups.values()){
      for(let i=0;i<items.length;i+=500){
        const batch=items.slice(i,i+500);
        const verse=batch[0].verse;

        const result=await a.messaging().sendEachForMulticast({
          tokens:batch.map(x=>x.token),

          notification:{
            title:verse[0],
            body:verse[1]
          },

          data:{
            url:"/"
          },

          webpush:{
            fcmOptions:{
              link:"/"
            }
          }
        });

        const byDoc=new Map();

        batch.forEach((item,index)=>{
          const response=result.responses[index];

          if(response.success){
            sent++;

            if(!byDoc.has(item.doc.id)){
              byDoc.set(item.doc.id,{
                ref:item.doc.ref,
                slots:[]
              });
            }

            byDoc.get(item.doc.id).slots.push(item.slot);

          }else{
            failed++;

            const code=response.error?.code;

            if(
              code==="messaging/registration-token-not-registered"||
              code==="messaging/invalid-registration-token"
            ){
              byDoc.set(item.doc.id,{
                ref:item.doc.ref,
                invalid:true
              });

              invalid++;
            }
          }
        });

        await Promise.all(
          [...byDoc.values()].map(async item=>{
            if(item.invalid){
              return item.ref.update({active:false});
            }

            const latest=await item.ref.get();
            const previous=latest.data()?.lastSentSlots||{};
            const next={...previous};

            item.slots.forEach(slot=>{
              next[slot]=true;
            });

            return item.ref.update({
              lastSentSlots:next,
              lastSentAt:a.firestore.FieldValue.serverTimestamp()
            });
          })
        );
      }
    }

    return res.status(200).json({
      ok:true,
      checked:snap.size,
      appSubscriptions:docs.length,
      ignoredNonAppSubscriptions:snap.size-docs.length,
      due,
      sent,
      failed,
      invalid,
      checkedAt:now.toISOString()
    });

  }catch(error){
    console.error(error);

    return res.status(500).json({
      error:"Send failed"
    });
  }
};
