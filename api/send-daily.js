
const admin = require("firebase-admin");
const dailyContent = require("../daily-content.json");

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

function parts(date, zone) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date).map(p => [p.type, p.value])
  );
}

/* MUST match app.js exactly. */
function verseIndexAtTime(year, month, day, hour, minute) {
  const dateNumber = Math.floor(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86400000
  );

  const block = Math.floor(
    (Number(hour) * 60 + Number(minute)) / 120
  );

  return (
    (dateNumber * 12 + block) % dailyContent.length +
    dailyContent.length
  ) % dailyContent.length;
}

function currentVerse(p) {
  const index = verseIndexAtTime(
    p.year,
    p.month,
    p.day,
    p.hour,
    p.minute
  );

  return dailyContent[index];
}

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;

  if (
    !secret ||
    req.headers.authorization !== `Bearer ${secret}`
  ) {
    return res.status(401).end("Unauthorized");
  }

  try {
    if (!Array.isArray(dailyContent) || dailyContent.length < 12) {
      throw Error("Daily content must contain at least 12 verses");
    }

    const a = fb();
    const db = a.firestore();
    const now = new Date();

    const snap = await db
      .collection("pushTokens")
      .where("active", "==", true)
      .get();

    const docs = snap.docs.filter(d => {
      const x = d.data();

      return x.platform === "android-app" &&
        x.packageName === "com.dailyfaith.app";
    });

    let due = 0;
    let sent = 0;
    let failed = 0;
    let invalid = 0;

    const groups = new Map();

    for (const doc of docs) {
      const d = doc.data();
      const zone = d.timezone || "Australia/Melbourne";

      let p;

      try {
        p = parts(now, zone);
      } catch {
        await doc.ref.update({
          active: false,
          invalidTimezone: true
        });

        invalid++;
        continue;
      }

      const date = `${p.year}-${p.month}-${p.day}`;
      const clock = `${p.hour}:${p.minute}`;

      const times = (
        d.reminderTimes?.length
          ? d.reminderTimes
          : [d.reminderTime || "08:00"]
      ).slice().sort();

      const sentMap = d.lastSentSlots || {};

      for (const time of times) {
        const slot = `${date}_${time}`;

        if (clock < time || sentMap[slot]) continue;

        // Select the verse displayed at the current local time.
        const verse = currentVerse(p);
        const key = verse.ref + "|" + verse.text;

        if (!groups.has(key)) {
          groups.set(key, []);
        }

        groups.get(key).push({
          doc,
          token: d.token,
          slot,
          verse
        });

        due++;
      }
    }

    for (const items of groups.values()) {
      for (let i = 0; i < items.length; i += 500) {
        const batch = items.slice(i, i + 500);
        const verse = batch[0].verse;

        const result = await a.messaging().sendEachForMulticast({
          tokens: batch.map(x => x.token),

          notification: {
            title: verse.ref,
            body: verse.text
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

        const byDoc = new Map();

        batch.forEach((item, index) => {
          const response = result.responses[index];

          if (response.success) {
            sent++;

            if (!byDoc.has(item.doc.id)) {
              byDoc.set(item.doc.id, {
                ref: item.doc.ref,
                slots: []
              });
            }

            byDoc.get(item.doc.id).slots.push(item.slot);

          } else {
            failed++;

            const code = response.error?.code;

            if (
              code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-registration-token"
            ) {
              byDoc.set(item.doc.id, {
                ref: item.doc.ref,
                invalid: true
              });

              invalid++;
            }
          }
        });

        await Promise.all(
          [...byDoc.values()].map(async item => {
            if (item.invalid) {
              return item.ref.update({ active: false });
            }

            const latest = await item.ref.get();
            const previous = latest.data()?.lastSentSlots || {};
            const next = { ...previous };

            item.slots.forEach(slot => {
              next[slot] = true;
            });

            return item.ref.update({
              lastSentSlots: next,
              lastSentAt: admin.firestore.FieldValue.serverTimestamp()
            });
          })
        );
      }
    }

    return res.status(200).json({
      ok: true,
      versesAvailable: dailyContent.length,
      checked: snap.size,
      appSubscriptions: docs.length,
      ignoredNonAppSubscriptions: snap.size - docs.length,
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
