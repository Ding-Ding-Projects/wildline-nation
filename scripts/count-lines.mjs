import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname.replace(/^\//, '').replaceAll('/', '\\');
async function walk(dir) { const entries = await readdir(dir, { withFileTypes: true }); const paths = []; for (const entry of entries) { if (['node_modules', '.git', 'dist'].includes(entry.name)) continue; const p = join(dir, entry.name); if (entry.isDirectory()) paths.push(...await walk(p)); else paths.push(p); } return paths; }
const files = await walk(root); const rows = new Map();
for (const file of files) { const ext = file.split('.').pop() ?? 'other'; const lines = (await readFile(file, 'utf8')).split(/\r?\n/); const bucket = ['ts','js','cjs','mjs'].includes(ext) ? 'source' : ['css','html'].includes(ext) ? 'styles-markup' : 'docs-config'; const row = rows.get(bucket) ?? { files: 0, total: 0, nonBlank: 0 }; row.files += 1; row.total += lines.length - 1; row.nonBlank += lines.filter((line) => line.trim()).length; rows.set(bucket, row); }
console.table(Object.fromEntries(rows));
