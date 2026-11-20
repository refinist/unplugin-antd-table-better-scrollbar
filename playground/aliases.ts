import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { siteAliases, vueRoute } from './site-assets.ts';
const require = createRequire(import.meta.url);
const resolve = require.resolve;
export function vueDemo(tool: string, major = process.env.ANTDV_MAJOR ?? '4') {
  if (!['3', '4', 'next'].includes(major)) throw new Error('ANTDV_MAJOR must be 3, 4 or next');
  const pkg = major === 'next' ? 'antdv-next' : `antdv${major}`;
  const { version } = require(`${pkg}/package.json`) as { version: string };
  const label =
    major === 'next' ? `Antdv Next ${version}` : `AntDV ${major === '4' ? '4.x +' : version}`;
  return {
    aliases: vueTableAliases(pkg),
    route: vueRoute(major),
    pkg,
    title: `Vue · ${tool} · ${label} · Antd 表格滚动条对比`,
  };
}

export const originalTablePath = (pkg: string) =>
  fileURLToPath(new URL(`../node_modules/.cache/original-tables/${pkg}.mjs`, import.meta.url));

export const tableEntry = (pkg: string) =>
  resolve(pkg === 'antdv-next' ? 'antdv-next/dist/table/index' : `${pkg}/es/table/index.js`);

export function vueTableAliases(pkg: string) {
  return {
    ...siteAliases('vue'),
    'demo-ui': dirname(dirname(tableEntry(pkg))),
    'original-table': originalTablePath(pkg),
    'table-under-test': tableEntry(pkg),
    'table-style':
      pkg === 'antdv3'
        ? process.env.PLAYGROUND_SITE_SHIMS
          ? join(process.env.PLAYGROUND_SITE_SHIMS, 'empty.css')
          : resolve('./antdv3-style.ts')
        : resolve(`${pkg}/dist/reset.css`),
  };
}

export function reactTableAliases() {
  return { ...siteAliases('react'), 'original-react-table': originalTablePath('antd') };
}
