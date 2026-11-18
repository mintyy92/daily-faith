# Daily Faith PWA — setup guide

## Architecture
Installable PWA hosted on Vercel; Firebase Cloud Messaging sends push notifications; Firestore stores device tokens; Vercel API functions manage subscriptions and sending. A Vercel Cron job checks hourly and sends only during the 08:00 `Australia/Melbourne` hour, automatically following AEST/AEDT daylight saving. Scheduled jobs are best-effort and can be delayed, so delivery is not guaranteed to the exact minute.

## 1. Firebase setup
1. Create a project at https://console.firebase.google.com.
2. Add a Web App and copy `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, and `appId`.
3. Project settings → Cloud Messaging → generate/get the Web Push certificate public key (VAPID).
4. Create a Firestore database; choose an Australian region if offered.
5. Project settings → Service accounts → Generate new private key. Keep this JSON secret; never commit it.

## 2. Configure client Firebase values
Replace the `REPLACE_WITH_...` values in BOTH `pwa.js` and `firebase-messaging-sw.js` with the Firebase Web App config. In `pwa.js`, replace `REPLACE_WITH_FIREBASE_WEB_PUSH_CERTIFICATE_KEY` with the VAPID public key. These browser config values are public; never put the Admin service-account JSON in browser files.

## 3. Deploy with GitHub and Vercel
1. Create a GitHub repository named `daily-faith`.
2. Upload every file and folder from this ZIP to the repository root.
3. Import the repo at https://vercel.com/new. Framework preset: Other; build command blank; output directory `.`.
4. Deploy. The hourly Vercel Cron job is defined in `vercel.json` and will be registered after deployment.

## 4. Vercel environment variables
Vercel → Project → Settings → Environment Variables:
- `FIREBASE_SERVICE_ACCOUNT_JSON`: entire Firebase service-account JSON pasted as one-line JSON.
- `CRON_SECRET`: a long random secret string. Vercel sends this to the cron endpoint as a bearer token.
Apply to Production and redeploy.

## 5. Firestore rules
Publish the included `firestore.rules` in Firebase → Firestore → Rules. The Vercel Admin SDK bypasses client rules.

## 6. Install and enable notifications
Android: open the HTTPS site in Chrome, install Daily Faith, open the installed app, tap **Enable 8am reminder**, and allow notifications. iPhone: add the site to Home Screen first, then open it and enable notifications. iOS/iPadOS 16.4+ is required for web push.

## Notes
- Notification contains the day's WEB verse and reference.
- Each device/browser must opt in separately.
- Daily verse rotates through seven curated WEB passages. The site library is a selected collection, not a complete Bible.
- Designed for Firebase Spark/free services and Vercel Hobby. Firestore has daily free quotas; monitor usage. Firebase Cloud Messaging is listed as a no-cost Firebase product.
- Push delivery is best-effort, not guaranteed to the exact minute.
