import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { SquareCrop } from '../utils/image';
import { cropImageFile, fileToImageElement } from '../utils/image';

type ImageUploaderProps = {
  selectedFile: File | null;
  onFileSelected: (file: File | null) => void;
  previewUrl?: string;
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

const MIN_CROP_SIZE = 48;

function buildCenteredCrop(metrics: ImageMetrics): SquareCrop {
  const size = Math.min(metrics.naturalWidth, metrics.naturalHeight);

  return {
    x: Math.round((metrics.naturalWidth - size) / 2),
    y: Math.round((metrics.naturalHeight - size) / 2),
    size,
  };
}

function isSameCrop(left: SquareCrop | null, right: SquareCrop | null): boolean {
  if (!left || !right) {
    return false;
  }

  return left.x === right.x && left.y === right.y && left.size === right.size;
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
  selectedFile,
  onFileSelected,
  previewUrl,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const interactionRef = useRef<{
    mode: 'move' | 'resize';
    pointerId: number;
    startX: number;
    startY: number;
    crop: SquareCrop;
    frame: RenderFrame;
    metrics: ImageMetrics;
  } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string>();
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<SquareCrop | null>(null);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const defaultCrop = useMemo(
    () => (metrics ? buildCenteredCrop(metrics) : null),
    [metrics],
  );

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(undefined);
      setCrop(null);
      setMetrics(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(pendingFile);
    let cancelled = false;

    setPendingPreviewUrl(nextPreviewUrl);
    void (async () => {
      try {
        const image = await fileToImageElement(pendingFile);

        if (cancelled) {
          return;
        }

        const nextMetrics = {
          naturalWidth: image.naturalWidth || image.width,
          naturalHeight: image.naturalHeight || image.height,
        };

        setMetrics(nextMetrics);
        setCrop(buildCenteredCrop(nextMetrics));
      } catch {
        if (!cancelled) {
          setPendingFile(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [pendingFile]);

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    setPendingFile(null);
    setIsCropping(false);
  }, [selectedFile]);

  useEffect(() => {
    if (!isCropping) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      interactionRef.current = null;
      setPendingFile(null);
      setIsCropping(false);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCropping]);

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

      const limitByWidth = current.metrics.naturalWidth - current.crop.x;
      const limitByHeight = current.metrics.naturalHeight - current.crop.y;
      const maxSize = Math.min(limitByWidth, limitByHeight);
      const nextSize = Math.max(
        MIN_CROP_SIZE,
        Math.min(
          Math.round(current.crop.size + Math.max(deltaX, deltaY)),
          maxSize,
        ),
      );

      setCrop({
        ...current.crop,
        size: nextSize,
      });
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
  }, [crop, metrics, pendingPreviewUrl, isCropping]);

  const startInteraction = (
    event: ReactPointerEvent<HTMLElement>,
    mode: 'move' | 'resize',
  ) => {
    if (!crop || !metrics || !cropImageRef.current) {
      return;
    }

    interactionRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      crop,
      frame: getImageRenderFrame(cropImageRef.current),
      metrics,
    };
  };

  const commitPendingFile = async () => {
    if (!pendingFile) {
      return;
    }

    onFileSelected(pendingFile);
  };

  const applyCrop = async () => {
    if (!pendingFile || !crop) {
      return;
    }

    const nextFile = await cropImageFile(pendingFile, crop);
    setPendingFile(nextFile);
    onFileSelected(nextFile);
    setIsCropping(false);
  };

  const previewSrc = pendingPreviewUrl ?? previewUrl;
  const canCrop = Boolean(selectedFile || pendingFile);
  const shouldApplyCrop = !isSameCrop(crop, defaultCrop);

  return (
    <section className="uploader-stage" aria-label="图片上传区域">
      <div className="uploader-actions">
        <label className="uploader" htmlFor="image-upload">
          <span className="uploader__title">上传图片</span>
          <input
            ref={fileInputRef}
            id="image-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (!file) {
                return;
              }

              setPendingFile(file);
              setIsCropping(true);
              event.currentTarget.value = '';
            }}
          />
        </label>

        {canCrop && !isCropping ? (
          <button
            type="button"
            className="chip-button"
            onClick={() => {
              setPendingFile(selectedFile);
              setIsCropping(true);
            }}
          >
            裁切
          </button>
        ) : null}

        {selectedFile && !isCropping ? (
          <button
            type="button"
            className="chip-button"
            onClick={() => {
              setPendingFile(null);
              setIsCropping(false);
              onFileSelected(null);
            }}
          >
            删除
          </button>
        ) : null}

      </div>

      {previewSrc ? (
        isCropping && pendingPreviewUrl ? (
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
                <button
                  type="button"
                  className="crop-selection__handle"
                  aria-label="调整裁切范围"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    startInteraction(event, 'resize');
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <img
            className="source-preview"
            src={previewSrc}
            alt="已上传原图预览"
          />
        )
      ) : (
        <div className="empty-state">无参考图</div>
      )}

      {isCropping && pendingPreviewUrl
        ? createPortal(
            <div
              className="crop-dialog-backdrop"
              role="presentation"
              onClick={() => {
                setPendingFile(null);
                setIsCropping(false);
              }}
            >
              <div
                className="crop-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="图片裁切"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="crop-dialog__header">
                  <div>
                    <p className="crop-dialog__eyebrow">上传前处理</p>
                    <h3 className="crop-dialog__title">裁切图片</h3>
                  </div>
                  <button
                    type="button"
                    className="chip-button"
                    onClick={() => {
                      setPendingFile(null);
                      setIsCropping(false);
                    }}
                  >
                    关闭
                  </button>
                </div>

                <p className="crop-dialog__hint">拖动选区调整构图，拖拽右下角圆点缩放裁切范围。</p>

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
                      <button
                        type="button"
                        className="crop-selection__handle"
                        aria-label="调整裁切范围"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          startInteraction(event, 'resize');
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="crop-dialog__footer">
                  <button
                    type="button"
                    className="chip-button"
                    onClick={() => {
                      setPendingFile(null);
                      setIsCropping(false);
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="chip-button"
                    onClick={() => {
                      if (shouldApplyCrop) {
                        void applyCrop();
                        return;
                      }

                      void commitPendingFile();
                      setIsCropping(false);
                    }}
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
