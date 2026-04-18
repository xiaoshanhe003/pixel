import type { EditorTool } from '../types/studio';

import ARROW_BACK_UP_SVG from '@tabler/icons/outline/arrow-back-up.svg?raw';
import ARROW_FORWARD_UP_SVG from '@tabler/icons/outline/arrow-forward-up.svg?raw';
import BUCKET_DROPLET_SVG from '@tabler/icons/outline/bucket-droplet.svg?raw';
import COLOR_PICKER_SVG from '@tabler/icons/outline/color-picker.svg?raw';
import ERASER_SVG from '@tabler/icons/outline/eraser.svg?raw';
import HAND_MOVE_SVG from '@tabler/icons/outline/hand-move.svg?raw';
import LINE_SVG from '@tabler/icons/outline/line.svg?raw';
import MINUS_SVG from '@tabler/icons/outline/minus.svg?raw';
import PENCIL_SVG from '@tabler/icons/outline/pencil.svg?raw';
import PLUS_SVG from '@tabler/icons/outline/plus.svg?raw';
import POINTER_SVG from '@tabler/icons/outline/pointer.svg?raw';
import RECTANGLE_SVG from '@tabler/icons/outline/rectangle.svg?raw';

export const UNDO_SVG = ARROW_BACK_UP_SVG;
export const REDO_SVG = ARROW_FORWARD_UP_SVG;
export const ZOOM_OUT_SVG = MINUS_SVG;
export const ZOOM_IN_SVG = PLUS_SVG;

export const TOOL_ICON_SVGS: Record<EditorTool, string> = {
  select: POINTER_SVG,
  paint: PENCIL_SVG,
  erase: ERASER_SVG,
  fill: BUCKET_DROPLET_SVG,
  line: LINE_SVG,
  rectangle: RECTANGLE_SVG,
  sample: COLOR_PICKER_SVG,
  move: HAND_MOVE_SVG,
};
