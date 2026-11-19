import { execFileSync } from 'node:child_process';
import { cp, mkdtempDisposable, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Flex, Table, Typography } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { reactAntdLabel } from './react/title.ts';
import { githubLink } from './github.ts';

const vueTools = ['vite', 'rsbuild', 'vue-cli'];
const reactTools = ['vite', 'rsbuild', 'webpack'];
const vueRoute = (major: string) => `vue-antdv${major}`;
const reactRoute = 'react-antd6';
await using staging = await mkdtempDisposable(resolve('.site-build-'));
const site = staging.path;

function workspaceTool(tool: string) {
  return tool === 'vite' ? 'vite8' : tool;
}

function build(filter: string[], major: string) {
  execFileSync('pnpm', ['exec', 'vp', 'run', ...filter.flatMap((name) => ['-F', name]), 'build'], {
    stdio: 'inherit',
    env: { ...process.env, ANTDV_MAJOR: major, PLAYGROUND_VITE_LABEL: 'Vite' },
  });
}
async function collectVue(major: string) {
  for (const tool of vueTools) {
    const output =
      tool === 'vite' ? `playground/dist/${workspaceTool(tool)}` : `playground/${tool}/dist`;
    await cp(output, resolve(site, vueRoute(major), tool), { recursive: true });
  }
}
const vuePackages = vueTools.map((tool) => 'playground-' + workspaceTool(tool));
const reactPackages = reactTools.map((tool) => 'playground-react-' + workspaceTool(tool));
build(vuePackages, '3');
await collectVue('3');
build([...vuePackages, ...reactPackages], '4');
await collectVue('4');
for (const tool of reactTools) {
  await cp(`playground/react-${workspaceTool(tool)}/dist`, resolve(site, reactRoute, tool), {
    recursive: true,
  });
}
const labels: Record<string, string> = {
  vite: 'Vite',
  rsbuild: 'Rsbuild',
  'vue-cli': 'Vue CLI',
  webpack: 'Webpack 5',
};
const groups = [
  { key: vueRoute('4'), name: 'Ant Design Vue 4.x +', tools: vueTools },
  { key: vueRoute('3'), name: 'Ant Design Vue 3.2.20', tools: vueTools },
  { key: reactRoute, name: `${reactAntdLabel}（React）`, tools: reactTools },
];
const columns = [
  { title: '组件库', dataIndex: 'name', rowScope: 'row' as const },
  ...['Vite', 'Rsbuild', 'Webpack 5'].map((title, index) => ({
    title,
    key: title,
    render: (_: unknown, group: (typeof groups)[number]) =>
      h('a', { href: `./${group.key}/${group.tools[index]}/` }, labels[group.tools[index]]),
  })),
];
// Embedded in the static directory page. Read the URLs from the rendered table.
function bindOpenAll() {
  const links = document.querySelectorAll<HTMLAnchorElement>('#example-directory tbody a[href]');
  const status = document.getElementById('open-examples-status')!;
  let next = 0;
  document.getElementById('open-examples')!.addEventListener('click', () => {
    for (; next < links.length; next++) {
      const tab = window.open(links[next].href, '_blank');
      if (!tab) {
        status.textContent = `已打开 ${next}/${links.length} 个示例。请允许本站弹出窗口，再次点击即可继续。`;
        return;
      }
      tab.opener = null;
    }
    status.textContent = `已打开全部 ${links.length} 个示例。`;
    next = 0;
  });
}
const cache = createCache();
const directory = renderToStaticMarkup(
  h(
    StyleProvider,
    { cache },
    h(
      'main',
      { style: { maxWidth: 960, margin: '32px auto', padding: '0 16px' } },
      h(
        Flex,
        {
          align: 'center',
          gap: 12,
          style: { marginBottom: 16 },
        },
        h(
          Typography.Title,
          { level: 1, style: { flex: 1, minWidth: 0, fontSize: 24, margin: 0 } },
          'Antd 表格滚动条对比',
        ),
        h(
          Button,
          { id: 'open-examples', type: 'primary' },
          `打开全部 ${groups.reduce((n, group) => n + group.tools.length, 0)} 个示例`,
        ),
        h(Button, {
          ...githubLink,
          type: 'text',
          style: { flex: 'none' },
          icon: h(GithubOutlined, { style: { fontSize: 22 } }),
        }),
      ),
      h(Typography.Text, { id: 'open-examples-status', role: 'status', type: 'secondary' }),
      h(Table<(typeof groups)[number]>, {
        id: 'example-directory',
        columns,
        dataSource: groups,
        pagination: false,
        size: 'middle',
        scroll: { x: 560 },
      }),
    ),
  ),
);
await writeFile(resolve(site, 'directory.css'), extractStyle(cache, true));
await writeFile(
  resolve(site, 'index.html'),
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Antd 表格滚动条对比</title><link rel="stylesheet" href="./directory.css"></head><body>${directory}<script>(${bindOpenAll.toString()})();</script></body></html>`,
);
await writeFile(
  resolve(site, '404.html'),
  '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>页面不存在</title><h1>页面不存在</h1><a href="/">返回示例目录</a></html>',
);

const output = resolve('site-dist');
await rm(output, { recursive: true, force: true });
await rename(site, output);
