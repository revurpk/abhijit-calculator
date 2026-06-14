# Project Constitution — Hindu Panchanga Calculator

This document is the supreme governing reference for the project. Every change —
by a human or an AI agent — is bound by it. Where any other instruction conflicts
with this constitution, the constitution prevails.

---

## Article I — Purpose

The project is a single, self-contained, offline-capable `index.html` that
computes the Hindu Panchanga and related jyotisha for any date, time, and
location. It is dedicated to the public domain under CC0 1.0 (see `LICENSE`).
It must remain dependency-free at runtime: no backend, no build step, no network
calls after the initial page load.

---

## Article II — The Pre-Commit Rule (mandatory)

**Before every commit, without exception, the author must:**

1. **Review and fix all safety and security issues.** Audit the changes (and any
   code they touch) for: XSS in every `innerHTML`/attribute sink, input
   validation (NaN/Infinity/range/radix), `localStorage` trust boundaries,
   prototype-pollution, unescaped user/stored strings, NaN/undefined leaks into
   rendered output, unbounded loops or caches, CSP/SRI integrity, and privacy
   (nothing transmitted; birth data never persisted). Fix everything found —
   do not defer security issues to a later commit.

2. **Rerun the regression tests and require a green run.** Execute `npm test`
   (`node test/regression.js`). The commit may proceed only when it reports
   **0 failed and 0 runtime errors**. If a change makes a legitimate behavioural
   difference, update the tests in the same commit — never weaken an assertion
   merely to make it pass.

3. **Add or extend tests for new behaviour.** Any new calculation, rule, or
   interactive feature must gain at least one assertion in `test/regression.js`,
   ideally anchored to an authoritative source (Shri B.V. Raman's *Muhurtha*,
   Meeus, Brihat Samhita, or verified almanac data).

A commit that skips the security review or ships with a red test run violates
this constitution.

---

## Article III — Correctness & Provenance

- Astronomical and jyotisha rules must trace to a citable source; encode the
  citation in a code comment or in `README.md`.
- Prefer the latest, most accurate models already in use (full Meeus Table 47.A
  Moon series, VSOP87 Sun, Lahiri ayanamsha at 50.2719″/yr). Do not silently
  reduce accuracy.
- Distinguish solar (Souramana) from lunar (Chandramana / amanta) reckoning
  wherever a month, ritu, or rashi is shown.

---

## Article IV — Tone & Respect

User-facing text follows the spirit of the muhurta shloka: classical
indications describe terrain, not destiny. Frame challenges as invitations to
care and preparation, never as verdicts against any person. Attribute classical
sources respectfully (e.g. "Shri B.V. Raman").

---

## Article V — Privacy & Data

- The app makes no network requests after load and uses no telemetry or cookies.
- The only persisted state is the `pcCustomCities` localStorage key (validated on
  every load). Birth details, search inputs, and locations are never transmitted
  and never persisted beyond that key.
- Any future persistence or network feature must be added to `SECURITY.md` and
  the in-app Security & Privacy section in the same commit.

---

## Article VI — Engineering Hygiene

- Keep the single-file architecture; avoid adding a build step or runtime
  dependencies. (Dev-only tooling such as the test harness's `jsdom` is fine and
  lives in `devDependencies`.)
- `index.html` is UTF-8 **without BOM** and contains Devanagari, Telugu, and
  symbol characters. Never round-trip it through tooling that re-encodes as
  cp1252 (e.g. PowerShell 5.1 `Get-Content`/`WriteAllText`); use UTF-8-aware
  edits and verify non-ASCII probes survive.
- Commit messages describe what changed and why, and end with the required
  co-authorship trailer.

---

## Article VII — Amendment

This constitution may be amended by committing a change to this file with a
commit message explaining the rationale. Amendments take effect immediately for
all subsequent commits.
