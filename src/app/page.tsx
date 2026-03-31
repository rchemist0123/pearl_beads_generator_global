'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  ChangeEvent,
  DragEvent,
} from 'react';
import Link from 'next/link';
import {
  PixelationMode,
  calculatePixelGrid,
  MappedPixel,
  removeBackground,
  recalculateColorStats,
} from '../utils/pixelation';
import {
  ColorSystem,
  colorSystemOptions,
  buildFullPalette,
  getDisplayColorKey,
  sortColorsByHue,
} from '../utils/colorSystem';
import { downloadPattern } from '../utils/downloadUtils';
import { translations, Locale } from '../i18n/translations';

const fullBeadPalette = buildFullPalette();

export default function Home() {
  const [locale, setLocale] = useState<Locale>('ko');
  const t = translations[locale];

  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<number>(32);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(30);
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>(
    PixelationMode.Dominant
  );
  const [selectedColorSystem, setSelectedColorSystem] =
    useState<ColorSystem>('MARD');
  const [mappedPixelData, setMappedPixelData] = useState<
    MappedPixel[][] | null
  >(null);
  const [gridDimensions, setGridDimensions] = useState<{
    N: number;
    M: number;
  } | null>(null);
  const [colorCounts, setColorCounts] = useState<{
    [key: string]: { count: number; color: string };
  } | null>(null);
  const [totalBeadCount, setTotalBeadCount] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleImageLoad = useCallback((src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const canvas = originalCanvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      // Reset results
      setMappedPixelData(null);
      setGridDimensions(null);
      setColorCounts(null);
      setTotalBeadCount(0);
      setStatusMessage(null);
    };
    img.src = src;
    setOriginalImageSrc(src);
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          handleImageLoad(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    },
    [handleImageLoad]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          handleImageLoad(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    },
    [handleImageLoad]
  );

  const handleGenerate = useCallback(() => {
    const canvas = originalCanvasRef.current;
    if (!canvas || !imgRef.current) return;

    setIsGenerating(true);
    setStatusMessage(null);

    requestAnimationFrame(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsGenerating(false);
        return;
      }

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const N = granularity;
      const M = Math.round((imgHeight / imgWidth) * N);

      const palette = fullBeadPalette;
      const fallbackColor = palette[0];

      const grid = calculatePixelGrid(
        ctx,
        imgWidth,
        imgHeight,
        N,
        M,
        palette,
        pixelationMode,
        fallbackColor
      );

      setMappedPixelData(grid);
      setGridDimensions({ N, M });

      const { colorCounts: counts, totalCount } =
        recalculateColorStats(grid);
      setColorCounts(counts);
      setTotalBeadCount(totalCount);
      setIsGenerating(false);
    });
  }, [granularity, pixelationMode]);

  const handleRemoveBackground = useCallback(() => {
    if (!mappedPixelData || !gridDimensions) return;
    setIsRemovingBg(true);

    requestAnimationFrame(() => {
      const newData = removeBackground(
        mappedPixelData,
        gridDimensions,
        similarityThreshold
      );
      setMappedPixelData(newData);

      const { colorCounts: counts, totalCount } =
        recalculateColorStats(newData);
      setColorCounts(counts);
      setTotalBeadCount(totalCount);
      setIsRemovingBg(false);
      setStatusMessage(t.backgroundRemoved);
    });
  }, [mappedPixelData, gridDimensions, similarityThreshold, t]);

  const handleDownload = useCallback(() => {
    if (!mappedPixelData || !gridDimensions) return;
    downloadPattern(mappedPixelData, gridDimensions, selectedColorSystem);
  }, [mappedPixelData, gridDimensions, selectedColorSystem]);

  const handleReset = useCallback(() => {
    setOriginalImageSrc(null);
    setMappedPixelData(null);
    setGridDimensions(null);
    setColorCounts(null);
    setTotalBeadCount(0);
    setStatusMessage(null);
    imgRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Draw preview canvas
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !mappedPixelData || !gridDimensions) return;

    const { N, M } = gridDimensions;
    const maxWidth = Math.min(window.innerWidth - 32, 600);
    const cellSize = Math.max(4, Math.floor(maxWidth / N));
    canvas.width = N * cellSize;
    canvas.height = M * cellSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let j = 0; j < M; j++) {
      for (let i = 0; i < N; i++) {
        const cell = mappedPixelData[j]?.[i];
        if (!cell) continue;

        const x = i * cellSize;
        const y = j * cellSize;

        if (cell.isExternal) {
          ctx.fillStyle = '#1a1a2e';
        } else {
          ctx.fillStyle = cell.color;
        }
        ctx.fillRect(x, y, cellSize, cellSize);

        ctx.strokeStyle = '#2a2a4a';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.25, y + 0.25, cellSize, cellSize);
      }
    }
  }, [mappedPixelData, gridDimensions]);

  React.useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  const sortedColorStats = useMemo(() => {
    if (!colorCounts) return [];
    return sortColorsByHue(
      Object.entries(colorCounts).map(([hex, data]) => ({
        hex,
        color: data.color,
        count: data.count,
        displayKey: getDisplayColorKey(hex, selectedColorSystem),
      }))
    );
  }, [colorCounts, selectedColorSystem]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d0d1a]/95 backdrop-blur-sm border-b border-[#2a2a4a]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {t.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/guide"
              className="text-xs px-3 py-1.5 rounded-full bg-[#1a1a2e] text-[#a78bfa] border border-[#2a2a4a] hover:bg-[#2a2a4a] transition-colors"
            >
              {t.guide}
            </Link>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="text-xs px-2 py-1.5 rounded-full bg-[#1a1a2e] text-[#a78bfa] border border-[#2a2a4a] outline-none cursor-pointer"
            >
              <option value="ko">한국어</option>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Upload Area */}
        {!originalImageSrc ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
              isDragOver
                ? 'border-[#7c3aed] bg-[#7c3aed]/10'
                : 'border-[#2a2a4a] bg-[#1a1a2e] hover:border-[#7c3aed]/50'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <svg
                className="w-12 h-12 text-[#a78bfa]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-white">
                  {t.uploadTitle}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t.uploadDesc}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t.uploadFormats}
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <>
            {/* Image Preview */}
            <div className="rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-[#2a2a4a]">
                <span className="text-xs text-gray-400">{t.uploadTitle}</span>
                <button
                  onClick={handleReset}
                  className="text-xs text-[#a78bfa] hover:text-white transition-colors"
                >
                  {t.changeImage}
                </button>
              </div>
              <div className="p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalImageSrc}
                  alt="Original"
                  className="w-full rounded-lg max-h-48 object-contain"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] p-4 space-y-5">
              {/* Granularity */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-200">
                    {t.granularity}
                  </label>
                  <span className="text-sm font-mono text-[#a78bfa] bg-[#7c3aed]/20 px-2 py-0.5 rounded">
                    {granularity}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={granularity}
                  onChange={(e) => setGranularity(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t.granularityDesc}
                </p>
              </div>

              {/* Pixelation Mode */}
              <div>
                <label className="text-sm font-medium text-gray-200 mb-2 block">
                  {t.mode}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setPixelationMode(PixelationMode.Dominant)
                    }
                    className={`px-3 py-2.5 rounded-xl text-sm transition-all ${
                      pixelationMode === PixelationMode.Dominant
                        ? 'bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/30'
                        : 'bg-[#16213e] text-gray-300 border border-[#2a2a4a]'
                    }`}
                  >
                    <div className="font-medium">{t.modeDominant}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {t.modeDominantDesc}
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setPixelationMode(PixelationMode.Average)
                    }
                    className={`px-3 py-2.5 rounded-xl text-sm transition-all ${
                      pixelationMode === PixelationMode.Average
                        ? 'bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/30'
                        : 'bg-[#16213e] text-gray-300 border border-[#2a2a4a]'
                    }`}
                  >
                    <div className="font-medium">{t.modeAverage}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {t.modeAverageDesc}
                    </div>
                  </button>
                </div>
              </div>

              {/* Color System */}
              <div>
                <label className="text-sm font-medium text-gray-200 mb-2 block">
                  {t.colorSystem}
                </label>
                <div className="flex gap-2">
                  {colorSystemOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedColorSystem(opt.key)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedColorSystem === opt.key
                          ? 'bg-[#7c3aed] text-white'
                          : 'bg-[#16213e] text-gray-400 border border-[#2a2a4a]'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Removal Sensitivity */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-200">
                    {t.similarity}
                  </label>
                  <span className="text-sm font-mono text-[#a78bfa] bg-[#7c3aed]/20 px-2 py-0.5 rounded">
                    {similarityThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={similarityThreshold}
                  onChange={(e) =>
                    setSimilarityThreshold(Number(e.target.value))
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t.similarityDesc}
                </p>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-base transition-all bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#8b5cf6] hover:to-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#7c3aed]/20"
            >
              {isGenerating ? t.generating : t.generate}
            </button>

            {/* Results */}
            {mappedPixelData && gridDimensions && (
              <>
                {/* Status Message */}
                {statusMessage && (
                  <div className="text-center text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 rounded-xl py-2">
                    {statusMessage}
                  </div>
                )}

                {/* Preview Canvas */}
                <div className="rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] overflow-hidden">
                  <div className="p-3 border-b border-[#2a2a4a]">
                    <span className="text-sm font-medium text-gray-200">
                      {t.result}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {gridDimensions.N} × {gridDimensions.M}
                    </span>
                  </div>
                  <div className="p-3 flex justify-center overflow-auto">
                    <canvas
                      ref={previewCanvasRef}
                      className="max-w-full rounded-lg"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg}
                    className="py-3 rounded-xl text-sm font-medium transition-all bg-[#16213e] text-gray-200 border border-[#2a2a4a] hover:bg-[#1e2d4a] disabled:opacity-50"
                  >
                    {isRemovingBg ? t.removingBackground : t.removeBackground}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="py-3 rounded-xl text-sm font-medium transition-all bg-emerald-800/50 text-emerald-200 border border-emerald-700/50 hover:bg-emerald-700/50"
                  >
                    {t.download}
                  </button>
                </div>

                {/* Color Statistics */}
                <div className="rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] overflow-hidden">
                  <div className="p-3 border-b border-[#2a2a4a] flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-200">
                      {t.colorStats}
                    </span>
                    <div className="flex gap-3 text-xs text-gray-400">
                      <span>
                        {t.totalBeads}:{' '}
                        <span className="text-[#a78bfa] font-medium">
                          {totalBeadCount.toLocaleString()}
                        </span>
                      </span>
                      <span>
                        {t.colors}:{' '}
                        <span className="text-[#a78bfa] font-medium">
                          {sortedColorStats.length}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto">
                      {sortedColorStats.map((item) => (
                        <div
                          key={item.hex}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#16213e]/50 hover:bg-[#16213e] transition-colors"
                        >
                          <div
                            className="w-8 h-8 rounded-lg border border-[#2a2a4a] flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-mono text-gray-200">
                              {item.displayKey}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-[#a78bfa]">
                            {item.count}{' '}
                            <span className="text-gray-500 text-xs">
                              {t.count}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 mt-8 pb-6">
        <div className="border-t border-[#2a2a4a] pt-4 text-center text-xs text-gray-500 space-y-1">
          <p>
            {t.license}: AGPL-3.0 |{' '}
            <a
              href="https://github.com/Zippland/perler-beads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a78bfa] hover:underline"
            >
              {t.originalProject}
            </a>
          </p>
          <p>
            <a
              href="https://github.com/rchemist0123/pearl_beads_generator_global"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a78bfa] hover:underline"
            >
              Pearl Beads Generator Global
            </a>
          </p>
        </div>
      </footer>

      {/* Hidden canvas for image processing */}
      <canvas ref={originalCanvasRef} className="hidden" />
    </div>
  );
}
