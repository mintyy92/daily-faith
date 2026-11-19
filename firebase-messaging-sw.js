
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

// Display the verse sent by the server.
messaging.onBackgroundMessage((payload) => {
  const title =
    payload.data?.title ||
    "Daily Faith";

  const body =
    payload.data?.body ||
    "Your daily Bible verse is ready.";

  const url =
    payload.data?.url ||
    "/";

  return self.registration.showNotification(title, {
    body: body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "daily-faith-daily-verse",
    renotify: true,
    data: { url: url }
  });
});

// Open Daily Faith when the notification is tapped.
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
