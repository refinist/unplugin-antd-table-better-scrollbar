import * as React from 'react';
import { useEffect, useRef, useState, type CSSProperties, type Key } from 'react';
import {
  CheckOutlined,
  CloseOutlined,
  ColumnHeightOutlined,
  GithubOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { createRoot } from 'react-dom/client';
import { Button, Card, Col, Flex, InputNumber, Radio, Row, Table, Typography } from 'antd';
import OriginalTable from 'original-react-table';
import 'antd/dist/reset.css';
import '../style.css';
import { githubLink } from '../github.ts';
import { observeComparison, type ComparisonNotes } from '../comparison.ts';

const columns = [
  { title: '名称', dataIndex: 'name', width: 400 },
  { title: '序号', dataIndex: 'key', width: 200, fixed: 'end' as const },
];
const options = [0, 2, 10, 100].map((value) => ({ value, label: value + ' 行' }));
const data = Array.from({ length: 100 }, (_, key) => ({ key, name: '示例行 ' + (key + 1) }));
const initialHeight = 480;

function App() {
  const [count, setCount] = useState(10);
  const [height, setHeight] = useState(initialHeight);
  const [custom, setCustom] = useState(false);
  const [width, setWidth] = useState<number | null>(8);
  const [expanded, setExpanded] = useState<readonly Key[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const section = useRef<HTMLElement>(null);
  const [comparison, setComparison] = useState<ComparisonNotes | null>(null);
  useEffect(() => {
    if (section.current) return observeComparison(section.current, setComparison);
  }, [resetKey]);
  const effectiveWidth = width ?? 8;
  function resize(h: number) {
    setHeight(Math.round(Math.min(1200, Math.max(80, h))));
  }
  function reset() {
    setResetKey((key) => key + 1);
    setCount(10);
    setHeight(initialHeight);
    setExpanded([]);
    setCustom(false);
    setWidth(8);
  }
  function panel(patched: boolean) {
    const Component = patched ? Table : OriginalTable;
    const side = patched ? 'patched' : 'original';
    return (
      <Col span={12}>
        <div id={side}>
          <Card
            className={patched ? 'comparison-patched' : 'comparison-original'}
            size='small'
            aria-describedby={side + '-note'}
            title={
              patched ? (
                <span className='plugin-title'>
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='#d99a15' aria-hidden='true'>
                    <path d='M14 4 Q15 11 21 13 Q15 14 14 21 Q13 15 7 13 Q13 11 14 4Z M6 1 Q6.5 5 10 6 Q6.5 7 6 11 Q5.5 7 2 6 Q5.5 5 6 1Z' />
                  </svg>
                  启用插件
                </span>
              ) : (
                '原生表格'
              )
            }
          >
            <Component
              key={patched ? 'patched' : custom ? effectiveWidth : 'system'}
              columns={columns}
              dataSource={data.slice(0, count)}
              pagination={false}
              size='small'
              scroll={{ x: 600, y: height }}
              expandable={{
                expandedRowRender: () => <div style={{ height: 300 }}>展开行内容</div>,
                expandedRowKeys: expanded,
                onExpandedRowsChange: setExpanded,
              }}
            />
          </Card>
        </div>
        <div className='comparison-caption' id={side + '-note'} role='status'>
          {comparison && (
            <Typography.Text type={patched ? 'success' : 'danger'}>
              {patched ? (
                <CheckOutlined aria-hidden='true' />
              ) : (
                <CloseOutlined aria-hidden='true' />
              )}
              <span>{comparison[side]}</span>
            </Typography.Text>
          )}
        </div>
      </Col>
    );
  }
  return (
    <main
      className={custom ? 'custom-scroll' : undefined}
      style={
        {
          maxWidth: 1200,
          margin: 'auto',
          padding: 24,
          '--body-height': height + 'px',
          '--scrollbar-size': effectiveWidth + 'px',
        } as CSSProperties
      }
    >
      <Flex vertical gap={16}>
        <header className='demo-header'>
          <Typography.Title level={2} style={{ margin: 0, fontSize: 22 }}>
            {document.title}
          </Typography.Title>
          <Button {...githubLink} type='text' icon={<GithubOutlined style={{ fontSize: 22 }} />} />
        </header>
        <Card size='small'>
          <Flex gap={12} wrap align='center'>
            <span>数据量</span>
            <Radio.Group
              aria-label='数据量'
              options={options}
              value={count}
              optionType='button'
              buttonStyle='solid'
              onChange={(e) => {
                setCount(Number(e.target.value));
                setExpanded([]);
              }}
            />
            <span>滚动条样式</span>
            <Radio.Group
              aria-label='滚动条样式'
              value={custom ? 'custom' : 'system'}
              optionType='button'
              buttonStyle='solid'
              options={[
                { label: '系统默认', value: 'system' },
                { label: '自定义', value: 'custom' },
              ]}
              onChange={(e) => {
                const enabled = e.target.value === 'custom';
                setCustom(enabled);
              }}
            />
            <InputNumber
              aria-label='自定义滚动条宽度'
              suffix='px'
              disabled={!custom}
              min={8}
              max={100}
              precision={0}
              value={width}
              onChange={setWidth}
              onBlur={() => setWidth((v) => v ?? 8)}
            />
            <Button onClick={reset}>重置所有</Button>
          </Flex>
        </Card>
        <Typography.Text type='secondary'>
          Windows 浏览器默认使用占宽滚动条时，选「系统默认」即可对比。macOS 上的 Chrome
          若使用浮层滚动条，可选「自定义」复现相同的占宽效果。
        </Typography.Text>
        <section
          className='resizable-pair'
          key={resetKey}
          ref={section}
          data-fixed-issues={comparison ? '' : undefined}
        >
          <Row gutter={16}>
            {panel(false)}
            {panel(true)}
          </Row>
          <Flex className='resize-toolbar' justify='center' align='center'>
            <div
              className='resize-handle'
              role='separator'
              tabIndex={0}
              aria-orientation='horizontal'
              aria-label='调整两张表的表体高度'
              aria-controls='original patched'
              aria-valuenow={height}
              aria-valuemin={80}
              aria-valuemax={1200}
              onPointerDown={(e) => {
                if (!e.isPrimary || e.button !== 0) return;
                drag.current = { y: e.clientY, height };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current && e.currentTarget.hasPointerCapture(e.pointerId))
                  resize(drag.current.height + e.clientY - drag.current.y);
              }}
              onLostPointerCapture={() => {
                drag.current = null;
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  resize(height + (e.key === 'ArrowUp' ? -20 : 20));
                }
              }}
            />
            <span className='resize-label'>
              <ColumnHeightOutlined aria-hidden='true' /> 拖动调整高度 · {height} px
            </span>
            <Button
              className='resize-action'
              size='small'
              type='text'
              aria-label='恢复默认高度'
              title='恢复默认高度'
              onClick={() => resize(initialHeight)}
              icon={<ReloadOutlined />}
            />
          </Flex>
        </section>
      </Flex>
    </main>
  );
}
createRoot(
  document.getElementById('app') ?? document.body.appendChild(document.createElement('div')),
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
