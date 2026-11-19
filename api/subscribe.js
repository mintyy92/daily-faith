const admin = require("firebase-admin");

function fb() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw))
    });
  }
  return admin;
}

const validTimeZone = value => {
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const {
      token,
      platform,
      packageName,
      timezone = "Australia/Melbourne",
      reminderTime = "08:00",
      active = true
    } = req.body || {};

    // Do not accept website/Chrome registrations.
    if (platform !== "android-app" || packageName !== "com.dailyfaith.app") {
      return res.status(403).json({
        error: "Only the installed Daily Faith app can register reminders."
      });
    }

    if (typeof token !== "string" || token.length < 30 || token.length > 4096) {
      return res.status(400).json({ error: "Invalid token" });
    }
    if (!validTimeZone(timezone)) {
      return res.status(400).json({ error: "Invalid timezone" });
    }
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime) ||
      Number(reminderTime.slice(3)) % 15 !== 0
    ) {
      return res.status(400).json({
        error: "Choose a time in 15-minute increments"
      });
    }

    const a = fb();
    const db = a.firestore();
    const q = await db.collection("pushTokens")
      .where("token", "==", token)
      .get();

    const data = {
      active: active === true,
      platform: "android-app",
      packageName: "com.dailyfaith.app",
      timezone,
      reminderTime,
      updatedAt: a.firestore.FieldValue.serverTimestamp()
    };

    if (q.empty) {
      if (active === true) {
        await db.collection("pushTokens").add({
          ...data,
          token,
          createdAt: a.firestore.FieldValue.serverTimestamp()
        });
      }
    } else {
      const docs = [...q.docs];
      docs.sort((left, right) => {
        const leftTime = left.data().updatedAt?.toMillis?.() || 0;
        const rightTime = right.data().updatedAt?.toMillis?.() || 0;
        return rightTime - leftTime;
      });

      const mainDoc = docs[0];
      const oldData = mainDoc.data();
      const reminderChanged =
        oldData.reminderTime !== reminderTime ||
        oldData.timezone !== timezone;

      const updateData = { ...data };
      if (reminderChanged) {
        updateData.lastSentDate = a.firestore.FieldValue.delete();
        updateData.lastSentAt = a.firestore.FieldValue.delete();
      }
      await mainDoc.ref.update(updateData);

      // Deactivate duplicate documents for this exact token only.
      for (const duplicate of docs.slice(1)) {
        await duplicate.ref.update({
          active: false,
          updatedAt: a.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return res.status(200).json({
      ok: true,
      platform: "android-app",
      reminderTime,
      timezone,
      active: active === true
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Could not save your reminder settings"
    });
  }
};
