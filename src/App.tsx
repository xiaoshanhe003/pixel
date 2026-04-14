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
};

function getPaletteCounts(grid: PixelGridModel | null): Map<string, number> {
  const counts = new Map<string, number>();

  if (!grid) {
    return counts;
  }

  for (const cell of grid.cells) {
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
  const [status, setStatus] = useState('Upload an image to begin');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(undefined);
      setPixelGrid(null);
      setStatus('Upload an image to begin');
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    let cancelled = false;

    setPreviewUrl(nextPreviewUrl);
    setStatus('Processing image...');

    void (async () => {
      try {
        const image = await fileToImageElement(selectedFile);
        const imageData = imageSourceToImageData(
          image,
          conversionOptions.gridSize,
          conversionOptions.gridSize,
          false,
        );
        const nextGrid = buildPixelGrid(imageData, conversionOptions);

        if (!cancelled) {
          setPixelGrid(nextGrid);
          setStatus('Grid ready');
        }
      } catch {
        if (!cancelled) {
          setPixelGrid(null);
          setStatus('Unable to process this image');
        }
      }
    })();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [conversionOptions, selectedFile]);

  const paletteCounts = getPaletteCounts(pixelGrid);

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Pixel Art Converter</p>
        <h1>Pixel Forge</h1>
        <p className="lede">
          Upload an image, compress it into deliberate pixels, and inspect the
          result as a true editable grid.
        </p>
      </section>

      <section className="controls-and-stage">
        <div className="controls-column">
          <ConversionControls
            value={conversionOptions}
            onChange={setConversionOptions}
          />
        </div>

        <section className="comparison-stage" aria-label="source and result comparison">
          <div className="comparison-panel">
            <div className="panel panel--comparison">
              <div className="panel__header">
                <h2>Source</h2>
                <span>Original image preview</span>
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
                <h2>Result</h2>
                <span>{status}</span>
              </div>
              <div className="panel__body">
                {pixelGrid ? (
                  <PixelGrid grid={pixelGrid} />
                ) : (
                  <div className="empty-state">
                    Pixel grid will appear here once the source image has been
                    sampled.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="sidebar-stack" aria-label="grid side panels">
          {pixelGrid ? (
            <>
              <PalettePanel
                palette={pixelGrid.palette}
                counts={paletteCounts}
              />
              <InspectorPanel
                grid={pixelGrid}
                options={conversionOptions}
              />
            </>
          ) : (
            <section className="panel panel--sidebar">
              <div className="panel__header panel__header--stack">
                <h2>Inspector</h2>
                <span>No grid yet</span>
              </div>
              <p className="sidebar-copy">
                Generate a draft to inspect palette usage, cell count, and
                future edit affordances.
              </p>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
