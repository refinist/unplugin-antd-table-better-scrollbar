import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const resolve = require.resolve;
const major = process.env.ANTDV_MAJOR ?? '4';
if (major !== '3' && major !== '4') throw new Error('ANTDV_MAJOR must be 3 or 4');
const { version } = require(`antdv${major}/package.json`) as { version: string };

export function playgroundTitle(tool: string) {
  return `Vue · ${tool} · AntDV ${major === '4' ? '4.x +' : version} · Antd 表格滚动条对比`;
}

export const originalTablePath = (pkg: string) =>
  fileURLToPath(new URL(`../node_modules/.cache/original-tables/${pkg}.mjs`, import.meta.url));

export function vueTableAliases(pkg: string) {
  return {
    'demo-ui': dirname(resolve(`${pkg}/es/index.js`)),
    'original-table': originalTablePath(pkg),
    'table-under-test': resolve(`${pkg}/es/table/index.js`),
    'table-style':
      pkg === 'antdv3' ? resolve('./antdv3-style.ts') : resolve(`${pkg}/dist/reset.css`),
  };
}
export const aliases = vueTableAliases(`antdv${major}`);
