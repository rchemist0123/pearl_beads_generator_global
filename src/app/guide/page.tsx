'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { translations, Locale } from '../../i18n/translations';

export default function GuidePage() {
  const [locale, setLocale] = useState<Locale>('ko');
  const t = translations[locale];

  const steps = [
    { title: t.guideStep1Title, desc: t.guideStep1Desc, icon: '📸' },
    { title: t.guideStep2Title, desc: t.guideStep2Desc, icon: '⚙️' },
    { title: t.guideStep3Title, desc: t.guideStep3Desc, icon: '🎨' },
    { title: t.guideStep4Title, desc: t.guideStep4Desc, icon: '✨' },
    { title: t.guideStep5Title, desc: t.guideStep5Desc, icon: '🧹' },
    { title: t.guideStep6Title, desc: t.guideStep6Desc, icon: '💾' },
  ];

  const algorithms = [t.guideAlgorithm1, t.guideAlgorithm2];

  const tips = [t.guideTip1, t.guideTip2, t.guideTip3];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d0d1a]/95 backdrop-blur-sm border-b border-[#2a2a4a]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[#a78bfa] hover:text-white transition-colors"
          >
            {t.guideBack}
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
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{t.guideTitle}</h1>
          <p className="text-sm text-gray-400 mt-2">{t.subtitle}</p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {step.icon}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Core Algorithms */}
        <div className="rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] p-4">
          <h2 className="text-base font-bold text-[#a78bfa] mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            {t.guideAlgorithmTitle}
          </h2>
          <div className="space-y-3">
            {algorithms.map((algo, index) => (
              <div
                key={index}
                className="text-xs text-gray-300 leading-relaxed pl-4 border-l-2 border-[#7c3aed]"
              >
                {algo}
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] p-4">
          <h2 className="text-base font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t.guideTipTitle}
          </h2>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li
                key={index}
                className="text-xs text-gray-300 leading-relaxed flex items-start gap-2"
              >
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">
                  •
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* License Info */}
        <div className="rounded-2xl bg-[#16213e] border border-[#2a2a4a] p-4 text-center">
          <p className="text-xs text-gray-400">
            {t.license}: AGPL-3.0
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on{' '}
            <a
              href="https://github.com/Zippland/perler-beads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a78bfa] hover:underline"
            >
              Zippland/perler-beads
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
