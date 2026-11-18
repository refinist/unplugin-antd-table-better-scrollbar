// The demo has a fixed last column and, on empty tables, a full-width placeholder.
function measureLayout(root: Element | null) {
  const body = root?.querySelector<HTMLElement>('.ant-table-body');
  const header = root?.querySelector('.ant-table-header');
  if (!body?.clientWidth || !body.clientHeight || !header?.clientWidth) return null;

  const style = getComputedStyle(body);
  const borders = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
  const gutter = Math.max(0, Math.round(body.offsetWidth - body.clientWidth - borders));
  const headerGutter =
    header.querySelector<HTMLElement>('.ant-table-cell-scrollbar')?.offsetWidth ?? 0;
  const row = body.querySelector('tr.ant-table-row');
  const fixed =
    ':is(.ant-table-cell-fix-right,.ant-table-cell-fix-end):not(.ant-table-cell-scrollbar)';
  const th = header.querySelector('th' + fixed);
  const td = row?.querySelector('td' + fixed);
  if (row && (!th || !td)) return null;
  const edgeOffset =
    td && th ? Math.abs(th.getBoundingClientRect().right - td.getBoundingClientRect().right) : 0;
  const empty = body.querySelector<HTMLElement>(
    '.ant-table-placeholder .ant-table-expanded-row-fixed',
  );
  if (!row && !empty) return null;
  return {
    gutter,
    headerGutter,
    edgeOffset,
    fits: body.scrollHeight <= body.clientHeight,
    bodyWidth: body.clientWidth,
    emptyWidth: empty?.offsetWidth,
  };
}

export interface ComparisonNotes {
  original: string;
  patched: string;
}

type Layout = NonNullable<ReturnType<typeof measureLayout>>;

function diagnostics(layout: Layout) {
  const { gutter, headerGutter, edgeOffset, fits, emptyWidth, bodyWidth } = layout;
  return [
    {
      issue: fits && gutter > 0,
      text:
        fits && gutter > 0 ? `内容未溢出，右侧仍占用 ${gutter} px` : `滚动条实际占位 ${gutter} px`,
    },
    {
      issue: Math.abs(headerGutter - gutter) >= 1,
      text: `表头预留 ${headerGutter} px，滚动条实际占用 ${gutter} px`,
    },
    {
      issue: edgeOffset >= 1,
      text: `末列表头与表体的边界相差 ${Number(edgeOffset.toFixed(1))} px`,
    },
    {
      issue: emptyWidth !== undefined && Math.abs(emptyWidth - bodyWidth) > 1,
      text:
        emptyWidth === undefined ? '' : `空状态宽 ${emptyWidth} px，表体可用宽度 ${bodyWidth} px`,
    },
  ];
}

function compare(section: HTMLElement): ComparisonNotes | null {
  const original = measureLayout(section.querySelector('#original'));
  const patched = measureLayout(section.querySelector('#patched'));
  if (
    !original ||
    !patched ||
    (original.emptyWidth === undefined) !== (patched.emptyWidth === undefined)
  )
    return null;

  const right = diagnostics(patched);
  if (right.some((check) => check.issue)) return null;
  const left = diagnostics(original);
  const originalNotes: string[] = [];
  const patchedNotes: string[] = [];
  left.forEach((check, i) => {
    if (check.issue) {
      originalNotes.push(check.text);
      patchedNotes.push(right[i].text);
    }
  });
  return originalNotes.length
    ? { original: originalNotes.join('。') + '。', patched: patchedNotes.join('。') + '。' }
    : null;
}

export function observeComparison(
  section: HTMLElement,
  report: (result: ComparisonNotes | null) => void,
) {
  let previous: ComparisonNotes | null | undefined;
  let timer: number;
  const watched = new Set<Element>();
  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(measure, 80);
  }
  const resize = new ResizeObserver(schedule);
  function measure() {
    // Width changes can remount the original table. Follow the current nodes on both sides.
    const current = new Set(
      section.querySelectorAll('.ant-table-body, .ant-table-body > table, .ant-table-header'),
    );
    for (const el of watched) {
      if (!current.has(el)) {
        resize.unobserve(el);
        watched.delete(el);
      }
    }
    for (const el of current) {
      if (!watched.has(el)) {
        resize.observe(el);
        watched.add(el);
      }
    }
    const next = compare(section);
    if (
      previous === undefined ||
      previous?.original !== next?.original ||
      previous?.patched !== next?.patched
    ) {
      previous = next;
      report(next);
    }
  }
  const mutations = new MutationObserver(schedule);
  mutations.observe(section, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });
  schedule();
  return () => {
    mutations.disconnect();
    resize.disconnect();
    window.clearTimeout(timer);
  };
}
