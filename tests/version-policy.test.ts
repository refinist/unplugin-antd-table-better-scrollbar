import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { transformReactTable } from '../src/react/index.ts';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, vi } from 'vite-plus/test';
import { transformTable } from '../src/index.ts';

const require = createRequire(import.meta.url);
const reactTableId = createRequire(require.resolve('antd/package.json')).resolve(
  '@rc-component/table/es/Table.js',
);

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

test('the supported Vue versions patch without a warning', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  for (const pkg of ['antdv3', 'antdv40', 'antdv4']) {
    const id = require.resolve(pkg + '/es/vc-table/Table.js');
    const result = transformTable(await readFile(id, 'utf8'), id);
    assert.ok(result);
    assert.match(result.code, /overflowY: 'auto'/);
    assert.match(result.code, /new view\.ResizeObserver/);
  }
  assert.equal(warning.mock.calls.length, 0);
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
  const id = reactTableId;
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

test('React patches an unknown version and warns once per version', async ({ onTestFinished }) => {
  const root = await mkdtemp(join(tmpdir(), 'scrollbar-react-version-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  const dir = join(root, '@rc-component/table');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ name: '@rc-component/table', version: '2.0.0' }),
  );
  const id = join(dir, 'es/Table.js');
  const source = await readFile(reactTableId, 'utf8');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  for (let i = 0; i < 2; i++) {
    const result = transformReactTable(source, id);
    assert.ok(result);
    assert.match(result.code, /antd-better-scrollbar-header/);
    assert.ok(result.code.includes(JSON.stringify(join(process.cwd(), 'styles/react.css'))));
    assert.match(result.code, /new view\.ResizeObserver/);
  }
  assert.equal(warn.mock.calls.length, 1);
  assert.match(String(warn.mock.calls[0][0]), /@rc-component\/table 2\.0\.0 is untested/);
});

test('both transforms ignore unrelated module paths', () => {
  assert.equal(transformTable('', 'src/Table.js'), undefined);
  assert.equal(transformReactTable('', 'src/Table.js'), undefined);
});
