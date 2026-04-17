import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/appTestUtils';

describe('App layout visibility', () => {
  it('hides layers, inspector, and frame modules from the current workspace', () => {
    renderApp();

    expect(screen.queryByRole('heading', { name: /图层/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /逐帧动画/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /检查器/i })).not.toBeInTheDocument();
  });
});
