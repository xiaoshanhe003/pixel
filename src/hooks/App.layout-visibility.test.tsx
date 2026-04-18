import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/appTestUtils';

describe('App layout visibility', () => {
  it('keeps the lightweight workspace focused on canvas, palette, and export flows', () => {
    renderApp();

    expect(screen.queryByRole('heading', { name: /图层/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /逐帧动画/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /检查器/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /素材/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /项目设置/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /打开右侧面板/i })).toBeInTheDocument();
  });
});
