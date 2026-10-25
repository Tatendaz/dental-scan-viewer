# Session: supply-chain hardening 2026-10-25

**Branch:** security/hardening-2026-10-25
**Date:** 2026-10-25

## Prompts
1. "PHASE 2 from coordinator (owner approved): after you finish the sweep for all your repos and write your _done file, do NOT stop. Read HARDENING.md and do it for each of your repos: Dependabot config with 7-day cooldown, package-manager cooldown, CI lockdown (npm ci, SHA pins, least permissions, zizmor job, gitleaks job on private repos). One more PR per repo, same review and merge rules."
2. "UPDATE from coordinator: HARDENING.md changed. (a) New section 5: add the auto-merge job from templates/merge-when-clean.yml to every repo you harden."

## Steps taken
- Confirmed `min-release-age` exists in the installed npm 11.20.0 (`@npmcli/config` definitions).
- Added `.npmrc`; `npm config get min-release-age` in the repo prints 7, and `npm exec -- http-server@14.1.1 --help` resolves with it set.
- `npm test`: 17 pass.

## Decisions
- First version skipped Dependabot and zizmor (no workflows). Adding merge-when-clean created workflows, so the zizmor job and a github-actions Dependabot entry came with it. Local `zizmor`: 0 findings; `actionlint`: clean.
