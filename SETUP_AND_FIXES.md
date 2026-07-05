# Myntra Clone — Setup Guide & What Was Fixed

I couldn't run `npm install` inside this sandbox (its network is locked down to a
short allowlist and the npm registry got blocked mid-session), so this isn't a
pre-built binary — it's your source code, fixed, ready to `npm install` and run
on your own machine in a few minutes.

## Bugs fixed

**Backend (`backend/`)**
- `routes/OrderRoutes.js` — order total was computed as `price + quantity`
  instead of `price * quantity`. Fixed to multiply.
- `routes/OrderRoutes.js` — the order was saved with a field called `item`
  but the `Order` model defines the field as `items`. Every order would have
  saved with an empty `items` array. Renamed to match the schema.
- `routes/Userroutes.js` — signup returned `404` for "user already exists"
  (should be `409 Conflict`) and login returned `404` for "invalid password"
  (should be `401 Unauthorized`). Fixed status codes.
- `server.js` — `PORT` had no fallback, so the server would crash with
  `undefined` if `.env` wasn't set up yet. Defaults to `5000` now.
- Added `backend/.env.example` — you need a real `.env` with your own
  MongoDB URI (see below).

**Frontend (`myntra/`)**
- Every screen (`index.tsx`, `bag.tsx`, `wishlist.tsx`, `categories.tsx`,
  `checkout.tsx`, `orders.tsx`, `product/[id].tsx`, `AuthContext.tsx`) had
  the original author's own live backend URL
  (`https://myntra-clone-xj36.onrender.com`) hardcoded in. That means as
  downloaded, the app was talking to *their* server and *their* database,
  not yours. I pulled this into one place: `constants/Api.ts`, which now
  points at `http://localhost:5000` by default. Change it once there
  instead of hunting through 8 files.

## How to run it

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
```
Edit `.env`:
```
MONGO_URI=your_mongodb_connection_string   # from MongoDB Atlas (free tier is fine)
PORT=5000
JWT_SECRET=any_random_string
```
Then:
```bash
npm start
```
You should see `Mongodb connected` and `Server is running on port 5000`.

Seed data: `backend/product.json` and `backend/category.json` look like
sample data — check if there's a seed script, otherwise you'll need to
insert them into your MongoDB collections manually (e.g. via MongoDB
Compass or `mongoimport`).

### 2. Frontend (Expo / React Native)
```bash
cd myntra
npm install
npx expo start
```
- Press `w` to run in browser, or scan the QR code with the **Expo Go** app
  on your phone.
- **If testing on a physical phone**, `localhost` in `constants/Api.ts`
  won't reach your computer — change it to your machine's LAN IP, e.g.
  `http://192.168.1.5:5000` (find it with `ipconfig`/`ifconfig`).
- Once you deploy the backend somewhere (Render, Railway, Fly.io), put that
  URL in `constants/Api.ts` instead.

## UI upgrade pass (this update)

Honest note: real 3D models (three.js-style) don't fit React Native without
heavy native libs I can't install/verify in this sandbox (npm registry got
blocked mid-project). What's shipped instead is genuine interactivity built
on packages already in your `package.json` (`react-native-reanimated`,
`react-native-gesture-handler`, `expo-haptics`):

- **Product page image** — drag it left/right/up/down and it tilts like a
  3D card (perspective + rotateX/rotateY), springs back on release.
- **Add to Bag** — press-in scale, shake if no size picked, morphs into a
  green "Added" state with a checkmark and haptic buzz on success.
- **Size selector** — spring pop + haptic tick on tap.
- **Wishlist heart** — spring pop animation on tap.
- **Sticky header fade-in** — appears once you scroll past the hero image.
- **Home screen cards** (categories, deals, products) — staggered fade/slide-in
  on load, spring press-scale on tap, via a new reusable
  `components/AnimatedCard.tsx`.

Two real fixes needed for the animations to work at all, now in place:
- `babel.config.js` didn't exist — added it with the Reanimated babel plugin
  (required, must be last in the plugins array).
- `app/_layout.tsx` wasn't wrapped in `GestureHandlerRootView` — gestures
  (like the tilt drag) silently no-op without this on Android. Added.

After `npm install`, if Metro complains about Reanimated on first run, stop
it and run `npx expo start -c` once (clears the babel cache).


React Native/Expo apps aren't a single "download and open" file the way a
website is — a real build means an `.apk`/`.ipa` (needs a signed build
pipeline) or `npx expo export -p web` for a static web bundle. Happy to
generate the web export once you confirm the backend is reachable — the
web bundle will hit whatever URL is set in `constants/Api.ts`, and right
now that's `localhost`, which only works while your own backend is running
next to it.

---

## Deploy — everything's set up, just run these

**Also fixed:** `app.json` had the original author's own EAS project ID
baked in — building with that would've tried to publish under *their*
Expo account. Removed it; `eas build:configure` below generates your own.

### 1. Backend → Render
1. Push the whole project to a GitHub repo.
2. Go to render.com → **New → Blueprint** → connect your repo. It'll read
   `render.yaml` (already in the repo root) and set everything up.
3. It'll ask for `MONGO_URI` — paste your MongoDB Atlas connection string.
4. Deploy. You'll get a URL like `https://myntra-backend-xxxx.onrender.com`.
5. Load sample data into your database:
   ```
   cd backend
   npm install
   cp .env.example .env   # paste the same MONGO_URI in here too
   npm run seed
   ```
   (This clears and re-inserts `product.json`/`category.json` properly —
   the original files had stale IDs from the author's own database that
   wouldn't have worked in yours.)

### 2. Point the app at your live backend
Edit `myntra/constants/Api.ts`:
```ts
export const API_BASE_URL = "https://myntra-backend-xxxx.onrender.com";
```

### 3a. Show it as a web link (fastest)
```
cd myntra
npm install
npx expo export -p web
```
Then drag the `myntra/dist` folder onto netlify.com (or push to GitHub and
connect the repo — `netlify.toml` is already set up to build it
automatically). You get a live shareable URL in ~2 minutes.

### 3b. Show it as a real installable Android app (better demo)
```
cd myntra
npm install -g eas-cli
eas login              # free Expo account
eas build:configure    # generates YOUR OWN project id in app.json
eas build -p android --profile preview
```
Takes ~10-15 min on Expo's build servers. You'll get a link to an `.apk` —
open it on any Android phone to install, or share the link directly.
