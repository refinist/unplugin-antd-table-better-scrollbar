import { computed, createApp, h, ref, watch } from 'vue';
import {
  CheckOutlined,
  CloseOutlined,
  ColumnHeightOutlined,
  GithubOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import Button from 'demo-ui/button';
import Card from 'demo-ui/card';
import Col from 'demo-ui/col';
import InputNumber from 'demo-ui/input-number';
import Form from 'demo-ui/form';
import Radio from 'demo-ui/radio';
import Row from 'demo-ui/row';
import Typography from 'demo-ui/typography';
import Table from 'table-under-test';
import OriginalTable from 'original-table';
import 'table-style';
import './style.css';
import { githubLink } from './github.ts';
import { observeComparison, type ComparisonNotes } from './comparison.ts';

const defaultCount = 10;
const defaultWidth = 8;
const count = ref(defaultCount);
const defaultHeight = 480;
const height = ref(defaultHeight);
const minHeight = 80;
const maxHeight = 1200;
function resize(value: number) {
  height.value = Math.max(minHeight, Math.min(maxHeight, Math.round(value)));
}

function resizeHandle() {
  return h('div', {
    class: 'resize-handle',
    role: 'separator',
    tabindex: 0,
    'aria-label': '调整两张表的表体高度',
    'aria-controls': 'original patched',
    'aria-orientation': 'horizontal',
    'aria-valuenow': height.value,
    'aria-valuemin': minHeight,
    'aria-valuemax': maxHeight,
    'aria-valuetext': height.value + ' 像素',
    onPointerdown(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return;
      const handle = event.currentTarget as HTMLElement;
      const startY = event.clientY;
      const startHeight = height.value;
      handle.setPointerCapture(event.pointerId);
      const move = (e: PointerEvent) => {
        if (e.pointerId === event.pointerId) resize(startHeight + e.clientY - startY);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener(
        'lostpointercapture',
        () => handle.removeEventListener('pointermove', move),
        { once: true },
      );
    },
    onKeydown(event: KeyboardEvent) {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        resize(height.value + (event.key === 'ArrowUp' ? -20 : 20));
      }
    },
  });
}
const custom = ref(false);
const scrollbarWidth = ref<number | null>(defaultWidth);
const expanded = ref<number[]>([]);
const resetKey = ref(0);
function resetAll() {
  count.value = defaultCount;
  height.value = defaultHeight;
  custom.value = false;
  scrollbarWidth.value = defaultWidth;
  expanded.value = [];
  resetKey.value++;
}
const columns = [
  { title: '名称', dataIndex: 'name', width: 400 },
  { title: '序号', dataIndex: 'key', width: 200, fixed: 'right' as const },
];
const rows = computed(() =>
  Array.from({ length: count.value }, (_, key) => ({ key, name: '示例行 ' + (key + 1) })),
);

function group<T extends string | number>(
  label: string,
  value: T,
  options: { label: string; value: T }[],
  update: (value: T) => void,
) {
  return h(Form.Item, { label }, () =>
    h(Radio.Group, {
      'aria-label': label,
      value,
      options,
      optionType: 'button',
      buttonStyle: 'solid',
      'onUpdate:value': update,
    }),
  );
}

function panel(original: boolean) {
  return h(
    Card,
    {
      id: original ? 'original' : 'patched',
      class: original ? 'comparison-original' : 'comparison-patched',
      'aria-describedby': original ? 'original-note' : 'patched-note',
      title: original
        ? '原生表格'
        : h('span', { class: 'plugin-title' }, [
            h(
              'svg',
              {
                viewBox: '0 0 24 24',
                width: 18,
                height: 18,
                'aria-hidden': 'true',
                fill: '#d99a15',
              },
              [
                h('path', {
                  d: 'M14 4 Q15 11 21 13 Q15 14 14 21 Q13 15 7 13 Q13 11 14 4Z M6 1 Q6.5 5 10 6 Q6.5 7 6 11 Q5.5 7 2 6 Q5.5 5 6 1Z M4 15 L5 18 L8 19 L5 20 L4 23 L3 20 L0 19 L3 18Z',
                }),
              ],
            ),
            '启用插件',
          ]),
      size: 'small',
    },
    () =>
      h(
        original ? OriginalTable : Table,
        {
          // 原生表格在挂载时测量滚动条，切换宽度后用新尺寸初始化对照组。
          key:
            original && custom.value
              ? (scrollbarWidth.value ?? defaultWidth)
              : String(custom.value),
          columns,
          dataSource: rows.value,
          pagination: false,
          size: 'small',
          scroll: { x: 600, y: height.value },
          expandedRowKeys: expanded.value,
          onExpandedRowsChange: (keys: (string | number)[]) => {
            expanded.value = keys.map(Number);
          },
        },
        { expandedRowRender: () => h('div', { style: 'height:300px' }, '展开行内容') },
      ),
  );
}
createApp({
  setup() {
    const section = ref<HTMLElement>();
    const comparison = ref<ComparisonNotes | null>(null);
    watch(
      section,
      (el, _, cleanup) => {
        if (el)
          cleanup(
            observeComparison(el, (result) => {
              comparison.value = result;
            }),
          );
      },
      { flush: 'post' },
    );
    return () =>
      h(
        'main',
        {
          class: { 'custom-scroll': custom.value },
          style: {
            '--scrollbar-size': (scrollbarWidth.value ?? defaultWidth) + 'px',
            maxWidth: '1200px',
            margin: 'auto',
            padding: '24px',
          },
        },
        [
          h('header', { class: 'demo-header', style: { marginBottom: '16px' } }, [
            h(
              Typography.Title,
              { level: 2, style: { margin: 0, fontSize: '22px' } },
              () => document.title,
            ),
            h(
              Button,
              { ...githubLink, type: 'text' },
              {
                icon: () => h(GithubOutlined, { style: { fontSize: '22px' } }),
              },
            ),
          ]),
          h(Row, { gutter: [16, 16] }, () => [
            h(Col, { span: 24 }, () =>
              h(Card, { size: 'small' }, () =>
                h(Form, { layout: 'inline' }, () => [
                  group(
                    '数据量',
                    count.value,
                    [0, 2, 10, 100].map((value) => ({ label: value + ' 行', value })),
                    (value) => {
                      count.value = value;
                      expanded.value = [];
                    },
                  ),
                  group(
                    '滚动条样式',
                    custom.value ? 'custom' : 'system',
                    [
                      { label: '系统默认', value: 'system' },
                      { label: '自定义', value: 'custom' },
                    ],
                    (value) => {
                      custom.value = value === 'custom';
                    },
                  ),
                  h(Form.Item, {}, () =>
                    h(InputNumber, {
                      'aria-label': '自定义滚动条宽度',
                      addonAfter: 'px',
                      style: { width: '112px' },
                      disabled: !custom.value,
                      min: 8,
                      max: 100,
                      precision: 0,
                      step: 1,
                      value: scrollbarWidth.value ?? undefined,
                      'onUpdate:value': (value: number | string | null) => {
                        scrollbarWidth.value = typeof value === 'number' ? value : null;
                      },
                      onBlur: () => {
                        scrollbarWidth.value ??= defaultWidth;
                      },
                    }),
                  ),
                  h(Form.Item, {}, () => h(Button, { onClick: resetAll }, () => '重置所有')),
                ]),
              ),
            ),
            h(Col, { span: 24 }, () =>
              h(
                Typography.Text,
                { type: 'secondary' },
                () =>
                  'Windows 浏览器默认使用占宽滚动条时，选「系统默认」即可对比。macOS 上的 Chrome 若使用浮层滚动条，可选「自定义」复现相同的占宽效果。',
              ),
            ),
            h(Col, { span: 24 }, () =>
              h(
                'section',
                {
                  key: resetKey.value,
                  ref: section,
                  'data-fixed-issues': comparison.value ? '' : undefined,
                  class: 'resizable-pair',
                  style: { '--body-height': height.value + 'px' },
                },
                [
                  h(Row, { gutter: 16 }, () =>
                    [true, false].map((original) => {
                      const side = original ? 'original' : 'patched';
                      return h(Col, { span: 12, key: side }, () => [
                        panel(original),
                        h(
                          'div',
                          { class: 'comparison-caption', role: 'status', id: side + '-note' },
                          comparison.value
                            ? [
                                h(
                                  Typography.Text,
                                  { type: original ? 'danger' : 'success' },
                                  () => [
                                    h(original ? CloseOutlined : CheckOutlined, {
                                      'aria-hidden': 'true',
                                    }),
                                    h('span', comparison.value?.[side]),
                                  ],
                                ),
                              ]
                            : [],
                        ),
                      ]);
                    }),
                  ),
                  h(
                    Row,
                    { class: 'resize-toolbar', align: 'middle', justify: 'center', wrap: false },
                    () => [
                      resizeHandle(),
                      h('span', { class: 'resize-label' }, [
                        h(ColumnHeightOutlined, { 'aria-hidden': true }),
                        h('span', '拖动调整高度 · ' + height.value + ' px'),
                      ]),
                      h(Col, { class: 'resize-action' }, () =>
                        h(
                          Button,
                          {
                            size: 'small',
                            type: 'text',
                            title: '恢复默认高度（480px）',
                            'aria-label': '恢复默认高度',
                            onClick: () => resize(defaultHeight),
                          },
                          { icon: () => h(ReloadOutlined) },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ]),
        ],
      );
  },
}).mount('#app');
