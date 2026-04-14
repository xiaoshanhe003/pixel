import { useEffect, useState } from 'react';
import ConversionControls from './components/ConversionControls';
import ImageUploader from './components/ImageUploader';
import InspectorPanel from './components/InspectorPanel';
import PalettePanel from './components/PalettePanel';
import PixelGrid from './components/PixelGrid';
import type { ConversionOptions } from './types/pixel';
import type { PixelGrid as PixelGridModel } from './types/pixel';
import { fileToImageElement, imageSourceToImageData } from './utils/image';
import { buildPixelGrid } from './utils/pixelPipeline';

const DEFAULT_OPTIONS: ConversionOptions = {
  gridSize: 16,
  paletteSize: 16,
  dithering: false,
  cleanupNoise: true,
  preserveSilhouette: true,
  simplifyShapes: true,
  animeMode: true,
  fillFrame: false,
};

function getPaletteCounts(grid: PixelGridModel | null): Map<string, number> {
  const counts = new Map<string, number>();

  if (!grid) {
    return counts;
  }

  for (const cell of grid.cells) {
    if (!cell.color) {
      continue;
    }

    counts.set(cell.color, (counts.get(cell.color) ?? 0) + 1);
  }

  return counts;
}

export default function App() {
  const [conversionOptions, setConversionOptions] =
    useState<ConversionOptions>(DEFAULT_OPTIONS);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [pixelGrid, setPixelGrid] = useState<PixelGridModel | null>(null);
  const [status, setStatus] = useState('上传图片后开始转换');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(undefined);
      setPixelGrid(null);
      setStatus('上传图片后开始转换');
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    let cancelled = false;

    setPreviewUrl(nextPreviewUrl);
    setStatus('正在处理图片...');

    void (async () => {
      try {
        const image = await fileToImageElement(selectedFile);
        const imageData = imageSourceToImageData(
          image,
          image.naturalWidth || image.width,
          image.naturalHeight || image.height,
          true,
        );
        const nextGrid = buildPixelGrid(imageData, conversionOptions);

        if (!cancelled) {
          setPixelGrid(nextGrid);
          setStatus('像素网格已生成');
        }
      } catch {
        if (!cancelled) {
          setPixelGrid(null);
          setStatus('图片处理失败');
        }
      }
    })();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [conversionOptions, selectedFile]);

  const paletteCounts = getPaletteCounts(pixelGrid);
  const transparentCount =
    pixelGrid?.cells.filter((cell) => cell.color === null).length ?? 0;

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">像素画转换器</p>
        <h1>像素工坊</h1>
        <p className="lede">
          上传图片，把画面压缩成更有取舍的像素块，并用可编辑网格查看结果。
        </p>
      </section>

      <section className="controls-and-stage">
        <div className="controls-column">
          <ConversionControls
            value={conversionOptions}
            onChange={setConversionOptions}
          />
        </div>

        <section className="comparison-stage" aria-label="原图与结果对比">
          <div className="comparison-panel">
            <div className="panel panel--comparison">
              <div className="panel__header">
                <h2>原图</h2>
                <span>{previewUrl ? '预览已就绪' : '尚未上传'}</span>
              </div>
              <div className="panel__body">
                <ImageUploader
                  onFileSelected={setSelectedFile}
                  previewUrl={previewUrl}
                />
              </div>
            </div>
          </div>

          <div className="comparison-panel">
            <div className="panel panel--comparison">
              <div className="panel__header">
                <h2>结果</h2>
                <span>{status}</span>
              </div>
              <div className="panel__body">
                {pixelGrid ? (
                  <PixelGrid grid={pixelGrid} />
                ) : (
                  <div className="empty-state">
                    采样完成后，这里会显示像素网格。
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="sidebar-stack" aria-label="侧边信息面板">
          {pixelGrid ? (
            <>
              <PalettePanel
                palette={pixelGrid.palette}
                counts={paletteCounts}
                transparentCount={transparentCount}
              />
              <InspectorPanel
                grid={pixelGrid}
                options={conversionOptions}
                transparentCount={transparentCount}
              />
            </>
          ) : (
            <section className="panel panel--sidebar">
              <div className="panel__header panel__header--stack">
                <h2>检查器</h2>
                <span>等待生成</span>
              </div>
              <p className="sidebar-copy">
                生成草稿后，这里会显示调色板和网格统计。
              </p>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
