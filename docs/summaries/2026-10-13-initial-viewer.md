# Browser-based dental CBCT viewer

**Branch:** main (initial release)
**Date:** 2026-10-13

## Prompts
1. "[Google Drive link] Can you download and extract and make the files available to me"
2. "Ok how do I download im on my iPhone for now"
3. "I'm goina move to my MacBook now how do I access this session?"
4. "give me the files and make me a mac viewer"
5. "can you make an analysis from it? I know its not a medical disagnisis but I want your opinion"
6. "Do you think you can serve this html through GitHub pages on a new repo with my pictures as demo? Additionally make a 30-1min video on how to use it? With copy to post to twitter and LinkedIn on an unconventional way I used Claude to check out my scans? The angle I went in for a checkup cs of pain in my left jaw and the dentist scanned me but sent me a file I could not open from my phone and scans that needed windows to run some special software and instead I gave it to Claude and here was the result"
7. "Can you do it all? And is there anything you need from me before I go" (answers: public demo with an anonymized copy, repo name `dental-scan-viewer`, push without waiting for docs review)

## Steps taken
- Downloaded the Drive file (a RAR5 archive), extracted it with `unrar` using a UTF-8 locale (the folder names are Cyrillic), and identified a Planmeca ProMax CBCT DICOM (551³, 0.2 mm) plus a Windows-only Romexis viewer.
- Split the scan into gzip parts under 30 MB so they could be sent to a phone or Mac, and wrote a single-file HTML viewer for it.
- Found during the analysis that the frames are stored top of head first, and fixed the upside-down front and side views.
- Built this repo: extracted the parser into `dicom.js` with node:test coverage (17 tests), added the demo button, phone layout, slice sliders, flip, and tooth-level opening slice, plus a standalone build.
- Created an anonymized demo DICOM from pixel data only (cropped, 2× downsampled, about 14 MB gzipped).
- Smoke-tested in headless Chromium: the demo on desktop and phone sizes, and the standalone file with the full-resolution split parts.

## Decisions
- No libraries: a small purpose-built parser keeps the page dependency-free and lets it work offline from `file://`.
- Kept `index.html` as an ES module importing `dicom.js` (testable), with a build step that inlines it for the offline file instead of maintaining two copies.
- The demo is downsampled to 0.4 mm so it loads quickly on phones. Full-resolution scans still work when opened locally.
- GitHub Pages serves straight from `main`, with no Actions workflow needed for a static site.
