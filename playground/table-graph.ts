import type { Metafile } from 'esbuild';

// These modules must stay with the table engine so the bundler can apply the
// plugin to one table while the control keeps using the upstream engine.
export function tableImporters(inputs: Metafile['inputs'], entry: string) {
  const engine = Object.keys(inputs).find((id) =>
    /\/(?:vc-table|@v-c\/table\/dist|@rc-component\/table\/es)\/Table\.js$/.test(id),
  );
  if (!engine) throw new Error(`Missing table engine for ${entry}`);

  const parents = new Map<string, string[]>();
  for (const [id, input] of Object.entries(inputs)) {
    for (const dep of input.imports) {
      if (dep.external) continue;
      const list = parents.get(dep.path) ?? [];
      list.push(id);
      parents.set(dep.path, list);
    }
  }
  const included = new Set([engine]);
  for (const id of included) {
    for (const parent of parents.get(id) ?? []) included.add(parent);
  }
  if (!included.has(entry)) throw new Error(`Cannot trace ${entry} to its table engine`);
  return included;
}
