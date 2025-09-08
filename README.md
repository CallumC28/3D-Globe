# Globe Facts

An interactive, cartoony 3D globe built with **Next.js 14**, **React Three Fiber**, and **OpenAI**.  
Users can spin and zoom the globe, click on any country, and see a popup panel with facts, history, languages, and landmarks, all generated on demand via the OpenAI API.  
Includes **Google Maps search/autocomplete** to jump to specific countries or cities.

**Currently working on better selected country overlay and fixing bug with slecting a country through the globe**

---

## Features

- **3D Interactive Globe**
  - Cartoony Earth with blue oceans and green land.
  - Crisp black outlines separate each country.
  - Smooth spin/zoom with inertia and camera tween.

- **Clickable Countries**
  - Hover outlines and highlight on click.
  - Selected country gently **lifts out like a Jenga piece**.
  - Works for all countries (even microstates) using ISO3 or name fallback.

- **Country Facts Panel**
  - Shows **summary, key landmarks, languages, fun fact**.
  - Powered by OpenAI API with deterministic prompts.
  - “Regenerate” button to fetch fresh facts.

- **Search Integration**
  - Google Places Autocomplete for searching countries/cities.
  - Geocoding → find country → focus globe.

- **Optional Landmarks**
  - Top 5 landmarks via Google Places API, shown as pins.

- **Cartoony Style**
  - Green land, blue oceans, soft glow rim.
  - Clean dark mode styling with Tailwind CSS.

- **Performance**
  - Lazy-loads heavy 3D deps.
  - SWR client caching.
  - Stateless: no database, ephemeral LRU cache in memory.

---

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router, Edge/serverless ready)
- [React](https://react.dev/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- [@react-three/drei](https://github.com/pmndrs/drei) helpers
- [Three.js](https://threejs.org/)
- [Tailwind CSS](https://tailwindcss.com/) (with dark mode)
- [Zustand](https://github.com/pmndrs/zustand) for global state
- [OpenAI Node SDK](https://www.npmjs.com/package/openai) (server-side facts generation)
- [Google Maps JS API](https://developers.google.com/maps/documentation/javascript/overview) (Autocomplete + Geocoding)
- [world-atlas](https://github.com/topojson/world-atlas) + [topojson-client](https://github.com/topojson/topojson-client) for polygons
- [SWR](https://swr.vercel.app/) for client-side caching
- [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/) for unit tests

---

## Project Structure (important ones)

```bash
app/
  ├─ api/
  │   ├─ facts/route.ts      # OpenAI facts API
  │   └─ geocode/route.ts    # Google Geocode proxy
  ├─ layout.tsx
  ├─ page.tsx
components/
  ├─ Globe.tsx               # 3D globe
  ├─ CountryPanel.tsx        # Info side drawer
  ├─ SearchBox.tsx           # Google Autocomplete
lib/
  ├─ topojson.ts             # World topojson loader
  ├─ countryMap.ts           # ISO/name mapping helpers
  ├─ openai.ts               # OpenAI client wrapper
  ├─ cache.ts                # In-memory LRU
  └─ utils.ts                # Camera tween helpers
store/
  └─ useAppStore.ts          # Zustand global state
public/
  └─ textures/               # Globe textures

```

---

## Environment Variables

.env file to hold API keys (the .env file goes in the Globe-facts file):
```bash
OPENAI_API_KEY=your_openai_key_here
GOOGLE_MAPS_API_KEY=your_restricted_google_key_here
```

---

## Limitations

- Tiny countries (e.g. Monaco, Vatican) exist in dataset but can be hard to click.
- OpenAI responses may vary slightly; schema is validated but facts are not “guaranteed”.

- No permanent cache: redeploying clears in-memory cache.
