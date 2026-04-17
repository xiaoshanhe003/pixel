import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlankCanvas, renderApp, uploadMockImage } from '../test/appTestUtils';

describe('App canvas editing', () => {
  it('creates a blank canvas and allows painting on it', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
    expect(screen.getAllByText(/#d65a31/i).length).toBeGreaterThan(0);
  });

  it('uses brush size controls to paint a larger footprint', async () => {
    renderApp();
    await createBlankCanvas();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /画笔尺寸/i }),
      '2',
    );
    await userEvent.click(screen.getByLabelText(/像素 5,5 透明/i));

    expect(screen.getByLabelText(/像素 5,5 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 6,5 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 5,6 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 6,6 #d65a31/i)).toBeInTheDocument();
  });

  it('fills a contiguous area on the blank canvas', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByRole('button', { name: /填充桶/i }));
    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 15,15 #d65a31/i)).toBeInTheDocument();
  });

  it('draws a line on the blank canvas', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByRole('button', { name: /线条/i }));

    const first = screen.getByLabelText(/像素 0,0 透明/i);
    const last = screen.getByLabelText(/像素 2,2 透明/i);

    fireEvent.pointerDown(first, { pointerId: 6 });
    fireEvent.pointerEnter(last, { pointerId: 6 });
    fireEvent.pointerUp(last, { pointerId: 6 });

    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 1,1 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 2,2 #d65a31/i)).toBeInTheDocument();
  });

  it('draws a rectangle outline on the blank canvas', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByRole('button', { name: /矩形/i }));

    const first = screen.getByLabelText(/像素 1,1 透明/i);
    const last = screen.getByLabelText(/像素 3,3 透明/i);

    fireEvent.pointerDown(first, { pointerId: 7 });
    fireEvent.pointerEnter(last, { pointerId: 7 });

    expect(screen.getByLabelText(/预览矩形 1,1 到 3,3/i)).toBeInTheDocument();

    fireEvent.pointerUp(last, { pointerId: 7 });

    expect(screen.getByLabelText(/像素 1,1 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 2,1 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 3,1 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 2,2 透明/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 3,3 #d65a31/i)).toBeInTheDocument();
  });

  it('allows direct painting after uploading an image from the left dock', async () => {
    renderApp();
    await uploadMockImage();
    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
  });

  it('moves and scales a marquee selection on the blank canvas', async () => {
    renderApp();
    await createBlankCanvas();

    await userEvent.click(screen.getByLabelText(/像素 1,1 透明/i));
    await userEvent.click(screen.getByRole('button', { name: /^选择$/i }));

    fireEvent.pointerDown(screen.getByLabelText(/像素 1,1 #d65a31/i), { pointerId: 20 });
    fireEvent.pointerUp(screen.getByLabelText(/像素 1,1 #d65a31/i), { pointerId: 20 });

    fireEvent.pointerDown(screen.getByRole('button', { name: /移动选区/i }), {
      pointerId: 21,
      clientX: 0,
      clientY: 0,
    });
    const moveTarget = screen.getByLabelText(/像素 2,2 透明/i);
    fireEvent.pointerMove(moveTarget, { pointerId: 21 });
    fireEvent.pointerUp(moveTarget, { pointerId: 21 });

    expect(screen.getByLabelText(/像素 2,2 #d65a31/i)).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: /缩放选区/i }), {
      pointerId: 22,
      clientX: 0,
      clientY: 0,
    });
    const scaleTarget = screen.getByLabelText(/像素 4,3 透明/i);
    fireEvent.pointerMove(scaleTarget, { pointerId: 22 });
    fireEvent.pointerUp(scaleTarget, { pointerId: 22 });

    expect(screen.getByLabelText(/像素 4,3 #d65a31/i)).toBeInTheDocument();
  });
});
