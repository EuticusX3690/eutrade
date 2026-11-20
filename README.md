# Eutrade

A trade calculator and journal that runs in the browser. No server, no sign-up.

## What it does
- Works out SL, TP, lot size, risk per lot and the money you risk and can win
- Journal with strategy, reason, trend, session, screenshots and timing
- Win rate and dollar total per strategy, trend and session
- Coach feedback after a trade closes, and an "Ask the AI" box

## Files
| File | Purpose |
|---|---|
| `index.html` | The page |
| `style.css` | Colors and layout |
| `app.js` | All the logic |
| `manifest.webmanifest` | Lets phones add it to the home screen |
| `icon-192.png`, `icon-512.png` | Home screen icons |
| `logo.png` | Logo in the header |
| `sw.js` | Lets the app open offline |

## Put it online with GitHub Pages
1. Create a new repository on GitHub.
2. Choose **Add file, then Upload files**, and upload every file here (keep the names exactly).
3. Open **Settings, then Pages**. Under **Branch** choose `main` and the `/ (root)` folder, then Save.
4. After a minute, GitHub shows your link. Open it in Chrome and use **Add to Home screen**.

## Your data
Trades and screenshots are stored only in the browser on your phone. They are not in the repository. Use **More, then Backup** and **Export everything** regularly. **Import export file** loads an export back in, screenshots included.

## The AI
- **With an API key:** open **More, then AI settings**, paste your Anthropic API key and save. The key stays in your browser only. Never put a key in these files, because the repository is public. Use a key with a low spending limit.
- **Without a key:** the app copies the prompt so you can paste it into Claude yourself.

## Make an Android APK
1. Name the repository `yourusername.github.io` so the app lives at the root of your address.
2. Open **pwabuilder.com**, enter your site address and tap Start.
3. Choose **Package for stores**, then **Android**, and generate a **signed** package. Keep the signing key safe.
4. Unzip the download and install the `.apk` on your phone (allow "install unknown apps").
5. To hide the browser address bar inside the app, add the `assetlinks.json` file that PWABuilder gives you at `.well-known/assetlinks.json` (and a file named `.nojekyll`) in the repository.

## Build the APK on GitHub (no computer needed)
1. In the repository tap **Add file, then Create new file**.
2. In the name box type `.github/workflows/build.yml` (the slashes make the folders).
3. Paste the contents of `build.yml` and commit.
4. Open the **Actions** tab, choose **Build Android APK**, and tap **Run workflow**. It also runs on every push.
5. When it finishes (a few minutes), open the run and download **Eutrade-APK** from **Artifacts**. Unzip it to get `app-debug.apk` and install it.
This makes a real Android app with no browser address bar. **Export everything** opens the share sheet inside this app.
