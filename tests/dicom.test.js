import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { isGzip, partNumber, orderFiles, gunzip, readScan, parseDicom, buildLut } from '../dicom.js';

// Builds a minimal explicit-VR little-endian multi-frame DICOM, shaped like a CBCT export.
function makeDicom({ nx = 4, ny = 3, nz = 2, signed = 0, bits = 16, pixels, voxel = '0.4', extra = [] } = {}) {
  const parts = [new Uint8Array(128), new TextEncoder().encode('DICM')];
  const el = (g, e, vr, value) => {
    const isUS = vr === 'US';
    let data = isUS ? new Uint8Array(new Uint16Array([value]).buffer) : new TextEncoder().encode(String(value));
    if (data.length % 2) data = Uint8Array.from([...data, 0x20]);
    const head = new DataView(new ArrayBuffer(8));
    head.setUint16(0, g, true); head.setUint16(2, e, true);
    head.setUint8(4, vr.charCodeAt(0)); head.setUint8(5, vr.charCodeAt(1));
    head.setUint16(6, data.length, true);
    parts.push(new Uint8Array(head.buffer), data);
  };
  el(0x0018, 0x0050, 'DS', voxel);
  el(0x0028, 0x0008, 'IS', nz);
  el(0x0028, 0x0010, 'US', ny);
  el(0x0028, 0x0011, 'US', nx);
  el(0x0028, 0x0100, 'US', bits);
  el(0x0028, 0x0103, 'US', signed);
  el(0x0028, 0x1052, 'DS', '-1000');
  el(0x0028, 0x1053, 'DS', '1');
  for (const x of extra) el(...x);
  const px = pixels ?? Uint16Array.from({ length: nx * ny * nz }, (_, i) => i * 10);
  const pixHead = new DataView(new ArrayBuffer(12));
  pixHead.setUint16(0, 0x7fe0, true); pixHead.setUint16(2, 0x0010, true);
  pixHead.setUint8(4, 'O'.charCodeAt(0)); pixHead.setUint8(5, 'W'.charCodeAt(0));
  pixHead.setUint32(8, px.byteLength, true);
  parts.push(new Uint8Array(pixHead.buffer), new Uint8Array(px.buffer, px.byteOffset, px.byteLength));
  const total = parts.reduce((n, p) => n + p.length, 0), out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

const fileLike = (name, bytes = new Uint8Array(1)) => Object.assign(new Blob([bytes]), { name });

test('isGzip recognises the gzip magic bytes', () => {
  assert.equal(isGzip(Uint8Array.of(0x1f, 0x8b, 8)), true);
  assert.equal(isGzip(Uint8Array.of(0x44, 0x49)), false);
  assert.equal(isGzip(Uint8Array.of(0x1f)), false);
});

test('partNumber reads the split-part suffix', () => {
  assert.equal(partNumber('scan.dcm.gz.part0'), 0);
  assert.equal(partNumber('scan.dcm.gz.PART12'), 12);
  assert.equal(partNumber('scan.dcm'), null);
});

test('orderFiles sorts parts numerically', () => {
  const names = ['s.part10', 's.part2', 's.part0', 's.part1', 's.part3', 's.part4', 's.part5', 's.part6', 's.part7', 's.part8', 's.part9']
    .map(n => fileLike(n));
  assert.deepEqual(orderFiles(names).map(f => f.name).slice(0, 3), ['s.part0', 's.part1', 's.part2']);
  assert.equal(orderFiles(names).at(-1).name, 's.part10');
});

test('orderFiles rejects a missing part and stray files', () => {
  assert.throws(() => orderFiles([fileLike('s.part0'), fileLike('s.part2')]), /Part 1 is missing/);
  assert.throws(() => orderFiles([fileLike('s.part0'), fileLike('notes.txt')]), /only the scan parts/);
});

test('orderFiles passes a single plain file through', () => {
  assert.deepEqual(orderFiles([fileLike('scan.dcm')]).map(f => f.name), ['scan.dcm']);
});

test('parseDicom reads size, rescale, voxel size and pixels', () => {
  const { vol, nx, ny, nz, slope, intercept, voxel } = parseDicom(makeDicom().buffer);
  assert.deepEqual([nx, ny, nz], [4, 3, 2]);
  assert.equal(slope, 1);
  assert.equal(intercept, -1000);
  assert.equal(voxel, 0.4);
  assert.equal(vol.length, 24);
  assert.equal(vol[0], 0);
  assert.equal(vol[23], 230);
});

test('parseDicom falls back to pixel spacing when slice thickness is missing', () => {
  const bytes = makeDicom({ voxel: '', extra: [[0x0028, 0x0030, 'DS', '0.2\\0.2']] });
  assert.equal(parseDicom(bytes.buffer).voxel, 0.2);
});

test('parseDicom handles pixel data at an odd byte offset', () => {
  const raw = makeDicom();
  const bytes = Uint8Array.from([...raw.subarray(0, 132), 0, ...raw.subarray(132)]); // one stray byte
  assert.equal((bytes.length - 24 * 2) % 2, 1);
  const { vol } = parseDicom(bytes.buffer);
  assert.equal(vol[23], 230);
});

test('parseDicom shifts signed pixels into unsigned space and keeps their real values', () => {
  const pixels = new Uint16Array(new Int16Array([-500, 0, 700, -1, 1, 2]).buffer);
  const scan = parseDicom(makeDicom({ nx: 3, ny: 2, nz: 1, signed: 1, pixels }).buffer);
  const real = Array.from(scan.vol, r => r * scan.slope + scan.intercept);
  assert.deepEqual(real, [-1500, -1000, -300, -1001, -999, -998]);
});

test('parseDicom rejects non-DICOM, truncated and 8-bit files', () => {
  assert.throws(() => parseDicom(new Uint8Array(200).buffer), /not a DICOM/);
  const full = makeDicom({ nx: 64, ny: 64, nz: 4 });
  assert.throws(() => parseDicom(full.slice(0, 400).buffer), /incomplete/);
  assert.throws(() => parseDicom(makeDicom({ bits: 8 }).buffer), /16-bit/);
});

test('gunzip and readScan open a gzipped scan', async () => {
  const raw = makeDicom();
  const gz = new Blob([gzipSync(raw)]);
  assert.deepEqual(new Uint8Array(await gunzip(gz)), raw);
  const scan = await readScan(gz);
  assert.equal(scan.vol[5], 50);
});

test('readScan opens a raw scan and a gzip split into parts', async () => {
  const raw = makeDicom({ nx: 32, ny: 32, nz: 8 });
  assert.equal((await readScan(new Blob([raw]))).nz, 8);
  const gz = gzipSync(raw), cut = [0, 100, 300, gz.length];
  const files = [2, 0, 1].map(i => fileLike(`scan.dcm.gz.part${i}`, gz.subarray(cut[i], cut[i + 1])));
  const scan = await readScan(new Blob(orderFiles(files)));
  assert.equal(scan.vol.length, 32 * 32 * 8);
  assert.equal(scan.vol.at(-1), (32 * 32 * 8 - 1) * 10 % 65536);
});

test('buildLut maps the window to 0..255 and can invert', () => {
  const lut = buildLut(new Uint8Array(4096), { wc: 0, ww: 1000, slope: 1, intercept: -1000 });
  assert.equal(lut[0], 0);       // -1000 HU, below the window
  assert.equal(lut[1000], 128);  // 0 HU, the centre
  assert.equal(lut[1500], 255);  // +500 HU, top of the window
  const inv = buildLut(new Uint8Array(4096), { wc: 0, ww: 1000, slope: 1, intercept: -1000, invert: true });
  assert.equal(inv[0], 255);
  assert.equal(inv[1500], 0);
});

test('densestSlice finds the slice with the most dense voxels', async () => {
  const { densestSlice } = await import('../dicom.js');
  const nx = 4, ny = 4, nz = 5, vol = new Uint16Array(nx * ny * nz);
  vol.fill(2600, 3 * 16, 3 * 16 + 10); // 10 dense voxels in slice 3
  vol.fill(2600, 1 * 16, 1 * 16 + 4);  // 4 in slice 1
  assert.equal(densestSlice({ vol, nx, ny, nz, intercept: -1000 }), 3);
  assert.equal(densestSlice({ vol: new Uint16Array(nx * ny * nz), nx, ny, nz }), 2); // nothing dense: middle
});
