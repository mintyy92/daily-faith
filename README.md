# Daily Faith

A free, static Christian daily inspiration website built for GitHub + Vercel.

## Included
- Daily Bible verse (World English Bible / WEB)
- Daily prayer
- Daily reflection
- Search-by-topic style Bible verse library filters
- Share and copy verse actions
- Responsive desktop and mobile layout

## How the daily update works
The site selects a daily entry using the visitor's local calendar date. No database, paid API, scheduled function, or server is required. The content changes automatically each day for visitors.

## Publish with GitHub and Vercel
1. Create a new GitHub repository named `daily-faith`.
2. Upload all files in this folder to the repository root: `index.html`, `styles.css`, `app.js`, `vercel.json`, and `README.md`.
3. In Vercel, choose **Add New → Project**, import the `daily-faith` GitHub repository, and deploy.
4. Framework preset: **Other**. Build command: leave blank. Output directory: `.` (or leave the default if Vercel detects the static site).
5. Every push to the connected GitHub branch will automatically redeploy the site.

## Custom domain
In Vercel → Project → Settings → Domains, add your domain and follow the DNS instructions.

## Content note
This starter includes a curated selection of WEB verse text, daily prayers and reflections. The Bible library is a selected verse collection, not a complete Bible reader. Add further verified WEB passages to the `library` array in `app.js` as the collection grows. The WEB translation is public domain.
