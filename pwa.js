import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getMessaging,
  getToken,
  isSupported
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvp_n3uPNg4gK9BQU39OEXuARUCQBPg4",
  authDomain: "daily-faith-27eb2.firebaseapp.com",
  projectId: "daily-faith-27eb2",
  storageBucket: "daily-faith-27eb2.firebasestorage.app",
  messagingSenderId: "147411163183",
  appId: "1:147411163183:web:38162d27a19e2f5115ceda",
  measurementId: "G-30HTLM4DGG"
};

const vapidKey =
  "BE3dynxB_Gx1EMgbVaRNeicHt_3NEktC73IEg52-pw8RzXxul2pMccsYZIZVWotnXwL5YoOEh5E2WXsN7yJdBBg";

const ANDROID_PACKAGE = "com.dailyfaith.app";
const expectedTwaReferrer = `android-app://${ANDROID_PACKAGE}`;
const isDailyFaithTwa =
  typeof document.referrer === "string" &&
  document.referrer.replace(/\/$/, "") === expectedTwaReferrer;

const btn = document.getElementById("enableNotifications");
const install = document.getElementById("installApp");
const timeInput = document.getElementById("reminderTime");
const enabledInput = document.getElementById("reminderEnabled");
const saveBtn = document.getElementById("saveReminder");
const status = document.getElementById("reminderStatus");

let deferred = null;
let app = null;
let messaging = null;
let token = null;

const timezone =
  Intl.DateTimeFormat().resolvedOptions().timeZone ||
  "Australia/Melbourne";

function message(text, type = "") {
  if (status) {
    status.textContent = text;
    status.className = "reminder-status " + type;
  }
}

function updateReminderButton() {
  if (!btn || !enabledInput) return;
  btn.textContent = enabledInput.checked
    ? "✓ Reminder enabled"
    : "Enable reminders";
}

function validateTime(value) {
  return (
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value) &&
    Number(value.slice(3)) % 15 === 0
  );
}

// Restore the user's saved display preferences only.
// App identity is deliberately NOT stored in localStorage because Chrome
// and a TWA can share the same website storage.
try {
  const saved = JSON.parse(
    localStorage.getItem("dailyFaithReminder") || "null"
  );
  if (saved) {
    if (timeInput) timeInput.value = saved.time || "08:00";
    if (enabledInput) enabledInput.checked = saved.enabled === true;
  }
} catch (error) {
  console.error("Could not restore reminder settings:", error);
}
updateReminderButton();
enabledInput?.addEventListener("change", updateReminderButton);

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferred = event;
  if (install) install.hidden = false;
});

install?.addEventListener("click", async () => {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  if (install) install.hidden = true;
});

if (
  window.matchMedia("(display-mode:standalone)").matches ||
  navigator.standalone
) {
  if (install) install.hidden = true;
}

// Register the service worker for the site/app origin.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .catch(console.error);
  });
}

async function getPushToken() {
  if (!isDailyFaithTwa) {
    throw Error(
      "Daily reminders are available only in the installed Daily Faith app. Please open Daily Faith using its app icon."
    );
  }

  if (!window.isSecureContext || !("Notification" in window)) {
    throw Error("Notifications require a supported browser and HTTPS.");
  }
  if (!(await isSupported())) {
    throw Error("Push notifications are not supported on this device.");
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw Error("Please allow notifications for Daily Faith.");
    }
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  }

  const registration = await navigator.serviceWorker.ready;
  token = token || await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration
  });

  if (!token) throw Error("Could not obtain your notification token.");
  return token;
}

async function saveSettings() {
  if (!validateTime(timeInput.value)) {
    throw Error(
      "Please choose a time on a 15-minute interval, such as 8:00 or 8:15."
    );
  }

  const pushToken = await getPushToken();
  const response = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: pushToken,
      platform: "android-app",
      packageName: ANDROID_PACKAGE,
      timezone,
      reminderTime: timeInput.value,
      active: enabledInput.checked
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Error(data.error || "Could not save your reminder settings.");
  }

  localStorage.setItem("dailyFaithReminder", JSON.stringify({
    time: timeInput.value,
    enabled: enabledInput.checked
  }));

  updateReminderButton();
  message(
    enabledInput.checked
      ? `Your app-only daily reminder is set for ${timeInput.value}.`
      : "Your daily reminder is turned off.",
    "success"
  );
}

saveBtn?.addEventListener("click", async () => {
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    await saveSettings();
  } catch (error) {
    message(error.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save reminder settings";
  }
});

btn?.addEventListener("click", async () => {
  document.getElementById("reminderSettings")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
  if (!enabledInput.checked) enabledInput.checked = true;
  updateReminderButton();
  try {
    btn.disabled = true;
    await saveSettings();
  } catch (error) {
    message(error.message, "error");
  } finally {
    btn.disabled = false;
    updateReminderButton();
  }
});
