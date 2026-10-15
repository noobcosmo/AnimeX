import React from 'react';
import { MarketNews } from '../types/market.ts';
import { Sparkles, AlertOctagon, Flame, Disc, Radio, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface NewsFeedProps {
  news: MarketNews[];
  onSelectStock?: (code: string) => void;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news, onSelectStock }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
          <h2 className="text-base font-bold text-white">业界番剧快讯 · 实时催化剂舆情</h2>
        </div>
        <span className="text-xs text-slate-400">行情波动主要受作画质量、收视热度与播放延期驱动</span>
      </div>

      <div className="flex flex-col gap-3">
        {news.map((item) => {
          const isBull = item.sentiment === 'BULLISH';
          const isBear = item.sentiment === 'BEARISH';

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all bg-slate-900 ${
                isBull
                  ? 'border-rose-900/40 hover:border-rose-800/80'
                  : isBear
                  ? 'border-emerald-900/40 hover:border-emerald-800/80'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-slate-400">{item.timestamp}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-400 font-semibold">{item.season}</span>
                  {item.episode && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">第{item.episode}集播出</span>
                    </>
                  )}
                  {item.stockCode && (
                    <>
                      <span className="text-slate-600">·</span>
                      <button
                        onClick={() => onSelectStock && onSelectStock(item.stockCode!)}
                        className="font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        [{item.stockCode}] {item.stockTitle}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 font-mono text-xs font-bold shrink-0">
                  {isBull && (
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-0.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      +{item.impactPercent}% 催化
                    </span>
                  )}
                  {isBear && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-0.5">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      {item.impactPercent}% 冲击
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                {item.type === 'SAKUGA' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                {item.type === 'DELAY' && <AlertOctagon className="w-4 h-4 text-emerald-400 shrink-0" />}
                {item.type === 'SALES' && <Disc className="w-4 h-4 text-rose-400 shrink-0" />}
                {item.type === 'SURPRISE' && <Flame className="w-4 h-4 text-indigo-400 shrink-0" />}
                <span>{item.title}</span>
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                {item.summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
