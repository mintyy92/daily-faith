
const admin = require("firebase-admin");

function getFirebase() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!raw) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
    }

    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw))
    });
  }

  return admin;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const { token, timezone, reminderTime, active } = req.body || {};

    // Validate the Firebase notification token.
    if (
      typeof token !== "string" ||
      token.trim().length < 20
    ) {
      return res.status(400).json({
        ok: false,
        error: "Invalid notification token"
      });
    }

    // Validate the reminder time.
    if (
      typeof reminderTime !== "string" ||
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(reminderTime)
    ) {
      return res.status(400).json({
        ok: false,
        error: "Invalid reminder time"
      });
    }

    // The scheduler checks reminders every 15 minutes.
    const minute = Number(reminderTime.split(":")[1]);

    if (minute % 15 !== 0) {
      return res.status(400).json({
        ok: false,
        error: "Reminder time must use 15-minute intervals"
      });
    }

    // Validate the timezone.
    const selectedTimezone =
      typeof timezone === "string" && timezone.trim()
        ? timezone.trim()
        : "Australia/Melbourne";

    try {
      new Intl.DateTimeFormat("en-AU", {
        timeZone: selectedTimezone
      });
    } catch {
      return res.status(400).json({
        ok: false,
        error: "Invalid timezone"
      });
    }

    const isActive = active !== false;

    const firebase = getFirebase();
    const db = firebase.firestore();

    const collection = db.collection("pushTokens");

    // Find existing records for this device token.
    const existing = await collection
      .where("token", "==", token.trim())
      .get();

    const now = firebase.firestore.FieldValue.serverTimestamp();

    const subscriptionData = {
      token: token.trim(),
      active: isActive,
      reminderTime,
      timezone: selectedTimezone,

      // Identify this as the official Android app.
      platform: "android-app",
      packageName: "com.dailyfaith.app",

      updatedAt: now
    };

    if (existing.empty) {
      // Create a new subscription.
      await collection.add({
        ...subscriptionData,
        createdAt: now
      });
    } else {
      // Keep the most recently updated record.
      const documents = existing.docs.slice();

      documents.sort((a, b) => {
        const aTime = a.data().updatedAt?.toMillis?.() || 0;
        const bTime = b.data().updatedAt?.toMillis?.() || 0;

        return bTime - aTime;
      });

      const mainDocument = documents[0];

      // Update the main record.
      const previousData = mainDocument.data();

      const updateData = {
        ...subscriptionData
      };

      // Allow a newly selected reminder time to send today.
      if (
        previousData.reminderTime !== reminderTime ||
        previousData.timezone !== selectedTimezone
      ) {
        updateData.lastSentDate =
          firebase.firestore.FieldValue.delete();

        updateData.lastSentAt =
          firebase.firestore.FieldValue.delete();
      }

      await mainDocument.ref.update(updateData);

      // Deactivate duplicate records for this same token.
      const duplicateUpdates = documents.slice(1).map(doc =>
        doc.ref.update({
          active: false,
          updatedAt: now
        })
      );

      await Promise.all(duplicateUpdates);
    }

    return res.status(200).json({
      ok: true,
      saved: true,
      platform: "android-app",
      packageName: "com.dailyfaith.app",
      active: isActive,
      reminderTime,
      timezone: selectedTimezone
    });

  } catch (error) {
    console.error("Subscription error:", error);

    return res.status(500).json({
      ok: false,
      error: "Could not save notification subscription"
    });
  }
};
