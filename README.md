# ⚡ LiftTap — Zero-Friction Gym & Bodyweight Tracker

A modern, mobile-first **Progressive Web App (PWA)** built to replace tedious Notepad gym logs with **sub-3-second, zero-hassle logging**.

![PWA Ready](https://img.shields.io/badge/PWA-Ready-10b981?style=for-the-badge)
![Offline First](https://img.shields.io/badge/Offline-100%25-06b6d4?style=for-the-badge)
![Data Privacy](https://img.shields.io/badge/Storage-Local_Only-6366f1?style=for-the-badge)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero-f59e0b?style=for-the-badge)

---

## 💡 Why LiftTap?

Logging workouts in a smartphone notepad between sets is slow, repetitive, and clunky with sweaty hands:
* Re-typing exercise names every session.
* Scrolling back up to recall: *"What weight and reps did I hit last week?"*
* Manually typing body weight and doing mental plate math.

**LiftTap eliminates the friction.** When you open today's workout, your previous records are already waiting as ghost values. Confirm last week's numbers with **1 tap**, or use quick `+` / `-` steppers to log progressive overload.

---

## ✨ Features

* **👻 Ghost Sets & 1-Tap Logging:**
  * Inputs automatically pre-fill with your numbers from the last session.
  * Tap **Log Set** to log in 1 second, or use quick stepper chips (`-2.5`, `+2.5`, `+5 kg` and `-1`, `+1`, `+2 reps`).
* **🔒 4-Set Cap per Exercise:**
  * Built-in set tracker (`0/4`, `1/4`, `2/4`, `3/4`, `4/4`).
  * Once 4 sets are completed, the exercise automatically locks with a completion checkmark.
* **⚖️ Fast Body Weight Check-in:**
  * Top check-in card with quick `[-0.5]`, `[-0.1]`, `[+0.1]`, `[+0.5]` steppers.
  * 7-day moving average and 30-day historical chart (rendered with HTML5 Canvas).
* **📝 Smart Notepad Sync (Import & Export):**
  * **Smart Parser:** Paste raw text notes from Notepad (e.g., `Bench Press: 75kg 8 reps`, `BW: 74.5`). Automatically parses exercises, weights, reps, and dates into structured history.
  * **1-Click Export:** Copies today's formatted workout back to your clipboard for text backup.
* **⏱️ Floating Rest Timer & Audio Chimes:**
  * Kicks off automatically the moment you log a set.
  * Floating progress ring with `+30s` and `Skip` controls.
  * Subtle audio chime (Web Audio API) + haptic phone vibration when rest is up.
* **☀️ Screen Wake Lock:**
  * Built-in screen lock toggle keeps your phone awake so it doesn't lock while resting between sets.
* **📶 100% Offline-First (PWA):**
  * Zero backend, zero subscriptions, zero tracking.
  * Works on Airplane Mode in basement gym spaces with no mobile signal.
  * Stored privately in your browser's `localStorage`.

---

## 📱 How to Install on Mobile

LiftTap is a standalone Progressive Web App. You do not need to download anything from the App Store or Google Play.

### Android (Google Chrome)
1. Open your hosted URL in **Chrome**.
2. Tap the three dots menu (`⋮`) in the top right.
3. Tap **"Install App"** (or **"Add to Home Screen"**).
4. Launch from your home screen in distraction-free fullscreen mode.

### iPhone / iPad (Apple Safari)
1. Open your hosted URL in **Safari**.
2. Tap the **Share** button (`⎋` box with an up arrow).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right.

---

## 🚀 Free Hosting & Deployment

Since LiftTap is a pure static web application (HTML, CSS, JavaScript), you can host it for free in seconds:

### Option 1: GitHub Pages (Recommended)
1. Push this repository to GitHub.
2. Go to **Settings** → **Pages**.
3. Under **Branch**, select `main` (and `/` or `/gym-tracker` if in a subfolder), then click **Save**.
4. Your free HTTPS link will be ready in 1–2 minutes!

### Option 2: Netlify Drop (No CLI Needed)
1. Open [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop this folder onto the page.
3. Get an instant, live HTTPS URL.

---

## 🛠️ Tech Stack

* **Frontend:** Vanilla HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid)
* **PWA:** Web App Manifest (`manifest.json`) + Service Worker (`sw.js`)
* **Audio & Haptics:** Web Audio API & `navigator.vibrate`
* **Storage:** LocalStorage (zero cloud dependency, 100% data privacy)
* **Graphics:** HTML5 Canvas API (interactive weight chart)

---

## 🔒 Privacy

All your workout logs, PR records, and weight measurements remain strictly on your personal device. No data is ever sent to external servers.
