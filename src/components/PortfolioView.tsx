import React, { useState } from 'react';
import { AnimeStock, Position, TransactionRecord, UserAccount } from '../types/market.ts';
import { calculateLongPnL, calculateShortPnL, round } from '../utils/stockEngine.ts';
import { ShieldCheck, AlertTriangle, ArrowUpRight, ArrowDownRight, Layers, History, DollarSign } from 'lucide-react';

interface PortfolioViewProps {
  account: UserAccount;
  stocks: AnimeStock[];
  onClosePosition: (position: Position) => void;
  onSelectStock: (code: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  account,
  stocks,
  onClosePosition,
  onSelectStock,
}) => {
  const [subTab, setSubTab] = useState<'POSITIONS' | 'IPO' | 'HISTORY'>('POSITIONS');

  const stockMap = new Map<string, AnimeStock>();
  stocks.forEach(s => stockMap.set(s.code, s));

  // Compute portfolio metrics
  let totalLongValue = 0;
  let totalShortCollateral = 0;
  let totalUnrealizedPnL = 0;

  account.positions.forEach(pos => {
    const stock = stockMap.get(pos.stockCode);
    const currentPrice = stock ? stock.currentPrice : pos.averageCost;

    if (pos.type === 'LONG') {
      const { pnl } = calculateLongPnL(pos.shares, pos.averageCost, currentPrice);
      totalLongValue += pos.shares * currentPrice;
      totalUnrealizedPnL += pnl;
    } else {
      const { pnl } = calculateShortPnL(pos.shares, pos.averageCost, currentPrice);
      const collateral = pos.marginCollateral || round(pos.shares * pos.averageCost * 0.5, 2);
      totalShortCollateral += collateral;
      totalUnrealizedPnL += pnl;
    }
  });

  // Frozen cash in IPOs
  const totalFrozenInIpo = account.subscribedIpos.reduce((sum, item) => sum + item.frozenCash, 0);

  // Total Equity = Cash + Long Value + Short Collateral + Unrealized PnL
  const totalEquity = round(account.cash + totalLongValue + totalShortCollateral + totalUnrealizedPnL, 2);
  const totalReturnPercent = round(((totalEquity - account.initialCash) / account.initialCash) * 100, 2);

  return (
    <div className="flex flex-col gap-6">
      {/* Account KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Assets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">账户总资产 (日元)</span>
          <div className="mt-2">
            <span className="text-xl lg:text-2xl font-bold font-mono tabular-nums text-white">
              ¥{totalEquity.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs font-mono">
            <span className="text-slate-400">总收益率:</span>
            <span className={totalReturnPercent >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Available Cash */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">可用现金余额</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-400">
              ¥{account.cash.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="mt-1 text-[11px] text-slate-400">可自由买入与做多</span>
        </div>

        {/* Long Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">多头持仓总市值</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums text-rose-300">
              ¥{totalLongValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="mt-1 text-[11px] text-slate-400">看涨动画资产</span>
        </div>

        {/* Short Collateral */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">融券做空占用保证金</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums text-amber-400">
              ¥{totalShortCollateral.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="mt-1 text-[11px] text-slate-400">50%维持质押比</span>
        </div>

        {/* Floating PnL */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-xs text-slate-400">总浮动盈亏</span>
          <div className="mt-2">
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                totalUnrealizedPnL >= 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {totalUnrealizedPnL >= 0 ? '+' : ''}¥{totalUnrealizedPnL.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="mt-1 text-[11px] text-slate-400">当前持仓实时波动</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setSubTab('POSITIONS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
            subTab === 'POSITIONS' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>当前持仓明细 ({account.positions.length})</span>
        </button>
        <button
          onClick={() => setSubTab('IPO')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
            subTab === 'IPO' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>新番IPO申购中 ({account.subscribedIpos.length})</span>
        </button>
        <button
          onClick={() => setSubTab('HISTORY')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
            subTab === 'HISTORY' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>历史交易流水账 ({account.history.length})</span>
        </button>
      </div>

      {/* Sub-tab 1: Active Positions */}
      {subTab === 'POSITIONS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {account.positions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Layers className="w-10 h-10 text-slate-600" />
              <p className="text-sm text-slate-400 font-medium">当前暂无任何持仓头寸</p>
              <p className="text-xs text-slate-500">前往交易行情大厅买入看好的新番，或融券做空可能烂尾的动画吧！</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800">
                    <th className="py-3 px-4 font-medium">方向</th>
                    <th className="py-3 px-4 font-medium">动画标的</th>
                    <th className="py-3 px-4 font-medium text-right">持仓股数</th>
                    <th className="py-3 px-4 font-medium text-right">持仓成本</th>
                    <th className="py-3 px-4 font-medium text-right">最新市价</th>
                    <th className="py-3 px-4 font-medium text-right">浮动盈亏</th>
                    <th className="py-3 px-4 font-medium text-right">保证金 / 强平线</th>
                    <th className="py-3 px-4 font-medium text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {account.positions.map((pos) => {
                    const stock = stockMap.get(pos.stockCode);
                    const currentPrice = stock ? stock.currentPrice : pos.averageCost;
                    const isLong = pos.type === 'LONG';
                    const { pnl, pnlPercent } = isLong
                      ? calculateLongPnL(pos.shares, pos.averageCost, currentPrice)
                      : calculateShortPnL(pos.shares, pos.averageCost, currentPrice);

                    // Risk status for short positions
                    const isRiskHigh = !isLong && pos.liquidationPrice && currentPrice >= pos.liquidationPrice * 0.9;

                    return (
                      <tr key={pos.id} className="hover:bg-slate-800/50 transition-colors">
                        {/* Type Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isLong
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {isLong ? '做多 LONG' : '融券做空 SHORT'}
                          </span>
                        </td>

                        {/* Title & Code */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onSelectStock(pos.stockCode)}
                            className="text-left group cursor-pointer"
                          >
                            <span className="font-mono text-amber-400 font-semibold mr-1.5">{pos.stockCode}</span>
                            <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                              {pos.stockTitle}
                            </span>
                          </button>
                        </td>

                        {/* Shares */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-white">
                          {pos.shares.toLocaleString()} 股
                        </td>

                        {/* Avg Cost */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                          ¥{pos.averageCost.toFixed(2)}
                        </td>

                        {/* Current Price */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-white font-bold">
                          ¥{currentPrice.toFixed(2)}
                        </td>

                        {/* PnL */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <span className={`font-bold ${pnl >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {pnl >= 0 ? '+' : ''}¥{pnl.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="block text-[11px]">({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
                          </span>
                        </td>

                        {/* Margin & Liquidation */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {isLong ? (
                            <span className="text-slate-500">现货无需质押</span>
                          ) : (
                            <div>
                              <span className="text-slate-300">押: ¥{pos.marginCollateral?.toLocaleString()}</span>
                              <div className={`text-[11px] font-bold ${isRiskHigh ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                                强平价: ¥{pos.liquidationPrice?.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Close Action */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onClosePosition(pos)}
                            className="px-3 py-1 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-200 rounded font-semibold transition-colors cursor-pointer"
                          >
                            市价平仓
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: IPO Subscriptions */}
      {subTab === 'IPO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          {account.subscribedIpos.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">暂无正在进行的IPO申购</div>
          ) : (
            <div className="divide-y divide-slate-800 text-xs font-mono">
              {account.subscribedIpos.map((sub, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-amber-400 font-bold mr-2">{sub.stockCode}</span>
                    <span className="text-white font-medium">IPO申购份额: {sub.shares} 股</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">已冻结保证金: ¥{sub.frozenCash.toLocaleString()}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[11px]">
                      等待上市摇号分配
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: History */}
      {subTab === 'HISTORY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {account.history.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">暂无成交流水记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-4 font-medium">时间</th>
                    <th className="py-2.5 px-4 font-medium">类型</th>
                    <th className="py-2.5 px-4 font-medium">代码 / 动画</th>
                    <th className="py-2.5 px-4 font-medium text-right">成交价</th>
                    <th className="py-2.5 px-4 font-medium text-right">数量</th>
                    <th className="py-2.5 px-4 font-medium text-right">成交金额</th>
                    <th className="py-2.5 px-4 font-medium text-right">结算盈亏</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {account.history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-4 text-slate-400">{h.timestamp}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            h.side === 'BUY'
                              ? 'bg-rose-950 text-rose-300'
                              : h.side === 'SELL'
                              ? 'bg-emerald-950 text-emerald-300'
                              : h.side === 'SHORT'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-indigo-950 text-indigo-300'
                          }`}
                        >
                          {h.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-white">{h.stockCode} · {h.stockTitle}</td>
                      <td className="py-2.5 px-4 text-right">¥{h.price.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right">{h.shares}</td>
                      <td className="py-2.5 px-4 text-right">¥{h.amount.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right">
                        {h.realizedPnL !== undefined ? (
                          <span className={h.realizedPnL >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {h.realizedPnL >= 0 ? '+' : ''}¥{h.realizedPnL.toFixed(2)}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
