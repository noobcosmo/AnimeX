import type { OrderBook, DepthLevel } from '../types/market.ts';

/**
 * 涨跌停幅度：10%
 * 融券做空初始保证金率：50%
 * 融券做空维持保证金率：20%
 */
export const LIMIT_PERCENT = 0.10;
export const SHORT_INITIAL_MARGIN_RATE = 0.50;
export const SHORT_MAINTENANCE_MARGIN_RATE = 0.20;

export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算涨跌停价格
 */
export function calculateLimitPrices(previousClose: number): { limitUpPrice: number; limitDownPrice: number } {
  const limitUp = round(previousClose * (1 + LIMIT_PERCENT), 2);
  const limitDown = round(previousClose * (1 - LIMIT_PERCENT), 2);
  return {
    limitUpPrice: limitUp,
    limitDownPrice: Math.max(0.01, limitDown),
  };
}

/**
 * 检查价格是否触发涨跌停
 */
export function checkLimitStatus(currentPrice: number, limitUpPrice: number, limitDownPrice: number) {
  return {
    isLimitUp: currentPrice >= limitUpPrice - 0.001,
    isLimitDown: currentPrice <= limitDownPrice + 0.001,
  };
}

/**
 * 价格限制拦截
 */
export function clampPriceToLimits(price: number, limitUpPrice: number, limitDownPrice: number): number {
  return Math.min(limitUpPrice, Math.max(limitDownPrice, round(price, 2)));
}

/**
 * 计算做多收益
 */
export function calculateLongPnL(shares: number, averageCost: number, currentPrice: number): { pnl: number; pnlPercent: number } {
  if (shares <= 0 || averageCost <= 0) return { pnl: 0, pnlPercent: 0 };
  const pnl = round((currentPrice - averageCost) * shares, 2);
  const pnlPercent = round(((currentPrice - averageCost) / averageCost) * 100, 2);
  return { pnl, pnlPercent };
}

/**
 * 计算融券做空所需保证金
 */
export function calculateShortCollateral(shares: number, price: number, marginRate = SHORT_INITIAL_MARGIN_RATE): number {
  return round(shares * price * marginRate, 2);
}

/**
 * 计算做空爆仓强平价格
 * 当 维持担保比例 <= 维持保证金率 时触发强平
 * Collateral = avgCost * shares * initialMarginRate
 * Equity = Collateral - (P - avgCost) * shares
 * 强平点: Collateral - (P - avgCost) * shares = P * shares * maintenanceMarginRate
 * => P = avgCost * (1 + initialMarginRate) / (1 + maintenanceMarginRate)
 */
export function calculateShortLiquidationPrice(
  averageCost: number,
  initialMarginRate = SHORT_INITIAL_MARGIN_RATE,
  maintenanceMarginRate = SHORT_MAINTENANCE_MARGIN_RATE
): number {
  if (averageCost <= 0) return 0;
  const p = averageCost * (1 + initialMarginRate) / (1 + maintenanceMarginRate);
  return round(p, 2);
}

/**
 * 计算做空收益 (做空价格下跌盈利，上涨亏损)
 */
export function calculateShortPnL(shares: number, averageCost: number, currentPrice: number): { pnl: number; pnlPercent: number } {
  if (shares <= 0 || averageCost <= 0) return { pnl: 0, pnlPercent: 0 };
  const pnl = round((averageCost - currentPrice) * shares, 2);
  const pnlPercent = round(((averageCost - currentPrice) / averageCost) * 100, 2);
  return { pnl, pnlPercent };
}

/**
 * 计算IPO认购与中签分配
 */
export function calculateIpoAllocation(params: {
  subscribedShares: number;
  totalOffered: number;
  totalSubscribed: number;
  issuePrice: number;
}): {
  wonShares: number;
  refundedCash: number;
  winRate: number;
  multiplier: number;
} {
  const { subscribedShares, totalOffered, totalSubscribed, issuePrice } = params;
  if (subscribedShares <= 0 || totalOffered <= 0) {
    return { wonShares: 0, refundedCash: 0, winRate: 100, multiplier: 1 };
  }

  const multiplier = round(Math.max(1, totalSubscribed / totalOffered), 2);
  const winRate = round(Math.min(100, (1 / multiplier) * 100), 2);

  // 中签股数
  const rawWon = (subscribedShares * winRate) / 100;
  // 整手分配 (以10股为最小单位)
  let wonShares = Math.floor(rawWon / 10) * 10;
  if (wonShares > subscribedShares) wonShares = subscribedShares;

  const unallottedShares = subscribedShares - wonShares;
  const refundedCash = round(unallottedShares * issuePrice, 2);

  return {
    wonShares,
    refundedCash,
    winRate,
    multiplier,
  };
}

/**
 * 模拟行情价格波动，严格受限于涨跌停板
 */
export function simulatePriceTick(
  currentPrice: number,
  previousClose: number,
  volatility = 0.015,
  catalystBias = 0
): {
  newPrice: number;
  isLimitUp: boolean;
  isLimitDown: boolean;
  changeAmount: number;
  changePercent: number;
} {
  const { limitUpPrice, limitDownPrice } = calculateLimitPrices(previousClose);

  // 随机漫步 + 催化剂偏置
  const randomShift = (Math.random() - 0.49) * 2 * volatility;
  const netShift = randomShift + catalystBias;

  let rawPrice = currentPrice * (1 + netShift);
  const newPrice = clampPriceToLimits(rawPrice, limitUpPrice, limitDownPrice);
  const { isLimitUp, isLimitDown } = checkLimitStatus(newPrice, limitUpPrice, limitDownPrice);

  const changeAmount = round(newPrice - previousClose, 2);
  const changePercent = round((changeAmount / previousClose) * 100, 2);

  return {
    newPrice,
    isLimitUp,
    isLimitDown,
    changeAmount,
    changePercent,
  };
}

/**
 * 生产买卖五档挂单簿
 */
export function generateOrderBook(
  currentPrice: number,
  limitUpPrice: number,
  limitDownPrice: number
): OrderBook {
  const bids: DepthLevel[] = [];
  const asks: DepthLevel[] = [];

  const spread = Math.max(0.1, round(currentPrice * 0.003, 2));

  // 买五档 (买一到买五递减)
  for (let i = 1; i <= 5; i++) {
    const p = round(currentPrice - spread * i, 2);
    if (p >= limitDownPrice) {
      bids.push({
        price: p,
        quantity: Math.floor(100 + Math.random() * 800) * 10,
      });
    }
  }

  // 卖五档 (卖一到卖五递增)
  for (let i = 1; i <= 5; i++) {
    const p = round(currentPrice + spread * i, 2);
    if (p <= limitUpPrice) {
      asks.push({
        price: p,
        quantity: Math.floor(100 + Math.random() * 800) * 10,
      });
    }
  }

  return { bids, asks };
}
