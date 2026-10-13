import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildStandalone } from '../scripts/build-standalone.mjs';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('buildStandalone inlines dicom.js as a classic script', () => {
  const out = buildStandalone(read('index.html'), read('dicom.js'));
  assert.doesNotMatch(out, /type="module"/);
  assert.doesNotMatch(out, /from '\.\/dicom\.js'/);
  assert.doesNotMatch(out, /^export /m);
  assert.match(out, /function parseDicom\(/);
  assert.match(out, /\}\)\(\);\n<\/script>\n<\/body>/);
});

test('the standalone script parses as JavaScript', () => {
  const out = buildStandalone(read('index.html'), read('dicom.js'));
  const script = out.slice(out.lastIndexOf('<script>') + 8, out.lastIndexOf('</script>'));
  assert.doesNotThrow(() => new Function(script));
});

test('buildStandalone refuses an index.html it does not recognise', () => {
  assert.throws(() => buildStandalone('<html></html>', ''), /expected way/);
});
