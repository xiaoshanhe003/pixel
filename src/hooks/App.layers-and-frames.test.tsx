import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/appTestUtils';

describe('App layers and frames', () => {
  it('lets the user create and manage layers in pixel mode', async () => {
    renderApp();

    expect(screen.getByRole('heading', { name: /图层/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /图层 1 100%/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /新建图层/i }));

    expect(screen.getByRole('button', { name: /图层 2 100%/i })).toBeInTheDocument();
  });

  it('lets the user delete the active layer in pixel mode', async () => {
    renderApp();

    await userEvent.click(screen.getByRole('button', { name: /新建图层/i }));
    expect(screen.getAllByRole('button', { name: /图层 [12] 100%/i })).toHaveLength(2);

    fireEvent.contextMenu(screen.getByRole('button', { name: /图层 2 100%/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /删除图层/i }));

    expect(screen.getAllByRole('button', { name: /图层 1 100%|图层 2 100%/i })).toHaveLength(1);
  });

  it('lets the user merge the active layer down in pixel mode', async () => {
    renderApp();

    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));
    await userEvent.click(screen.getByRole('button', { name: /新建图层/i }));
    await userEvent.click(screen.getByRole('button', { name: /线条/i }));

    const start = screen.getByLabelText(/像素 1,0 透明/i);
    const end = screen.getByLabelText(/像素 1,0 透明/i);
    fireEvent.pointerDown(start, { pointerId: 11 });
    fireEvent.pointerEnter(end, { pointerId: 11 });
    fireEvent.pointerUp(end, { pointerId: 11 });

    expect(screen.getAllByRole('button', { name: /图层 [12] 100%/i })).toHaveLength(2);

    fireEvent.contextMenu(screen.getByRole('button', { name: /图层 2 100%/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /合并到下层/i }));

    expect(screen.getAllByRole('button', { name: /图层 1 100%|图层 2 100%/i })).toHaveLength(1);
    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 1,0 #d65a31/i)).toBeInTheDocument();
  });

  it('lets the user hide a layer and change its opacity', async () => {
    renderApp();

    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));
    await userEvent.click(screen.getByRole('button', { name: /新建图层/i }));
    await userEvent.click(screen.getByLabelText(/像素 1,0 透明/i));

    await userEvent.click(screen.getByRole('checkbox', { name: /显示 图层 2/i }));
    expect(screen.getByLabelText(/像素 1,0 透明/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /显示 图层 2/i }));

    await userEvent.click(
      screen.getAllByRole('button', { name: /^100%$/i })[0],
    );
    const opacity = screen.getByRole('slider', { name: /^图层 2 不透明度$/i });
    fireEvent.change(opacity, { target: { value: '50' } });

    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
  });

  it('lets the user rename a layer', async () => {
    renderApp();

    await userEvent.dblClick(screen.getByText('图层 1'));
    const input = screen.getAllByRole('textbox', { name: /图层 1 名称/i })[0];

    await userEvent.clear(input);
    await userEvent.type(input, '角色线稿');
    fireEvent.blur(input);

    expect(screen.getByText('角色线稿')).toBeInTheDocument();
  });

  it('adds a duplicate frame in pixel mode', async () => {
    renderApp();

    await userEvent.click(screen.getByRole('button', { name: /复制当前帧/i }));

    expect(screen.getAllByRole('button', { name: /第 .* 帧/i }).length).toBeGreaterThan(1);
  });

  it('plays back frames in sequence when preview is enabled', async () => {
    vi.useFakeTimers();

    try {
      renderApp();

      fireEvent.click(screen.getByRole('button', { name: /复制当前帧/i }));
      expect(screen.getAllByRole('button', { name: /第 .* 帧/i })).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: /播放预览/i }));
      expect(screen.getByRole('button', { name: /暂停预览/i })).toBeInTheDocument();

      const firstFrame = screen.getByRole('button', { name: /第 1 帧/i });
      const secondFrame = screen.getByRole('button', { name: /第 2 帧/i });

      expect(firstFrame.className).not.toContain('is-active');
      expect(secondFrame.className).toContain('is-active');

      act(() => {
        vi.advanceTimersByTime(170);
      });

      expect(screen.getByRole('button', { name: /第 1 帧/i }).className).toContain(
        'is-active',
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
