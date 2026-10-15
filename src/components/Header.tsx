import React from 'react';
import { FastForward, RefreshCw, TrendingUp, Sparkles, ShieldAlert, Award } from 'lucide-react';

interface HeaderProps {
  activeTab: 'terminal' | 'ipo' | 'rankings' | 'portfolio' | 'news';
  setActiveTab: (tab: 'terminal' | 'ipo' | 'rankings' | 'portfolio' | 'news') => void;
  cash: number;
  totalAssets: number;
  currentEpisodeWeek: number;
  currentSeasonName: string;
  onAdvanceWeek: () => void;
  onResetAccount: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cash,
  totalAssets,
  currentEpisodeWeek,
  currentSeasonName,
  onAdvanceWeek,
  onResetAccount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-rose-600 via-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <button
            onClick={() => setActiveTab('terminal')}
            className="text-left group cursor-pointer"
          >
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors whitespace-nowrap">
              AnimeX 动画交易所
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{currentSeasonName}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-medium font-mono tabular-nums">第{currentEpisodeWeek}周开播日</span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-3 text-sm font-medium">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            交易行情大厅
          </button>
          <button
            onClick={() => setActiveTab('ipo')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ipo'
                ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            新番IPO认购
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rankings'
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            热门排行榜
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'portfolio'
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            资产仓位
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'news'
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            业界快讯
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action & Asset Overview */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <span className="text-slate-400">总资产 / 可用</span>
            <div className="flex items-center gap-1.5 font-mono tabular-nums">
              <span className="text-emerald-400 font-semibold">¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-300">¥{cash.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button
            onClick={onAdvanceWeek}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded-md shadow-sm whitespace-nowrap cursor-pointer"
            title="模拟推进到下一周新番开播，触发作画神回/延期等事件与行情结算"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>推进新番开播周</span>
          </button>

          <button
            onClick={onResetAccount}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title="重置模拟交易账户"
            aria-label="重置账户"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav aria-label="移动端导航" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-1.5 px-2 text-[11px]">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded transition-colors cursor-pointer ${
            activeTab === 'terminal' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>行情大厅</span>
        </button>
        <button
          onClick={() => setActiveTab('ipo')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded transition-colors cursor-pointer ${
            activeTab === 'ipo' ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>新番IPO</span>
        </button>
        <button
          onClick={() => setActiveTab('rankings')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded transition-colors cursor-pointer ${
            activeTab === 'rankings' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>排行榜</span>
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded transition-colors cursor-pointer ${
            activeTab === 'portfolio' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>资产仓位</span>
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded transition-colors cursor-pointer ${
            activeTab === 'news' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FastForward className="w-4 h-4" />
          <span>快讯</span>
        </button>
      </nav>
    </header>
  );
};
