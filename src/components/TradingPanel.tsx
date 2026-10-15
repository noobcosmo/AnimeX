import React, { useState } from 'react';
import { AnimeStock, OrderBook, Position, TradeSide } from '../types/market.ts';
import {
  calculateLimitPrices,
  calculateShortCollateral,
  calculateShortLiquidationPrice,
  round,
} from '../utils/stockEngine.ts';
import { ArrowDownRight, ArrowUpRight, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TradingPanelProps {
  stock: AnimeStock;
  orderBook: OrderBook;
  cash: number;
  positions: Position[];
  onExecuteTrade: (params: {
    stockCode: string;
    stockTitle: string;
    side: TradeSide;
    shares: number;
    price: number;
  }) => { success: boolean; message: string };
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  stock,
  orderBook,
  cash,
  positions,
  onExecuteTrade,
}) => {
  const [side, setSide] = useState<TradeSide>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [customPrice, setCustomPrice] = useState<number>(stock.currentPrice);
  const [shares, setShares] = useState<number>(100);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Existing positions for this stock
  const longPosition = positions.find(p => p.stockCode === stock.code && p.type === 'LONG');
  const shortPosition = positions.find(p => p.stockCode === stock.code && p.type === 'SHORT');

  const executionPrice = orderType === 'MARKET' ? stock.currentPrice : customPrice;

  // Calculations based on side
  const tradeAmount = round(shares * executionPrice, 2);
  const estimatedCommission = round(Math.max(5, tradeAmount * 0.0005), 2);

  // Short margin (50% collateral)
  const shortRequiredCollateral = calculateShortCollateral(shares, executionPrice);
  const shortEstimatedLiq = calculateShortLiquidationPrice(executionPrice);

  // Total cash required
  let totalCashRequired = 0;
  if (side === 'BUY') {
    totalCashRequired = tradeAmount + estimatedCommission;
  } else if (side === 'SHORT') {
    totalCashRequired = shortRequiredCollateral + estimatedCommission;
  }

  // Max shares calculable
  const getMaxShares = (): number => {
    if (side === 'BUY') {
      return Math.floor(cash / (executionPrice * 1.0005) / 10) * 10;
    }
    if (side === 'SELL') {
      return longPosition ? longPosition.shares : 0;
    }
    if (side === 'SHORT') {
      // 50% margin
      return Math.floor(cash / (executionPrice * 0.5005) / 10) * 10;
    }
    if (side === 'COVER') {
      return shortPosition ? shortPosition.shares : 0;
    }
    return 0;
  };

  const handlePercentage = (pct: number) => {
    const max = getMaxShares();
    const calculated = Math.floor((max * pct) / 10) * 10;
    setShares(Math.max(10, calculated));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (shares <= 0) {
      setStatusMessage({ text: '交易股数必须大于0', type: 'error' });
      return;
    }

    // Limit price validation
    if (orderType === 'LIMIT') {
      const { limitUpPrice, limitDownPrice } = calculateLimitPrices(stock.previousClose);
      if (customPrice > limitUpPrice || customPrice < limitDownPrice) {
        setStatusMessage({
          text: `委托价超出今日涨跌停范围 (${limitDownPrice} ~ ${limitUpPrice})`,
          type: 'error',
        });
        return;
      }
    }

    // Circuit breaker limits execution validation
    if (stock.isLimitUp && side === 'BUY') {
      setStatusMessage({
        text: '标的当前已封死涨停板 (+10%)，卖盘全无，市价买单无法即时撮合！',
        type: 'error',
      });
      return;
    }

    if (stock.isLimitDown && (side === 'SELL' || side === 'SHORT')) {
      setStatusMessage({
        text: '标的当前已触及跌停板 (-10%)，买盘冻结，无法市价抛售或新增空头！',
        type: 'error',
      });
      return;
    }

    const result = onExecuteTrade({
      stockCode: stock.code,
      stockTitle: stock.title,
      side,
      shares,
      price: executionPrice,
    });

    if (result.success) {
      setStatusMessage({ text: result.message, type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      setStatusMessage({ text: result.message, type: 'error' });
    }
  };

  // Max volume in depth for visual bars
  const maxDepthQty = Math.max(
    ...orderBook.asks.map(a => a.quantity),
    ...orderBook.bids.map(b => b.quantity),
    1
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 border border-slate-800 rounded-lg p-4">
      {/* Column 1: Order Book (五档盘口) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
          <span className="font-semibold text-slate-200">实时买卖五档盘口</span>
          <span className="font-mono">单位: 股 / 日元</span>
        </div>

        <div className="flex flex-col gap-1 text-xs font-mono">
          {/* Asks (卖五到卖一，从高到低排列) */}
          <div className="flex flex-col gap-1">
            {[...orderBook.asks].reverse().map((ask, idx) => {
              const levelName = `卖${orderBook.asks.length - idx}`;
              const barWidth = `${(ask.quantity / maxDepthQty) * 100}%`;
              return (
                <div
                  key={`ask-${idx}`}
                  onClick={() => setCustomPrice(ask.price)}
                  className="relative flex items-center justify-between px-2 py-1 rounded bg-slate-950/60 hover:bg-rose-950/40 cursor-pointer transition-colors"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/15 rounded-r pointer-events-none"
                    style={{ width: barWidth }}
                  />
                  <span className="text-slate-400 z-10">{levelName}</span>
                  <span className="text-rose-400 font-bold z-10">{ask.price.toFixed(2)}</span>
                  <span className="text-slate-300 z-10">{ask.quantity.toLocaleString()}</span>
                </div>
              );
            })}
          </div>

          {/* Current Middle Price Divider */}
          <div className="my-1.5 py-1 px-2.5 bg-slate-950 border-y border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">最新成交价</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-base font-bold ${stock.currentPrice >= stock.previousClose ? 'text-rose-400' : 'text-emerald-400'}`}>
                {stock.currentPrice.toFixed(2)}
              </span>
              {stock.currentPrice >= stock.previousClose ? (
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <span className="text-xs text-slate-400">
              {stock.currentPrice >= stock.previousClose ? '+' : ''}
              {(((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100).toFixed(2)}%
            </span>
          </div>

          {/* Bids (买一到买五) */}
          <div className="flex flex-col gap-1">
            {orderBook.bids.map((bid, idx) => {
              const levelName = `买${idx + 1}`;
              const barWidth = `${(bid.quantity / maxDepthQty) * 100}%`;
              return (
                <div
                  key={`bid-${idx}`}
                  onClick={() => setCustomPrice(bid.price)}
                  className="relative flex items-center justify-between px-2 py-1 rounded bg-slate-950/60 hover:bg-emerald-950/40 cursor-pointer transition-colors"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 rounded-r pointer-events-none"
                    style={{ width: barWidth }}
                  />
                  <span className="text-slate-400 z-10">{levelName}</span>
                  <span className="text-emerald-400 font-bold z-10">{bid.price.toFixed(2)}</span>
                  <span className="text-slate-300 z-10">{bid.quantity.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current position summary for this stock */}
        <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400 flex flex-col gap-1 bg-slate-950/80 p-2.5 rounded">
          <div className="flex justify-between">
            <span>当前多头持仓:</span>
            <span className="font-mono text-slate-200">
              {longPosition ? `${longPosition.shares} 股 (均价 ¥${longPosition.averageCost})` : '无'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>当前做空头寸:</span>
            <span className="font-mono text-rose-300">
              {shortPosition ? `${shortPosition.shares} 股 (均价 ¥${shortPosition.averageCost})` : '无'}
            </span>
          </div>
        </div>
      </div>

      {/* Column 2: Trade Execution Order Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Trade Side Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              side === 'BUY'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            做多买入
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              side === 'SELL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            卖出平多
          </button>
          <button
            type="button"
            onClick={() => setSide('SHORT')}
            className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              side === 'SHORT'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="融券做空：看衰动画后期崩盘/作画延期，股价下跌获利"
          >
            融券做空
          </button>
          <button
            type="button"
            onClick={() => setSide('COVER')}
            className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              side === 'COVER'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="买入平空：归还借入的股票，锁定做空利润"
          >
            买入平空
          </button>
        </div>

        {/* Order Type Toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">委托类型:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setOrderType('MARKET');
                setCustomPrice(stock.currentPrice);
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                orderType === 'MARKET' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400'
              }`}
            >
              市价即时
            </button>
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                orderType === 'LIMIT' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400'
              }`}
            >
              限价挂单
            </button>
          </div>
        </div>

        {/* Price Input (if LIMIT) */}
        {orderType === 'LIMIT' ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1">委托限价 (日元)</label>
            <input
              type="number"
              step="0.1"
              min={stock.limitDownPrice}
              max={stock.limitUpPrice}
              value={customPrice}
              onChange={(e) => setCustomPrice(parseFloat(e.target.value) || stock.currentPrice)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80 text-xs">
            <span className="text-slate-400">成交参考价</span>
            <span className="font-mono text-amber-400 font-bold">¥{stock.currentPrice.toFixed(2)} (市价撮合)</span>
          </div>
        )}

        {/* Shares Input */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>委托股数 (整手)</span>
            <span className="font-mono">可交易: {getMaxShares().toLocaleString()} 股</span>
          </div>
          <input
            type="number"
            step="10"
            min="10"
            value={shares}
            onChange={(e) => setShares(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Quick Percentages */}
        <div className="grid grid-cols-4 gap-1.5">
          {[0.25, 0.5, 0.75, 1.0].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentage(pct)}
              className="py-1 text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded transition-colors cursor-pointer font-mono"
            >
              {pct * 100}%
            </button>
          ))}
        </div>

        {/* Margin / Cost Preview */}
        <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 text-xs flex flex-col gap-1 font-mono">
          <div className="flex justify-between text-slate-400">
            <span>标的总市值:</span>
            <span className="text-slate-200">¥{tradeAmount.toLocaleString()}</span>
          </div>

          {side === 'SHORT' ? (
            <>
              <div className="flex justify-between text-amber-400 font-semibold">
                <span>融券初始保证金 (50%):</span>
                <span>¥{shortRequiredCollateral.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>预估强平线 (维持率20%):</span>
                <span>¥{shortEstimatedLiq.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-400">
              <span>预估资金占用:</span>
              <span className="text-emerald-400 font-semibold">¥{totalCashRequired.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-2 rounded text-xs flex items-center gap-1.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950/70 text-rose-300 border border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-2.5 rounded font-bold text-sm text-white transition-all shadow-md cursor-pointer active:scale-98 ${
            side === 'BUY'
              ? 'bg-rose-600 hover:bg-rose-500'
              : side === 'SELL'
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : side === 'SHORT'
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          {side === 'BUY' && `确认买入做多 (${shares} 股)`}
          {side === 'SELL' && `确认卖出平多 (${shares} 股)`}
          {side === 'SHORT' && `确认融券做空 (${shares} 股)`}
          {side === 'COVER' && `确认买入平空 (${shares} 股)`}
        </button>
      </form>
    </div>
  );
};
