
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

// Let Firebase handle background notification display automatically.
// Do not call showNotification() manually.
const messaging = firebase.messaging();
