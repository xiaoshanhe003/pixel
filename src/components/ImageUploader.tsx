import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { BEAD_BRANDS, BEAD_BRAND_ORDER, type BeadBrand } from '../data/beadPalettes';
import type { ConversionOptions, PaletteSize } from '../types/pixel';
import type { ScenarioId } from '../types/studio';
import type { CropRect } from '../utils/image';
import { cropImageFile, detectContentCrop, fileToImageElement, imageSourceToImageData } from '../utils/image';
import { Button } from './ui/button';
import { Icon } from './ui/Icon';
import { DropdownField } from './ui/dropdown';
import { applyDetailPreset, inferDetailPreset, type DetailPreset } from '../utils/conversionPresets';

type ImageUploaderProps = {
  activeScenario: ScenarioId;
  sourceFile: File | null;
  appliedFile: File | null;
  appliedCrop: CropRect | null;
  previewUrl?: string;
  conversionOptions: ConversionOptions;
  beadBrand: BeadBrand;
  onApply: (params: {
    sourceFile: File;
    appliedFile: File;
    crop: CropRect | null;
    conversionOptions: ConversionOptions;
    beadBrand: BeadBrand;
  }) => void;
  onClear: () => void;
};

type ImageMetrics = {
  naturalWidth: number;
  naturalHeight: number;
};

type RenderFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ResizeHandle =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left';

const MIN_CROP_SIZE = 48;
const AUTO_FIT_PADDING_RATIO = 0;
const DEFAULT_CROP_INSET_RATIO = 0.03;
const COMMON_GRID_SIZES = [16, 32, 50, 52, 100, 200] as const;
const RATIO_PRESETS = [
  { label: '1:1', value: '1:1', width: 1, height: 1 },
  { label: '3:4', value: '3:4', width: 3, height: 4 },
  { label: '4:5', value: '4:5', width: 4, height: 5 },
  { label: '9:16', value: '9:16', width: 9, height: 16 },
  { label: '16:9', value: '16:9', width: 16, height: 9 },
  { label: '自由', value: 'free' },
] as const;

type RatioPresetValue = (typeof RATIO_PRESETS)[number]['value'];
type DimensionKey = 'width' | 'height';

function buildCenteredCrop(metrics: ImageMetrics): CropRect {
  const insetX = Math.max(8, Math.min(24, Math.round(metrics.naturalWidth * DEFAULT_CROP_INSET_RATIO)));
  const insetY = Math.max(8, Math.min(24, Math.round(metrics.naturalHeight * DEFAULT_CROP_INSET_RATIO)));
  const width = Math.max(MIN_CROP_SIZE, metrics.naturalWidth - insetX * 2);
  const height = Math.max(MIN_CROP_SIZE, metrics.naturalHeight - insetY * 2);

  return {
    x: Math.max(0, Math.round((metrics.naturalWidth - width) / 2)),
    y: Math.max(0, Math.round((metrics.naturalHeight - height) / 2)),
    width,
    height,
  };
}

function normalizeCrop(crop: CropRect, metrics: ImageMetrics): CropRect {
  const nextWidth = Math.max(MIN_CROP_SIZE, Math.min(Math.round(crop.width), metrics.naturalWidth));
  const nextHeight = Math.max(MIN_CROP_SIZE, Math.min(Math.round(crop.height), metrics.naturalHeight));

  return {
    x: Math.max(0, Math.min(Math.round(crop.x), metrics.naturalWidth - nextWidth)),
    y: Math.max(0, Math.min(Math.round(crop.y), metrics.naturalHeight - nextHeight)),
    width: nextWidth,
    height: nextHeight,
  };
}

function getImageRenderFrame(image: HTMLImageElement): RenderFrame {
  const renderedWidth = image.clientWidth;
  const renderedHeight = image.clientHeight;
  const naturalWidth = image.naturalWidth || renderedWidth;
  const naturalHeight = image.naturalHeight || renderedHeight;

  if (naturalWidth === 0 || naturalHeight === 0) {
    return { left: 0, top: 0, width: renderedWidth, height: renderedHeight };
  }

  const imageRatio = naturalWidth / naturalHeight;
  const renderedRatio = renderedWidth / renderedHeight;

  if (imageRatio >= renderedRatio) {
    const width = renderedWidth;
    const height = width / imageRatio;

    return {
      left: 0,
      top: (renderedHeight - height) / 2,
      width,
      height,
    };
  }

  const height = renderedHeight;
  const width = height * imageRatio;

  return {
    left: (renderedWidth - width) / 2,
    top: 0,
    width,
    height,
  };
}

function inferRatioPreset(width: number, height: number): RatioPresetValue {
  const targetRatio = width / height;

  for (const preset of RATIO_PRESETS) {
    if (!('width' in preset)) {
      continue;
    }

    const presetRatio = preset.width / preset.height;

    if (Math.abs(targetRatio - presetRatio) < 0.0001) {
      return preset.value;
    }
  }

  return 'free';
}

function formatFreeRatio(crop: CropRect | null): string {
  if (!crop || crop.width <= 0) {
    return '1:1';
  }

  const normalizedHeight = crop.height / crop.width;
  const rounded = Math.round(normalizedHeight * 1000) / 1000;
  const formatted = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

  return `1:${formatted}`;
}

export default function ImageUploader({
  activeScenario,
  sourceFile,
  appliedFile,
  appliedCrop,
  previewUrl,
  conversionOptions,
  beadBrand,
  onApply,
  onClear,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const widthFieldRef = useRef<HTMLLabelElement | null>(null);
  const heightFieldRef = useRef<HTMLLabelElement | null>(null);
  const interactionRef = useRef<{
    mode: 'move' | 'resize';
    handle?: ResizeHandle;
    pointerId: number;
    startX: number;
    startY: number;
    crop: CropRect;
    frame: RenderFrame;
    metrics: ImageMetrics;
  } | null>(null);
  const [pendingSourceFile, setPendingSourceFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [initialCrop, setInitialCrop] = useState<CropRect | null>(null);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [draftOptions, setDraftOptions] = useState<ConversionOptions>(conversionOptions);
  const [draftBeadBrand, setDraftBeadBrand] = useState<BeadBrand>(beadBrand);
  const [ratioPreset, setRatioPreset] = useState<RatioPresetValue>('1:1');
  const [openGridMenu, setOpenGridMenu] = useState<DimensionKey | null>(null);
  const lastEditedDimensionRef = useRef<DimensionKey>('width');
  const resolvedGridWidth = draftOptions.gridWidth ?? draftOptions.gridSize ?? 16;
  const resolvedGridHeight = draftOptions.gridHeight ?? draftOptions.gridSize ?? 16;
  const detailPreset = inferDetailPreset(draftOptions);

  useEffect(() => {
    if (!pendingSourceFile) {
      setPendingPreviewUrl(undefined);
      setCrop(null);
      setMetrics(null);
      setInitialCrop(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(pendingSourceFile);
    let cancelled = false;

    setPendingPreviewUrl(nextPreviewUrl);
    void (async () => {
      try {
        const image = await fileToImageElement(pendingSourceFile);

        if (cancelled) {
          return;
        }

        const nextMetrics = {
          naturalWidth: image.naturalWidth || image.width,
          naturalHeight: image.naturalHeight || image.height,
        };
        const centeredCrop = buildCenteredCrop(nextMetrics);

        setMetrics(nextMetrics);
        setCrop(
          initialCrop
            ? normalizeCrop(initialCrop, nextMetrics)
            : centeredCrop,
        );
      } catch {
        if (!cancelled) {
          setPendingSourceFile(null);
          setIsDialogOpen(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [initialCrop, pendingSourceFile]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && openGridMenu) {
        setOpenGridMenu(null);
        return;
      }

      if (event.key !== 'Escape' || isApplying) {
        return;
      }

      interactionRef.current = null;
      setPendingSourceFile(null);
      setIsDialogOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (
        widthFieldRef.current?.contains(target ?? null) ||
        heightFieldRef.current?.contains(target ?? null)
      ) {
        return;
      }

      setOpenGridMenu(null);
    }

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isApplying, isDialogOpen, openGridMenu]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const current = interactionRef.current;

      if (!current) {
        return;
      }

      const scale = current.metrics.naturalWidth / current.frame.width;
      const deltaX = (event.clientX - current.startX) * scale;
      const deltaY = (event.clientY - current.startY) * scale;

      if (current.mode === 'move') {
        const maxX = current.metrics.naturalWidth - current.crop.width;
        const maxY = current.metrics.naturalHeight - current.crop.height;

        setCrop({
          ...current.crop,
          x: Math.max(0, Math.min(Math.round(current.crop.x + deltaX), maxX)),
          y: Math.max(0, Math.min(Math.round(current.crop.y + deltaY), maxY)),
        });
        return;
      }

      const handle = current.handle;

      if (!handle) {
        return;
      }

      const currentRight = current.crop.x + current.crop.width;
      const currentBottom = current.crop.y + current.crop.height;
      let nextLeft = current.crop.x;
      let nextTop = current.crop.y;
      let nextRight = currentRight;
      let nextBottom = currentBottom;

      if (handle.includes('left')) {
        nextLeft = Math.max(
          0,
          Math.min(Math.round(current.crop.x + deltaX), currentRight - MIN_CROP_SIZE),
        );
      }

      if (handle.includes('right')) {
        nextRight = Math.min(
          current.metrics.naturalWidth,
          Math.max(Math.round(currentRight + deltaX), current.crop.x + MIN_CROP_SIZE),
        );
      }

      if (handle.includes('top')) {
        nextTop = Math.max(
          0,
          Math.min(Math.round(current.crop.y + deltaY), currentBottom - MIN_CROP_SIZE),
        );
      }

      if (handle.includes('bottom')) {
        nextBottom = Math.min(
          current.metrics.naturalHeight,
          Math.max(Math.round(currentBottom + deltaY), current.crop.y + MIN_CROP_SIZE),
        );
      }

      setCrop(
        normalizeCrop(
          {
            x: nextLeft,
            y: nextTop,
            width: nextRight - nextLeft,
            height: nextBottom - nextTop,
          },
          current.metrics,
        ),
      );
    }

    function handlePointerUp(event: PointerEvent) {
      if (!interactionRef.current || interactionRef.current.pointerId !== event.pointerId) {
        return;
      }

      interactionRef.current = null;
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  const cropAspectRatio = crop ? crop.width / crop.height : 1;
  const selectedRatio = useMemo(() => {
    if (ratioPreset === 'free') {
      return cropAspectRatio;
    }

    const preset = RATIO_PRESETS.find((item) => item.value === ratioPreset);

    if (!preset || !('width' in preset)) {
      return 1;
    }

    return preset.width / preset.height;
  }, [cropAspectRatio, ratioPreset]);

  useEffect(() => {
    if (!isDialogOpen || !Number.isFinite(selectedRatio) || selectedRatio <= 0) {
      return;
    }

    if (ratioPreset === 'free' && !crop) {
      return;
    }

    setDraftOptions((current) => {
      const anchorWidth = current.gridWidth ?? current.gridSize ?? 16;
      const anchorHeight = current.gridHeight ?? current.gridSize ?? 16;

      if (lastEditedDimensionRef.current === 'height') {
        return {
          ...current,
          gridWidth: Math.max(1, Math.ceil(anchorHeight * selectedRatio)),
          gridHeight: anchorHeight,
        };
      }

      return {
        ...current,
        gridWidth: anchorWidth,
        gridHeight: Math.max(1, Math.ceil(anchorWidth / selectedRatio)),
      };
    });
  }, [isDialogOpen, ratioPreset, selectedRatio]);

  const cropFrame = useMemo(() => {
    if (!crop || !metrics || !cropImageRef.current) {
      return null;
    }

    const frame = getImageRenderFrame(cropImageRef.current);
    const scale = frame.width / metrics.naturalWidth;

    return {
      left: frame.left + crop.x * scale,
      top: frame.top + crop.y * scale,
      width: crop.width * scale,
      height: crop.height * scale,
    };
  }, [crop, metrics, pendingPreviewUrl, isDialogOpen]);

  const startInteraction = (
    event: ReactPointerEvent<HTMLElement>,
    mode: 'move' | 'resize',
    handle?: ResizeHandle,
  ) => {
    if (!crop || !metrics || !cropImageRef.current) {
      return;
    }

    interactionRef.current = {
      mode,
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      crop,
      frame: getImageRenderFrame(cropImageRef.current),
      metrics,
    };
  };

  const openDialog = (file: File, nextCrop: CropRect | null) => {
    const nextGridWidth = conversionOptions.gridWidth ?? conversionOptions.gridSize ?? 16;
    const nextGridHeight = conversionOptions.gridHeight ?? conversionOptions.gridSize ?? 16;

    setPendingSourceFile(file);
    setDraftOptions(conversionOptions);
    setDraftBeadBrand(beadBrand);
    setInitialCrop(nextCrop);
    setRatioPreset(inferRatioPreset(nextGridWidth, nextGridHeight));
    setOpenGridMenu(null);
    lastEditedDimensionRef.current = 'width';
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isApplying) {
      return;
    }

    interactionRef.current = null;
    setOpenGridMenu(null);
    setPendingSourceFile(null);
    setIsDialogOpen(false);
  };

  const updateCanvasSize = (dimension: DimensionKey, value: string) => {
    const nextValue = Math.max(1, Number.parseInt(value || '1', 10));
    const nextRatio = Number.isFinite(selectedRatio) && selectedRatio > 0 ? selectedRatio : 1;

    lastEditedDimensionRef.current = dimension;

    setDraftOptions((current) => {
      if (dimension === 'width') {
        return {
          ...current,
          gridWidth: nextValue,
          gridHeight: Math.max(1, Math.ceil(nextValue / nextRatio)),
        };
      }

      return {
        ...current,
        gridHeight: nextValue,
        gridWidth: Math.max(1, Math.ceil(nextValue * nextRatio)),
      };
    });
  };

  const fitToContent = async () => {
    if (!pendingSourceFile || !metrics) {
      return;
    }

    const image = await fileToImageElement(pendingSourceFile);
    const imageData = imageSourceToImageData(
      image,
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      true,
    );

    setCrop(normalizeCrop(detectContentCrop(imageData, AUTO_FIT_PADDING_RATIO), metrics));
  };

  const paletteOptions: PaletteSize[] = [16, 32];

  const handleRatioPresetChange = (nextPreset: RatioPresetValue) => {
    setRatioPreset(nextPreset);
  };

  const selectCommonGridSize = (dimension: DimensionKey, size: number) => {
    updateCanvasSize(dimension, String(size));
    setOpenGridMenu(null);
  };

  const applySettings = async () => {
    if (!pendingSourceFile) {
      return;
    }

    setIsApplying(true);

    try {
      const nextAppliedFile = crop
        ? await cropImageFile(pendingSourceFile, crop)
        : pendingSourceFile;

      onApply({
        sourceFile: pendingSourceFile,
        appliedFile: nextAppliedFile,
        crop,
        conversionOptions: draftOptions,
        beadBrand: draftBeadBrand,
      });
      setIsDialogOpen(false);
      setPendingSourceFile(null);
    } finally {
      setIsApplying(false);
    }
  };

  const hasAppliedResult = Boolean(appliedFile && previewUrl);

  return (
    <section className="uploader-stage" aria-label="图片上传区域">
      <div className="source-card">
        <input
          ref={fileInputRef}
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (!file) {
              return;
            }

            openDialog(file, null);
            event.currentTarget.value = '';
          }}
        />

        {hasAppliedResult ? (
          <>
            <div className="source-preview-frame">
              <img
                className="source-preview"
                src={previewUrl}
                alt="已上传原图预览"
              />
            </div>

            <div className="uploader-actions uploader-actions--stacked">
              {sourceFile ? (
                <Button
                  variant="secondary"
                  className="source-action source-action--primary"
                  icon={<Icon name="crop" />}
                  onClick={() => openDialog(sourceFile, appliedCrop)}
                >
                  修改设置
                </Button>
              ) : null}

              <Button
                variant="secondary"
                className="source-action source-action--icon-only"
                icon={<Icon name="x" />}
                iconOnly
                aria-label="删除"
                onClick={onClear}
              />
            </div>
          </>
        ) : (
          <label className="uploader uploader--card" htmlFor="image-upload">
            <span className="uploader__icon" aria-hidden="true">
              <Icon name="upload" />
            </span>
            <span className="uploader__title">点击上传图片</span>
            <span className="uploader__copy">支持 PNG、JPG、WebP</span>
          </label>
        )}
      </div>

      {isDialogOpen && pendingPreviewUrl
        ? createPortal(
            <div
              className="crop-dialog-backdrop"
              role="presentation"
              onClick={closeDialog}
            >
              <div
                className="crop-dialog crop-dialog--split"
                role="dialog"
                aria-modal="true"
                aria-label="裁切并应用转绘设置"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="crop-dialog__dialog-header">
                  <h3 className="crop-dialog__dialog-title">编辑参考图</h3>
                  <Button
                    variant="tertiary"
                    icon={<Icon name="x" />}
                    iconOnly
                    className="crop-dialog__close"
                    aria-label="关闭弹窗"
                    onClick={closeDialog}
                  />
                </div>

                <div className="crop-dialog__split-main">
                  <div className="crop-dialog__workspace">
                    <div className="source-preview source-preview--cropper" aria-label="上传前裁切">
                      <img
                        ref={cropImageRef}
                        className="source-preview__image"
                        src={pendingPreviewUrl}
                        alt="待裁切原图预览"
                      />
                      {cropFrame ? (
                        <div
                          className="crop-selection"
                          style={{
                            left: `${cropFrame.left}px`,
                            top: `${cropFrame.top}px`,
                            width: `${cropFrame.width}px`,
                            height: `${cropFrame.height}px`,
                          }}
                          onPointerDown={(event) => startInteraction(event, 'move')}
                        >
                          <span className="crop-selection__rule crop-selection__rule--horizontal" />
                          <span className="crop-selection__rule crop-selection__rule--vertical" />
                          {(['top', 'right', 'bottom', 'left'] as ResizeHandle[]).map(
                            (handle) => (
                              <button
                                key={handle}
                                type="button"
                                className={`crop-selection__edge crop-selection__edge--${handle}`}
                                aria-label="调整裁切范围"
                                onPointerDown={(event) => {
                                  event.stopPropagation();
                                  startInteraction(event, 'resize', handle);
                                }}
                              />
                            ),
                          )}
                          {(
                            [
                              'top-left',
                              'top-right',
                              'bottom-left',
                              'bottom-right',
                            ] as ResizeHandle[]
                          ).map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              className={`crop-selection__handle crop-selection__handle--${handle}`}
                              aria-label="调整裁切范围"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                startInteraction(event, 'resize', handle);
                              }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="crop-dialog__workspace-actions">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          void fitToContent();
                        }}
                      >
                        贴合内容
                      </Button>
                    </div>
                  </div>

                  <aside className="crop-dialog__settings">
                    <div className="crop-dialog__form">
                      <div className="crop-dialog__form-row">
                        <div className="crop-dialog__form-label">比例</div>
                        <div className="crop-dialog__form-control">
                          <DropdownField
                            label="比例"
                            hideLabel
                            value={ratioPreset}
                            options={RATIO_PRESETS.map((preset) => ({
                              label: preset.label,
                              value: preset.value,
                            }))}
                            onChange={(value) => handleRatioPresetChange(value as RatioPresetValue)}
                          />
                          {ratioPreset === 'free' ? (
                            <p className="crop-dialog__ratio-hint">
                              当前裁切框比例为 {formatFreeRatio(crop)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="crop-dialog__form-row">
                        <div className="crop-dialog__form-label">格子数</div>
                        <div className="crop-dialog__form-control">
                          <div className="crop-dialog__size-controls">
                            <label
                              ref={widthFieldRef}
                              className={`crop-dialog__size-field${openGridMenu === 'width' ? ' is-open' : ''}`}
                            >
                              <span className="crop-dialog__size-prefix">宽</span>
                              <input
                                className="crop-dialog__size-input"
                                type="text"
                                inputMode="numeric"
                                aria-label="宽"
                                value={resolvedGridWidth}
                                onChange={(event) => updateCanvasSize('width', event.target.value)}
                              />
                              <button
                                type="button"
                                className="crop-dialog__size-trigger"
                                aria-label="打开宽常用值"
                                aria-expanded={openGridMenu === 'width'}
                                onClick={() =>
                                  setOpenGridMenu((current) => (current === 'width' ? null : 'width'))
                                }
                              >
                                <Icon className="ui-dropdown__icon" name="chevronDown" size={14} />
                              </button>
                              {openGridMenu === 'width' ? (
                                <div className="crop-dialog__size-menu" role="listbox" aria-label="宽常用值">
                                  {COMMON_GRID_SIZES.map((size) => (
                                    <button
                                      key={size}
                                      type="button"
                                      className="crop-dialog__size-option"
                                      onClick={() => selectCommonGridSize('width', size)}
                                    >
                                      {size}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </label>
                            <span className="crop-dialog__size-link" aria-hidden="true">
                              <Icon name="link" size={18} stroke={1.7} />
                            </span>
                            <label
                              ref={heightFieldRef}
                              className={`crop-dialog__size-field${openGridMenu === 'height' ? ' is-open' : ''}`}
                            >
                              <span className="crop-dialog__size-prefix">高</span>
                              <input
                                className="crop-dialog__size-input"
                                type="text"
                                inputMode="numeric"
                                aria-label="高"
                                value={resolvedGridHeight}
                                onChange={(event) => updateCanvasSize('height', event.target.value)}
                              />
                              <button
                                type="button"
                                className="crop-dialog__size-trigger"
                                aria-label="打开高常用值"
                                aria-expanded={openGridMenu === 'height'}
                                onClick={() =>
                                  setOpenGridMenu((current) => (current === 'height' ? null : 'height'))
                                }
                              >
                                <Icon className="ui-dropdown__icon" name="chevronDown" size={14} />
                              </button>
                              {openGridMenu === 'height' ? (
                                <div className="crop-dialog__size-menu" role="listbox" aria-label="高常用值">
                                  {COMMON_GRID_SIZES.map((size) => (
                                    <button
                                      key={size}
                                      type="button"
                                      className="crop-dialog__size-option"
                                      onClick={() => selectCommonGridSize('height', size)}
                                    >
                                      {size}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </label>
                          </div>
                        </div>
                      </div>

                      {activeScenario !== 'beads' ? (
                        <div className="crop-dialog__form-row">
                          <div className="crop-dialog__form-label">颜色数量</div>
                          <div className="crop-dialog__form-control">
                            <DropdownField
                              label="颜色数量"
                              hideLabel
                              value={draftOptions.paletteSize}
                              options={paletteOptions.map((size) => ({
                                label: `${size} 色`,
                                value: size,
                              }))}
                              onChange={(size) =>
                                setDraftOptions((current) => ({
                                  ...current,
                                  paletteSize: size as PaletteSize,
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}

                      {activeScenario === 'beads' ? (
                        <div className="crop-dialog__form-row">
                          <div className="crop-dialog__form-label">拼豆色板</div>
                          <div className="crop-dialog__form-control">
                            <DropdownField
                              label="拼豆色板"
                              hideLabel
                              value={draftBeadBrand}
                              options={BEAD_BRAND_ORDER.map((brandId) => ({
                                value: brandId,
                                label: BEAD_BRANDS[brandId].label,
                              }))}
                              onChange={(brand) => setDraftBeadBrand(brand as BeadBrand)}
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="crop-dialog__form-row">
                        <div className="crop-dialog__form-label">精细度</div>
                        <div className="crop-dialog__form-control">
                          <DropdownField
                            label="精细度"
                            hideLabel
                            value={detailPreset}
                            options={[
                              { label: '简洁', value: 'clean' satisfies DetailPreset },
                              { label: '平衡', value: 'balanced' satisfies DetailPreset },
                              { label: '细节', value: 'detailed' satisfies DetailPreset },
                            ]}
                            onChange={(preset) =>
                              setDraftOptions((current) =>
                                applyDetailPreset(current, preset as DetailPreset),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="crop-dialog__footer crop-dialog__footer--stacked">
                      <Button variant="secondary" onClick={closeDialog}>
                        取消
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          void applySettings();
                        }}
                        disabled={isApplying}
                      >
                        {isApplying ? '转绘中...' : '转绘到画板'}
                      </Button>
                    </div>
                  </aside>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
