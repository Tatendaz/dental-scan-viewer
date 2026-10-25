# Feature: 7-day npm cooldown

**Branch:** security/hardening-2026-10-25
**Date:** 2026-10-25

## Summary
Adds `.npmrc` with `min-release-age=7`, so npm in this folder only installs package
versions that have been public for at least 7 days.

## Motivation
Phase 2 of the 2026-10-25 security sweep. `npm start` runs `npx http-server@14.1.1`.
http-server's own dependencies still float to the newest version in their ranges.
With the cooldown, a malicious version published today is not picked up for a week,
which is usually long enough for it to be found and pulled.

## What changed
- `.npmrc`: `min-release-age=7`.

## Notes
- No Dependabot config, zizmor job or `.coderabbit.yaml`: the repo has no dependencies and no workflows, so there is nothing for them to act on.
- Needs a recent npm. npm 11.20.0 on the owner's Mac reads it (`npm config get min-release-age` prints 7). Older npm warns and ignores it.
