# Session: security sweep 2026-10-25

**Branch:** security/sweep-2026-10-25
**Date:** 2026-10-25

## Prompts
1. "You are worker sec-w7 in the 2026-10-25 security sweep. Read BRIEF.md now and follow it exactly. Your repos: graph_express onemind dental-scan-viewer yapui."
2. "Pick old, safe versions, never latest: bump only the named package, to the lowest fixing version, published on or before 2026-10-18."

## Steps taken
- IOC grep, commit authors, deploy keys, webhooks, secrets: nothing unexpected.
- gitleaks (history + tree): no leaks. osv-scanner: no lockfile (no dependencies).
- Read the demo DICOM header with pydicom: no personal data (name `Demo^CBCT`, ID `DEMO`, new UIDs, no dates).
  Checked PNG/MP4 metadata and video frames: no name or clinic shown.
- Security read of `index.html` and `dicom.js`: no HTML sinks, no third-party scripts.
- Pinned `http-server` in `npm start`. Ran `npm test` (17 pass).

## Decisions
- Pinned the version rather than replacing http-server, to keep `npm start` behaving the same.
