# Hindu Panchanga Calendar — Technical Documentation

> **File:** `hindu_panchanga_calendar.html`  
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
   - 5.6 Lunar Month (Masa) Identification
   - 5.7 Guru & Sukra Moudhyam
   - 5.8 Transition End Times
6. [Inauspicious & Auspicious Periods](#6-inauspicious--auspicious-periods)
7. [Auspiciousness Score](#7-auspiciousness-score)
8. [Eclipse Calculations](#8-eclipse-calculations)
9. [Festival Detection](#9-festival-detection)
10. [Location & Solar Times](#10-location--solar-times)
11. [Fine-Tuning Guide](#11-fine-tuning-guide)
11A. [Sky Tab (Planetary Positions & Divisional Charts)](#11a-sky-tab-planetary-positions--divisional-charts)
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
13. [Security & Privacy](#13-security--privacy)
14. [Quick-Reference: Key Variables](#14-quick-reference-key-variables)
15. [References](#references)

---

## 1. Overview

This is a self-contained HTML file that computes the Hindu *Panchanga* (five-limbed almanac) for any date and location using JavaScript astronomy. It requires no server, no framework, and no build step — open it in any modern browser.

All calculations are done in the browser at runtime. Panchanga results are cached in memory (`pcache`, `tcache`) so repeated access to the same date is instant.

---

## 2. Features at a Glance

> **AI-generated tool — use with discretion.** Calculations use simplified astronomical models and may differ from printed almanacs by minutes to days. Always verify important muhurthas with a qualified jyotishi or a trusted printed panchanga before scheduling marriages, ceremonies, or other significant events.

| Tab | What it shows |
|-----|---------------|
| **Calendar** | Monthly grid with tithi quality colour-coding, tithi end times, eclipse markers, festival dots, lunar month header |
| **Panchanga** | Full five-anga detail for any date with transition end times, solar times, nakshatra metadata, lunar month (with adhika/nija labels), eclipse card, festival card, moudhyam card |
| **Festivals** | 35+ named festivals + all Ekadashis + Pradosh Vrat, grouped by month, filterable by category, countdown to each |
| **Eclipses** | All solar & lunar eclipses for 3 years with visibility computed for the selected location |
| **Search** | Date-range search with tithi / nakshatra / vara filters, min-score slider, moudhyam exclusion filters, optional eclipse exclusion. Headed by the muhurtha shloka *तदेव लग्नं सुदिनं तदेव…* |
| **Sky** | Two side-by-side South-Indian Rashi charts for any date & time at the chosen location: a fixed D-1 Rashi chart and a switchable divisional chart (D-2 Hora through D-27 Bhamsa). All nine grahas + Lagna are placed by their sidereal longitude. Optional **reference overlay** lets you superimpose a second moment (birth chart, past event) onto both charts in blue italic. Includes a table of exact longitudes and a **viewing guide** with each body's altitude/azimuth, twilight phase, rise times for bodies below the horizon, and the Moon's current nakshatra with its principal stars. |
| **About** | Astronomical engine table, panchanga formulas, lunar-month rules, score weights, daily periods, planetary combustion, known limitations, security/privacy, references |

---

## 3. Architecture

```
html_panchanga_calendar.html
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
    │   mlong(J)     — tropical moon longitude (59-term Meeus Table 47.A)
    │   ayan(J)      — Lahiri ayanamsha (23.85° + 1.39644°/century)
    │   getSunTimes(date, lat, lon) — NOAA sunrise/sunset; uses resolveTz(date)
    │   getHY()      — Hindu year metadata (Samvatsara, Shaka, Vikram, Souramana + Chandramana ritus, Ayana)
    │   resolveTz(date) — Intl-based DST-aware UTC offset for LOC.iana
    │   tzFromLon(lon) — approximate civil tz from longitude (custom-coords fallback)
    │
    ├── Eclipse module
    │   moonLat(J), phaseJDE(), moonAlt(), eclipseData()
    │   addVisibility(), getDayEclipse(), getUpcomingEclipses()
    │
    ├── Panchanga transition finders
    │   findEnd(date, getFn, startJD?)   — forward bisection from startJD
    │   findEndJD(getFn, refJD)          — pure-JD forward bisection
    │   findStartJD(getFn, refJD)        — pure-JD backward bisection
    │   calcTr(date, startJD?)           — all four transitions
    │   calcVarjyam(Jsr, tz, J0)         — Varjyam window(s) for the day
    │
    ├── Core panchanga
    │   calcP(date, Joverride?)  — full panchanga; optional JD overrides noon default
    │   gp()      — cached wrapper for calcP() at noon (used by calendar grid)
    │   calcTr(date, startJD?)   — transitions starting from startJD (default: noon)
    │   gt()      — cached wrapper for calcTr() at noon (used by calendar grid)
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
| `pcache` | `"lat-lon-Y-M-D"` | Full panchanga object (noon reference) |
| `tcache` | `"tr-Y-M-D"` | Tithi/nakshatra/yoga/karana end times |
| `edCache` | `"de-Y-M-D"` | Eclipse for that date (or null) |
| `festDayCache` | `"fd-Y-M-D"` | First matching festival (or null) |

All caches are soft-capped at `CACHE_MAX = 5000` entries. When exceeded, the 1000 oldest insertions are dropped via `cacheSet(cache, k, v)`. This prevents unbounded growth across heavy navigation sessions.

Call `clearPCache()` after a location change to invalidate all four caches at once (location affects solar times, sunrise-based panchanga, eclipse visibility, and festival timing).

---

## 4. Astronomical Calculations

### 4.1 Julian Date

```js
function jd(date) { /* uses noon as reference point */ }
function jdFull(date) { /* UTC-based, for precise moment calculations */ }
```

`jd()` computes the Julian Day Number for **local noon** of the given date. It is used as the baseline JD and by the calendar grid (`gp()`).

`jdFull()` uses UTC hours/minutes/seconds — used for eclipse midpoints and transition binary searches.

**Panchanga tab reference time — sunrise:**

The Panchanga tab calls `calcP(date, Jsr)` where:
```js
const st  = getSunTimes(date, LOC.lat, LOC.lon);
const Jsr = jd(date) + (st.sunrise - 720) / 1440;  // shift from noon to local sunrise
```
This follows the traditional almanac convention that panchanga values are read at the moment of sunrise. The calendar grid continues to use `gp()` (noon) for overview display and caching purposes.

`calcP(date, Joverride?)` accepts an optional second argument. When provided it replaces the `jd(date)` noon value for all astronomical calculations (tithi, nakshatra, yoga, karana, masa, score, moudhyam). Calendar-date fields (vara weekday, `getSunTimes`) are not affected since they are derived from `date`, not `J`.

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

**Algorithm:** Full Meeus Table 47.A (ELP2000) — all 59 contributing longitude terms, table-driven with automatic E/E² eccentricity weighting. Coefficients are in units of 10⁻⁶ °; the loop accumulates `Σl` and divides by 10⁶ at the end.

**Eccentricity factor E** (applied to all terms where Sun's mean anomaly M ≠ 0):
```
E = 1 − 0.002516·T − 0.0000074·T²    (|M|=1 → ×E,  |M|=2 → ×E²)
```

**Implementation (table-driven):**
```js
const T47=[[0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314], ...  // 59 rows
let sl=0;
for(const[d,m,mp,f,c]of T47){
  const ef=m===0?1:Math.abs(m)===1?E:E*E;
  sl+=c*ef*Math.sin(d*D+m*M+mp*Mp+f*F);
}
return nm(L0+sl*1e-6);
```

**Accuracy:** ±0.01° (improved from ±0.1° with the previous 26-term version). Nakshatra transition timing improves from ±10 min to ±1 min. The previous 26-term version had several incorrect coefficients and three terms not present in Meeus at all, which could push boundary nakshatras (e.g. Bharani/Krittika) to the wrong side.

---

### 4.4 Ayanamsha (Sidereal Correction)

**Function:** `ayan(J)`  
**Returns:** Ayanamsha in degrees (amount to subtract from tropical longitude to get sidereal)

**Current formula (Lahiri approximation):**

```js
function ayan(J) {
  return 23.85 + (J - 2451545) / 36525 * 1.39644;
}
```

This gives approximately:
- J2000 (Jan 1.5, 2000): **23.85°**
- Rate: **1.39644° per century** = **50.2719″ per year** (canonical IAU/IIA)

The Lahiri (Chitrapaksha) ayanamsha is the official ayanamsha of the Government of India and is used by most North Indian panchangas. The constant 50.2719″/yr was earlier coded as 50.29″/yr (≈1.397°/century) — the corrected rate brings results within ±2″ of Swiss Ephemeris (the nutation term is still omitted; that's the dominant residual).

**Sidereal longitude:**
```
sid = (tropical_longitude − ayanamsha + 360) % 360
```

All panchanga elements (tithi, nakshatra, yoga, masa, ritu) use sidereal longitudes.

---

### 4.5 Sunrise & Sunset

**Function:** `getSunTimes(date, lat, lon)`  
**Returns:** `{ sunrise, sunset, solarNoon, tz }` in minutes from midnight in the **location's** clock (not the browser's clock). `tz` is the UTC offset in minutes that was applied for `date`.

**Timezone handling (DST-aware):**

Each `CITIES` entry has two timezone fields:
- `iana` — IANA timezone name (e.g. `"America/New_York"`, `"Asia/Kolkata"`)
- `tz` — standard-time UTC offset in minutes (fallback when `iana` is missing or unresolved)

When a user picks a city, both are copied to `LOC`. For custom coordinates only `tz` is set via `tzFromLon(lon) = Math.round(lon × 4 / 15) × 15` (rounds to the nearest 15 min so half-hour zones land sensibly), and `iana` is left blank.

**`resolveTz(date)`** consults `Intl.DateTimeFormat` with `LOC.iana` (`timeZoneName: 'longOffset'`) to obtain the **actual** offset for that date — including DST. So a New Jersey user sees `EST -05:00` from November to March and `EDT -04:00` from March to November, automatically matching printed almanacs. If `iana` is missing or the browser doesn't recognise it, `resolveTz` falls back to the static `LOC.tz` or the longitude estimator.

`getSunTimes` calls `resolveTz(date)` per call. This also means a Boston-based user viewing **Delhi** sees Delhi-local sunrise, not Boston-local sunrise, regardless of what timezone the browser is in.

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

The Moon's **sidereal** longitude divided into 27 equal segments of 13°20′ each.

```js
const ay   = ayan(J);                        // Lahiri ayanamsha (~24.2° in 2026)
const nRaw = nm(mlong(J) - ay) / (360/27);  // tropical Moon − ayanamsha = sidereal Moon
const nIdx = Math.floor(nRaw);              // 0–26 (Ashwini to Revati)
const pada = Math.floor((nRaw - nIdx) * 4) + 1;  // 1–4
```

> **Important:** `mlong(J)` returns the **tropical** ecliptic longitude. Subtracting `ayan(J)` converts it to sidereal before dividing into nakshatra segments. Using the tropical value directly would shift the nakshatra by ~1–2 positions (~24° ÷ 13.3°/nakshatra).

Each nakshatra has 4 padas of 3°20′ each, corresponding to the 108 navamshas.

**Duration:** A nakshatra averages ~27h 13m (Moon travels ~13.2°/day on average).

---

### 5.3 Yoga

The sum of the **sidereal** longitudes of Sun and Moon, divided into 27 equal segments.

```js
const ay      = ayan(J);   // Lahiri ayanamsha — subtracted from both bodies
const yogaIdx = Math.floor(nm(slong(J) + mlong(J) - 2*ay) / (360/27)) % 27;
//                                                  ^^^^
//  Both slong() and mlong() return tropical longitudes; subtracting ayanamsha
//  twice converts the sum to its sidereal equivalent.
//  Using the tropical sum would shift yoga by ~3–4 positions (2 × 24° ÷ 13.3°).
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

---

### 5.5A Ritu — solar (Souramana) and lunar (Chandramana)

Two parallel notions of "season" coexist in the Indian calendar:

| Ritu | English | Souramana (solar) — Sun's rashi | Chandramana (lunar) — masa pair |
|------|---------|-------------------------------|---------------------------------|
| Vasanta  | Spring     | Mesha + Vrishabha   | Chaitra + Vaishakha    |
| Grishma  | Summer     | Mithuna + Karka     | Jyeshtha + Ashadha     |
| Varsha   | Monsoon    | Simha + Kanya       | Shravana + Bhadrapada  |
| Sharad   | Autumn     | Tula + Vrischika    | Ashweeyuja + Kartika   |
| Hemanta  | Pre-winter | Dhanu + Makara      | Margashirsha + Pushya  |
| Shishira | Winter     | Kumbha + Meena      | Magha + Phalguna       |

```js
function getHY(date){
  // ...
  const souraIdx   = Math.floor(sid / 60);                       // 2 rashis / ritu
  const chandraIdx = Math.floor(masaInfo.masaIdx / 2);            // 2 masas / ritu
  return { ..., souraRitu: RITU[souraIdx], chandraRitu: RITU[chandraIdx], ... };
}
```

Souramana ritu and Chandramana ritu can disagree by up to a month around Sankranti, when the Sun has just changed rashi but the lunar month is still the previous one. The year-strip displays both; the panchanga subtitle mentions Souramana first and Chandramana in parentheses.

---

### 5.6 Lunar Month (Masa) Identification

**Functions:** `sunRashi(J)`, `getLunarMasaInfo(J)`

---

#### Two parallel month systems

Indian almanacs maintain **two** month-naming systems and they can disagree by weeks:

| System | Period | Named after | Example |
|--------|--------|-------------|---------|
| **Souramana** (solar) | Sun's stay in one rashi (~30 days) | The rashi itself | When the Sun is in Mesha, the solar month is *Mesha māsa* (Tamil: *Chittirai*) |
| **Chāndramāna · amanta** (lunar, this app) | New moon → next new moon (~29.5 days) | The **rashi the Sun enters** during the lunation (the Sankranti within it) | The lunation containing the Sun's entry into Mesha is named **Chaitra** |

The Sanskrit names you see throughout this app — Chaitra, Vaishakha, Jyeshtha, Ashadha, Shravana, Bhadrapada, Ashweeyuja, Kartika, Margashirsha, Pushya, Magha, Phalguna — are **lunar** month names. They are indexed by the Sankranti rashi: HM[0]=Chaitra corresponds to *"the lunation in which the Sun enters Mesha"*, HM[1]=Vaishakha to *"the lunation in which the Sun enters Vrishabha"*, and so on.

**Why the amanta name can drift from the Sun's current rashi.** On 13 May 2026 the Sun is still at ~27° Mesha. If you read off the lunar-month name naively from the Sun's *current* rashi you'd get HM[0]=Chaitra. But the actual amanta lunar month is **Vaishakha** (HM[1]) — because the Sankranti that *defines* this lunation is the Sun's entry into Vrishabha, which lands *within* the current new-moon-to-new-moon period. The amanta rule names a lunation after the **destination** rashi of the Sankranti it contains, not the rashi the Sun is sitting in when you look up.

---

#### Where the names come from — the Purnima nakshatra

The lunar month names *Chaitra, Vaishakha, Jyeshtha, …* aren't arbitrary labels — they are **the nakshatras in which the Purnima (full moon) of each lunation falls**. This is the older, etymologically primary rule; the Sankranti formulation used in the code is its computational restatement.

| Lunar month | Etymological root — Purnima falls in… |
|---|---|
| **Chaitra**      | **Chitra** (and sometimes Swati) |
| **Vaishakha**    | **Vishakha** |
| **Jyeshtha**     | **Jyeshtha** |
| **Ashadha**      | **Purva / Uttara Ashadha** |
| **Shravana**     | **Shravana** |
| **Bhadrapada**   | **Purva / Uttara Bhadrapada** |
| **Ashweeyuja** *(Ashvina)* | **Ashwini** |
| **Kartika**      | **Krittika** |
| **Margashirsha** | **Mrigashira** |
| **Pushya**       | **Pushya** |
| **Magha**        | **Magha** |
| **Phalguna**     | **Purva / Uttara Phalguni** |

**Why this is equivalent to the Sankranti rule.** The Sun and the Full Moon are always 180° apart. So if you know the Sun's rashi at full moon, you automatically know the nakshatra near which the Moon sits — exactly opposite. Walking the zodiac:

| Sun in… | Full Moon (180°) in… | Nakshatra near opposition | → Lunar month |
|---|---|---|---|
| Mesha       | Tula       | Chitra          | Chaitra      |
| Vrishabha   | Vrischika  | Vishakha        | Vaishakha    |
| Mithuna     | Dhanu      | Jyeshtha        | Jyeshtha     |
| Karka       | Makara     | U.Ashadha       | Ashadha      |
| Simha       | Kumbha     | Shravana        | Shravana     |
| Kanya       | Meena      | U.Bhadrapada    | Bhadrapada   |
| Tula        | Mesha      | Ashwini         | Ashweeyuja   |
| Vrischika   | Vrishabha  | Krittika        | Kartika      |
| Dhanu       | Mithuna    | Mrigashira      | Margashirsha |
| Makara      | Karka      | Pushya          | Pushya       |
| Kumbha      | Simha      | Magha           | Magha        |
| Meena       | Kanya      | U.Phalguni      | Phalguna     |

So "the Sankranti rashi r₁" and "the nakshatra of this lunation's Purnima" point to the **same** masa, because they sit on opposite ends of the same astronomical axis. The Purnima-nakshatra rule is the older Vedic naming convention (used in poetic and ritual contexts); the Sankranti rule is the later siddhantic formalisation that handles adhika months cleanly.

**Boundary subtleties.** For Ashadha, Bhadrapada, and Phalguna the Purnima can fall in either of the *Purva* / *Uttara* pair across different years — which is why each month name uses the umbrella stem covering both nakshatras. In an **adhika** lunation no Sankranti happens, but the Purnima still falls in roughly the same nakshatra group as the following nija lunation's Purnima — which is why the adhika and nija take the same masa name (with the *Adhika* prefix on the intercalary one).

---

#### Core rule — amanta lunar month

A lunation runs from new moon to next new moon and is named for the **Sankranti** (the Sun's transit from one sidereal rashi into the next) that falls *within* it. Concretely, look at the Sun's rashi at the two end-points of the lunation:

**Detection:** let r0 = Sun's sidereal rashi at the *current* new moon, r1 = at the *next* new moon.

| r0 vs r1 | Meaning | Month type | Name |
|----------|---------|------------|------|
| r0 ≠ r1 | A Sankranti (transit r0 → r1) happened during this lunation | Normal (or Nija) | HM[r1] — "the month in which the Sun enters r1" |
| r0 = r1 | No Sankranti — Sun stayed in the same rashi for the whole lunation | **Adhika** (intercalary) | HM[r2] where r2 = Sun's rashi at new moon k+2 (the next lunation will contain the missed Sankranti and is the *nija* of HM[r2]; the adhika takes the same name with the "Adhika" prefix) |

The **Nija** label applies to a *normal* month when the *previous* month was adhika (its r0 = r1 = current r0), distinguishing the regular month from its adhika twin.

```javascript
function sunRashi(J) {
  return Math.floor(nm(slong(J) - ayan(J)) / 30);
}

function getLunarMasaInfo(J) {
  const k = Math.floor((J - 2451550.09766) / 29.530588861);
  const r0 = sunRashi(phaseJDE(k,   false));  // Sun at current new moon
  const r1 = sunRashi(phaseJDE(k+1, false));  // Sun at next new moon

  if (r0 !== r1) {
    // Sankranti occurred → normal month (or nija if previous was adhika)
    const rPrev = sunRashi(phaseJDE(k-1, false));
    const isNija = (rPrev === r0);
    return { masaIdx: r1, isAdhika: false, isNija,
             fullName: (isNija ? 'Nija ' : '') + HM[r1] };
  } else {
    // No Sankranti → adhika; named after the rashi the Sun enters in the next (nija) month
    const r2 = sunRashi(phaseJDE(k+2, false));
    return { masaIdx: r2, isAdhika: true, isNija: false,
             fullName: 'Adhika ' + HM[r2] };
  }
}
```

---

#### Worked example — 2026 Adhika Jyeshtha

| New moon | Approx date | Sun's sidereal rashi | Conclusion |
|----------|-------------|----------------------|------------|
| k=325 | April 17 | Mesha (0) | — |
| k=326 | May 16 | Vrishabha (1) | Month k=325→326: r0=Mesha, r1=Vrishabha → **normal Vaishakha** |
| k=327 | June 14 | Vrishabha (1) | Month k=326→327: r0=Vrishabha, r1=Vrishabha → **Adhika!** → look to r2 |
| k=328 | July 13 | Mithuna (2) | r2=Mithuna → **Adhika Jyeshtha** ✓ |
| — | (within k=327→328) | — | Month k=327→328: r0=Vrishabha, r1=Mithuna, rPrev=Vrishabha=r0 → **Nija Jyeshtha** ✓ |

The Sun moves slowly near aphelion (~July) at ≈0.95°/day; over one synodic month (29.5 days) it covers only ~28°, which is less than one rashi (30°). This is what allows the Sun to stay in a single rashi for two consecutive new moons, creating the adhika month.

---

#### Adhika masa traditional significance

- **Adhika / Mala Masa / Purushottama Masa** — considered inauspicious for new ventures, marriages, and Upanayana. Religious activities (fasting, charity, scripture reading) are especially meritorious.
- **Nija month** — the regular month that follows; normal muhurtha rules apply.
- Occurs approximately **once every 2.5–3 years** when the Sun is near aphelion.

---

#### What is stored in `p.masaInfo`

`calcP()` calls `getLunarMasaInfo(J)` and stores the result as `p.masaInfo`:

```javascript
const masaInfo = getLunarMasaInfo(J);
const hm = masaInfo.fullName;          // e.g. "Adhika Jyeshtha", "Nija Jyeshtha", "Vaishakha"
// In returned panchanga object:
return { ..., hm, masaInfo, ... };
```

`p.masaInfo` fields:

| Field | Type | Description |
|-------|------|-------------|
| `masaIdx` | 0–11 | Index into `HM[]` for the base masa name |
| `isAdhika` | boolean | `true` if this is an intercalary month |
| `isNija` | boolean | `true` if this follows an adhika month |
| `fullName` | string | Display name: `"Adhika Jyeshtha"`, `"Nija Jyeshtha"`, or `"Vaishakha"` |

---

#### Where displayed

- **Calendar month header:** `getLunarMasaInfo` is called for day 1 and the last day of the Gregorian month. If they return different `fullName` values, the header shows them hyphenated: `June 2026 · Adhika Jyeshtha–Nija Jyeshtha`.
- **Calendar day detail** ("Lunar Month" card): shows `p.hm` (full name including prefix). Sub-label shows: "Mala Masa · intercalary month" for adhika, "Nija — follows Adhika Jyeshtha" for nija, or "[Paksha]" for normal months.
- **Panchanga tab subtitle:** `${p.hm} masa · ${p.tithi.pak} Paksha`.
- **Panchanga tab info card:** amber banner for adhika months with traditional guidance; blue banner for nija months.

---

#### Adhika masa detection edge case

During an adhika month the auspiciousness score is not automatically penalised (the app leaves scoring to the pandit's discretion since opinions vary by tradition). To add a penalty, find the score calculation in `calcP()` and add:

```javascript
if (masaInfo.isAdhika) score = Math.max(5, score - 15);
```

---

#### Note on festival detection

Festivals use `lmi(p)` (`p.masaInfo.masaIdx`, the lunar masa) for all checks except Makar Sankranti (which uses `mi(p)`, the solar rashi, for its transit detection). All festival checks include `&&!p.masaInfo?.isAdhika` to prevent firing during intercalary months. During adhika months, Ekadashis are renamed Padmini (Shukla) and Parama (Krishna). See Festival Detection (§9) for details.

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

### 5.8 Transition End Times

**Function:** `findEnd(date, getFn, startJD?)` — binary search for when an anga changes value, starting from `startJD` (default: local noon).

```
1. Sample every 20 minutes FORWARD from startJD to find the bracket [Jlo, Jhi]
   where getFn(Jlo) == current value and getFn(Jhi) != current value
2. Bisect 24 times (to ~4-second precision)
3. Convert result JDE to local time
```

The 20-minute step covers 216 samples (72 hours × 60 / 20). If no transition is found, the anga continues beyond the search range.

**Why the reference time matters:** the returned transition is the end of the anga active *at startJD*. The calendar grid passes no `startJD` (defaults to noon, matching `gp()` which also uses noon). The Panchanga tab passes the sunrise JD (`Jsr`), so the returned transition is the end of the anga *at sunrise* — matching the displayed sunrise-anchored panchanga. Without this, when a tithi transitions between sunrise and noon, the displayed name (sunrise tithi) and the displayed end time (noon tithi's end) refer to different tithis, producing nonsensical labels like "Trayodashi ends 08:25" when in fact Chaturdashi ends at 08:25 the next day.

**Accuracy:** ±30 seconds (limited by the moon longitude precision of ~0.01°).

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

### Yamaganda Kalam

Same 8-part division; the Yama-ruled part. Standard Indian almanac order (Brihat Hora Shastra):

| Day | Part# |
|-----|-------|
| Sunday | 5 |
| Monday | 4 |
| Tuesday | 3 |
| Wednesday | 2 |
| Thursday | 1 |
| Friday | 7 |
| Saturday | 6 |

```js
const YAMAGANDA = [5,4,3,2,1,7,6];  // indexed by date.getDay()
```

Yamaganda is computed in `calcP()` as `yamaK` and displayed alongside Rahu Kalam / Gulika in the inauspicious-periods card.

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

Abhijit is the **8th of the 15 day-muhurthas**, centred on solar noon. Width = day-length / 15, so the window scales seasonally — about 48 min near the equinox, 60 min in mid-summer at mid-latitudes, ~36 min near the winter solstice.

```js
const dMu = dayLen / 15;
abhijit = { start: solarNoon − dMu/2, end: solarNoon + dMu/2 };
```

This corrects an earlier fixed-width approximation of ±24 min that was inaccurate at high latitudes and in seasons with very long or short days.

### Brahma Muhurtha

The **14th of the 15 night-muhurthas**, ending one night-muhurtha before sunrise. Width = night-length / 15 (also scales seasonally). Optimal time for meditation and religious study.

```js
const nMu = (1440 − dayLen) / 15;
brahma = { start: sunrise − 2·nMu, end: sunrise − nMu };
```

For a 12-hour night this matches the traditional "96 to 48 min before sunrise" definition; at high latitudes in summer the window correctly shrinks to (~24 to ~12 min before sunrise).

### Varjyam

An inauspicious window located inside the currently-active nakshatra. Each nakshatra has a specific "Varjyam start ghatika" — an elapsed value in nakshatra-ghatikas where 1 = 1/60 of the nakshatra's actual time-duration (not the 24-minute civil ghatika). Varjyam length is fixed at **4 nakshatra-ghatikas** = (4/60) of the nakshatra duration, which works out to ~85–95 min for a typical 21–24 h nakshatra.

```js
// 0-indexed Ashwini..Revati. Source: Brihat Samhita / "Lectures on Vedic Calendar".
const VARJYAM_GHATI = [50,24,30,40,14,21,30,20,32,30,20,18,21,20,14,14,10,14,56,24,20,10,10,18,16,24,30];

// Formula (given Jsr = sunrise JD, J0 = JD at UT midnight, tzOff = location offset):
// 1. Find nakshatra-start (when getNkIdx transitioned into current) by backward bisection.
// 2. Find nakshatra-end (forward bisection).
// 3. dur = end − start
// 4. V_start = start + (VARJYAM_GHATI[nIdx] / 60) × dur
// 5. V_end   = V_start + (4 / 60) × dur
```

`calcVarjyam(Jsr, tzOff, J0)` walks the day starting at sunrise, computes the Varjyam window for each nakshatra it touches, and returns the windows whose START falls within [sunrise, next-day-sunrise). Most days have exactly one Varjyam window; rarely two when a nakshatra ends shortly after sunrise.

**Verification:** matched SVBF-2026 NJ for ten consecutive January days within 3–5 minutes (residual from the sunrise-zenith convention difference).

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

**AMRITA table** (Vara → 0-based nakshatra index for Amrita Siddhi Yoga):
```js
const AMRITA = { 0:12, 1:4, 2:0, 3:16, 4:7, 5:26, 6:3 };
// Sunday→Hasta(12), Monday→Mrigashira(4), Tuesday→Ashwini(0),
// Wednesday→Anuradha(16), Thursday→Pushya(7), Friday→Revati(26), Saturday→Rohini(3)
```

The four Wed/Thu/Fri/Sat entries were previously transcribed wrong (mapping to Rohini, Ardra, Vishakha, Uttara Ashadha respectively), causing Amrita Siddhi Yoga to fire on the wrong day-nakshatra combinations. The canonical list above follows Brihat Samhita and standard printed almanacs.

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
If |β| > 1.60°, no eclipse of any kind occurs. (1.57° was the previous cutoff; bumped to 1.60° to capture borderline penumbrals.)

**Step 4 — Classify:**

| Condition | Eclipse type |
|-----------|-------------|
| Full moon, \|β\| ≤ 0.47° | Total Lunar |
| Full moon, 0.47° < \|β\| ≤ 1.04° | Partial Lunar |
| Full moon, 1.04° < \|β\| ≤ 1.60° | Penumbral Lunar |
| New moon, \|β\| ≤ 0.99° | Total/Annular Solar |
| New moon, 0.99° < \|β\| ≤ 1.60° | Partial Solar |

The lunar `0.47°` is umbra-radius minus moon-radius (Meeus Ch. 54), tightened from `0.58°` so that marginal partials are not mis-labelled total. The solar `0.99°` is the geocentric central-eclipse limit (γ ≈ 1 Earth-radius from the shadow axis); above this only partial geometry is possible.

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

### Lunar Masa Index for Festival Detection

All festival checks (except Makar Sankranti) use **`lmi(p)`** — the lunar masa index from `p.masaInfo.masaIdx`:

```js
function lmi(p) { return p.masaInfo?.masaIdx ?? mi(p); }
// 0=Chaitra, 1=Vaishakha, 2=Jyeshtha, ..., 11=Phalguna
```

`mi(p)` (solar rashi, `Math.floor(p.sid/30)`) is retained only for the Makar Sankranti solar-transit check.

**Why `lmi` is necessary:** In years with an adhika masa, the solar and lunar masas diverge. In 2026, for example, the Sun is in Vrishabha (solar Vaishakha = `mi(p)===1`) throughout the entire Adhika Jyeshtha period (May 17–June 15). Using `mi(p)` would cause Akshaya Tritiya, Buddha Purnima, and Mohini Ekadashi to be missed on their correct dates in April/May and instead fire incorrectly during Adhika Jyeshtha. `lmi(p)` uses the lunar month boundary (new moon) for context, not the Sun's current position.

All festival checks also include `&&!p.masaInfo?.isAdhika` to prevent any festival from firing during an intercalary month. During adhika months, the generic Ekadashi handler substitutes the traditional **Padmini Ekadashi** (Shukla Ekadashi) and **Parama Ekadashi** (Krishna Ekadashi) names.

| Index | Lunar Masa | Solar Rashi | Approx Gregorian |
|-------|-----------|-------------|-----------------|
| 0 | Chaitra | Mesha | Mar–Apr |
| 1 | Vaishakha | Vrishabha | Apr–May |
| 2 | Jyeshtha | Mithuna | May–Jun |
| 3 | Ashadha | Karka | Jun–Jul |
| 4 | Shravana | Simha | Jul–Aug |
| 5 | Bhadrapada | Kanya | Aug–Sep |
| 6 | Ashweeyuja | Tula | Sep–Oct |
| 7 | Kartika | Vrischika | Oct–Nov |
| 8 | Margashirsha | Dhanu | Nov–Dec |
| 9 | Pushya | Makara | Dec–Jan |
| 10 | Magha | Kumbha | Jan–Feb |
| 11 | Phalguna | Meena | Feb–Mar |

> **Festival rules for new additions** should use `lmi(p)===N&&!p.masaInfo?.isAdhika` for all lunar-month festivals, and `mi(p)===N` only for solar events like Sankrantis.

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
let LOC = { lat: 28.614, lon: 77.209, name: "Delhi", tz: 330, iana: "Asia/Kolkata" };
```

After changing location, call `clearPCache()` to invalidate cached panchanga (solar times are embedded in the cache).

**Auto-detect** uses the browser's `navigator.geolocation` API. The closest city within 3° is automatically selected as the display name; the matched city's `iana` and `tz` are copied into `LOC`. When no city matches, the **browser's resolved timezone** (`Intl.DateTimeFormat().resolvedOptions().timeZone`) is used as the IANA name — because for auto-detect, the user is physically at that location, so the browser's timezone is authoritative. **No DST prompt is ever shown.**

**URL parameter** `?loc=CityName` (case-insensitive) sets the default location at load time. `parseLocFromURL()` strictly matches against the static `CITIES` list and never accepts raw lat/lon from the URL — bad or unknown values are silently ignored and the default (Boston) is used. The URL string itself is never interpolated into HTML or any other sensitive sink; only the matched `CITIES` entry's pre-validated fields (lat, lon, name, tz, iana) are used. Example: `index.html?loc=Delhi` or `index.html?loc=mumbai`.

Solar times are returned in **the location's local wall-clock minutes from midnight** (not the browser's). `resolveTz(date)` provides DST-aware offsets via `Intl.DateTimeFormat` with `LOC.iana`, so US/EU summer dates show DST times automatically.

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

`mlong()` now uses the complete Meeus Table 47.A (59 terms). The full ELP2000-82B series has 1,200+ terms for sub-arcsecond accuracy; beyond 59 terms the returns diminish rapidly for panchanga purposes. The next improvement level would be Swiss Ephemeris (see §11.12).

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
  check: (p) => lmi(p)=== 2 &&!p.masaInfo?.isAdhika&&p.tIdx === 14   // Jyeshtha Purnima
},
```

#### Example: Adding Ratha Saptami (Magha Shukla Saptami)

```js
{
  name: "Ratha Saptami",
  alt:  "Surya Jayanti",
  desc: "Sun's birthday; chariot of the Sun turns northward. Special worship at Tirupati.",
  cat:  "major",
  check: (p) => lmi(p)=== 10 &&!p.masaInfo?.isAdhika&&p.tIdx === 6   // Magha Shukla Saptami
},
```

#### Example: Adding Chhath Puja (Kartika Shukla Shashthi)

```js
{
  name: "Chhath Puja",
  alt:  "Dala Chhath",
  desc: "Four-day worship of Chhathi Maiya and the Sun; fasting from Chaturthi to Saptami. Major festival in Bihar and UP.",
  cat:  "major",
  check: (p) => lmi(p)=== 7 &&!p.masaInfo?.isAdhika&&p.tIdx === 5   // Kartika Shukla Shashthi (6th day)
},
```

#### Example: Adding a nakshatra-based festival

```js
// Shravana Saturdays (Shravana Somvar is already common — here Shravana Shanivar)
{
  name: "Shravana Shanivar",
  desc: "Saturn worship on Saturdays during Shravana month.",
  cat:  "festival",
  check: (p) => lmi(p)=== 4 &&!p.masaInfo?.isAdhika&&p.vara.n === 6  // Shravana masa + Saturday
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
| Shri B.V. Raman's system | 10° | 11° |

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

## 11A. Sky Tab (Planetary Positions & Divisional Charts)

### Date/time semantics

The Sky tab takes a `<date>` + `<time>` pair and interprets the chosen wall-clock as **the location's local time**. The exact UT instant is reconstructed via:

```js
const tz = resolveTz(date);                 // DST-aware
const localMin = hour * 60 + minute;
const J0 = jd(date) - 0.5;                  // JD at UT midnight of the calendar date
const J  = J0 + (localMin - tz) / 1440;     // true UT JD of the chosen moment
```

### Planetary positions

`getSkyPositions(J, lat, lon)` returns sidereal longitudes (degrees) for all nine grahas plus the ascending Lagna:

| Graha | Source |
|-------|--------|
| Sun (Ravi) | `slong(J)` — VSOP87 apparent tropical |
| Moon (Chandra) | `mlong(J)` — Meeus Table 47.A 59-term ELP2000 |
| Mars · Mercury · Jupiter · Venus · Saturn | `helioXYZ(planet, T) − helioXYZ(earth, T)` → geocentric ecliptic longitude (Meeus Ch. 31 orbital elements, Kepler with 5 iterations) |
| Rahu (north node) | Mean lunar node: `125.04452 − 1934.136261·T` |
| Ketu (south node) | `Rahu + 180°` |
| Lagna (Ascendant) | `ascendantTropical(J, lat, lon)` — RAMC-based formula |

All values are then made sidereal by subtracting the Lahiri ayanamsha.

### Ascendant formula

```js
RAMC = GMST + east_longitude     // local sidereal time, in degrees
L_asc = atan2( cos(RAMC), −(sin(ε)·tan(φ) + cos(ε)·sin(RAMC)) )
```

The atan2 sign convention picks the **rising** (east-horizon) intersection of the ecliptic, not the setting intersection 180° away. Verified: at sunrise, `Lagna ≈ Sun's longitude` (within ~0.3° including the sunrise-zenith convention residual).

### Retrograde detection

`isRetrograde(key, J)` compares the apparent geocentric longitude at `J` and `J + 0.5 days` (accounting for 0/360 wrap). If the planet's longitude decreased, it is in apparent retrograde motion. Sun, Moon, and Lagna are never retrograde; Rahu and Ketu are always retrograde (mean nodes move backward through the zodiac).

### Varga (divisional chart) calculations

`vargaRashi(longitude, N)` returns the rashi (0–11) for a given sidereal longitude in the D-N chart. Implements the standard Parashara rules:

| N | Chart | Rule |
|---|-------|------|
| 1 | Rashi | `floor(L/30)` |
| 2 | Hora | Male signs: 0–15°→Leo(4), 15–30°→Cancer(3); female signs reversed |
| 3 | Drekkana | 1st/2nd/3rd ⅓ → same / 5th / 9th from sign |
| 4 | Chaturthamsa | 7.5° quarters → same / 4th / 7th / 10th from sign |
| 7 | Saptamsa | Odd signs from same, even from 7th from same |
| 9 | Navamsa | `floor(L · 9 / 30) % 12` (cyclic by element via element rotation) |
| 10 | Dasamsa | Odd signs from same, even from 9th from same |
| 12 | Dwadasamsa | 12 parts of 2.5° starting at same sign |
| 16 | Shodasamsa | Movable→Aries, fixed→Leo, dual→Sag |
| 20 | Vimshamsa | Movable→Aries, fixed→Sag, dual→Leo |
| 24 | Siddhamsa | Odd signs→Leo, even→Cancer |
| 27 | Bhamsa | Fire→Aries, earth→Cancer, air→Libra, water→Capricorn |

D-30 (Trimshamsa) is omitted because Parashara's rule is non-uniform (5 unequal divisions by lord, not 30 equal parts).

### Accuracy

| Body | Source | Accuracy |
|------|--------|----------|
| Sun, Moon | VSOP87 / 59-term ELP2000 | ±0.003° / ±0.01° |
| Mercury, Venus, Mars, Jupiter, Saturn | Linear J2000 elements + Kepler | ±0.5–1° (±2° outside 1900–2100) |
| Rahu, Ketu | Mean node (no nutation) | ±0.5° |
| Lagna | Meeus RAMC formula | ±0.05° (limited by Sun & GMST precision) |

For higher precision on the outer planets, replace the linear orbital elements with the full VSOP87 series or Swiss Ephemeris.

### Reference nakshatra, 9-Tara, and marriage compatibility

When the reference overlay is enabled, four additional cards appear on the Sky tab:

**1. Reference Moon · nakshatra & pada** — `nakAndPada(siderealMoonLon)` computes:

```
nRaw = nm(siderealMoonLon) / 13.333°       // 0–27
nIdx = floor(nRaw)                          // 0–26  → NK[nIdx]
pada = floor((nRaw − nIdx) × 4) + 1         // 1–4
degInNak = (nRaw − nIdx) × 13.333°
```

Plus the nakshatra's principal stars (from `NAKSHATRA_STARS[]`).

**2. Mitra & Parama-Mitra stars (9-Tara)** — for the reference nakshatra `B`:

```
For a target nakshatra N (also 0-indexed):
  count       = ((N − B + 27) mod 27) + 1     ← 1-based count from B
  categoryIdx = (count − 1) mod 9              ← 0..8
  cycle       = ⌈count / 9⌉                    ← 1, 2, or 3
```

The nine tara categories indexed by `categoryIdx`:

| idx | Name | Quality |
|---|---|---|
| 0 | Janma | Danger to body |
| 1 | Sampat | Wealth & prosperity ✓ |
| 2 | Vipat | Losses, accidents ✗ |
| 3 | Kshema | Prosperity ✓ |
| 4 | Pratyak | Obstacles ✗ |
| 5 | Sadhana | Ambitions realised ✓ |
| 6 | Naidhana | Dangers ✗ |
| 7 | **Mitra** | Good ✓ |
| 8 | **Parama-Mitra** | Very favourable ✓ |

Cycle (Paryaya) softening per Shri B.V. Raman Ch. III: full evil only in cycle 1 (counts 1–9), half in cycle 2 (10–18), almost negligible in cycle 3 (19–27).

So the Mitra nakshatras for birth-star B are at offsets **B+7, B+16, B+25** (mod 27), and Parama-Mitra at **B+8, B+17, B+26**. For Ashwini (B=0) that's Pushya, Anuradha, U.Bhadrapada (Mitra) and Ashlesha, Jyeshtha, Revati (Parama-Mitra).

The card also shows today's actual Moon nakshatra and where it falls in the 9-Tara cycle relative to the reference — so e.g. "the day's Sravana is the 22nd star → Kshema, cycle 3 (almost negligible evil)".

**3. Marriage compatibility — Ashtakuta (Shri B.V. Raman)** — `ashtakuta(boyNak, girlNak)`. Eight kutas totalling 36 points:

| # | Kuta | Max | What it measures |
|---|---|---|---|
| 1 | Varna | 1 | Boy's varna ≥ girl's |
| 2 | Vasya | 2 | Rashi-to-rashi amenability |
| 3 | Tara (Dina) | 3 | Bidirectional 9-Tara check (1.5 pts per favourable direction) |
| 4 | Yoni | 4 | 14-animal pairing matrix |
| 5 | Graha Maitri | 5 | Friendship between rashi lords |
| 6 | Gana | 6 | Deva/Manushya/Rakshasa temperament |
| 7 | Bhakuta | 7 | 0 if rashi offset is 1/11 (2-12 axis) or 5/7 (6-8 sashtashtaka); else 7 |
| 8 | Nadi | 8 | Same Nadi → 0 (same-nakshatra exempt); different → 8 |

**Pada exception for Nadi.** When both padas are supplied and the nakshatra-level Nadi would score zero, `ashtakuta()` consults the pada-level Nadi (Shri B.V. Raman p.74). The 108 padas are arranged in a **boustrophedon** snake across the three Nadi columns:

```
                    Vata        Pitta       Kapha
row 0 (→):          Aswini 1    Aswini 2    Aswini 3
row 1 (←):          Bharani 2   Bharani 1   Aswini 4
row 2 (→):          Bharani 3   Bharani 4   Krittika 1
row 3 (←):          Krittika 4  Krittika 3  Krittika 2
row 4 (→):          Rohini 1    Rohini 2    Rohini 3
…repeats every 6 padas…
```

`padaNadi(nakIdx, pada)` returns 0/1/2. If the two padas fall in different columns despite identical nakshatra-Nadi, the Nadi dosha is considered neutralised and the full 8 points awarded.

Verdict cutoffs: ≥28 excellent · ≥18 acceptable · ≥14 marginal · <14 poor. Shri B.V. Raman cautions repeatedly (Ch. IX) that longevity and the 7th-house strength of each chart take precedence over the kuta total.

### Panchaka — five-source vibration

`panchaka(tithiN, weekdayN, nakshatraN, lagnaN)` from Shri B.V. Raman Ch. III. Sum the four 1-based numbers (tithi from Shukla Pratipada, weekday Sun=1..Sat=7, nakshatra from Ashwini, Lagna rashi from Mesha) and divide by 9. The Sky tab computes all four from the chosen moment and shows the result:

| Remainder | Type | Quality |
|---|---|---|
| 0, 3, 5, 7 | Auspicious | no panchaka dosha |
| 1 | Mrityu Panchaka | indicates danger |
| 2 | Agni Panchaka | risk from fire |
| 4 | Raja Panchaka | bad results — especially set aside for occupational elections |
| 6 | Chora Panchaka | evil happenings, theft — especially set aside for travel |
| 8 | Roga Panchaka | disease — especially set aside for marriage and upanayanam |

Most exception rules are situational: a panchaka declared unsuitable for one election category can sometimes be used for another. For ordinary acts a favourable Tarabala alone is sufficient; panchaka is only needed for ceremonies like marriage, nuptials, entry into a new house, etc.

**Verified** against the book's worked example: tithi 13 + Sunday (1) + Ashlesha (9) + Virgo (6) = sum 29 → remainder 2 → Agni Panchaka.

The card is a standalone collapsible widget with two nakshatra dropdowns (plus optional pada selectors) — it does not depend on the reference overlay.

**4. Guidance card** — a condensed adaptation of Shri B.V. Raman's *Muhurtha* covering Tarabala, Chandrabala, the Cycle softening rule, marriage caveats, and stars/days to avoid for important events. Cited inline; the user is directed to consult an experienced astrologer for decisions of real consequence.

### Reference / overlay chart

The Sky tab has an **optional reference moment** that is overlaid on both charts. Common use cases:

- **Birth chart vs current transit** — pin the birth moment as reference; the primary date/time tracks "now" so you can see how the current sky maps onto the natal placements
- **Comparing two events** — set primary = event A, reference = event B
- **Comparing locations** — same date/time but different lat/lon to see how Lagna shifts

**UI:** a collapsible `<details>` card with a checkbox toggle, separate reference date / time / city / lat / lon inputs. Location resolution priority:

1. If both `sky-ref-lat` and `sky-ref-lon` are filled → use those (longitude-estimated tz)
2. Else if a city is chosen → use the city's lat / lon / iana / tz
3. Else → reuse the primary `LOC`

The reference's UTC offset is resolved via `Intl.DateTimeFormat` against its own IANA tz (DST-aware), so a 1990 Delhi reference uses +5:30 IST and a 2010 Boston reference correctly chooses EST or EDT for the date.

**`getRefMoment()`** returns `{J, lat, lon, name, label, tz}` when the overlay is enabled and inputs are valid, otherwise `null`.

**Display:** reference planets are rendered in the chart cells in *blue italic* below the primary set, with a dashed separator. The cell gets a blue inset border when the reference Lagna falls in that rashi. The sidereal-longitudes table gains a fourth column showing the reference position. The viewing guide remains primary-only — "where to look" answers only one moment at a time.

### Viewing guide (where to look)

Below the charts the Sky tab renders a **"weather permitting"** observation panel for the same instant. It tells the user where each body actually sits in the local sky and whether it can be seen.

**Coordinate conversion:** `eclToHor(λ, β, J, lat, lon)` converts a body's ecliptic longitude and latitude to horizontal coordinates (altitude in degrees above the horizon, azimuth as a compass bearing 0–360° from north, clockwise):

```js
RA  = atan2(sin(λ)·cos(ε) − tan(β)·sin(ε), cos(λ))
dec = asin(sin(β)·cos(ε) + cos(β)·sin(ε)·sin(λ))
H   = LST − RA                                            // hour angle
alt = asin(sin(φ)·sin(dec) + cos(φ)·cos(dec)·cos(H))
A   = atan2(sin(H), cos(H)·sin(φ) − tan(dec)·cos(φ))      // Meeus from south
az  = (A·180/π + 180) mod 360                             // → compass
```

Planet ecliptic latitudes are treated as β=0 (acceptable to ±5° in azimuth for the bright planets); the Moon uses its full `moonLat()` value.

**Twilight phase** is classified from the Sun's altitude:

| Sun altitude | Phase | What's visible |
|---|---|---|
| > 0° | Daytime | No stars; only Sun and bright Moon |
| 0° to −6° | Civil twilight | Moon and brightest planets (Venus, Jupiter) |
| −6° to −12° | Nautical twilight | Most planets and bright stars |
| −12° to −18° | Astronomical twilight | Faintest stars becoming visible |
| < −18° | Full night | Sky at its darkest |

**Rise-time fallback:** for any body currently below the horizon, `findRiseTime(altFn, J, hoursAhead)` steps forward in 15-min increments and bisects the first 0°-crossing. The reported rise time is converted to the location's wall-clock via `LOC.iana`.

**Glare check:** Mercury and Venus closer than 10° to the Sun are flagged "lost in glare" — even if technically above the horizon they cannot be seen.

**Nakshatra star table:** `NAKSHATRA_STARS[27]` maps each nakshatra to its principal stars and a finder hint (e.g. *Rohini → Aldebaran (α Tauri), bright orange star — the eye of Taurus*). The Moon's current nakshatra at the chosen instant is displayed with its star information plus a "look toward the Moon (currently SW, 30° above horizon)" pointer. This gives an observable visual anchor for what the panchanga's abstract nakshatra index actually corresponds to in the sky.

### Lagna card — strengthening the ascendant

The Sky tab shows a **Lagna card** for the chosen moment: rising sign, degree, sign nature (`SIGN_NATURE[r % 3]` — movable/fixed/dual), the rashi lord and the whole-sign house it occupies, plus live strength checks per Shri B.V. Raman Ch. II & IX:

- **Lagna tyajya** — `lagnaTyajya(siderealLon)` flags the rejected slices of the rising sign: *Bhujanga* (first 3° of Aries, Taurus, Sagittarius, Virgo), *Rahu* (last 3° of Pisces, Capricorn, Cancer, Scorpio), *Gridhra* (13°30′–16°30′ of Gemini, Libra, Leo, Aquarius). Even a strong sign is rejected while the ascendant degree sits in these zones — shifting the chosen time a few minutes moves past them.
- **Dynamic checks** computed from the chart (whole-sign houses from the Lagna rashi): benefic (Jupiter/Venus/Mercury) in Lagna — *"a formidable force in rendering the Lagna strong"*; Lagna free of malefics; malefics usefully placed in 3rd/11th; no papakartari (Lagna hemmed between malefics in the 12th and 2nd); Jupiter or Venus in a kendra.
- **Marriage-specific trio**: 7th house unoccupied, Mars not in the 8th, Venus not in the 6th.
- **Guidance text**: match the sign nature to the purpose — fixed for permanence (house entry, foundation, coronation), movable for travel, common for education; Gemini/Virgo/Libra best for marriage; prefer the forenoon; strengthen the ascendant, its lord, and the Moon. Because the Lagna changes roughly every two hours, small time shifts usually suffice.

### Category muhurtha search (Search tab)

The Search tab's **Purpose** selector applies Shri B.V. Raman's per-category election rules and ranks every day in the chosen range by favourability:

| Category | Source | Key rules encoded |
|---|---|---|
| Marriage (Vivaha) | Ch. IX | 11 sanctioned nakshatras (others unsuitable; Magha/Mula pada 1 and Revati pada 4 rejected); bright-half tithis 2/3/5/7/10/11/13; Riktha + 6/8/12 + dark-11-to-Amavasya rejected; Mon/Wed/Thu/Fri best, Tue rejected; masa Magha/Phalguna/Vaisakha/Jyeshtha good; 9 rejected yogas; Vishti invariably discarded; Roga & Mrityu Panchaka; Moudhyam; Adhika masa |
| House entry (Griha Pravesha) | Ch. XII | Vaisakha/Jyeshtha/Magha/Phalguna; Uttarayana; fixed lagna preferred; Tue/Sat set aside |
| Laying foundation | Ch. XII | 8 best + 7 middling nakshatras (other 12 invariably avoided); odd tithis (not 9th) + 2/6/10; masa rules; Agni & Raja Panchaka |
| Education (Vidyarambha) | Ch. XI | Mrigasira/Ardra/Punarvasu/Pushya/Hasta/Chitta/Swati/Sravana/Dhanishta/Satabhisha; Wed morning best; common signs; 4/8/9/14 + New/Full Moon avoided |
| Travel (Yatra) | Ch. XIV | 10 "safe return" nakshatras; Bharani & Krittika invariably rejected; 9th tithi prohibited; Chora Panchaka; Janma nakshatra avoided |
| Business / trade | Ch. X | Thursday + 10th tithi + Pushya best; Tuesday completely rejected; Mercury fortification noted |
| Medical treatment | Ch. XV | 16 sanctioned nakshatras; Mon/Wed/Thu/Fri; 4/9/14 + Purnima/Amavasya set aside |
| General | Ch. II–IV | Tue/Sat avoided; 4/8/14 tithis unsuitable; Bharani avoided for all good work |

`categoryDayScore(p, catKey, participants, eclipse)` builds the score from a base of 50, with weighted contributions (nakshatra ±25, tithi ±18, vara ±15, masa ±12, yoga −8, Vishti −8/−12, Panchaka −10, Adhika −12, Moudhyam −12, eclipse −15) and returns a **reasons array** — every result shows a "Why this ranking" breakdown quoting the rule applied. The day-level Panchaka is computed with a Mesha placeholder Lagna and flagged as such — the user finalises the hour against the Sky tab's Lagna card.

**Participants (marriage & business).** When the purpose is Marriage, the form asks for the bride's and groom's birth details; for Business, up to four partners. Each slot accepts a directly-picked Janma nakshatra **or** birth date/time/city — `computeBirthStar()` resolves the timezone DST-aware via the city's IANA name, computes the sidereal Moon, and returns nakshatra, pada and Janma Rasi. Per participant, each candidate day then gains/loses points for **Tarabala** (9-count from the birth star, with Paryaya cycle softening ×1/×0.5/×0.15) and **Chandrabala** (day's Moon must not sit 6th/8th/12th from the Janma Rasi). For a marriage couple, the fixed **Ashtakuta** total is displayed once above the results — it qualifies the match, while the ranking addresses the timing. Birth details never leave the browser.

---

## 12. Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Lunar masa uses Sun's rashi at current/next new moon boundaries — correct for normal and adhika months; the nija detection (rPrev check) may rarely misfire if two consecutive Sankrantis are very close to new moon boundaries | Extremely rare edge case (~once per decade) | Validate against a printed panchanga for the specific year |
| Festival detection uses solar masa `mi(p)`, not the lunar `p.hm` | By design — festival rules are solar-anchored; the two names are offset ~2–4 weeks near Sankranti | No change needed; see §5.6 |
| Moon longitude ±0.01° (Meeus 59-term ELP2000) | Transition times ±1 minute | Use Swiss Ephemeris (§11.12) for sub-arcminute accuracy |
| Sun longitude ±0.003° | Minimal impact on panchanga | Already adequate |
| Eclipse type threshold is β-only (geocentric) | Solar eclipses near the central/partial boundary may be classified slightly differently than path-of-totality maps would show, because lunar parallax is not applied | Cross-check with NASA / timeanddate.com for high-stakes uses |
| Eclipse visibility uses daytime-at-location for solar, Moon-above-horizon for lunar | A daytime solar eclipse is reported "visible" anywhere the Sun is up; this overstates: only points on the path of totality see totality. Lunar visibility is exact for the midpoint instant | Use authoritative eclipse maps for path-of-totality |
| Vara (weekday) derived from `date.getDay()` | Correct on the Panchanga tab (sunrise reference) and all daytime hours; may be off by one only in the narrow pre-sunrise window on the calendar grid | Acceptable for practical use |
| DST resolved via `Intl.DateTimeFormat(LOC.iana)`; custom coords without `iana` use static `tz` or longitude estimate | Cities in `CITIES` carry their IANA name and are DST-correct; custom-coordinate locations may be off by 1 h during DST and the longitude estimate may miss by up to 30 min in regions with eccentric zones (Western China, parts of Russia) | Add the location to `CITIES` with the correct `iana` |
| No ayanamsha interpolation for sub-day calculations | Eclipse midpoint ayanamsha is slightly off | Sub-arcsecond correction; negligible |
| Nakshatra / yoga ±0.01° (sidereal Moon + Sun, 59-term ELP2000 + apparent Sun) | Transition timing ±1–2 min for nakshatra, ±3 min for yoga | Use Swiss Ephemeris (§11.12) for sub-arcminute accuracy |
| `findMoudhyamEnd` assumes monotonic elongation between daily samples | Around inferior conjunction (Venus), the U-shaped elongation curve can be sampled wrong, mis-estimating end date by 1–2 weeks at worst | Use hourly samples or a planetary ephemeris service |
| Sunrise zenith fixed at 90.833° (refraction + semi-diameter, sea level) | At elevated cities (Bengaluru, Kathmandu, Mexico City) the geometric horizon is depressed; sunrise may be 1–3 min early | Add an `elev` field to CITIES and include `0.0353°·√h` in the zenith |

---

## 13. Security & Privacy

This is a fully static, in-browser app — no backend, no `fetch`, no `localStorage`, no telemetry, no analytics. Everything you see is computed in your browser from your inputs. Here is the deliberate posture:

### What the app does NOT do

- **No network requests after page load.** The HTML is loaded once; CSS/font CDNs are fetched per request, but the JavaScript itself never makes XHR/`fetch` calls.
- **No data persistence.** Your location, dates, and search filters are not stored across sessions.
- **No third-party scripts.** Only stylesheet/font CDNs (Tabler Icons, Google Fonts) are loaded, and Tabler is pinned with SRI.
- **No reverse-geocoding.** When you click "Auto-detect", your coordinates stay in the browser — they are matched against the static `CITIES` list locally to pick a nearby name.

### Defences in place

| Mitigation | Implementation |
|------------|----------------|
| **Content-Security-Policy** | `<meta http-equiv="Content-Security-Policy">` restricts script/style/font/img/connect sources. `connect-src 'none'` blocks any future runtime exfiltration. `frame-ancestors 'none'` prevents clickjacking. |
| **Subresource Integrity (SRI)** | Tabler Icons stylesheet pinned to SHA-384. CDN compromise → browser refuses the file. |
| **Referrer policy** | `no-referrer` set globally and per-link, so font/icon requests do not leak the page URL. |
| **HTML-escape helper** | `esc(s)` is applied wherever `LOC.name` (the only string with a path from user input) reaches `innerHTML`. |
| **Input validation** | `applyCustomLoc` rejects `NaN`, `Infinity`, and lat/lon outside ±90/±180. `parseInt` always specifies radix 10 and is followed by a `Number.isFinite` guard. Date inputs check `isNaN(date.getTime())`. |
| **Geolocation flow** | No auto-prompt on load (poor UX, browsers often auto-deny). Explicit click → 10 s timeout, error codes are translated to friendly strings. |
| **Cache bounding** | All caches soft-capped at 5000 entries to prevent unbounded growth. |

### Known residual risks

- **Inline event handlers (`onclick=`)** prevent dropping `'unsafe-inline'` from `script-src`. A future refactor to `addEventListener` would let CSP block injected inline scripts entirely.
- **Google Fonts CSS is not SRI-pinned** because its response varies per user-agent. The risk is a compromised Google Fonts CDN serving malicious `@font-face` declarations; the CSP `font-src` restriction limits the blast radius.
- **`unsafe-inline` for `style-src`** is required by the heavy inline-style usage. Refactor to classes would let us tighten this.

### If you self-host

Replace the two CDN `<link>` tags with locally-hosted copies of the CSS/font files (and update SRI accordingly). Then you can drop the `https://cdn.jsdelivr.net` and `https://fonts.*` allowances from the CSP, leaving `'self'` and `'unsafe-inline'` only.

---

## 14. Quick-Reference: Key Variables

| Variable | Location | What it controls |
|----------|----------|-----------------|
| `LOC` | Global | `{ lat, lon, name, tz, iana }` — current location with standard tz offset and IANA timezone for DST resolution |
| `TI[30]` | Static array | Tithi names and quality ratings |
| `NK[27]` | Static array | Nakshatra names, rulers, qualities, gana, nature |
| `YG[27]` | Static array | Yoga names and quality ratings |
| `KR[11]` | Static array | Karana names and quality ratings |
| `VA[7]` | Static array | Vara names, deities, qualities, Rahu slot numbers |
| `GULIKA[7]` | Constant | Gulika Kalam part numbers indexed by weekday |
| `AMRITA` | Constant | Map of weekday → nakshatra index for Amrita Siddhi Yoga |
| `VARJYAM_GHATI[27]` | Constant | Per-nakshatra elapsed-ghatika (in /60 of nakshatra duration) at which Varjyam begins |
| `YAMAGANDA[7]` | Constant | 1-based day-part number for Yamaganda Kalam, indexed by weekday |
| `SAMVATSARA[60]` | Static array | 60-year Samvatsara cycle names |
| `FEST[]` | Static array | Festival detection rules — add here to add festivals |
| `EK_SH[12]` | Constant | Shukla Ekadashi names by solar masa |
| `EK_KR[12]` | Constant | Krishna Ekadashi names by solar masa |
| `CITIES[]` | Static array | City list for location picker |
| `sunRashi(J)` | Function | Returns 0–11 sidereal rashi of the Sun at Julian Day J |
| `getLunarMasaInfo(J)` | Function | Returns `{masaIdx, isAdhika, isNija, fullName}` — correct amanta lunar month with adhika/nija detection (see §5.6) |
| `p.hm` | Panchanga object | Full lunar month name: `"Vaishakha"`, `"Adhika Jyeshtha"`, `"Nija Jyeshtha"`, etc. |
| `p.masaInfo` | Panchanga object | Full `{masaIdx, isAdhika, isNija, fullName}` object for conditional rendering |
| `pcache` | Global | Panchanga object cache (key: `lat-lon-Y-M-D`); includes `moudhyam` and `hm` |
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

## References

### Classical sources — Hindu astrology, Muhurtha, Jyotisha

- **Shri B.V. Raman**, *Muhurtha (Electional Astrology)*, UBSPD — primary source for the Sky-tab's 9-Tara cycle, Ashtakuta marriage compatibility (Varna / Vasya / Tara / Yoni / Graha Maitri / Gana / Bhakuta / Nadi), Tarabala & Chandrabala, Panchaka, and the rules around Janma Star / Janma Rasi (Chapters III, IV, IX). The Yoni 14×14 matrix, Gana matrix, Nadi assignments and planetary-friendship table in `index.html` are transcribed directly from this work.
- **Shri B.V. Raman**, *Hindu Predictive Astrology* — foundational treatment of Janma Rasi, Janma Nakshatra, planetary friendships, and rashi lords.
- **Shri B.V. Raman**, *Ashtakavarga System of Prediction* — referenced in *Muhurtha* Ch. IX for the 7th-house assessment that should precede any kuta scoring.
- **Shri B.V. Raman**, *Planetary Influences on Human Affairs* and *A Manual of Hindu Astrology* — broader context for the cosmic-determinism reading of muhurtha cited in the guidance card.
- **Prof. B. Suryanarain Rao**, *An Introduction to the Study of Astrology* and *Astrological Mirror* — cited within Shri B.V. Raman's *Muhurtha* for the rationale of Panchaka and electional theory.
- **Varahamihira**, *Brihat Samhita* — original source of the Varjyam ghati-per-nakshatra table and the Nadi classification.

### Astronomical algorithms & data

- **Jean Meeus**, *Astronomical Algorithms*, 2nd ed., Willmann-Bell, 1998 — JD, VSOP87, ELP2000 (Ch. 47), eclipse, sunrise, planetary elements (Ch. 31).
- **N. C. Lahiri**, *Indian Ephemeris and Nautical Almanac* — Chitrapaksha (Lahiri) ayanamsha, the official standard of the Government of India.
- **NOAA Solar Calculator** — sunrise/sunset zenith angle 90.833° (refraction + semi-diameter) and equation of time.
- **PyMeeus** (architest/pymeeus on GitHub) — used to verify the ELP2000 Table 47.A term coefficients.
- **Tabler Icons** v2.44 (CDN) and **Google Fonts** (Baloo Tammudu 2) — UI assets.

---

*Documentation for `index.html` (Hindu Panchanga Calendar). For bug reports or improvements, refer to the inline comments in the source file. Calculations are AI-generated approximations — verify critical muhurthas with a printed panchanga or a qualified astrologer.*

---

## Copyright & License

© 2026 Pradyumna Revur. This work is dedicated to the public domain under the [Creative Commons CC0 1.0 Universal Public Domain Dedication](LICENSE).

To the extent possible under law, the author has waived all copyright and related or neighboring rights to this work. It may be freely copied, modified, distributed, and used for any purpose, including commercial, without permission, attribution, or fee. Attribution remains welcome but is not required.

The cited works listed under [References](#references) — Shri B.V. Raman's books, Meeus' *Astronomical Algorithms*, the *Brihat Samhita*, the SVBF-2026 calendar used for verification, etc. — are referenced under their own respective copyrights. They are not redistributed; only specific tables, formulas, and worked examples necessary to compute the panchanga have been transcribed.
