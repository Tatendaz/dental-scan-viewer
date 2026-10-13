# Browser-based dental CBCT viewer

**Branch:** main (initial release)
**Date:** 2026-10-13

## Summary
A static web app, hosted on GitHub Pages, that opens a dental cone-beam CT DICOM file in any browser and shows linked top-down, front and side slices. It ships with an anonymized demo scan.

## Motivation
Dental clinics hand out CBCT scans bundled with Windows-only viewers, so patients on phones or Macs can't look at their own scans. This viewer needs nothing but a browser, and the scan never leaves the device.

## What changed
- `index.html`: the viewer, with linked views, window presets, slab/X-ray projection, measuring, flip, phone layout and a demo button.
- `dicom.js`: a dependency-free parser for multi-frame 16-bit DICOM. It handles gzip and split `.partN` files, plus a lookup-table builder and a picker for the densest (tooth-level) slice.
- `scripts/build-standalone.mjs` → `dist/dental-scan-viewer.html`: a single-file offline version that works from `file://`.
- `demo/`: an anonymized, downsampled (0.4 mm) demo scan and a panoramic reconstruction image.
- `demo/demo-video.mp4`: a 50-second walkthrough, linked from the README.
- `tests/`: node:test unit tests for the parser and the build.

## Notes
- Only uncompressed multi-frame DICOM is supported. JPEG-compressed transfer syntaxes and single-slice series aren't supported yet.
- Orientation assumes frame 0 is the top of the head (true for Planmeca exports). "Flip vertical" covers the other case.
- The demo DICOM is rebuilt from pixel data alone, so none of the original header (name, IDs, dates, clinic) is carried over.
