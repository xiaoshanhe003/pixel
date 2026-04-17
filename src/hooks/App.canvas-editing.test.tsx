import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlankCanvas, renderApp } from '../test/appTestUtils';

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
});
