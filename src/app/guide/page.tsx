'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { translations, Locale } from '../../i18n/translations';

export default function GuidePage() {
  const [locale, setLocale] = useState<Locale>('ko');
  const t = translations[locale];

  const steps = [
    { title: t.guideStep1Title, desc: t.guideStep1Desc, icon: '1' },
    { title: t.guideStep2Title, desc: t.guideStep2Desc, icon: '2' },
    { title: t.guideStep3Title, desc: t.guideStep3Desc, icon: '3' },
    { title: t.guideStep4Title, desc: t.guideStep4Desc, icon: '4' },
    { title: t.guideStep5Title, desc: t.guideStep5Desc, icon: '5' },
    { title: t.guideStep6Title, desc: t.guideStep6Desc, icon: '6' },
  ];

  const algorithms = [t.guideAlgorithm1, t.guideAlgorithm2];
  const tips = [t.guideTip1, t.guideTip2, t.guideTip3];

  return (
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden">
      {/* Header */}
      <header className="w-full text-center mt-6 mb-6 px-4 relative">
        <div className="absolute top-0 left-0 w-48 h-48 bg-blue-900 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-pink-900 rounded-full opacity-20 blur-3xl"></div>

        <div className="relative z-10 py-4 flex items-center justify-between max-w-2xl mx-auto">
          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t.guideBack}
          </Link>
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
      </header>

      <main className="w-full max-w-2xl px-4 pb-20 space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
            {t.guideTitle}
          </h1>
          <p className="text-sm text-gray-400 mt-2">{t.subtitle}</p>
        </div>

        {/* Steps - card style */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-200">
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
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-md">
          <h2 className="text-base font-bold text-blue-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {t.guideAlgorithmTitle}
          </h2>
          <div className="space-y-3">
            {algorithms.map((algo, index) => (
              <div
                key={index}
                className="text-xs text-gray-300 leading-relaxed pl-4 border-l-2 border-blue-500"
              >
                {algo}
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-md">
          <h2 className="text-base font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.guideTipTitle}
          </h2>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li
                key={index}
                className="text-xs text-gray-300 leading-relaxed flex items-start gap-2"
              >
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* License */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400">
            {t.license}: AGPL-3.0
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on{' '}
            <a
              href="https://github.com/Zippland/perler-beads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Zippland/perler-beads
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
