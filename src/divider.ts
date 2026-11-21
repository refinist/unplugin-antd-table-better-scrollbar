import { fileURLToPath } from 'node:url';

const headerStyle = import.meta.resolve('unplugin-antd-table-better-scrollbar/header.css');

export function dividerEdits(
  code: string,
  importAnchor: string,
  headerClass: string,
  scopedHeader: string,
) {
  // The stylesheet and its scope marker are a single optional change.
  const canScopeDivider = [importAnchor, headerClass].every((anchor) => {
    const index = code.indexOf(anchor);
    return index >= 0 && index === code.lastIndexOf(anchor);
  });
  return canScopeDivider
    ? [
        [importAnchor, `import ${JSON.stringify(fileURLToPath(headerStyle))};\n${importAnchor}`],
        [headerClass, scopedHeader],
      ]
    : [];
}
