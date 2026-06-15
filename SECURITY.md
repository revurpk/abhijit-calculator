# Security Policy

## Supported versions

The project ships as a single, self-contained `index.html`. The latest commit on
the `main` branch is the only supported version; fixes are made there.

| Version            | Supported |
| ------------------ | --------- |
| `main` (latest)    | ✅        |
| older commits/tags | ❌        |

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue for an
unfixed vulnerability.

- Preferred: open a **GitHub private vulnerability report** via the repository's
  **Security ▸ Report a vulnerability** ("Privately report a vulnerability")
  button at <https://github.com/revurpk/abhijit-calculator/security>.
- Alternative: email the maintainer (Pradyumna Revur).

Please include: affected file/line or feature, reproduction steps, browser and
version, and the impact you observed. As a small
public-domain project there is no bug-bounty program; credit is gladly given in
the commit and release notes if you wish.

## Scope

In scope: anything that affects users of the app — cross-site scripting (XSS),
injection via URL parameters or saved/imported data, unsafe handling of
`localStorage`, prototype pollution, supply-chain integrity of the two CDN
assets, privacy regressions (any data leaving the browser), and denial of
service in the page itself.

Out of scope: the accuracy of astrological/astronomical calculations (these are
documented approximations — see `README.md` §12 Known Limitations), issues that
require a already-compromised browser or OS, and social-engineering reports.

## Security posture (by design)

This is a static, in-browser application with a deliberately small attack
surface:

- **No backend, no telemetry, no analytics, no cookies.** No network requests
  are made after the initial page load.
- **Content-Security-Policy** (`<meta>`): `default-src 'none'` with `connect-src
  'none'` (blocks any runtime exfiltration), `frame-ancestors 'none'` (blocks
  clickjacking), and tightly scoped style/font/img sources.
- **Subresource Integrity (SHA-384)** pins the Tabler Icons CDN stylesheet;
  `referrer` policy is `no-referrer`.
- **Output escaping.** All dynamic strings that reach `innerHTML` — including
  location names and any saved/imported data — pass through an HTML-escape
  helper; framework-free templating is reviewed for injection.
- **Input validation.** Latitude/longitude are range-checked; `NaN`/`Infinity`
  rejected; `parseInt` is always called with a radix and a finite-number guard;
  date/time inputs are validated; numeric edge cases (high latitude, polar
  day/night, extreme dates) are clamped so no `NaN`/`undefined` reaches the UI.
- **Persistence.** The only stored state is one `localStorage` key
  (`pcCustomCities`) holding user-saved locations, re-validated on every load
  (schema check, range/length limits, IANA timezone verified via `Intl`,
  25-entry cap, malformed JSON discarded). **Birth details, dates, and searches
  are never persisted and never transmitted.**

## Our commitment

Per the project [CONSTITUTION.md](CONSTITUTION.md) (Article II), **every commit**
is preceded by a safety-and-security review and a green regression-test run
(`npm test`). Security fixes are never deferred to a later commit.
