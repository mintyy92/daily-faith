
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAvp_n3uPN4gK9BQU39OEXuARUCQBPQG4",
  authDomain: "daily-faith-27eb2.firebaseapp.com",
  projectId: "daily-faith-27eb2",
  storageBucket: "daily-faith-27eb2.firebasestorage.app",
  messagingSenderId: "147411163183",
  appId: "1:147411163183:web:38162d27a19e2f5115ceda",
  measurementId: "G-30HTLM4DGG"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// TEMPORARY DIAGNOSTIC NOTIFICATION
messaging.onBackgroundMessage((payload) => {

  console.log("DAILY FAITH FCM PAYLOAD:", payload);

  const receivedData = payload.data || {};

  const title = "Daily Faith — Diagnostic";

  const body = JSON.stringify({
    titleReceived: receivedData.title || "MISSING",
    bodyReceived: receivedData.body || "MISSING",
    urlReceived: receivedData.url || "MISSING",
    notificationPayload: payload.notification || null
  }, null, 2);

  console.log("DAILY FAITH RECEIVED DATA:", receivedData);

  return self.registration.showNotification(title, {
    body: body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "daily-faith-diagnostic",
    renotify: true,
    data: {
      url: receivedData.url || "/"
    }
  });
});

// OPEN DAILY FAITH WHEN NOTIFICATION IS TAPPED
self.addEventListener("notificationclick", (event) => {

  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((windowClients) => {

      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      return clients.openWindow(url);
    })
  );
});
