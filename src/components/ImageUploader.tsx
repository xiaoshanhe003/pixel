import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { BeadBrand } from '../data/beadPalettes';
import type { ConversionOptions } from '../types/pixel';
import type { ScenarioId } from '../types/studio';
import type { SquareCrop } from '../utils/image';
import { cropImageFile, fileToImageElement } from '../utils/image';
import { Button } from './ui/button';
import ConversionControls from './ConversionControls';
import { Icon } from './ui/Icon';

type ImageUploaderProps = {
  activeScenario: ScenarioId;
  sourceFile: File | null;
  appliedFile: File | null;
  appliedCrop: SquareCrop | null;
  previewUrl?: string;
  conversionOptions: ConversionOptions;
  beadBrand: BeadBrand;
  onApply: (params: {
    sourceFile: File;
    appliedFile: File;
    crop: SquareCrop | null;
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

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const MIN_CROP_SIZE = 48;

function buildCenteredCrop(metrics: ImageMetrics): SquareCrop {
  const size = Math.min(metrics.naturalWidth, metrics.naturalHeight);

  return {
    x: Math.round((metrics.naturalWidth - size) / 2),
    y: Math.round((metrics.naturalHeight - size) / 2),
    size,
  };
}

function normalizeCrop(crop: SquareCrop, metrics: ImageMetrics): SquareCrop {
  const maxSize = Math.min(
    metrics.naturalWidth,
    metrics.naturalHeight,
  );
  const nextSize = Math.max(MIN_CROP_SIZE, Math.min(crop.size, maxSize));

  return {
    x: Math.max(0, Math.min(crop.x, metrics.naturalWidth - nextSize)),
    y: Math.max(0, Math.min(crop.y, metrics.naturalHeight - nextSize)),
    size: nextSize,
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
    crop: SquareCrop;
    frame: RenderFrame;
    metrics: ImageMetrics;
  } | null>(null);
  const [pendingSourceFile, setPendingSourceFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [crop, setCrop] = useState<SquareCrop | null>(null);
  const [initialCrop, setInitialCrop] = useState<SquareCrop | null>(null);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [draftOptions, setDraftOptions] = useState<ConversionOptions>(conversionOptions);
  const [draftBeadBrand, setDraftBeadBrand] = useState<BeadBrand>(beadBrand);

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
        const maxX = current.metrics.naturalWidth - current.crop.size;
        const maxY = current.metrics.naturalHeight - current.crop.size;

        setCrop({
          ...current.crop,
          x: Math.max(0, Math.min(Math.round(current.crop.x + deltaX), maxX)),
          y: Math.max(0, Math.min(Math.round(current.crop.y + deltaY), maxY)),
          size: current.crop.size,
        });
        return;
      }

      const oppositeX =
        current.handle === 'top-left' || current.handle === 'bottom-left'
          ? current.crop.x + current.crop.size
          : current.crop.x;
      const oppositeY =
        current.handle === 'top-left' || current.handle === 'top-right'
          ? current.crop.y + current.crop.size
          : current.crop.y;

      const pointerX =
        current.handle === 'top-left' || current.handle === 'bottom-left'
          ? current.crop.x + deltaX
          : current.crop.x + current.crop.size + deltaX;
      const pointerY =
        current.handle === 'top-left' || current.handle === 'top-right'
          ? current.crop.y + deltaY
          : current.crop.y + current.crop.size + deltaY;

      const rawSize = Math.max(
        Math.abs(oppositeX - pointerX),
        Math.abs(oppositeY - pointerY),
      );
      const maxAllowedSize =
        current.handle === 'top-left'
          ? Math.min(oppositeX, oppositeY)
          : current.handle === 'top-right'
            ? Math.min(current.metrics.naturalWidth - oppositeX, oppositeY)
            : current.handle === 'bottom-left'
              ? Math.min(oppositeX, current.metrics.naturalHeight - oppositeY)
              : Math.min(
                  current.metrics.naturalWidth - oppositeX,
                  current.metrics.naturalHeight - oppositeY,
                );
      const nextSize = Math.max(
        MIN_CROP_SIZE,
        Math.min(Math.round(rawSize), maxAllowedSize),
      );

      const nextCrop =
        current.handle === 'top-left'
          ? {
              x: oppositeX - nextSize,
              y: oppositeY - nextSize,
              size: nextSize,
            }
          : current.handle === 'top-right'
            ? {
                x: oppositeX,
                y: oppositeY - nextSize,
                size: nextSize,
              }
            : current.handle === 'bottom-left'
              ? {
                  x: oppositeX - nextSize,
                  y: oppositeY,
                  size: nextSize,
                }
              : {
                  x: oppositeX,
                  y: oppositeY,
                  size: nextSize,
                };

      setCrop(nextCrop);
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

  const cropFrame = useMemo(() => {
    if (!crop || !metrics || !cropImageRef.current) {
      return null;
    }

    const frame = getImageRenderFrame(cropImageRef.current);
    const scale = frame.width / metrics.naturalWidth;

    return {
      left: frame.left + crop.x * scale,
      top: frame.top + crop.y * scale,
      size: crop.size * scale,
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

  const openDialog = (file: File, nextCrop: SquareCrop | null) => {
    setPendingSourceFile(file);
    setDraftOptions(conversionOptions);
    setDraftBeadBrand(beadBrand);
    setInitialCrop(nextCrop);
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
                  <h3 className="crop-dialog__dialog-title">裁切图片</h3>
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
                            width: `${cropFrame.size}px`,
                            height: `${cropFrame.size}px`,
                          }}
                          onPointerDown={(event) => startInteraction(event, 'move')}
                        >
                          <span className="crop-selection__rule crop-selection__rule--horizontal" />
                          <span className="crop-selection__rule crop-selection__rule--vertical" />
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
                  </div>

                  <aside className="crop-dialog__settings">
                    <div className="crop-dialog__settings-header">
                      <h3 className="crop-dialog__title">转绘偏好</h3>
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
