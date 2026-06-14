# Working agreement for this repository

This project is governed by its **[CONSTITUTION.md](CONSTITUTION.md)** — read it
and follow it. The binding operational rules below are summarised from it.

## Before EVERY commit (mandatory, Constitution Article II)

1. **Review and fix all safety & security issues** in the change and the code it
   touches — XSS sinks, input validation, localStorage trust boundary, NaN/
   undefined leaks, unbounded loops/caches, CSP/SRI, privacy. Fix everything
   found in the same commit; never defer a security issue.
2. **Run `npm test`** (`node test/regression.js`) and proceed only on
   **0 failed, 0 runtime errors**.
3. **Add/extend an assertion** in `test/regression.js` for any new behaviour,
   anchored to an authoritative source where possible.

## Key facts

- Single self-contained `index.html` — no runtime deps, no build step, offline.
- `index.html` is UTF-8 **without BOM** with Devanagari/Telugu/symbol text;
  edit with UTF-8-aware tools only (Edit tool or Node `fs`), never round-trip
  through PowerShell 5.1 `Get-Content`/`WriteAllText` (it mojibakes to cp1252).
  Node is at `C:\Program Files\nodejs\node.exe` (not on PATH).
- Tests need `jsdom` (devDependency): run `npm install` once, then `npm test`.
- Security posture and reporting: see [SECURITY.md](SECURITY.md).
- Public domain under CC0 1.0 (`LICENSE`).
