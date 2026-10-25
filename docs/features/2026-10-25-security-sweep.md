# Feature: pin http-server in `npm start`

**Branch:** security/sweep-2026-10-25
**Date:** 2026-10-25

## Summary
`npm start` now runs `http-server@14.1.1` instead of whatever `http-server` version is newest on npm.

## Motivation
`npx --yes http-server` downloads and runs the latest release with no prompt and no lockfile.
This year's npm worms shipped as new versions of trusted packages. An unpinned `npx` would run such
a version on the first `npm start` after it is published. 14.1.1 (2022-05-31) is the current release
and has no known advisories on osv.dev.

## What changed
- `package.json` `start` script: `http-server` → `http-server@14.1.1`.

## Notes
http-server's own dependencies still resolve to the newest version in their ranges at `npx` time.
The pin removes the biggest exposure (the top-level package); it does not freeze the whole tree.
