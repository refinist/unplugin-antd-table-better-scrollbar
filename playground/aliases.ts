import { dirname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const resolve = require.resolve;
const major = process.env.ANTDV_MAJOR ?? '4';
if (major !== '3' && major !== '4') throw new Error('ANTDV_MAJOR must be 3 or 4');
const { version } = require(`antdv${major}/package.json`) as { version: string };

export function playgroundTitle(tool: string) {
  return `Vue · ${tool} · AntDV ${major === '4' ? '4.x +' : version} · 表格滚动条对比`;
}

export const aliases = {
  'demo-ui': dirname(resolve(`antdv${major}/es/index.js`)),
  'original-table': resolve(`antdv${major}/lib/table/index.js`),
  'table-under-test': resolve(`antdv${major}/es/table/index.js`),
  'table-style': resolve(`antdv${major}/dist/${major === '3' ? 'antd' : 'reset'}.css`),
};
