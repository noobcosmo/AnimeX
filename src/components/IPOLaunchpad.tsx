import React, { useState } from 'react';
import { IPOCampaign } from '../types/market.ts';
import { Sparkles, Trophy, CheckCircle2, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';
import { round } from '../utils/stockEngine.ts';

interface IPOLaunchpadProps {
  campaigns: IPOCampaign[];
  cash: number;
  onSubscribeIPO: (campaignId: string, shares: number) => { success: boolean; message: string };
  onSimulateListing: (campaignId: string) => void;
  onSelectStockToTrade: (code: string) => void;
}

export const IPOLaunchpad: React.FC<IPOLaunchpadProps> = ({
  campaigns,
  cash,
  onSubscribeIPO,
  onSimulateListing,
  onSelectStockToTrade,
}) => {
  const [selectedCampaign, setSelectedCampaign] = useState<IPOCampaign | null>(null);
  const [subscribeShares, setSubscribeShares] = useState<number>(500);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleOpenSubscribe = (campaign: IPOCampaign) => {
    setSelectedCampaign(campaign);
    // default 10% of cash or 500 shares
    const maxAffordable = Math.floor(cash / campaign.issuePrice / 10) * 10;
    setSubscribeShares(Math.min(500, Math.max(10, maxAffordable)));
    setMessage(null);
  };

  const handleConfirmSubscribe = () => {
    if (!selectedCampaign) return;
    const res = onSubscribeIPO(selectedCampaign.id, subscribeShares);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setTimeout(() => {
        setSelectedCampaign(null);
        setMessage(null);
      }, 1800);
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Banner for IPO Center */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border border-rose-900/40 p-6">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold mb-2">
              <Sparkles className="w-4 h-4" />
              <span>新番发行认购中心 · 2027年冬季番IPO专属通道</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
              认购下季度新番IPO，抢占开盘溢价红利
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              每季度上市一批重磅日本动画。在开播前以<span className="text-amber-400 font-semibold">发行底价</span>参与摇号认购。
              若剧集开播引发热烈反响，首日上市溢价最高可获超额红利收益！
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col gap-1.5 shrink-0 min-w-[220px]">
            <span className="text-xs text-slate-400">当前可用认购备用金</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              ¥{cash.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500">申购资金在上市摇号前暂时冻结，未中签全额退回</span>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {campaigns.map((camp) => {
          const isListed = camp.status === 'LISTED';
          const totalCost = round(camp.issuePrice * (camp.userSubscribedShares || 0), 2);

          return (
            <div
              key={camp.id}
              className={`relative bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isListed
                  ? 'border-emerald-700/60 bg-gradient-to-b from-slate-900 to-emerald-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="font-mono text-amber-400 font-bold">{camp.stockCode}</span>
                      <span>·</span>
                      <span>{camp.studio}</span>
                      <span>·</span>
                      <span className="text-rose-400">{camp.targetSeason}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{camp.title}</h3>
                    <p className="text-xs text-slate-400 italic">{camp.originalTitle}</p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded font-semibold whitespace-nowrap ${
                      isListed
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {isListed ? '已正式上市交易' : `申购倒计时 ${camp.daysLeft} 天`}
                  </span>
                </div>

                {/* Genres & Director */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                  <span>监督: {camp.director}</span>
                  <span>·</span>
                  <span>题材: {camp.genres.join(' / ')}</span>
                </div>

                {/* Hype Description */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-4">
                  {camp.hypeDescription}
                </p>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-4 gap-2 text-xs font-mono mb-4 text-center">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">IPO发行价</span>
                    <span className="text-amber-400 font-bold">¥{camp.issuePrice.toFixed(2)}</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">发售配额</span>
                    <span className="text-slate-200">{(camp.totalSharesOffered / 1000).toFixed(0)}k股</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">超额认购</span>
                    <span className="text-rose-400 font-bold">{camp.subscriptionMultiplier}x</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">预估中签率</span>
                    <span className="text-cyan-400 font-bold">{camp.estimatedWinRate}%</span>
                  </div>
                </div>

                {/* User's Subscription Status */}
                {camp.userSubscribedShares > 0 && (
                  <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-xs mb-4 flex items-center justify-between font-mono">
                    <span className="text-amber-300">已申购配额: {camp.userSubscribedShares} 股</span>
                    <span className="text-slate-400">冻结保证金: ¥{totalCost.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                {isListed ? (
                  <button
                    onClick={() => onSelectStockToTrade(camp.stockCode)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>已上市！前往交易大厅看盘交易</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenSubscribe(camp)}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded transition-colors cursor-pointer active:scale-98"
                    >
                      {camp.userSubscribedShares > 0 ? '追加认购份额' : '立即认购申购'}
                    </button>
                    <button
                      onClick={() => onSimulateListing(camp.id)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1"
                      title="提前模拟上市摇号与首日敲钟暴涨行情"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>上市敲钟</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subscription Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              申购新番IPO: {selectedCampaign.title}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              股票代码: <span className="font-mono text-amber-400">{selectedCampaign.stockCode}</span> · 发行单价: <span className="font-mono text-white">¥{selectedCampaign.issuePrice.toFixed(2)}</span>
            </p>

            <div className="flex flex-col gap-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">认购股数 (以10股为一手):</label>
                <input
                  type="number"
                  step="10"
                  min="10"
                  value={subscribeShares}
                  onChange={(e) => setSubscribeShares(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white font-mono text-base focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Slider for convenience */}
              <input
                type="range"
                min="10"
                max={Math.max(500, Math.floor(cash / selectedCampaign.issuePrice))}
                step="10"
                value={subscribeShares}
                onChange={(e) => setSubscribeShares(parseInt(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>需冻结认购资金:</span>
                  <span className="text-rose-400 font-bold">
                    ¥{round(subscribeShares * selectedCampaign.issuePrice, 2).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>预估可中签股数:</span>
                  <span className="text-emerald-400">
                    ≈ {Math.floor((subscribeShares * (selectedCampaign.estimatedWinRate / 100)) / 10) * 10} 股
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>未中签退款保障:</span>
                  <span className="text-slate-300">100% 自动原路退还</span>
                </div>
              </div>

              {message && (
                <div
                  className={`p-2.5 rounded text-xs flex items-center gap-1.5 ${
                    message.type === 'success'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCampaign(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubscribe}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded cursor-pointer shadow-md"
                >
                  确认冻结申购
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
