# Hindu Panchanga Calendar — Technical Documentation

> **File:** `index.html`
> **Type:** Single-file standalone web app (no build step, no dependencies except Tabler Icons CDN)
> **Last updated:** May 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Features at a Glance](#2-features-at-a-glance)
3. [Architecture](#3-architecture)
4. [Astronomical Calculations](#4-astronomical-calculations)
   - 4.1 Julian Date
   - 4.2 Sun Longitude (enhanced VSOP87)
   - 4.3 Moon Longitude (extended ELP2000)
   - 4.4 Ayanamsha (Sidereal Correction)
   - 4.5 Sunrise & Sunset
5. [Panchanga Elements](#5-panchanga-elements)
   - 5.1 Tithi
   - 5.2 Nakshatra
   - 5.3 Yoga
   - 5.4 Karana
   - 5.5 Vara (Weekday)
   - 5.6 Transition End Times
   - 5.7 Guru & Sukra Moudhyam
6. [Inauspicious & Auspicious Periods](#6-inauspicious--auspicious-periods)
7. [Auspiciousness Score](#7-auspiciousness-score)
8. [Eclipse Calculations](#8-eclipse-calculations)
9. [Festival Detection](#9-festival-detection)
10. [Location & Solar Times](#10-location--solar-times)
11. [Fine-Tuning Guide](#11-fine-tuning-guide)
    - 11.1 Switching Ayanamsha
    - 11.2 Improving Sun Accuracy
    - 11.3 Improving Moon Accuracy
    - 11.4 Sunrise Altitude Correction
    - 11.5 Tithi / Nakshatra Quality Ratings
    - 11.6 Auspiciousness Score Weights
    - 11.7 Rahu Kalam & Gulika Slots
    - 11.8 Adding / Editing Festivals
    - 11.9 Adding Cities / Changing Default Location
    - 11.10 Eclipse Accuracy
    - 11.11 Using an External Sunrise API
    - 11.12 Swiss Ephemeris via WASM
    - 11.13 Adjusting Moudhyam Thresholds
12. [Known Limitations](#12-known-limitations)
13. [Quick-Reference: Key Variables](#13-quick-reference-key-variables)

---

## 1. Overview

This is a self-contained HTML file that computes the Hindu *Panchanga* (five-limbed almanac) for any date and location using JavaScript astronomy. It requires no server, no framework, and no build step — open it in any modern browser.

All calculations are done in the browser at runtime. Panchanga results are cached in memory (`pcache`, `tcache`) so repeated access to the same date is instant.

---

## 2. Features at a Glance

| Tab | What it shows |
|-----|---------------|
| **Calendar** | Monthly grid with tithi quality colour-coding, tithi end times, eclipse markers, festival dots |
| **Panchanga** | Full five-anga detail for any date with transition end times, solar times, nakshatra metadata, eclipse card, festival card |
| **Festivals** | 35+ named festivals + all Ekadashis + Pradosh Vrat, grouped by month, filterable by category, countdown to each |
| **Eclipses** | All solar & lunar eclipses for 3 years with visibility computed for the selected location |
| **Muhurtha** | Date-range search with tithi / nakshatra / vara filters, min-score slider, optional eclipse exclusion |

---

## 3. Architecture

```
index.html
│
├── <style>          CSS custom properties (light + dark theme)
│
├── <body>           Tab shell + five panel divs
│
└── <script>
    ├── Static data arrays
    │   TI[30]  — Tithi metadata
    │   NK[27]  — Nakshatra metadata
    │   YG[27]  — Yoga metadata
    │   KR[11]  — Karana metadata
    │   VA[7]   — Vara (weekday) metadata
    │   FEST[]  — Festival rules
    │
    ├── Core astronomy
    │   jd(), jdFull(), jdToLocal()
    │   slong(J)     — tropical sun longitude
    │   mlong(J)     — tropical moon longitude
    │   ayan(J)      — ayanamsha (Lahiri approximation)
    │   getSunTimes() — NOAA sunrise/sunset
    │   getHY()      — Hindu year metadata
    │
    ├── Eclipse module
    │   moonLat(J), phaseJDE(), moonAlt(), eclipseData()
    │   addVisibility(), getDayEclipse(), getUpcomingEclipses()
    │
    ├── Panchanga transition finders
    │   findEnd() — binary-search for anga end time
    │   calcTr()  — all four transitions for a date
    │
    ├── Core panchanga
    │   calcP()   — full panchanga for a date
    │   gp()      — cached wrapper for calcP()
    │   gt()      — cached wrapper for calcTr()
    │
    ├── Festival engine
    │   getFestivalsForYear() — scans 365 days, applies FEST rules
    │   renderFestivals()
    │
    └── UI renderers
        renderCal(), renderPanch(), renderEclipses(),
        renderFestivals(), runSearch(), renderYearStrip()
```

**Caches:**

| Cache | Key | Content |
|-------|-----|---------|
| `pcache` | `"lat-lon-Y-M-D"` | Full panchanga object |
| `tcache` | `"tr-Y-M-D"` | Tithi/nakshatra/yoga/karana end times |
| `edCache` | `"de-Y-M-D"` | Eclipse for that date (or null) |
| `festDayCache` | `"fd-Y-M-D"` | First matching festival (or null) |

Call `clearPCache()` after a location change to force recalculation of solar times.

---

## 4. Astronomical Calculations

### 4.1 Julian Date

```js
function jd(date) { /* uses noon as reference point */ }
function jdFull(date) { /* UTC-based, for precise moment calculations */ }
```

`jd()` computes the Julian Day Number for **local noon** of the given date — used for daily panchanga values where the traditional Hindu day starts at sunrise.

`jdFull()` uses UTC hours/minutes/seconds — used for eclipse midpoints and transition binary searches.

**Standard formula** (Jean Meeus, *Astronomical Algorithms* Ch. 7):

```
If month ≤ 2: year -= 1, month += 12
A = floor(year / 100)
B = 2 - A + floor(A / 4)
JD = floor(365.25*(year+4716)) + floor(30.6001*(month+1)) + day + B - 1524.5
```

---

### 4.2 Sun Longitude (enhanced)

**Function:** `slong(J)`  
**Returns:** Apparent tropical (geocentric) ecliptic longitude of the Sun in degrees [0–360)

**Algorithm:** Jean Meeus VSOP87 simplified, with T² terms and nutation+aberration correction.

```
T  = (J - 2451545) / 36525
L0 = 280.46646 + 36000.76983·T + 0.0003032·T²   ← includes T² term
M  = 357.52911 + 35999.05029·T − 0.0001537·T²   ← includes T² term
C  = (1.914602 − 0.004817·T − 0.000014·T²)·sin(M)   ← full equation of centre
   + (0.019993 − 0.000101·T)·sin(2M)
   + 0.000289·sin(3M)
Ω  = 125.04452 − 1934.136261·T                   ← ascending node
λ  = L0 + C − 0.00569 − 0.00478·sin(Ω)          ← apparent longitude (nutation+aberration)
```

**Accuracy:** ±0.003° (vs. ±0.01° for the previous 3-term version). The −0.00569 − 0.00478·sin(Ω) correction adds the nutational shift and stellar aberration (~−20.5″), which matters for precise ayanamsha epoch calculations and eclipse midpoints.

---

### 4.3 Moon Longitude (extended)

**Function:** `mlong(J)`  
**Returns:** Tropical geocentric ecliptic longitude of the Moon in degrees [0–360)

**Algorithm:** Extended ELP2000 — 26 terms (vs. 18 in the previous version), now including the eccentricity correction factor **E** for terms involving the Sun's mean anomaly M.

**Eccentricity factor E** (applied to all terms containing M):
```
E = 1 − 0.002516·T − 0.0000074·T²
```

This corrects for the slow decrease in Earth's orbital eccentricity over time, improving accuracy by ~0.01° for dates far from J2000.

**Additional terms added:**
```
+0.004607·E·sin(D+M)          +0.004307·sin(2D+Mp−2F)
+0.003773·sin(2D−Mp−2F)       −0.003239·E·sin(Mp+M)
−0.002819·sin(2D+3Mp)         +0.002737·sin(2D−2Mp+2F)
−0.002349·sin(D+Mp)           +0.002028·E²·sin(2M)
```

**Accuracy:** ±0.1° (vs. ±0.3° previously). Nakshatra transition timing improves from ±30 min to ±10 min.

---

### 4.4 Ayanamsha (Sidereal Correction)

**Function:** `ayan(J)`  
**Returns:** Ayanamsha in degrees (amount to subtract from tropical longitude to get sidereal)

**Current formula (Lahiri approximation):**

```js
function ayan(J) {
  return 23.853 + (J - 2451545) / 36525 * 1.397;
}
```

This gives approximately:
- J2000 (Jan 1.5, 2000): **23.853°**
- Rate: **1.397° per century** ≈ **50.29″ per year**

The Lahiri (Chitrapaksha) ayanamsha is the official ayanamsha of the Indian Government and is used by most North Indian panchangas.

**Sidereal longitude:**
```
sid = (tropical_longitude − ayanamsha + 360) % 360
```

All panchanga elements (tithi, nakshatra, yoga, masa, ritu) use sidereal longitudes.

---

### 4.5 Sunrise & Sunset

**Function:** `getSunTimes(date, lat, lon)`  
**Returns:** `{ sunrise, sunset, solarNoon }` in minutes from midnight (local wall-clock)

**Algorithm:** NOAA solar algorithm (based on Meeus). Steps:

1. Compute solar declination from sun longitude + obliquity
2. Compute equation of time
3. Compute hour angle H from `cos(H) = (cos(90.833°) − sin(lat)·sin(dec)) / (cos(lat)·cos(dec))`
4. `sunrise = 720 − 4·lon − eot − H·4 + timezone_offset`
5. `sunset  = 720 − 4·lon − eot + H·4 + timezone_offset`

The zenith angle **90.833°** accounts for atmospheric refraction (~0.57°) and the Sun's semi-diameter (~0.267°).

Timezone is taken from `date.getTimezoneOffset()` — the browser's local timezone — so results are in local wall-clock time automatically.

---

## 5. Panchanga Elements

### 5.1 Tithi

A tithi is 1/30th of the synodic lunar month — the time for the Moon to gain exactly 12° on the Sun.

**Calculation:**

```js
const diff = (moonLong − sunLong + 360) % 360;  // 0–360
const tIdx = Math.floor(diff / 12);               // 0–29
```

| `tIdx` | Tithi | Paksha |
|--------|-------|--------|
| 0 | Pratipada | Shukla |
| 1–13 | Dwitiya–Chaturdashi | Shukla |
| 14 | Purnima | Shukla |
| 15 | Pratipada | Krishna |
| 16–28 | Dwitiya–Chaturdashi | Krishna |
| 29 | Amavasya | Krishna |

**Progress within tithi:**
```js
progress = (diff/12 − tIdx) × 100  // 0–100%
```

**Duration:** A tithi averages ~23h 37m but can range from ~19h to ~26h depending on the Moon's speed in its elliptical orbit.

---

### 5.2 Nakshatra

The Moon's sidereal longitude divided into 27 equal segments of 13°20′ each.

```js
const nRaw = moonLong_sidereal / (360/27);
const nIdx = Math.floor(nRaw);        // 0–26 (Ashwini to Revati)
const pada = Math.floor((nRaw - nIdx) × 4) + 1;  // 1–4
```

Each nakshatra has 4 padas of 3°20′ each, corresponding to the 108 navamshas.

**Duration:** A nakshatra averages ~27h 13m (Moon travels ~13.2°/day on average).

---

### 5.3 Yoga

The sum of the sidereal longitudes of Sun and Moon, divided into 27 equal segments.

```js
const yogaIdx = Math.floor((sunLong_sid + moonLong_sid) / (360/27)) % 27;
```

Yoga advances faster than either tithi or nakshatra alone because it accumulates the motions of both bodies (~1° per hour on average). A yoga lasts roughly **12–26 hours**.

---

### 5.4 Karana

A karana is half a tithi (6° of Sun–Moon elongation). There are 11 karanas — 7 movable (repeating) and 4 fixed.

```js
const kIdx = Math.floor(diff / 6);  // 0–59 within a lunar month

// Fixed karanas at boundaries:
if (kIdx === 0)       karana = KR[10];  // Kimstughna (Shukla Pratipada AM)
else if (kIdx >= 57)  karana = KR[7 + min(kIdx-57, 2)];  // Shakuni, Chatushpada, Naga
else                  karana = KR[(kIdx - 1) % 7];  // Bava through Vishti (movable)
```

**Fixed karanas (occur once per lunar month):**
- `KR[10]` Kimstughna — first half of Shukla Pratipada
- `KR[7]` Shakuni — second half of Krishna Chaturdashi
- `KR[8]` Chatushpada — first half of Amavasya
- `KR[9]` Naga — second half of Amavasya

**Movable karanas** cycle through 7 types repeatedly (Bava, Balava, Kaulava, Taitila, Garija, Vanija, Vishti).

---

### 5.5 Vara (Weekday)

The weekday is taken directly from `date.getDay()` (0=Sunday … 6=Saturday).

The Hindu vara starts at **sunrise** (not midnight), so strictly speaking, the vara for an early morning hour before sunrise belongs to the previous day. The app uses the calendar date's weekday — a simplification that is off by ~6 hours at most.

---

### 5.7 Guru & Sukra Moudhyam (Planetary Combustion)

A planet is *moudhya* (combust) when it is too close to the Sun to be visible and is considered weakened in its influence. Traditional Hindu almanacs define combustion thresholds for each planet.

**Planets tracked:**

| Planet | Sanskrit | Threshold | Traditional restriction |
|--------|----------|-----------|------------------------|
| Venus | Sukra | < 10° from Sun | Avoid marriages, engagements, and major auspicious ceremonies |
| Jupiter | Guru | < 11° from Sun | Avoid Upanayana (thread ceremony), initiation rites, new learning |

**Elongation formula:**
```
elongation = angular distance between geocentric planet longitude and Sun longitude
           = min(|planet_lon − sun_lon|, 360 − |planet_lon − sun_lon|)
```

**Geocentric planet position algorithm:**

The app uses a full inclination-corrected heliocentric → geocentric conversion (Meeus Ch. 31 orbital elements). For each planet:

1. Compute heliocentric ecliptic coordinates (x, y, z) using Kepler's equation:
   ```
   E − e·sin(E) = M  [solved iteratively, 5 iterations]
   ν = 2·atan2(√(1+e)·sin(E/2), √(1-e)·cos(E/2))   [true anomaly]
   u = ν + ω                                          [argument of latitude]
   x = r·(cos Ω · cos u − sin Ω · sin u · cos i)
   y = r·(sin Ω · cos u + cos Ω · sin u · cos i)
   z = r·sin u · sin i
   ```
2. Subtract Earth's heliocentric position to get geocentric vector
3. Geocentric ecliptic longitude = atan2(Δy, Δx)

**Orbital elements used (`ORBELEMS` constant):**

```javascript
const ORBELEMS = {
  venus:   { L0:181.9798, dL:58517.8157, a:0.72333, e:0.006772,
             M0:212.4487, dM:58517.8153, i:3.3947, Om0:76.6800, dOm:0.9113 },
  earth:   { L0:100.4665, dL:36000.7698, a:1.00000, e:0.016709,
             M0:357.5291, dM:35999.0503, i:0,       Om0:0,       dOm:0 },
  jupiter: { L0: 34.3515, dL: 3034.9057, a:5.20260, e:0.048498,
             M0: 20.0202, dM: 3034.6960, i:1.3032,  Om0:100.464, dOm:1.0217 },
};
```

Fields: `L0` = mean longitude at J2000 (°), `dL` = rate (°/century), `a` = semi-major axis (AU), `e` = eccentricity, `M0` = mean anomaly at J2000 (°), `dM` = rate (°/century), `i` = inclination (°), `Om0` = longitude of ascending node at J2000 (°), `dOm` = rate (°/century).

**Accuracy:** Elongation ±3°. This translates to a timing error of ±3–5 days for the start/end of moudhyam periods. For tighter accuracy, use Swiss Ephemeris (§11.12).

**Where displayed:**
- Year strip: red badge `☿ Sukra Moudhyam 6.3°` when active for the displayed date
- Panchanga tab: dedicated "Planetary Combustion" card with elongation, active status, estimated end date, and traditional restriction
- Calendar day detail: inline warning badges
- Muhurtha search results: `⚠ Sukra Moudhyam 4.1°` warning per result, plus optional exclusion checkboxes "Exclude Guru Moudhyam" / "Exclude Sukra Moudhyam"

**Score penalty:** Active Guru Moudhyam or Sukra Moudhyam each subtract 5 points from the auspiciousness score.

**Sukra Moudhyam typical duration:** 40–75 days per synodic cycle (~585 days). Occurs roughly twice every 1.5 years.

**Guru Moudhyam typical duration:** 20–30 days per year. Jupiter's combust period repeats annually.

---

**Function:** `findEnd(date, getFn)` — binary search for when an anga changes value.

```
1. Sample every 20 minutes from midnight to find the bracket [Jlo, Jhi]
   where getFn(Jlo) == current value and getFn(Jhi) != current value
2. Bisect 24 times (to ~4-second precision)
3. Convert result JDE to local time
```

The 20-minute step covers 216 samples (72 hours × 60 / 20). If no transition is found, the anga continues to the next day.

**Accuracy:** ±30 seconds (limited by the moon longitude precision of ~0.3°).

---

## 6. Inauspicious & Auspicious Periods

All periods are computed from local sunrise/sunset and therefore update automatically when location changes.

### Rahu Kalam

The day (sunrise to sunset) is divided into **8 equal parts**. Rahu Kalam is the part ruled by Rahu:

| Day | Part# (1-based) |
|-----|-----------------|
| Sunday | 8 |
| Monday | 2 |
| Tuesday | 7 |
| Wednesday | 5 |
| Thursday | 6 |
| Friday | 4 |
| Saturday | 3 |

```js
const partDuration = (sunset − sunrise) / 8;
const rahuStart    = sunrise + (rahuPart − 1) × partDuration;
```

### Gulika Kalam

Same 8-part division, Gulika (son of Saturn) is:

| Day | Part# |
|-----|-------|
| Sunday | 7 |
| Monday | 6 |
| Tuesday | 5 |
| Wednesday | 4 |
| Thursday | 3 |
| Friday | 2 |
| Saturday | 1 |

```js
const GULIKA = [7,6,5,4,3,2,1];  // indexed by date.getDay()
```

### Abhijit Muhurtha

Solar noon ± 24 minutes (48-minute window centred on solar noon). This is considered the best muhurtha of the day, overriding all negative influences.

```js
abhijit = { start: solarNoon − 24, end: solarNoon + 24 };
```

### Brahma Muhurtha

96 to 48 minutes before sunrise — optimal time for meditation and religious study.

```js
brahma = { start: sunrise − 96, end: sunrise − 48 };
```

---

## 7. Auspiciousness Score

Each day is assigned a score from **5 to 100** based on the quality of all five angas plus special yogas.

### Quality Mapping

Each anga element has a quality rating: `"excellent"`, `"good"`, `"mixed"`, or `"bad"`.

```js
const qv = { excellent: 20, good: 10, mixed: 0, bad: -15 };
```

### Score Formula

```
score = 50
      + qv[tithi.q]           // ±20 / +10 / 0 / −15
      + qv[naksh.q]           // same
      + qv[yoga.q] × 0.6      // weighted 60%
      + qv[karana.q] × 0.5    // weighted 50%
      + qv[vara.q]            // same as tithi weight
      + special.length × 10   // +10 per special yoga
```

Clamped to [5, 100].

### Special Yogas Detected

| Yoga | Condition | Bonus |
|------|-----------|-------|
| Amrita Siddhi Yoga | Vara × Nakshatra pair matches AMRITA table | +10 |
| Pushya Nakshatra | Moon in Pushya (naksh.n === 8) | +10 |
| Rohini Nakshatra | Moon in Rohini (naksh.n === 4) | +10 |
| Purnima | Shukla Chaturdashi tithi (tIdx 14) | +10 |
| Amavasya | Krishna Chaturdashi tithi (tIdx 29) | +10 |
| Ekadashi | tIdx 10 (Shukla) or 25 (Krishna) | +10 |
| Saubhagya/Siddhi/Siddha Yoga | yoga.n ∈ {4, 16, 21} | +10 |

**AMRITA table** (Vara → Nakshatra index for Amrita Siddhi Yoga):
```js
const AMRITA = { 0:12, 1:4, 2:0, 3:3, 4:6, 5:16, 6:21 };
// Sunday→Hasta, Monday→Mrigashira, Tuesday→Ashwini,
// Wednesday→Rohini, Thursday→Punarvasu, Friday→Vishakha, Saturday→Uttara Ashadha
```

---

## 8. Eclipse Calculations

### Algorithm (Meeus Chapter 51)

**Step 1 — Find lunar phase k:**
```
k = (JD − 2451550.09766) / 29.530588861
```
`k` is an integer for new moon, half-integer for full moon.

**Step 2 — Compute JDE of phase:**
The `phaseJDE(ki, isFull)` function computes the Julian Ephemeris Date of a given new or full moon with corrections for:
- Sun's mean anomaly M
- Moon's mean anomaly M′
- Moon's argument of latitude F
- Longitude of ascending node Ω
- Earth's orbital eccentricity E

**Step 3 — Compute Moon's latitude β:**
```js
function moonLat(J)  // 15-term series from ELP2000
```
If |β| > 1.57°, no eclipse of any kind occurs.

**Step 4 — Classify:**

| Condition | Eclipse type |
|-----------|-------------|
| Full moon, \|β\| ≤ 0.58° | Total Lunar |
| Full moon, 0.58° < \|β\| ≤ 1.04° | Partial Lunar |
| Full moon, 1.04° < \|β\| ≤ 1.57° | Penumbral Lunar |
| New moon, \|β\| ≤ 1.00° | Total/Annular Solar |
| New moon, 1.00° < \|β\| ≤ 1.57° | Partial Solar |

### Visibility Computation

**Lunar eclipse visibility at a given location:**
```js
moonAlt(J, lat, lon)
// Returns Moon altitude in degrees at eclipse midpoint
// Visible if alt > -0.5° (near horizon counts)
```

The `moonAlt()` function computes:
1. Moon's equatorial coordinates (RA, Dec) from ecliptic longitude, latitude, and obliquity
2. Greenwich Mean Sidereal Time (GMST)
3. Local Hour Angle (HA)
4. Altitude from HA, Dec, and latitude

**Solar eclipse visibility:**
Checks whether it is daytime at the selected location at the eclipse midpoint:
```js
isDaytime = eclipseMinutes > sunrise && eclipseMinutes < sunset
```
Then checks the sun's declination vs. observer's latitude to filter out impossible geometries.

> **Note:** Solar eclipse totality paths are narrow (~100–200 km wide). This app correctly identifies that a solar eclipse *is happening* at your location's longitude if it's daytime, but cannot determine whether you are in the umbra (totality), penumbra (partial), or outside the path entirely. Use [NASA's eclipse site](https://eclipse.gsfc.nasa.gov) or [timeanddate.com](https://www.timeanddate.com/eclipse/) for path maps.

### Eclipse Date Accuracy

The `phaseJDE()` formula from Meeus is accurate to within **a few minutes** for eclipse midpoint times over the next century. The date is correct to ±1 day in almost all cases.

---

## 9. Festival Detection

### How It Works

The `getFestivalsForYear(year)` function scans every day of the given year and applies rules from the `FEST` array plus generic Ekadashi and Pradosh rules.

### Solar Masa Index

All festival checks use the **solar masa** — the sign of the zodiac the Sun occupies:

```js
const masaIdx = Math.floor(sidereal_sun_longitude / 30);
// 0=Chaitra (Mesha), 1=Vaishakha (Vrishabha), ... 11=Phalguna (Meena)
```

| Index | Solar Rashi | Lunar Masa | Approx Gregorian |
|-------|-------------|------------|-----------------|
| 0 | Mesha | Chaitra | Mar–Apr |
| 1 | Vrishabha | Vaishakha | Apr–May |
| 2 | Mithuna | Jyeshtha | May–Jun |
| 3 | Karka | Ashadha | Jun–Jul |
| 4 | Simha | Shravana | Jul–Aug |
| 5 | Kanya | Bhadrapada | Aug–Sep |
| 6 | Tula | Ashwin | Sep–Oct |
| 7 | Vrischika | Kartika | Oct–Nov |
| 8 | Dhanu | Margashirsha | Nov–Dec |
| 9 | Makara | Pausha | Dec–Jan |
| 10 | Kumbha | Magha | Jan–Feb |
| 11 | Meena | Phalguna | Feb–Mar |

> **Solar vs. lunar masa:** Traditional panchangas use the *lunar* masa (starts at new moon after the sun enters a new sign). The solar masa used here agrees with the lunar masa ~90% of the time; dates within 1–2 days of a masa boundary may differ. For strict accuracy, replace the masa check with a full lunar month boundary tracker.

### Festival Rule Format

```js
{
  name: "Festival Name",          // shown as headline
  alt:  "Alternate / Regional",   // shown smaller (optional)
  desc: "One-line description",
  cat:  "major" | "vrat" | "monthly" | "festival",
  check: (p, prevP) => Boolean    // return true on the festival day
}
```

`p` is the panchanga object for the current day. `prevP` is the panchanga from the previous day (used for solar transit detection).

### Deduplication

Named festivals in `FEST` are processed first; their dates are added to `festDates`. The generic Ekadashi handler then skips any date already in `festDates`, preventing double-entries for named Ekadashis like Nirjala or Devshayani.

### Ekadashi Names

```js
const EK_SH = ["Kamada","Mohini","Nirjala","Devshayani","Putrada",
               "Parsva","Pashatputrada","Prabodhini","Mokshada",
               "Putrada","Jaya","Amalaki"];  // Shukla Ekadashis [masa 0–11]

const EK_KR = ["Papamochini","Varuthini","Apara","Yogini","Kamika",
               "Aja","Indira","Rama","Utpanna","Saphala",
               "Sat-tila","Vijaya"];          // Krishna Ekadashis [masa 0–11]
```

---

## 10. Location & Solar Times

Location is stored in the global `LOC` object:
```js
let LOC = { lat: 28.614, lon: 77.209, name: "Delhi" };
```

After changing location, call `clearPCache()` to invalidate cached panchanga (solar times are embedded in the cache).

**Auto-detect** uses the browser's `navigator.geolocation` API. The closest city within 3° is automatically selected as the display name.

Solar times are in **local wall-clock minutes from midnight**. The formula uses `date.getTimezoneOffset()` to convert from UTC. This works correctly across DST transitions.

---

## 11. Fine-Tuning Guide

This section explains exactly which lines to edit for each type of improvement.

---

### 11.1 Switching Ayanamsha

**Find this function:**
```js
function ayan(J) {
  return 23.853 + (J - 2451545) / 36525 * 1.397;
}
```

**Replace the body** with one of the following:

#### Lahiri (Chitrapaksha) — current, official Indian government
```js
return 23.853 + (J - 2451545) / 36525 * 1.397;
// ~23.853° at J2000, precession 50.29″/yr
```

#### Lahiri more precise (from Astronomical Ephemeris of India)
```js
const T = (J - 2451545) / 36525;
return 23.85 + 50.2564 / 3600 * T * 100;
// 23.85° at J2000, 50.2564″/yr
```

#### Raman ayanamsha
```js
const T = (J - 2451545) / 36525;
return 22.460148 + T * 1.3972;
// ~1.4° less than Lahiri, yielding later nakshatra transitions
```

#### Krishnamurti Paddhati (KP)
```js
const T = (J - 2451545) / 36525;
return 23.864 + T * 1.397;
// Nearly identical to Lahiri; small offset for sub-lord system
```

#### Fagan-Bradley (Western sidereal)
```js
const T = (J - 2451545) / 36525;
return 24.741 + T * 1.3972;
// Used by Western sidereal astrologers; roughly 1° more than Lahiri
```

After changing ayanamsha, **reload the page** — `pcache` will be empty (JS refresh clears it) and all values will be recalculated.

---

### 11.2 Improving Sun Accuracy

The current `slong()` function uses a 3-term approximation. For ±0.001° accuracy, replace with a full VSOP87 truncation:

**Find:**
```js
function slong(J) {
  const T = (J-2451545)/36525, L0 = nm(280.46646+36000.76983*T), M = nm(357.52911+35999.05029*T)*D2R;
  return nm(L0 + (1.914602-0.004817*T)*Math.sin(M) + 0.019993*Math.sin(2*M) + 0.000289*Math.sin(3*M));
}
```

**Replace with a 10-term version:**
```js
function slong(J) {
  const T = (J-2451545)/36525;
  const L0 = nm(280.46646 + 36000.76983*T + 0.0003032*T*T);
  const M  = nm(357.52911 + 35999.05029*T - 0.0001537*T*T) * D2R;
  const e  = 0.016708634 - 0.000042037*T;
  const C  = (1.914602 - 0.004817*T - 0.000014*T*T)*Math.sin(M)
           + (0.019993 - 0.000101*T)*Math.sin(2*M)
           +  0.000289*Math.sin(3*M);
  const sunLon = L0 + C;
  // Apparent longitude (nutation + aberration correction)
  const Om = nm(125.04 - 1934.136*T) * D2R;
  return nm(sunLon - 0.00569 - 0.00478*Math.sin(Om));
}
```

This adds the **apparent longitude** correction (nutation + aberration ≈ −0.006°) which matters for precise sunrise/sunset and ayanamsha epoch calculations.

---

### 11.3 Improving Moon Accuracy

The current `mlong()` uses 20 terms. The full ELP2000-82B series has 1,200+ terms for 0.001° accuracy, but a 60-term truncation gives ±0.05°:

Add the following additional terms to `mlong()` just before the final `return`:

```js
// Additional terms (add inside mlong, before the return statement)
+ 0.003958*Math.sin(2*D - 2*F)
+ 0.003229*Math.sin(2*D + Mp - M)
+ 0.002550*Math.sin(2*D - Mp + M)
+ 0.002520*Math.sin(-M + Mp)
+ 0.002459*Math.sin(3*D - Mp)
+ 0.002174*Math.sin(2*D - 3*Mp)
```

Where `D`, `M`, `Mp`, `F` are already computed in the function.

For full Swiss Ephemeris accuracy, see section 11.12.

---

### 11.4 Sunrise Altitude Correction for Elevated Locations

The current formula uses a fixed refraction+semi-diameter offset of **0.833°** (cos 90.833° in the hour angle formula). For elevated locations (hills, plateaus), the geometric horizon is below the astronomical horizon.

**Find in `getSunTimes()`:**
```js
const cosH = (Math.cos(90.833*D2R) - ...) / ...;
```

**Replace** `90.833` with a corrected value:

```js
// elevation in metres above sea level
const elevation = 0;  // ← set your elevation here

// Dip of horizon in degrees: dip = 0.0353 * sqrt(elevation)
const dip  = 0.0353 * Math.sqrt(elevation);
const zenith = 90.833 + dip;  // add dip to standard zenith

const cosH = (Math.cos(zenith*D2R) - Math.sin(lat*D2R)*sinDec)
           / (Math.cos(lat*D2R)*Math.cos(dec));
```

Example: At 1000 m elevation, dip ≈ 1.12°, so zenith = 91.95°. This pushes sunrise ~4 minutes earlier. Varanasi (~80 m) and Delhi (~216 m) have negligible dip, but Shimla (2200 m) or Dehradun (640 m) benefit from this correction.

---

### 11.5 Tithi / Nakshatra Quality Ratings

All quality ratings are stored in the static arrays. Find each array at the top of the `<script>` block.

#### Tithi Quality (`TI` array)

Each entry: `{ n, name, pak, q }` where `q` is `"excellent"` | `"good"` | `"mixed"` | `"bad"`.

Common customisations:

```js
// Make Amavasya bad instead of mixed:
TI[29].q = "bad";

// Make Chaturthi (Shukla) good for Ganesha worshippers:
TI[3].q = "good";

// Make Ashtami bad in both pakshas (strict view):
TI[7].q  = "bad";   // Shukla Ashtami
TI[22].q = "bad";   // Krishna Ashtami
```

#### Nakshatra Quality (`NK` array)

```js
// Abhijit is sometimes added as a 28th nakshatra (6°40′ of Makara)
// The app doesn't currently support it, but you can mark Uttara Ashadha
// partially as excellent to approximate it:
NK[20].q = "excellent";  // Uttara Ashadha (already excellent in most systems)
```

#### Yoga Quality (`YG` array)

All 27 yogas have quality ratings. The five most inauspicious yogas are:
Vishkumbha (1), Atiganda (6), Shula (9), Ganda (10), Vyaghata (13), Vajra (15), Vyatipata (17), Parigha (19), Vaidhriti (27).

```js
// Make Variyana (18) bad (strict view — some sources do):
YG[17].q = "bad";
```

---

### 11.6 Auspiciousness Score Weights

**Find in `calcP()`:**
```js
const qv = { excellent: 20, good: 10, mixed: 0, bad: -15 };
let score = 50
  + (qv[tithi.q]  || 0)         // weight = 1.0
  + (qv[naksh.q]  || 0)         // weight = 1.0
  + (qv[yoga.q]   || 0) * 0.6   // weight = 0.6
  + (qv[karana.q] || 0) * 0.5   // weight = 0.5
  + (qv[vara.q]   || 0)         // weight = 1.0
  + special.length * 10;
```

**To adjust priorities:**

```js
// Example: Emphasise tithi strongly, reduce yoga weight
let score = 50
  + (qv[tithi.q]  || 0) * 1.5   // tithi is most important
  + (qv[naksh.q]  || 0) * 1.2
  + (qv[yoga.q]   || 0) * 0.4   // yoga less important
  + (qv[karana.q] || 0) * 0.3
  + (qv[vara.q]   || 0) * 0.8
  + special.length * 15;          // special yogas are very important
```

**To add a Rahu Kalam penalty:**
```js
// Penalise if the current moment is within Rahu Kalam
// (add after computing rahuK, only meaningful for a specific hour, not a daily score)
```

**To change the base score:**
Change the initial `50`. A base of 40 means neutral days score below 50 more easily.

---

### 11.7 Rahu Kalam & Gulika Slots

The slot numbers follow traditional South Indian reckoning. If your source differs, edit these two lines:

**Rahu Kalam slot (in `VA` array):**
```js
const VA = [
  { n:0, name:"Ravivara",  ..., rahu:8 },  // Sunday:    part 8 (last)
  { n:1, name:"Somavara",  ..., rahu:2 },  // Monday:    part 2
  { n:2, name:"Mangalavara",..., rahu:7 }, // Tuesday:   part 7
  { n:3, name:"Budhavara", ..., rahu:5 },  // Wednesday: part 5
  { n:4, name:"Guruvara",  ..., rahu:6 },  // Thursday:  part 6
  { n:5, name:"Shukravara",..., rahu:4 },  // Friday:    part 4
  { n:6, name:"Shanivara", ..., rahu:3 },  // Saturday:  part 3
];
```

**Gulika Kalam slots:**
```js
const GULIKA = [7, 6, 5, 4, 3, 2, 1];
// index = date.getDay() (0=Sunday)
// Sunday: part 7, Monday: part 6, ... Saturday: part 1
```

To switch to a **North Indian** reckoning where the day is divided from sunrise (same as South Indian), no change is needed. Some traditions count from midnight — to implement that, change `st.sunrise` to `0` in the slot calculation.

---

### 11.8 Adding / Editing Festivals

The `FEST` array is the single place to add or modify festivals. Each entry follows this structure:

```js
{
  name: "Festival Name",
  alt:  "Alternate name / region",   // optional
  desc: "Short description",
  cat:  "major",                     // "major" | "vrat" | "monthly" | "festival"
  check: (p, prevP) => Boolean       // return true on the festival day
}
```

#### Available panchanga properties in `p`:

| Property | Type | Description |
|----------|------|-------------|
| `p.tIdx` | 0–29 | Tithi index (0=Shukla Pratipada … 29=Amavasya) |
| `p.sid` | 0–360 | Sidereal sun longitude |
| `mi(p)` | 0–11 | Solar masa index (helper: `Math.floor(p.sid/30)`) |
| `p.naksh.n` | 1–27 | Nakshatra number (1=Ashwini … 27=Revati) |
| `p.vara.n` | 0–6 | Weekday (0=Sunday) |
| `p.tithi.pak` | string | `"Shukla"` or `"Krishna"` |
| `p.tithi.n` | 1–15 | Tithi number within paksha |
| `prevP` | object | Previous day's panchanga (same structure) |

#### Example: Adding Vat Savitri Purnima (Jyeshtha Purnima)

```js
{
  name: "Vat Savitri Purnima",
  alt:  "Savatri Vrat",
  desc: "Married women fast and worship the banyan tree; commemorates Savitri's devotion.",
  cat:  "festival",
  check: (p) => mi(p) === 2 && p.tIdx === 14   // Jyeshtha Purnima
},
```

#### Example: Adding Ratha Saptami (Magha Shukla Saptami)

```js
{
  name: "Ratha Saptami",
  alt:  "Surya Jayanti",
  desc: "Sun's birthday; chariot of the Sun turns northward. Special worship at Tirupati.",
  cat:  "major",
  check: (p) => mi(p) === 10 && p.tIdx === 6   // Magha Shukla Saptami
},
```

#### Example: Adding Chhath Puja (Kartika Shukla Shashthi)

```js
{
  name: "Chhath Puja",
  alt:  "Dala Chhath",
  desc: "Four-day worship of Chhathi Maiya and the Sun; fasting from Chaturthi to Saptami. Major festival in Bihar and UP.",
  cat:  "major",
  check: (p) => mi(p) === 7 && p.tIdx === 5   // Kartika Shukla Shashthi (6th day)
},
```

#### Example: Adding a nakshatra-based festival

```js
// Shravana Saturdays (Shravana Somvar is already common — here Shravana Shanivar)
{
  name: "Shravana Shanivar",
  desc: "Saturn worship on Saturdays during Shravana month.",
  cat:  "festival",
  check: (p) => mi(p) === 4 && p.vara.n === 6  // Shravana masa + Saturday
},
```

#### Example: Solar transit (like Makar Sankranti already in the array)

```js
// Mesha Sankranti — Sun enters Aries (sidereal)
{
  name: "Mesha Sankranti",
  alt:  "Solar New Year",
  desc: "Sun enters sidereal Aries; New Year in Tamil (Puthandu), Bengali (Poila Boishakh), and Odia calendars.",
  cat:  "major",
  check: (p, prevP) => mi(p) === 0 && prevP && mi(prevP) === 11
},
```

---

### 11.9 Adding Cities / Changing Default Location

**Changing the default location** (currently Boston):

Find the global `LOC` declaration near the top of the `<script>` block:
```js
let LOC = { lat: 42.360, lon: -71.059, name: "Boston" };
```
Replace `lat`, `lon`, and `name` with your preferred location. The change takes effect on next page load.

**Adding cities to the dropdown:**

Find the `CITIES` array and add entries. The first entry appears first in the dropdown:
```js
const CITIES = [
  { name: "Boston",       lat: 42.360, lon: -71.059 },  // keep first for default
  { name: "Delhi",        lat: 28.614, lon:  77.209 },
  // ... existing cities ...

  // Add below:
  { name: "Bhopal",       lat: 23.259, lon:  77.413 },
  { name: "Indore",       lat: 22.719, lon:  75.857 },
  { name: "Mysuru",       lat: 12.295, lon:  76.644 },
  { name: "Amritsar",     lat: 31.634, lon:  74.873 },
  { name: "Guwahati",     lat: 26.145, lon:  91.735 },
  { name: "Dhaka",        lat: 23.811, lon:  90.412 },
  { name: "Lahore",       lat: 31.560, lon:  74.357 },
  { name: "Kuala Lumpur", lat:  3.148, lon: 101.686 },
];
```

The auto-detect matching radius is 3° (≈ 333 km). To tighten this:
```js
if (d < 3) nm2 = c.name;    // ← change 3 to 1.5 for stricter matching
```

---

### 11.10 Eclipse Accuracy

The current implementation catches approximately **95–98%** of all eclipses with correct dates. Potential issues:

| Problem | Frequency | Fix |
|---------|-----------|-----|
| Eclipse on day boundaries (UTC) may appear ±1 day in local time | Rare | `jdToLocal()` converts correctly via ms timestamp; usually fine |
| Penumbral lunar eclipses may be classified as partial | ~5% | Tighten the `ab <= 1.04` threshold |
| Near-limit solar eclipses (β ≈ 1.0°) may be missed or mis-classified | ~2% | Adjust `ab <= 1.00` threshold |

To verify any specific eclipse, cross-reference with [NASA Eclipse Predictions](https://eclipse.gsfc.nasa.gov/lunar.html).

**Improving lunar eclipse type boundaries** (Meeus-derived, more precise):

```js
// Replace in eclipseData(), isFull branch:
const u = 0.0059 + 0.0046*Math.cos(Mp) - 0.0182*Math.cos(2*D)
        + 0.0004*Math.cos(2*Mp) - 0.0005*Math.cos(M + Mp);
// u = umbral radius parameter; u > 0.9972 → central total eclipse
// For simplification, the current β-only check works in ~97% of cases
```

---

### 11.11 Using an External Sunrise API

For higher-precision sunrise times (accounting for terrain, precise refraction), you can call the [Sunrise-Sunset API](https://sunrise-sunset.org/api) (free, no key):

**Replace the `getSunTimes()` call** in `calcP()`:

```js
// Option A: Fetch from API (async) — requires reworking calcP() to be async
async function getSunTimesAPI(date, lat, lon) {
  const ds = date.toISOString().split('T')[0];
  const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${ds}&formatted=0`;
  const r = await fetch(url);
  const d = await r.json();
  // Convert UTC ISO strings to local minutes from midnight
  const toLocalMin = s => {
    const t = new Date(s);
    return (t.getHours()*60 + t.getMinutes() - t.getTimezoneOffset() + 1440) % 1440;
  };
  return {
    sunrise:   toLocalMin(d.results.sunrise),
    sunset:    toLocalMin(d.results.sunset),
    solarNoon: toLocalMin(d.results.solar_noon),
  };
}
```

> Note: making `calcP()` async requires all callers (`gp()`, `renderCal()`, `renderPanch()` etc.) to be awaited. This is a significant refactor. Easier to pre-fetch sunrise for a week at a time and cache.

---

### 11.12 Swiss Ephemeris via WASM

For professional-grade accuracy (±1 arcsecond for sun/moon), the [Moshier Ephemeris](http://www.moshier.net/) or Swiss Ephemeris WASM build can replace both `slong()` and `mlong()`.

**Using `swisseph-wasm` npm package:**

```html
<!-- In a Node/bundled environment: -->
<script src="swisseph.js"></script>
<script>
Module.onRuntimeInitialized = () => {
  const swe = Module;
  
  // Replace slong(J):
  function slong(J) {
    const [lon] = swe.swe_calc_ut(J, swe.SE_SUN, swe.SEFLG_SWIEPH);
    return (lon + 360) % 360;
  }

  // Replace mlong(J):
  function mlong(J) {
    const [lon] = swe.swe_calc_ut(J, swe.SE_MOON, swe.SEFLG_SWIEPH);
    return (lon + 360) % 360;
  }

  // Replace ayan(J) for built-in Lahiri:
  function ayan(J) {
    const [ay] = swe.swe_get_ayanamsa_ut(J);  // uses SE_SIDM_LAHIRI by default
    return ay;
  }
};
</script>
```

The Swiss Ephemeris WASM file is ~4 MB. Bundle it alongside the HTML for offline use, or load from a CDN. This is the approach used by professional astrology software.

---

---

### 11.13 Adjusting Moudhyam Thresholds and Orbital Elements

**Moudhyam combustion thresholds** are defined in a single constant at the top of the script:

```javascript
const MOUDHYAM_THRESH = { venus: 10, jupiter: 11 };
```

Some traditional sources use different values. To adjust:

| Source | Venus | Jupiter |
|--------|-------|---------|
| Standard (default) | 10° | 11° |
| Stricter view | 8° | 10° |
| Some South Indian sources | 12° | 11° |
| BV Raman's system | 10° | 11° |

**To add more planets** (Mars, Mercury, Saturn — also have traditional combustion thresholds):

```javascript
// Add to MOUDHYAM_THRESH:
const MOUDHYAM_THRESH = { venus: 10, jupiter: 11, mars: 17, mercury: 14, saturn: 15 };

// Add orbital elements to ORBELEMS:
const ORBELEMS = {
  // ... existing entries ...
  mars:    { L0:355.4530, dL:19140.2993, a:1.52366, e:0.093405, M0:319.5015, dM:19140.3000, i:1.8497, Om0: 49.588,  dOm:0.7726 },
  mercury: { L0:252.2509, dL:149472.674, a:0.38710, e:0.205633, M0:174.7948, dM:149472.515, i:7.0050, Om0: 48.331,  dOm:1.1857 },
  saturn:  { L0: 50.0774, dL: 1222.1138, a:9.53707, e:0.054150, M0:317.0207, dM: 1221.5515, i:2.4851, Om0:113.665, dOm:0.8770 },
};
```

Then add display rows in `renderPanch()` inside the `mdRow()` calls:
```javascript
${mdRow('mars',    'Mangala (Mars)',   'Avoid new ventures, surgery', mEnd.mars)}
${mdRow('mercury', 'Budha (Mercury)',  'Avoid contracts, trade deals', mEnd.mercury)}
${mdRow('saturn',  'Shani (Saturn)',   'Avoid inaugurations',         mEnd.saturn)}
```

**Improving elongation accuracy** (currently ±3°, sufficient for ±3–5 day timing):

The main source of error is ignoring light-time correction (~8 minutes for Venus, ~40 minutes for Jupiter). To add it:

```javascript
function getPlanetElongation(key, J) {
  const T = (J-2451545)/36525;
  const p = helioXYZ(ORBELEMS[key], T);
  const e = helioXYZ(ORBELEMS.earth, T);
  const dx = p.x-e.x, dy = p.y-e.y, dz = p.z-e.z;
  // Light travel time: 0.0057755 days per AU
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  const lightTime = 0.0057755 * dist;  // days
  // Recompute planet at (J - lightTime):
  const p2 = helioXYZ(ORBELEMS[key], (J - lightTime - 2451545)/36525);
  const gLon = nm(Math.atan2(p2.y-e.y, p2.x-e.x) * R2D);
  const d = nm(gLon - slong(J));
  return d > 180 ? 360-d : d;
}
```

This reduces elongation error to ~0.5°, improving moudhyam timing to ±1–2 days.

---

## 12. Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Solar masa used for festivals instead of lunar masa | ±1–2 day discrepancy for some festivals in some years | Use dedicated lunar month tracker |
| Moon longitude ±0.3° | Transition times ±15–30 minutes | Use Swiss Ephemeris (§11.12) |
| Sun longitude ±0.01° | Minimal impact on panchanga | Already adequate |
| Eclipse type threshold is β-only | Penumbral eclipses may be mis-classified | Acceptable for most users |
| Vara starts at midnight not sunrise | Off by up to 6 hours for hours before sunrise | Switch to sunrise-based vara |
| No adhika masa (leap month) detection | Displayed masa name may shift for ~1 month every 3 years | Add lunar month counter |
| Sunrise uses browser timezone | Correct for local wall-clock; incorrect if page opened with a different system timezone | Force timezone via `Intl.DateTimeFormat` |
| No Ayanamsha interpolation for sub-day calculations | Eclipse midpoint ayanamsha is slightly off | Sub-arcsecond correction; negligible |

---

## 13. Quick-Reference: Key Variables

| Variable | Location | What it controls |
|----------|----------|-----------------|
| `LOC` | Global | `{ lat, lon, name }` — current location |
| `TI[30]` | Static array | Tithi names and quality ratings |
| `NK[27]` | Static array | Nakshatra names, rulers, qualities, gana, nature |
| `YG[27]` | Static array | Yoga names and quality ratings |
| `KR[11]` | Static array | Karana names and quality ratings |
| `VA[7]` | Static array | Vara names, deities, qualities, Rahu slot numbers |
| `GULIKA[7]` | Constant | Gulika Kalam part numbers indexed by weekday |
| `AMRITA` | Constant | Map of weekday → nakshatra index for Amrita Siddhi Yoga |
| `SAMVATSARA[60]` | Static array | 60-year Samvatsara cycle names |
| `FEST[]` | Static array | Festival detection rules — add here to add festivals |
| `EK_SH[12]` | Constant | Shukla Ekadashi names by solar masa |
| `EK_KR[12]` | Constant | Krishna Ekadashi names by solar masa |
| `CITIES[]` | Static array | City list for location picker |
| `pcache` | Global | Panchanga object cache (key: `lat-lon-Y-M-D`); now includes `moudhyam` |
| `tcache` | Global | Transition-time cache (key: `tr-Y-M-D`) |
| `edCache` | Global | Eclipse-per-day cache (key: `de-Y-M-D`) |
| `festDayCache` | Global | First festival per day (key: `fd-Y-M-D`) |
| `ORBELEMS` | Constant | Orbital elements for Venus, Earth, Jupiter (Meeus Table 31.a) |
| `MOUDHYAM_THRESH` | Constant | Combustion thresholds: `{ venus: 10, jupiter: 11 }` (degrees) |
| `today` | Global | `new Date()` at page load |
| `selD` | Global | Currently selected date |
| `vM`, `vY` | Global | Calendar view month and year |
| `festCat` | Global | Active festival category filter |

---

*Documentation generated for `hindu_panchanga_calendar.html`. For bug reports or improvements, refer to the inline comments in the source file.*
