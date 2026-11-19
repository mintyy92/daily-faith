
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

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  return Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );
}

const verses = [
  ["Joshua 1:9", "Be strong and courageous. Don't be afraid. Don't be discouraged, for Yahweh your God is with you wherever you go."],
  ["Psalm 46:10", "Be still, and know that I am God."],
  ["Proverbs 3:5", "Trust in Yahweh with all your heart, and don't lean on your own understanding."],
  ["Philippians 4:13", "I can do all things through Christ, who strengthens me."],
  ["1 Peter 5:7", "Casting all your worries on him, because he cares for you."],
  ["Romans 12:12", "Rejoicing in hope; enduring in troubles; continuing steadfastly in prayer."],
  ["1 Corinthians 16:14", "Let all that you do be done in love."]
];

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;

  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).end("Unauthorized");
  }

  try {
    const a = fb();
    const db = a.firestore();
    const now = new Date();

    const snap = await db.collection("pushTokens")
      .where("active", "==", true)
      .get();

    // Keep the Android app subscription filter.
    const appDocs = snap.docs.filter(doc => {
      const data = doc.data();

      return data.platform === "android-app" &&
        data.packageName === "com.dailyfaith.app";
    });

    const groups = new Map();
    let due = 0;
    let invalid = 0;

    for (const doc of appDocs) {
      const data = doc.data();
      const timezone = data.timezone || "Australia/Melbourne";
      const reminderTime = data.reminderTime || "08:00";

      let parts;

      try {
        parts = localParts(now, timezone);
      } catch {
        await doc.ref.update({
          active: false,
          invalidTimezone: true
        });
        invalid++;
        continue;
      }

      const localDate =
        `${parts.year}-${parts.month}-${parts.day}`;

      const localTime =
        `${parts.hour}:${parts.minute}`;

      if (
        localTime < reminderTime ||
        data.lastSentDate === localDate
      ) {
        continue;
      }

      const day = Math.floor(
        Date.UTC(
          Number(parts.year),
          Number(parts.month) - 1,
          Number(parts.day)
        ) / 86400000
      );

      const verse = verses[((day % 7) + 7) % 7];
      const key = `${verse[0]}|${verse[1]}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push({
        doc,
        token: data.token,
        localDate,
        verse
      });

      due++;
    }

    let sent = 0;
    let failed = 0;

    for (const items of groups.values()) {
      for (let i = 0; i < items.length; i += 500) {
        const batch = items.slice(i, i + 500);
        const verse = batch[0].verse;

        // Restore the original Firebase notification payload.
        await sendBatch(batch, verse);
      }
    }

    async function sendBatch(batch, verse) {
      const result = await a.messaging().sendEachForMulticast({
        tokens: batch.map(item => item.token),

        notification: {
          title: verse[0],
          body: verse[1]
        },

        data: {
          url: "/"
        },

        webpush: {
          fcmOptions: {
            link: "/"
          }
        }
      });

      const writes = [];

      batch.forEach((item, index) => {
        const response = result.responses[index];
        const code = response.error?.code;

        if (response.success) {
          sent++;

          writes.push(
            item.doc.ref.update({
              lastSentDate: item.localDate,
              lastSentAt:
                a.firestore.FieldValue.serverTimestamp()
            })
          );
        } else {
          failed++;

          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            writes.push(
              item.doc.ref.update({ active: false })
            );
          }
        }
      });

      await Promise.all(writes);
    }

    return res.status(200).json({
      ok: true,
      checked: snap.size,
      appSubscriptions: appDocs.length,
      ignoredNonAppSubscriptions: snap.size - appDocs.length,
      due,
      sent,
      failed,
      invalid,
      checkedAt: now.toISOString()
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Send failed"
    });
  }
};
