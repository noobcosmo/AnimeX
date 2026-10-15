import React, { useState } from 'react';
import { AnimeStock } from '../types/market.ts';
import { TrendingUp, TrendingDown, Flame, DollarSign, Star, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MarketRankingsProps {
  stocks: AnimeStock[];
  onSelectStock: (code: string) => void;
}

type RankingCategory = 'GAINERS' | 'LOSERS' | 'VOLUME' | 'SHORT' | 'RATING';

export const MarketRankings: React.FC<MarketRankingsProps> = ({ stocks, onSelectStock }) => {
  const [category, setCategory] = useState<RankingCategory>('GAINERS');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');

  // Filter by season
  const filteredStocks = seasonFilter === 'ALL'
    ? stocks
    : stocks.filter(s => s.seasonTag === seasonFilter);

  // Sort based on category
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const aChange = (a.currentPrice - a.previousClose) / a.previousClose;
    const bChange = (b.currentPrice - b.previousClose) / b.previousClose;

    switch (category) {
      case 'GAINERS':
        return bChange - aChange;
      case 'LOSERS':
        return aChange - bChange;
      case 'VOLUME':
        return b.turnover - a.turnover;
      case 'SHORT':
        return b.shortInterestRatio - a.shortInterestRatio;
      case 'RATING':
        return b.malScore - a.malScore;
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Category selector & Season Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setCategory('GAINERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              category === 'GAINERS'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>涨幅排行榜 (含涨停板)</span>
          </button>
          <button
            onClick={() => setCategory('LOSERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              category === 'LOSERS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>跌幅排行榜 (含跌停板)</span>
          </button>
          <button
            onClick={() => setCategory('VOLUME')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              category === 'VOLUME'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>成交额榜</span>
          </button>
          <button
            onClick={() => setCategory('SHORT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              category === 'SHORT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>融券做空榜</span>
          </button>
          <button
            onClick={() => setCategory('RATING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              category === 'RATING'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Bangumi/MAL口碑榜</span>
          </button>
        </div>

        {/* Season Filter Dropdown / Segmented */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">季度板:</span>
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="ALL">全部季度新番</option>
            <option value="2026_FALL">2026年10月秋季番</option>
            <option value="2026_SUMMER">2026年7月夏季番</option>
            <option value="2026_SPRING">2026年4月春季番</option>
            <option value="CLASSIC">经典蓝筹板</option>
          </select>
        </div>
      </div>

      {/* High-Density Rankings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-xs border-b border-slate-800">
                <th className="py-3 px-4 font-medium w-16 text-center">排名</th>
                <th className="py-3 px-4 font-medium">动画标的 / 代码</th>
                <th className="py-3 px-4 font-medium">制作会社 / 监督</th>
                <th className="py-3 px-4 font-medium text-right">最新行情</th>
                <th className="py-3 px-4 font-medium text-right">今日涨跌幅</th>
                <th className="py-3 px-4 font-medium text-right">涨跌停状态</th>
                <th className="py-3 px-4 font-medium text-right">做空比率</th>
                <th className="py-3 px-4 font-medium text-right">总市值</th>
                <th className="py-3 px-4 font-medium text-right">评分</th>
                <th className="py-3 px-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {sortedStocks.map((stock, index) => {
                const changeAmount = stock.currentPrice - stock.previousClose;
                const changePercent = (changeAmount / stock.previousClose) * 100;
                const isUp = changeAmount >= 0;

                return (
                  <tr
                    key={stock.id}
                    className="hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {index === 0 && <span className="inline-block w-6 h-6 rounded-full bg-amber-400 text-slate-950 leading-6 text-center shadow">1</span>}
                      {index === 1 && <span className="inline-block w-6 h-6 rounded-full bg-slate-300 text-slate-950 leading-6 text-center shadow">2</span>}
                      {index === 2 && <span className="inline-block w-6 h-6 rounded-full bg-amber-700 text-white leading-6 text-center shadow">3</span>}
                      {index > 2 && <span className="text-slate-400">{index + 1}</span>}
                    </td>

                    {/* Anime Title & Code */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-amber-400 font-semibold">{stock.code}</span>
                          <span className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                            {stock.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{stock.originalTitle}</span>
                      </div>
                    </td>

                    {/* Studio */}
                    <td className="py-3 px-4 text-slate-300">
                      <div>{stock.studio}</div>
                      <div className="text-[11px] text-slate-500">监督: {stock.director}</div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-sm font-bold text-white">
                      ¥{stock.currentPrice.toFixed(2)}
                    </td>

                    {/* Change % */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          isUp ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isUp ? '+' : ''}{changePercent.toFixed(2)}%
                      </span>
                    </td>

                    {/* Limit status */}
                    <td className="py-3 px-4 text-right">
                      {stock.isLimitUp && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          🔴 封死涨停
                        </span>
                      )}
                      {stock.isLimitDown && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          🟢 触及跌停
                        </span>
                      )}
                      {!stock.isLimitUp && !stock.isLimitDown && (
                        <span className="text-slate-500 text-[11px]">正常交易</span>
                      )}
                    </td>

                    {/* Short Ratio */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span className={stock.shortInterestRatio > 18 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {stock.shortInterestRatio.toFixed(1)}%
                      </span>
                    </td>

                    {/* Market Cap */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      ¥{stock.marketCap}亿
                    </td>

                    {/* Score */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-300">
                      ★ {stock.malScore.toFixed(2)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectStock(stock.code)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-amber-400 hover:text-slate-900 text-slate-200 font-medium rounded transition-colors cursor-pointer text-xs"
                      >
                        看盘交易
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
