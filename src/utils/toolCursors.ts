import type { EditorTool } from '../types/studio';
import { TOOL_ICON_SVGS } from './toolIcons';

function extractViewBox(svg: string): string {
  return svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 24 24';
}

function withCurrentColor(svg: string, color: string): string {
  return svg.replaceAll('currentColor', color);
}

function createCursor(svg: string, hotspotX: number, hotspotY: number): string {
  const viewBox = extractViewBox(svg);
  const halo = withCurrentColor(svg, '#ffffff').replace('stroke-width="2"', 'stroke-width="4.5"');
  const icon = withCurrentColor(svg, '#111111');
  const normalized = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="24" height="24">
      ${halo}
      ${icon}
    </svg>
  `.trim();
  return `url("data:image/svg+xml,${encodeURIComponent(normalized)}") ${hotspotX} ${hotspotY}, auto`;
}

const TOOL_CURSOR_MAP: Record<EditorTool, string> = {
  select: createCursor(TOOL_ICON_SVGS.select, 7, 4),
  paint: createCursor(TOOL_ICON_SVGS.paint, 3, 20),
  erase: createCursor(TOOL_ICON_SVGS.erase, 4, 20),
  fill: createCursor(TOOL_ICON_SVGS.fill, 8, 20),
  line: createCursor(TOOL_ICON_SVGS.line, 4, 20),
  rectangle: createCursor(TOOL_ICON_SVGS.rectangle, 4, 4),
  sample: createCursor(TOOL_ICON_SVGS.sample, 3, 20),
  move: createCursor(TOOL_ICON_SVGS.move, 8, 8),
};

export function getCursorForTool(tool: EditorTool): string {
  return TOOL_CURSOR_MAP[tool];
}
