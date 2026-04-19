import type { IconProps as TablerIconProps } from '@tabler/icons-react';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBucketDroplet,
  IconCheck,
  IconChevronDown,
  IconColorPicker,
  IconCrop,
  IconEraser,
  IconHandStop,
  IconHandMove,
  IconLine,
  IconMinus,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconPointer,
  IconPrinter,
  IconRectangle,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

export type AppIconComponent = ComponentType<TablerIconProps>;

export const ICON_COMPONENTS = {
  arrowBackUp: IconArrowBackUp,
  arrowForwardUp: IconArrowForwardUp,
  bucketDroplet: IconBucketDroplet,
  check: IconCheck,
  chevronDown: IconChevronDown,
  colorPicker: IconColorPicker,
  crop: IconCrop,
  erase: IconEraser,
  handStop: IconHandStop,
  handMove: IconHandMove,
  line: IconLine,
  minus: IconMinus,
  paint: IconPencil,
  photo: IconPhoto,
  plus: IconPlus,
  pointer: IconPointer,
  printer: IconPrinter,
  rectangle: IconRectangle,
  upload: IconUpload,
  x: IconX,
} as const satisfies Record<string, AppIconComponent>;

export type IconName = keyof typeof ICON_COMPONENTS;
