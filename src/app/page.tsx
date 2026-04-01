'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
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
  const [granularity, setGranularity] = useState<number>(50);
  const [granularityInput, setGranularityInput] = useState<string>('50');
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
      if (e.target) e.target.value = '';
    },
    [handleImageLoad]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
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
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setIsGenerating(false);
        return;
      }

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const N = granularity;
      const M = Math.max(1, Math.round((imgHeight / imgWidth) * N));

      const palette = fullBeadPalette;
      const fallbackColor =
        palette.find((p) => p.hex.toUpperCase() === '#FFFFFF') || palette[0];

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

      const { colorCounts: counts, totalCount } = recalculateColorStats(grid);
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

      const { colorCounts: counts, totalCount } = recalculateColorStats(newData);
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

  const handleConfirmGranularity = useCallback(() => {
    const val = parseInt(granularityInput, 10);
    if (!isNaN(val) && val >= 10 && val <= 300) {
      setGranularity(val);
    } else {
      setGranularityInput(granularity.toString());
    }
  }, [granularityInput, granularity]);

  // Draw preview canvas - white background for external cells
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !mappedPixelData || !gridDimensions) return;

    const { N, M } = gridDimensions;
    const maxWidth = Math.min(window.innerWidth - 48, 600);
    const cellSize = Math.max(4, Math.floor(maxWidth / N));
    canvas.width = N * cellSize;
    canvas.height = M * cellSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background for the entire canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let j = 0; j < M; j++) {
      for (let i = 0; i < N; i++) {
        const cell = mappedPixelData[j]?.[i];
        if (!cell) continue;

        const x = i * cellSize;
        const y = j * cellSize;

        if (cell.isExternal) {
          // White for background/external cells
          ctx.fillStyle = '#FFFFFF';
        } else {
          ctx.fillStyle = cell.color;
        }
        ctx.fillRect(x, y, cellSize, cellSize);

        // Grid lines - light gray
        ctx.strokeStyle = '#DDDDDD';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.25, y + 0.25, cellSize, cellSize);
      }
    }
  }, [mappedPixelData, gridDimensions]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Sync granularity input
  useEffect(() => {
    setGranularityInput(granularity.toString());
  }, [granularity]);

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
    <div className="min-h-screen p-4 sm:p-6 flex flex-col items-center overflow-x-hidden">
      {/* Header */}
      <header className="w-full md:max-w-4xl text-center mt-6 mb-8 sm:mt-8 sm:mb-10 relative overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-blue-900 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-pink-900 rounded-full opacity-20 blur-3xl"></div>
        {/* Decorative dots */}
        <div className="absolute top-0 right-0 grid grid-cols-5 gap-1 opacity-10">
          {[...Array(25)].map((_, i) => (
            <div key={`tr-${i}`} className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 grid grid-cols-5 gap-1 opacity-10">
          {[...Array(25)].map((_, i) => (
            <div key={`bl-${i}`} className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
          ))}
        </div>

        <div className="relative z-10 py-8">
          {/* Bead icon grid */}
          <div className="relative mb-6 inline-block" style={{ animation: 'float 3s ease-in-out infinite' }}>
            <div className="grid grid-cols-4 gap-2 p-4 bg-gray-800/95 rounded-3xl shadow-2xl border border-gray-600">
              {['bg-red-400', 'bg-blue-400', 'bg-yellow-400', 'bg-green-400',
                'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-teal-400',
                'bg-indigo-400', 'bg-cyan-400', 'bg-lime-400', 'bg-amber-400',
                'bg-rose-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400'].map((color, i) => (
                <div key={i} className="relative">
                  <div
                    className={`w-5 h-5 rounded-full ${color} shadow-xl hover:scale-150 transition-all duration-500 relative z-10`}
                    style={{
                      animation: `float ${2 + (i % 3)}s ease-in-out infinite ${i * 0.1}s`,
                    }}
                  />
                  {i % 4 === 0 && <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-yellow-300 rounded-full animate-ping"></div>}
                  {i % 4 === 1 && <div className="absolute -bottom-0.5 -left-0.5 w-0.5 h-0.5 bg-pink-300 rounded-full animate-pulse"></div>}
                  {i % 4 === 2 && <div className="absolute -top-0.5 -left-0.5 w-0.5 h-0.5 bg-blue-300 rounded-full animate-bounce"></div>}
                  {i % 4 === 3 && <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-purple-300 rounded-full animate-spin"></div>}
                </div>
              ))}
            </div>
            {/* Sparkle decorations */}
            <div className="absolute -top-3 -right-4 w-3 h-3 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full animate-ping"></div>
            <div className="absolute -bottom-3 -left-4 w-2.5 h-2.5 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full animate-bounce"></div>
            <div className="absolute -top-1 -right-2 w-2 h-2 bg-gradient-to-br from-pink-400 to-purple-500 rotate-45 animate-spin"></div>
            <div className="absolute -bottom-1 -left-2 w-1.5 h-1.5 bg-gradient-to-br from-green-400 to-teal-500 rotate-45 animate-pulse"></div>
          </div>

          <div className="relative flex flex-col items-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-400 tracking-wider">
              {t.title}
            </h1>
            <p className="text-sm sm:text-base font-light text-gray-400 tracking-[0.15em]">
              {t.subtitle}
            </p>
          </div>

          {/* Nav links */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-xs">
            <Link
              href="/guide"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.guide}
            </Link>
            <span className="text-gray-600">·</span>
            <a
              href="https://github.com/Zippland/perler-beads"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-300 font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M12 0C5.37 0 0 5.48 0 12.25c0 5.42 3.44 10.01 8.2 11.63.6.12.82-.27.82-.6 0-.3-.01-1.08-.02-2.13-3.34.74-4.04-1.65-4.04-1.65-.55-1.44-1.35-1.83-1.35-1.83-1.1-.78.08-.77.08-.77 1.21.09 1.85 1.26 1.85 1.26 1.08 1.9 2.83 1.35 3.52 1.03.11-.81.42-1.35.77-1.66-2.66-.31-5.46-1.36-5.46-6.06 0-1.34.46-2.43 1.22-3.29-.12-.31-.53-1.55.12-3.23 0 0 1-.33 3.29 1.25a10.96 10.96 0 0 1 5.98 0c2.29-1.58 3.29-1.25 3.29-1.25.65 1.68.24 2.92.12 3.23.76.86 1.22 1.95 1.22 3.29 0 4.71-2.81 5.74-5.49 6.05.43.38.81 1.13.81 2.28 0 1.65-.02 2.98-.02 3.39 0 .33.22.72.83.59C20.56 22.25 24 17.67 24 12.25 24 5.48 18.63 0 12 0Z" />
              </svg>
              GitHub
            </a>
            <span className="text-gray-600">·</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700 outline-none cursor-pointer"
            >
              <option value="ko">한국어</option>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </header>

      <main className="w-full md:max-w-4xl flex flex-col items-center space-y-5 sm:space-y-6 relative overflow-hidden">
        {/* File Upload / Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-600 rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-800/50 transition-all duration-300 w-full md:max-w-md flex flex-col justify-center items-center shadow-sm hover:shadow-md"
          style={{ minHeight: '130px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-gray-500 mb-2 sm:mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-xs sm:text-sm text-gray-400">{t.uploadDesc}, <span className="font-medium text-blue-400">{t.uploadTitle}</span></p>
          <p className="text-xs text-gray-500 mt-1">{t.uploadFormats}</p>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />

        {/* Controls and Output */}
        {originalImageSrc && (
          <div className="w-full flex flex-col items-center space-y-5 sm:space-y-6">
            {/* Control Panel */}
            <div className="w-full md:max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-800 p-4 sm:p-5 rounded-xl shadow-md border border-gray-700">
              {/* Granularity Input */}
              <div className="flex-1">
                <label htmlFor="granularityInput" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
                  {t.granularity} (10-300):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="granularityInput"
                    value={granularityInput}
                    onChange={(e) => setGranularityInput(e.target.value)}
                    className="w-full p-1.5 border border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 h-9 shadow-sm bg-gray-700 text-gray-200 placeholder-gray-500"
                    min="10"
                    max="300"
                  />
                </div>
              </div>

              {/* Similarity Threshold */}
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
                  {t.similarity} (0-100):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm font-mono text-blue-400 w-8 text-right">{similarityThreshold}</span>
                </div>
              </div>

              {/* Action buttons row */}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    handleConfirmGranularity();
                    handleGenerate();
                  }}
                  disabled={isGenerating}
                  className="h-9 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 rounded-md whitespace-nowrap transition-colors duration-200 shadow-sm disabled:opacity-50"
                >
                  {isGenerating ? t.generating : t.generate}
                </button>
                <button
                  onClick={handleRemoveBackground}
                  disabled={!mappedPixelData || !gridDimensions || isRemovingBg}
                  className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-blue-700 bg-blue-900/30 text-blue-200 hover:bg-blue-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isRemovingBg ? t.removingBackground : t.removeBackground}
                </button>
                {mappedPixelData && (
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-emerald-700 bg-emerald-900/30 text-emerald-200 hover:bg-emerald-800/40 transition-colors duration-200 whitespace-nowrap"
                  >
                    {t.download}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors duration-200 whitespace-nowrap ml-auto"
                >
                  {t.reset}
                </button>
              </div>

              {/* Pixelation Mode */}
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
                  {t.mode}:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={pixelationMode}
                    onChange={(e) => setPixelationMode(e.target.value as PixelationMode)}
                    className="w-full p-1.5 border border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 h-9 shadow-sm bg-gray-700 text-gray-200"
                  >
                    <option value={PixelationMode.Dominant}>{t.modeDominant}</option>
                    <option value={PixelationMode.Average}>{t.modeAverage}</option>
                  </select>
                </div>
              </div>

              {/* Color System */}
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
                  {t.colorSystem}:
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorSystemOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setSelectedColorSystem(option.key)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 flex-shrink-0 ${
                        selectedColorSystem === option.key
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md transform scale-105'
                          : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-blue-500 hover:bg-gray-600'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status message */}
            {statusMessage && (
              <div className="w-full md:max-w-2xl text-center text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 rounded-lg py-2">
                {statusMessage}
              </div>
            )}

            {/* Canvas Preview */}
            <div className="w-full md:max-w-2xl">
              <canvas ref={originalCanvasRef} className="hidden"></canvas>

              {/* Preview container */}
              <div className="bg-gray-800 p-4 rounded-xl shadow-md border border-gray-700">
                {gridDimensions && (
                  <div className="mb-3 sm:mb-4 flex items-center justify-between text-xs text-gray-400">
                    <span>{t.result} ({gridDimensions.N} × {gridDimensions.M})</span>
                    <span>{t.totalBeads}: {totalBeadCount.toLocaleString()}</span>
                  </div>
                )}
                {/* White background container for the canvas */}
                <div className="flex justify-center mb-3 sm:mb-4 bg-white p-2 rounded-lg overflow-x-auto overflow-y-hidden"
                     style={{ minHeight: '150px' }}>
                  <canvas
                    ref={previewCanvasRef}
                    className="max-w-full"
                  />
                </div>
              </div>
            </div>

            {/* Color Statistics */}
            {colorCounts && Object.keys(colorCounts).length > 0 && (
              <div className="w-full md:max-w-2xl mt-6 bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
                <h3 className="text-lg font-semibold mb-1 text-gray-200 text-center">
                  {t.colorStats}
                </h3>
                <p className="text-xs text-center text-gray-400 mb-3">
                  {t.totalBeads}: {totalBeadCount.toLocaleString()} | {t.colors}: {sortedColorStats.length}
                </p>
                <ul className="space-y-1 max-h-60 overflow-y-auto pr-2 text-sm">
                  {sortedColorStats.map((item) => (
                    <li
                      key={item.hex}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className="inline-block w-4 h-4 rounded border border-gray-500 flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-mono font-medium text-gray-200">
                          {item.displayKey}
                        </span>
                      </div>
                      <span className="text-xs text-gray-300">
                        {item.count} {t.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full md:max-w-4xl mx-auto px-4 mt-auto pt-8 pb-6">
        <div className="border-t border-gray-800 pt-4 text-center text-xs text-gray-500 space-y-1">
          <p>
            {t.license}: AGPL-3.0 |{' '}
            <a
              href="https://github.com/Zippland/perler-beads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {t.originalProject}: Zippland/perler-beads
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
