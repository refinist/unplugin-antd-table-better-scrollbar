import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyEdits, observeCall, packageVersion, tablePlugin } from '../plugin.ts';

const target = /[\\/]@rc-component[\\/]table[\\/]es[\\/]Table\.js$/;
const warned = new Set<string>();

const originalEffect = `useLayoutEffect(() => {
    if (!tailor || !useInternalHooks) {
      if (scrollBodyRef.current instanceof Element) {
        setScrollbarSize(getTargetScrollBarSize(scrollBodyRef.current).width);
      } else {
        setScrollbarSize(getTargetScrollBarSize(scrollBodyContainerRef.current).width);
      }
    }
  }, []);`;

const headerStyle = import.meta.resolve('unplugin-antd-table-better-scrollbar/react/header.css');

export function transformReactTable(code: string, id: string) {
  if (!target.test(id)) return;
  const version = packageVersion(resolve(dirname(id), '../package.json'), '@rc-component/table');
  if (!version) return;
  const label = `@rc-component/table ${version}`;
  if (version !== '1.12.0' && !warned.has(label)) {
    warned.add(label);
    console.warn(
      `[unplugin-antd-table-better-scrollbar] ${label} is untested (tested: 1.12.0). Attempting the React patch.`,
    );
  }

  // The stylesheet and its scope marker are a single optional change.
  const reactImport = "import * as React from 'react';";
  const headerClass = 'className: `${prefixCls}-header`,';
  const canScopeDivider = [reactImport, headerClass].every((anchor) => {
    const index = code.indexOf(anchor);
    return index >= 0 && index === code.lastIndexOf(anchor);
  });
  const dividerEdits = canScopeDivider
    ? [
        [reactImport, `import ${JSON.stringify(fileURLToPath(headerStyle))};\n${reactImport}`],
        [
          headerClass,
          'className: `${prefixCls}-header${fixHeader && typeof customizeScrollBody !== "function" ? " antd-better-scrollbar-header" : ""}`,',
        ],
      ]
    : [];

  return applyEdits(
    code,
    id,
    [
      ...dividerEdits,
      [
        "overflowY: hasData ? 'scroll' : 'auto'",
        "overflowY: typeof customizeScrollBody === 'function' && hasData ? 'scroll' : 'auto'",
      ],
      [
        originalEffect,
        `useLayoutEffect(() => {
      if (tailor && useInternalHooks) return;
      const body = scrollBodyRef.current;
      if (fixHeader && typeof customizeScrollBody !== 'function' && body?.ownerDocument?.defaultView?.ResizeObserver) {
        return ${observeCall};
      }
      setScrollbarSize(getTargetScrollBarSize(body instanceof Element ? body : scrollBodyContainerRef.current).width);
    }, [fixHeader, customizeScrollBody, tailor, useInternalHooks]);`,
      ],
    ],
    label,
  );
}

export default tablePlugin(
  'unplugin-antd-table-better-scrollbar/react',
  target,
  transformReactTable,
);
