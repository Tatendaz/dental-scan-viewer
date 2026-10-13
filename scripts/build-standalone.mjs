// Inlines dicom.js into index.html so the viewer works as one file opened straight from disk
// (browsers block ES module imports over file://).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const IMPORT_RE = /<script type="module">\s*import \{[^}]*\} from '\.\/dicom\.js';\n/;

export function buildStandalone(html, dicomJs) {
  if (!IMPORT_RE.test(html)) throw new Error('index.html no longer imports ./dicom.js the expected way');
  const lib = dicomJs.replace(/^export /gm, '');
  return html
    .replace(IMPORT_RE, () => `<script>\n(() => {\n${lib}\n`)
    .replace(/<\/script>\s*<\/body>/, '})();\n</script>\n</body>');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('..', import.meta.url);
  const out = buildStandalone(readFileSync(new URL('index.html', root), 'utf8'), readFileSync(new URL('dicom.js', root), 'utf8'));
  mkdirSync(new URL('dist/', root), { recursive: true });
  writeFileSync(new URL('dist/dental-scan-viewer.html', root), out);
  console.log('wrote dist/dental-scan-viewer.html');
}
