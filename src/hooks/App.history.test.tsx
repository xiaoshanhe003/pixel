import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlankCanvas, renderApp } from '../test/appTestUtils';

describe('App history', () => {
  it('undoes and redoes a paint command from the topbar', async () => {
    renderApp();
    await createBlankCanvas();

    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));
    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^撤销$/i }));
    await waitFor(() =>
      expect(screen.queryByLabelText(/像素 0,0 #d65a31/i)).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /^重做$/i }));
    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
  });

  it('supports keyboard undo and redo shortcuts', async () => {
    renderApp();
    await createBlankCanvas();

    await userEvent.click(screen.getByLabelText(/像素 1,1 透明/i));
    expect(screen.getByLabelText(/像素 1,1 #d65a31/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await waitFor(() =>
      expect(screen.queryByLabelText(/像素 1,1 #d65a31/i)).not.toBeInTheDocument(),
    );

    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(screen.getByLabelText(/像素 1,1 #d65a31/i)).toBeInTheDocument();
  });

  it('keeps frame controls hidden from the current workspace', async () => {
    renderApp();

    expect(screen.queryByRole('button', { name: /复制当前帧/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /第 1 帧/i })).not.toBeInTheDocument();
  });
});
