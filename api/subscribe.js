const admin=require("firebase-admin");
function fb(){if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))});}return admin;}
module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).end();
 try{const token=req.body?.token;if(typeof token!=="string"||token.length<30||token.length>4096)return res.status(400).json({error:"Invalid token"});const a=fb(),db=a.firestore(),q=await db.collection("pushTokens").where("token","==",token).limit(1).get();if(q.empty)await db.collection("pushTokens").add({token,active:true,timezone:"Australia/Melbourne",createdAt:a.firestore.FieldValue.serverTimestamp()});else await q.docs[0].ref.update({active:true});return res.status(200).json({ok:true});}
 catch(e){console.error(e);return res.status(500).json({error:"Subscription failed"});}
};
