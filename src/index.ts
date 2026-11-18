import { resolve, dirname } from 'node:path';
import { applyEdits, observeCall, packageVersion, tablePlugin } from './plugin.ts';

const target = /[\\/]es[\\/]vc-table[\\/]Table\.js$/;
const warnedVersions = new Set<string>();

export function transformTable(code: string, id: string) {
  if (!target.test(id)) return;
  const version = packageVersion(resolve(dirname(id), '../../package.json'), 'ant-design-vue');
  if (!version) return;
  const supported = version === '3.2.20' || /^4\.\d+\.\d+(?:\+[\w.-]+)?$/.test(version);
  if (!supported && !warnedVersions.has(version)) {
    warnedVersions.add(version);
    console.warn(
      `[unplugin-antd-table-better-scrollbar] ant-design-vue ${version} is outside the target range (3.2.20 or stable 4.x). Attempting the patch.`,
    );
  }

  const originalMeasure = 'setScrollbarSize(getTargetScrollBarSize(scrollBodyRef.value).width);';
  const changes = [
    ["overflowY: 'scroll'", "overflowY: 'auto'"],
    [
      originalMeasure,
      'if (!fixHeader.value || !scrollBodyRef.value?.ownerDocument) ' + originalMeasure,
    ],
    [
      'useProvideSticky();',
      `useProvideSticky();
    watch([scrollBodyRef, fixHeader], ([body, fixedHeader], _, cleanup) => {
      if (fixedHeader && body?.ownerDocument?.defaultView?.ResizeObserver) {
        cleanup(${observeCall});
      } else if (body) {
        setScrollbarSize(getTargetScrollBarSize(body).width);
      }
    }, { immediate: true, flush: 'post' });`,
    ],
  ];
  return applyEdits(code, id, changes, `ant-design-vue ${version}`);
}

export default tablePlugin('unplugin-antd-table-better-scrollbar', target, transformTable);
