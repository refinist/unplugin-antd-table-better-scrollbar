import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { transformReactTable } from '../src/react/index.ts';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, vi } from 'vite-plus/test';
import { transformTable } from 'unplugin-antd-table-better-scrollbar';

test('lookalike modules without the target package are left alone', async ({ onTestFinished }) => {
  const root = await mkdtemp(join(tmpdir(), 'scrollbar-lookalike-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  const cases = [
    { dir: root, file: 'es/vc-table/Table.js', transform: transformTable },
    { dir: join(root, '@rc-component/table'), file: 'es/Table.js', transform: transformReactTable },
  ];
  for (const { dir, file, transform } of cases) {
    const id = join(dir, file);
    assert.equal(transform('export default {};', id), undefined);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'unrelated', version: '1.0.0' }),
    );
    assert.equal(transform('export default {};', id), undefined);
  }
});

test('an unknown version warns once and still requires every replacement to match', async ({
  onTestFinished,
}) => {
  const root = await mkdtemp(join(tmpdir(), 'scrollbar-version-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'es/vc-table'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name: 'ant-design-vue', version: '5.0.0' }),
  );
  const id = join(root, 'es/vc-table/Table.js');
  const code = await readFile('node_modules/antdv40/es/vc-table/Table.js', 'utf8');
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  assert.ok(transformTable(code, id)?.code.includes("overflowY: 'auto'"));
  assert.throws(
    () => transformTable(code.replace('useProvideSticky();', ''), id),
    /5\.0\.0.*useProvideSticky/,
  );
  assert.throws(
    () => transformTable(code + 'useProvideSticky();', id),
    /5\.0\.0.*useProvideSticky/,
  );
  assert.equal(warning.mock.calls.length, 1);
});

test('React skips both divider edits when either anchor is missing or ambiguous', async () => {
  const require = createRequire(import.meta.url);
  const id = createRequire(require.resolve('antd/package.json')).resolve(
    '@rc-component/table/es/Table.js',
  );
  const source = await readFile(id, 'utf8');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const anchors = ["import * as React from 'react';", 'className: `${prefixCls}-header`,'];
  const core = anchors.reduce((code, anchor) => code.replaceAll(anchor, ''), source);
  for (const anchor of anchors) {
    const missing = [core, ...anchors.filter((other) => other !== anchor)].join('\n');
    for (const changed of [missing, [missing, anchor, anchor].join('\n')]) {
      const result = transformReactTable(changed, id);
      assert.ok(result);
      assert.doesNotMatch(result.code, /antd-better-scrollbar-header|styles[/\\]react\.css/);
      assert.match(result.code, /new view\.ResizeObserver/);
      assert.ok(!result.code.includes("overflowY: hasData ? 'scroll' : 'auto'"));
      assert.throws(
        () => transformReactTable(changed.replace('overflowY:', 'overflow:'), id),
        /expected exactly one match/,
      );
    }
  }
  assert.ok(warn.mock.calls.every(([message]) => String(message).includes('is untested')));
});
