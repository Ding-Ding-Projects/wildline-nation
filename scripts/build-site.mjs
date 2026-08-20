import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname.replace(/^\//, '').replaceAll('/', '\\');
const out = join(root, 'site', 'dist');
await mkdir(out, { recursive: true });
await cp(join(root, 'site', 'index.html'), join(out, 'index.html'));
await cp(join(root, 'site', 'site.css'), join(out, 'site.css'));
console.log(`Pages site built at ${out}`);
