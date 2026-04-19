import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { BeadBrand } from '../data/beadPalettes';
import type { ConversionOptions } from '../types/pixel';
import type { ScenarioId } from '../types/studio';
import type { CropRect } from '../utils/image';
import { cropImageFile, detectContentCrop, fileToImageElement, imageSourceToImageData } from '../utils/image';
import { Button } from './ui/button';
import ConversionControls from './ConversionControls';
import { Icon } from './ui/Icon';
import { CheckboxField } from './ui/checkbox';

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

function buildCenteredCrop(metrics: ImageMetrics): CropRect {
  return {
    x: 0,
    y: 0,
    width: metrics.naturalWidth,
    height: metrics.naturalHeight,
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
  const [keepRatio, setKeepRatio] = useState(true);
  const resolvedGridWidth = draftOptions.gridWidth ?? draftOptions.gridSize ?? 16;
  const resolvedGridHeight = draftOptions.gridHeight ?? draftOptions.gridSize ?? 16;

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
      if (event.key !== 'Escape' || isApplying) {
        return;
      }

      interactionRef.current = null;
      setPendingSourceFile(null);
      setIsDialogOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isApplying, isDialogOpen]);

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

  useEffect(() => {
    if (!isDialogOpen || !keepRatio || !crop) {
      return;
    }

    setDraftOptions((current) => ({
      ...current,
      gridHeight: Math.max(1, Math.ceil((current.gridWidth ?? current.gridSize ?? 16) / cropAspectRatio)),
    }));
  }, [cropAspectRatio, isDialogOpen, keepRatio, crop]);

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
    setPendingSourceFile(file);
    setDraftOptions(conversionOptions);
    setDraftBeadBrand(beadBrand);
    setInitialCrop(nextCrop);
    setKeepRatio(true);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isApplying) {
      return;
    }

    interactionRef.current = null;
    setPendingSourceFile(null);
    setIsDialogOpen(false);
  };

  const updateCanvasSize = (dimension: 'width' | 'height', value: string) => {
    const nextValue = Math.max(1, Number.parseInt(value || '1', 10));

    setDraftOptions((current) => {
      if (!keepRatio || !crop) {
        return dimension === 'width'
          ? { ...current, gridWidth: nextValue }
          : { ...current, gridHeight: nextValue };
      }

      if (dimension === 'width') {
        return {
          ...current,
          gridWidth: nextValue,
          gridHeight: Math.max(1, Math.ceil(nextValue / cropAspectRatio)),
        };
      }

      return {
        ...current,
        gridHeight: nextValue,
        gridWidth: Math.max(1, Math.ceil(nextValue * cropAspectRatio)),
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
                    <div className="conversion-controls conversion-controls--plain crop-dialog__controls">
                      <div className="conversion-controls__groups crop-dialog__controls-body">
                        <fieldset className="size-control">
                          <legend>画布</legend>
                          <CheckboxField
                            checked={keepRatio}
                            onCheckedChange={(checked) => setKeepRatio(Boolean(checked))}
                            label="按当前比例"
                            wrapperClassName="crop-dialog__ratio-toggle"
                          />
                          <div className="size-fields">
                            <label className="ui-number-field">
                              <span className="ui-number-field__label">宽</span>
                              <input
                                className="ui-number-field__input"
                                type="number"
                                min={1}
                                max={256}
                                step={1}
                                inputMode="numeric"
                                value={resolvedGridWidth}
                                onChange={(event) => updateCanvasSize('width', event.target.value)}
                              />
                            </label>
                            <label className="ui-number-field">
                              <span className="ui-number-field__label">高</span>
                              <input
                                className="ui-number-field__input"
                                type="number"
                                min={1}
                                max={256}
                                step={1}
                                inputMode="numeric"
                                value={resolvedGridHeight}
                                onChange={(event) => updateCanvasSize('height', event.target.value)}
                              />
                            </label>
                          </div>
                        </fieldset>
                      </div>
                    </div>

                    <ConversionControls
                      plain
                      className="crop-dialog__controls"
                      bodyClassName="crop-dialog__controls-body"
                      activeScenario={activeScenario}
                      value={draftOptions}
                      beadBrand={draftBeadBrand}
                      onChange={setDraftOptions}
                      onBeadBrandChange={setDraftBeadBrand}
                      showCanvasSize={false}
                    />

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
