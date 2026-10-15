export type OrderType = 'LIMIT' | 'MARKET';
export type TradeSide = 'BUY' | 'SELL' | 'SHORT' | 'COVER';

export interface PricePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnimeStock {
  id: string;
  code: string;
  title: string;
  originalTitle: string;
  season: string; // e.g. '2026年10月秋季番'
  seasonTag: '2026_FALL' | '2026_SUMMER' | '2026_SPRING' | 'CLASSIC';
  studio: string;
  director: string;
  genres: string[];
  episodesTotal: number;
  currentEpisode: number;
  currentPrice: number;
  previousClose: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  turnover: number;
  limitUpPrice: number; // +10% 涨停价
  limitDownPrice: number; // -10% 跌停价
  isLimitUp: boolean;
  isLimitDown: boolean;
  shortInterestRatio: number; // 做空比率 %
  marketCap: number; // 市值 (亿日元)
  malScore: number; // 评分
  hypeIndex: number; // 0-100 热度
  status: 'TRADING' | 'HALTED' | 'DELISTED';
  sparkline: number[];
  priceHistory: PricePoint[];
  description: string;
  themeColor: string;
}

export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  bids: DepthLevel[]; // 买盘 (从高到低)
  asks: DepthLevel[]; // 卖盘 (从低到高)
}

export interface IPOCampaign {
  id: string;
  stockCode: string;
  title: string;
  originalTitle: string;
  studio: string;
  targetSeason: string;
  issuePrice: number;
  totalSharesOffered: number;
  subscribedShares: number;
  subscriptionMultiplier: number;
  estimatedWinRate: number; // %
  daysLeft: number;
  genres: string[];
  director: string;
  hypeDescription: string;
  themeColor: string;
  userSubscribedShares: number;
  status: 'OPEN' | 'ALLOCATING' | 'LISTED';
}

export interface Position {
  id: string;
  stockCode: string;
  stockTitle: string;
  type: 'LONG' | 'SHORT';
  shares: number;
  averageCost: number;
  marginCollateral?: number; // 保证金 for short
  liquidationPrice?: number; // 强平预警价 for short
  openedAt: string;
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  stockCode: string;
  stockTitle: string;
  side: TradeSide | 'IPO_SUBSCRIBE' | 'IPO_ALLOT' | 'LIQUIDATION';
  shares: number;
  price: number;
  amount: number;
  realizedPnL?: number;
}

export interface MarketNews {
  id: string;
  timestamp: string;
  season: string;
  episode?: number;
  stockCode?: string;
  stockTitle?: string;
  type: 'SAKUGA' | 'DELAY' | 'SURPRISE' | 'SALES' | 'SCANDAL' | 'AWARDS';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impactPercent: number;
  title: string;
  summary: string;
}

export interface UserAccount {
  cash: number;
  initialCash: number;
  positions: Position[];
  history: TransactionRecord[];
  subscribedIpos: {
    campaignId: string;
    stockCode: string;
    shares: number;
    frozenCash: number;
  }[];
}
