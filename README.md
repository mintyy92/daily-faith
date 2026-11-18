# Daily Faith

A lightweight installable Daily Faith website with Firebase Cloud Messaging push reminders.

## Deploy
1. Upload the contents of this folder to the root of the `mintyy92/daily-faith` GitHub repository.
2. Vercel should deploy the static site and `/api` functions automatically.
3. Keep these Vercel environment variables configured: `FIREBASE_SERVICE_ACCOUNT_JSON` and `CRON_SECRET`.
4. Keep GitHub Actions secrets configured: `DAILY_FAITH_URL` and `DAILY_FAITH_CRON_SECRET` (the latter must match `CRON_SECRET`).
5. Enable GitHub Actions for the repository. `.github/workflows/daily-push.yml` checks every 15 minutes and sends reminders that are due.

## Reminder behaviour
- Users choose any time in 15-minute increments.
- The selected time is interpreted in the device's detected IANA timezone.
- Existing subscriptions without a saved time default to 08:00 in Australia/Melbourne.
- Users can switch their reminder off in the reminder settings panel.
- Successful delivery is tracked per subscription and local calendar date.

## Firebase
The client Firestore rules deny direct client access. The API uses the Firebase Admin SDK service account stored in Vercel environment variables.
