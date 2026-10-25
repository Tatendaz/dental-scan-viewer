# Feature: 7-day npm cooldown, zizmor and merge-when-clean

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
- `.github/workflows/merge-when-clean.yml`: the sweep's shared template, unchanged. Merges Dependabot PRs and the owner's `security/*` / `automerge` PRs once checks are green, a real review ran on the head and 0 threads are open.
- `.github/workflows/zizmor.yml`: zizmor 1.31.1 via `zizmorcore/zizmor-action` v0.7.1 (SHA-pinned), fails on high findings.
- `.github/dependabot.yml`: github-actions updates, monthly, `cooldown.default-days: 7`, minor + patch grouped, at most 3 open PRs.

## Notes
- No npm Dependabot entry: the repo has no dependencies.
- GitHub Pages builds from `main` (legacy build, not a workflow file). A merge made by the merge-when-clean job uses GITHUB_TOKEN, which may not start a Pages build. If the live site lags after an automatic merge, push any commit or re-run the Pages build from the repo settings.
- Needs a recent npm. npm 11.20.0 on the owner's Mac reads it (`npm config get min-release-age` prints 7). Older npm warns and ignores it.
