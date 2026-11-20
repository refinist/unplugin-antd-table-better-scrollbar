import { dirname, resolve } from 'node:path';
import { dividerEdits } from './divider.ts';
import { applyEdits, observeCall, packageVersion } from './plugin.ts';

const warnedVersions = new Set<string>();
const originalWatch = `onMounted(() => {
		if (needScrollbarSize.value) measureScrollbarSize();
	});
	watch(needScrollbarSize, (need) => {
		if (need && mounted.value) measureScrollbarSize();
	}, { flush: "post" });`;

export function transformNextTable(code: string, id: string) {
  const version = packageVersion(resolve(dirname(id), '../package.json'), '@v-c/table');
  if (!version) return;
  const label = `@v-c/table ${version}`;
  if (version !== '1.3.8' && !warnedVersions.has(version)) {
    warnedVersions.add(version);
    console.warn(
      `[unplugin-antd-table-better-scrollbar] ${label} is untested (tested: 1.3.8). Attempting the Antdv Next patch.`,
    );
  }

  return applyEdits(
    code,
    id,
    [
      ...dividerEdits(
        code,
        'import { getTargetScrollBarSize } from "@v-c/util/dist/getScrollBarSize";',
        '"className": `${mergedPrefixCls.value}-header`,',
        '"className": `${mergedPrefixCls.value}-header${fixHeader.value && typeof customizeScrollBody.value !== "function" ? " antd-better-scrollbar-header" : ""}`,',
      ),
      [
        'overflowY: hasData.value ? "scroll" : "auto"',
        'overflowY: typeof customizeScrollBody.value === "function" && hasData.value ? "scroll" : "auto"',
      ],
      [
        originalWatch,
        `watch([mounted, needScrollbarSize, fixHeader, scrollBodyRef, customizeScrollBody, () => props.tailor, useInternalHooks],
      ([ready, need, fixed, body, custom, tailor, internal], _, cleanup) => {
        if (!ready || !need || (tailor && internal)) return;
        if (fixed && typeof custom !== "function" && body?.ownerDocument?.defaultView?.ResizeObserver) {
          const setScrollbarSize = width => { scrollbarSize.value = width; };
          cleanup(${observeCall});
        } else {
          measureScrollbarSize();
        }
      }, { flush: "post" });`,
      ],
    ],
    label,
  );
}
