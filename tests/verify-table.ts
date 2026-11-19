import assert from 'node:assert/strict';
import type { Browser } from '@playwright/test';

export async function verifyTable(browser: Browser, url: string, framework: 'vue' | 'react') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  try {
    const verifyComparison = (highlight: boolean) =>
      page.waitForFunction(
        (expected) => {
          const left = document.querySelector('.comparison-original');
          const right = document.querySelector('.comparison-patched');
          return (
            left &&
            right &&
            Boolean(document.querySelector('#original-note')?.textContent) === expected &&
            Boolean(document.querySelector('#patched-note')?.textContent) === expected &&
            (getComputedStyle(left).borderTopColor === 'rgb(255, 77, 79)') === expected &&
            (getComputedStyle(right).borderTopColor === 'rgb(82, 196, 26)') === expected
          );
        },
        highlight,
        { timeout: 5000 },
      );
    await page.goto(url);
    assert.ok(await page.getByRole('radio', { name: '系统默认', exact: true }).isChecked());
    const widthInput = page.getByRole('spinbutton');
    assert.ok(await widthInput.isDisabled());
    await page.getByText('自定义', { exact: true }).click();
    await page.getByText('100 行', { exact: true }).click();
    await widthInput.fill('16');
    await widthInput.press('Enter');
    await page.waitForFunction(
      () => {
        const bodies = [...document.querySelectorAll<HTMLElement>('.ant-table-body')];
        const headers = [
          ...document.querySelectorAll<HTMLElement>('.ant-table-header .ant-table-cell-scrollbar'),
        ];
        return (
          bodies.length === 2 &&
          bodies.every((el) => el.offsetWidth - el.clientWidth === 16) &&
          headers.length === 2 &&
          headers.every((el) => el.offsetWidth === 16)
        );
      },
      undefined,
      { timeout: 5000 },
    );
    if (framework === 'react') {
      const dividers = await page.evaluate(() =>
        ['#original', '#patched'].map((root) => {
          const gutter = document.querySelector(
            root + ' .ant-table-header .ant-table-cell-scrollbar',
          )!;
          return [
            gutter.previousElementSibling!.previousElementSibling!,
            gutter.previousElementSibling!,
          ].map((cell) => {
            const line = getComputedStyle(cell, '::before');
            return line.content !== 'none' && line.display !== 'none';
          });
        }),
      );
      assert.equal(dividers[1][0], dividers[0][0], 'preserve the normal column divider');
      assert.equal(dividers[1][1], false, 'no extra divider next to the scrollbar');
    }
    await page.getByText('系统默认', { exact: true }).click();
    await page.getByText('自定义', { exact: true }).click();
    assert.equal(await widthInput.inputValue(), '16');
    await widthInput.fill('8');
    await widthInput.press('Enter');
    for (const count of [0, 2, 10, 100, 0]) {
      await page.getByText(count + ' 行', { exact: true }).click();
      await page.waitForFunction(
        (n) => {
          const body = document.querySelector<HTMLElement>('#patched .ant-table-body');
          if (!body || document.querySelectorAll('#patched tr.ant-table-row').length !== n)
            return false;
          const gutter = body.offsetWidth - body.clientWidth;
          const header = document.querySelector<HTMLElement>(
            '#patched .ant-table-header .ant-table-cell-scrollbar',
          );
          return (
            getComputedStyle(body).overflowY === 'auto' &&
            body.scrollHeight > body.clientHeight === (n === 100) &&
            Math.abs((header?.getBoundingClientRect().width || 0) - gutter) < 1
          );
        },
        count,
        { timeout: 10000 },
      );
      const baseline = page.locator('#original .ant-table-body');
      const nativeScroll = count > 0 || framework === 'vue';
      assert.equal(
        await baseline.evaluate((el) => getComputedStyle(el).overflowY),
        nativeScroll ? 'scroll' : 'auto',
      );
      assert.equal(await baseline.locator('tr.ant-table-row').count(), count);
      assert.equal(
        await baseline.evaluate((el: HTMLElement) => el.offsetWidth - el.clientWidth),
        nativeScroll ? 8 : 0,
      );
      await verifyComparison(nativeScroll && count < 100);
      if (count === 0) {
        await page.waitForFunction(() => {
          const empty = document.querySelector<HTMLElement>(
            '#patched .ant-table-placeholder .ant-table-expanded-row-fixed',
          );
          return (
            empty &&
            Math.abs(
              empty.offsetWidth -
                document.querySelector<HTMLElement>('#patched .ant-table-body')!.clientWidth,
            ) <= 1
          );
        });
      }
      if (count === 10) {
        const body = page.locator('#patched .ant-table-body');
        const gutter = () => body.evaluate((el: HTMLElement) => el.offsetWidth - el.clientWidth);
        const verify = async (expected: number) => {
          await page.waitForFunction((width) => {
            const th = document.querySelector<HTMLElement>(
              '#patched .ant-table-header .ant-table-cell-scrollbar',
            );
            return (th?.offsetWidth || 0) === width;
          }, expected);
          assert.equal(await gutter(), expected);
          await verifyComparison(expected === 0);
        };
        const expand = page.locator('#patched .ant-table-row-expand-icon').first();
        await expand.click();
        await verify(8);
        await expand.click();
        await verify(0);
        const handle = page.getByRole('separator', { name: '调整两张表的表体高度' });
        const box = await handle.boundingBox();
        assert.ok(box);
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x, y - 240, { steps: 6 });
        await verify(8);
        assert.equal(await baseline.locator('tr.ant-table-row').count(), 10);
        await page.mouse.move(x, y, { steps: 6 });
        await page.mouse.up();
        await verify(0);
        await handle.focus();
        await page.keyboard.press('ArrowUp');
        assert.equal(await handle.getAttribute('aria-valuenow'), '460');
        await page.getByRole('button', { name: '恢复默认高度' }).click();
        assert.equal(await handle.getAttribute('aria-valuenow'), '480');
      }
      if (count === 100) {
        const width = await page
          .locator('#patched .ant-table-body')
          .evaluate((el: HTMLElement) => el.offsetWidth - el.clientWidth);
        assert.equal(width, 8, 'test requires a space-consuming scrollbar');
      }
      if (count) {
        const difference = await page.evaluate(
          (fixedClass) => {
            const right = (s: string) => document.querySelector(s)!.getBoundingClientRect().right;
            return (
              right('#patched thead th.' + fixedClass) - right('#patched tbody td.' + fixedClass)
            );
          },
          framework === 'vue' ? 'ant-table-cell-fix-right' : 'ant-table-cell-fix-end',
        );
        assert.ok(Math.abs(difference) < 1, 'fixed column offset: ' + difference);
      }
    }
  } finally {
    await page.close();
  }
}
