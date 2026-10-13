// Reading a single multi-frame DICOM volume (e.g. a dental CBCT export) in the browser.
// No dependencies, so the same module runs in Node for the tests.

export function isGzip(u8) {
  return u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b;
}

export function partNumber(name) {
  const m = /\.part(\d+)$/i.exec(name);
  return m ? Number(m[1]) : null;
}

// Puts files in reading order. Split parts (scan.dcm.gz.part0, .part1, ...) must all be present.
export function orderFiles(files) {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const nums = sorted.map(f => partNumber(f.name)).filter(n => n !== null);
  if (nums.length) {
    if (nums.length !== sorted.length) throw new Error('Select only the scan parts, without other files.');
    for (let i = 0; i <= Math.max(...nums); i++) {
      if (!nums.includes(i)) throw new Error(`Part ${i} is missing. Select all the parts together.`);
    }
  }
  return sorted;
}

export async function gunzip(blob) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser is too old to unpack .gz files. Update it, or use Chrome.');
  }
  return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

// Accepts a raw .dcm or a gzip of one, whatever the file is called.
export async function readScan(blob) {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  const buf = isGzip(head) ? await gunzip(blob) : await blob.arrayBuffer();
  return parseDicom(buf);
}

// Finds the tags the viewer needs by scanning the header for explicit-VR elements, and takes the
// pixel data as the last rows*cols*frames*2 bytes, which is where CBCT exports put it.
export function parseDicom(buf) {
  const u8 = new Uint8Array(buf);
  if (u8.length < 132 || String.fromCharCode(...u8.subarray(128, 132)) !== 'DICM') {
    throw new Error('This is not a DICOM file.');
  }
  const dv = new DataView(buf);
  const headLen = Math.min(u8.length, 4 << 20);
  const find = (g, e) => {
    for (let i = 132; i < headLen - 8; i++) {
      if (dv.getUint16(i, true) === g && dv.getUint16(i + 2, true) === e) {
        const vr = String.fromCharCode(u8[i + 4], u8[i + 5]);
        if (/^[A-Z]{2}$/.test(vr)) return { i, vr };
      }
    }
    return null;
  };
  const num = (g, e, def) => {
    const t = find(g, e);
    if (!t) return def;
    if (t.vr === 'US') return dv.getUint16(t.i + 8, true);
    const len = dv.getUint16(t.i + 6, true);
    const s = String.fromCharCode(...u8.subarray(t.i + 8, t.i + 8 + len)).trim();
    const v = parseFloat(s.split('\\')[0]);
    return Number.isNaN(v) ? def : v;
  };

  const ny = num(0x0028, 0x0010), nx = num(0x0028, 0x0011), nz = num(0x0028, 0x0008, 1);
  const bits = num(0x0028, 0x0100, 16), signed = num(0x0028, 0x0103, 0);
  if (!nx || !ny) throw new Error('Could not read the image size from the file.');
  if (bits !== 16) throw new Error(`Only 16-bit scans are supported (this one is ${bits}-bit).`);
  const slope = num(0x0028, 0x1053, 1);
  let intercept = num(0x0028, 0x1052, 0);
  const voxel = num(0x0018, 0x0050, 0) || num(0x0028, 0x0030, 0) || 0.2;

  const count = nx * ny * nz, off = u8.length - count * 2;
  if (off < 132) throw new Error('The file is incomplete. Check that all the parts were selected.');
  let vol = off % 2 === 0 ? new Uint16Array(buf, off, count) : new Uint16Array(buf.slice(off));
  if (signed) { // shift into unsigned so a 65536-entry lookup table can index every value
    const s = new Int16Array(vol.buffer, vol.byteOffset, count), out = new Uint16Array(count);
    for (let i = 0; i < count; i++) out[i] = s[i] + 32768;
    vol = out;
    intercept -= 32768 * slope;
  }
  return { vol, nx, ny, nz, slope, intercept, voxel };
}

// Maps every stored value to a grey level for a window centre/width given in rescaled units (HU).
export function buildLut(lut, { wc, ww, slope = 1, intercept = 0, invert = false }) {
  const lo = wc - ww / 2;
  for (let r = 0; r < lut.length; r++) {
    let v = ((r * slope + intercept) - lo) / ww;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    lut[r] = Math.round(invert ? 255 - v * 255 : v * 255);
  }
  return lut;
}

// Index of the top-down slice with the most voxels denser than `hu` (enamel is the densest thing
// in a dental scan), so the viewer can open on the teeth instead of an arbitrary middle slice.
export function densestSlice({ vol, nx, ny, nz, slope = 1, intercept = 0 }, hu = 1500) {
  const raw = (hu - intercept) / slope, sxy = nx * ny;
  let best = nz >> 1, bestCount = 0;
  for (let z = 0; z < nz; z++) {
    let n = 0;
    for (let i = z * sxy, end = i + sxy; i < end; i++) if (vol[i] > raw) n++;
    if (n > bestCount) { bestCount = n; best = z; }
  }
  return best;
}
