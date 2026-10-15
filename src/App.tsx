import React, { useState, useEffect } from 'react';
import { AnimeStock, IPOCampaign, MarketNews, OrderBook, Position, TradeSide, UserAccount } from './types/market.ts';
import { INITIAL_ANIME_STOCKS, INITIAL_IPO_CAMPAIGNS, INITIAL_NEWS } from './data/initialMarketData.ts';
import {
  calculateLimitPrices,
  calculateShortCollateral,
  calculateShortLiquidationPrice,
  calculateLongPnL,
  calculateShortPnL,
  calculateIpoAllocation,
  generateOrderBook,
  simulatePriceTick,
  round,
} from './utils/stockEngine.ts';
import { Header } from './components/Header.tsx';
import { CandleChart } from './components/CandleChart.tsx';
import { TradingPanel } from './components/TradingPanel.tsx';
import { IPOLaunchpad } from './components/IPOLaunchpad.tsx';
import { MarketRankings } from './components/MarketRankings.tsx';
import { PortfolioView } from './components/PortfolioView.tsx';
import { NewsFeed } from './components/NewsFeed.tsx';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  Info,
  Calendar,
  FastForward,
  Trophy,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';

const INITIAL_CASH = 200000; // 初始启动资金 20万日元

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'terminal' | 'ipo' | 'rankings' | 'portfolio' | 'news'>('terminal');

  // Market State
  const [stocks, setStocks] = useState<AnimeStock[]>(() => {
    const saved = localStorage.getItem('animex_stocks_v1');
    return saved ? JSON.parse(saved) : INITIAL_ANIME_STOCKS;
  });

  const [selectedStockCode, setSelectedStockCode] = useState<string>('8412');
  const [ipoCampaigns, setIpoCampaigns] = useState<IPOCampaign[]>(() => {
    const saved = localStorage.getItem('animex_ipos_v1');
    return saved ? JSON.parse(saved) : INITIAL_IPO_CAMPAIGNS;
  });

  const [news, setNews] = useState<MarketNews[]>(() => {
    const saved = localStorage.getItem('animex_news_v1');
    return saved ? JSON.parse(saved) : INITIAL_NEWS;
  });

  const [currentWeek, setCurrentWeek] = useState<number>(4);
  const currentSeasonName = '2026年10月秋季番';

  // User Account State
  const [account, setAccount] = useState<UserAccount>(() => {
    const saved = localStorage.getItem('animex_account_v1');
    if (saved) return JSON.parse(saved);
    return {
      cash: INITIAL_CASH,
      initialCash: INITIAL_CASH,
      positions: [
        {
          id: 'pos-init-1',
          stockCode: '8412',
          stockTitle: '葬送的芙莉莲 第二季',
          type: 'LONG',
          shares: 200,
          averageCost: 182.00,
          openedAt: '2026-10-10',
        },
        {
          id: 'pos-init-2',
          stockCode: '5540',
          stockTitle: '迷宫饭 第二季',
          type: 'SHORT',
          shares: 150,
          averageCost: 135.00,
          marginCollateral: 10125, // 150 * 135 * 0.5
          liquidationPrice: calculateShortLiquidationPrice(135.00),
          openedAt: '2026-10-12',
        },
      ],
      history: [
        {
          id: 'hist-1',
          timestamp: '10-10 09:35',
          stockCode: '8412',
          stockTitle: '葬送的芙莉莲 第二季',
          side: 'BUY',
          shares: 200,
          price: 182.00,
          amount: 36400,
        },
        {
          id: 'hist-2',
          timestamp: '10-12 11:20',
          stockCode: '5540',
          stockTitle: '迷宫饭 第二季',
          side: 'SHORT',
          shares: 150,
          price: 135.00,
          amount: 20250,
        },
      ],
      subscribedIpos: [
        {
          campaignId: 'ipo-102',
          stockCode: '7230',
          shares: 200,
          frozenCash: 21000,
        },
      ],
    };
  });

  // Modals
  const [lotteryModalResult, setLotteryModalResult] = useState<{
    title: string;
    stockCode: string;
    subscribedShares: number;
    wonShares: number;
    issuePrice: number;
    openingPrice: number;
    refundedCash: number;
    multiplier: number;
    profitFirstDay: number;
  } | null>(null);

  const [broadcastModalOpen, setBroadcastModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('animex_stocks_v1', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('animex_ipos_v1', JSON.stringify(ipoCampaigns));
  }, [ipoCampaigns]);

  useEffect(() => {
    localStorage.setItem('animex_news_v1', JSON.stringify(news));
  }, [news]);

  useEffect(() => {
    localStorage.setItem('animex_account_v1', JSON.stringify(account));
  }, [account]);

  // Active Selected Stock
  const activeStock = stocks.find(s => s.code === selectedStockCode) || stocks[0];
  const orderBook: OrderBook = generateOrderBook(
    activeStock.currentPrice,
    activeStock.limitUpPrice,
    activeStock.limitDownPrice
  );

  // Background random market pulse (simulates real stock exchange ticks every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setStocks(prevStocks =>
        prevStocks.map(stock => {
          // slight random walk
          const tick = simulatePriceTick(stock.currentPrice, stock.previousClose, 0.008, 0);
          const newSparkline = [...stock.sparkline.slice(1), tick.newPrice];

          // update last point in priceHistory
          const updatedHistory = [...stock.priceHistory];
          if (updatedHistory.length > 0) {
            const lastPoint = { ...updatedHistory[updatedHistory.length - 1] };
            lastPoint.close = tick.newPrice;
            lastPoint.high = Math.max(lastPoint.high, tick.newPrice);
            lastPoint.low = Math.min(lastPoint.low, tick.newPrice);
            lastPoint.volume += Math.floor(Math.random() * 200);
            updatedHistory[updatedHistory.length - 1] = lastPoint;
          }

          return {
            ...stock,
            currentPrice: tick.newPrice,
            isLimitUp: tick.isLimitUp,
            isLimitDown: tick.isLimitDown,
            highPrice: Math.max(stock.highPrice, tick.newPrice),
            lowPrice: Math.min(stock.lowPrice, tick.newPrice),
            volume: stock.volume + Math.floor(Math.random() * 500),
            turnover: stock.turnover + Math.floor(Math.random() * 500) * tick.newPrice,
            sparkline: newSparkline,
            priceHistory: updatedHistory,
          };
        })
      );
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // Compute Total Assets
  let totalStockAssets = 0;
  account.positions.forEach(pos => {
    const s = stocks.find(st => st.code === pos.stockCode);
    const p = s ? s.currentPrice : pos.averageCost;
    if (pos.type === 'LONG') {
      totalStockAssets += pos.shares * p;
    } else {
      // Short position: collateral + unrealized pnl
      const { pnl } = calculateShortPnL(pos.shares, pos.averageCost, p);
      const col = pos.marginCollateral || pos.shares * pos.averageCost * 0.5;
      totalStockAssets += col + pnl;
    }
  });

  const frozenIpoCash = account.subscribedIpos.reduce((sum, item) => sum + item.frozenCash, 0);
  const totalAssets = round(account.cash + frozenIpoCash + totalStockAssets, 2);

  // Execute Trade Handler
  const handleExecuteTrade = (params: {
    stockCode: string;
    stockTitle: string;
    side: TradeSide;
    shares: number;
    price: number;
  }): { success: boolean; message: string } => {
    const { stockCode, stockTitle, side, shares, price } = params;
    const tradeAmount = round(shares * price, 2);
    const fee = round(Math.max(5, tradeAmount * 0.0005), 2);
    const nowTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (side === 'BUY') {
      const totalCost = tradeAmount + fee;
      if (account.cash < totalCost) {
        return { success: false, message: `可用资金不足，需 ¥${totalCost.toLocaleString()}，当前仅剩 ¥${account.cash.toLocaleString()}` };
      }

      // Update cash & positions
      const existingPos = account.positions.find(p => p.stockCode === stockCode && p.type === 'LONG');
      let newPositions: Position[] = [];

      if (existingPos) {
        const totalOldCost = existingPos.shares * existingPos.averageCost;
        const newTotalShares = existingPos.shares + shares;
        const newAvgCost = round((totalOldCost + tradeAmount) / newTotalShares, 2);

        newPositions = account.positions.map(p =>
          p.id === existingPos.id
            ? { ...p, shares: newTotalShares, averageCost: newAvgCost }
            : p
        );
      } else {
        const newPos: Position = {
          id: `pos-${Date.now()}`,
          stockCode,
          stockTitle,
          type: 'LONG',
          shares,
          averageCost: price,
          openedAt: nowTime,
        };
        newPositions = [...account.positions, newPos];
      }

      setAccount(prev => ({
        ...prev,
        cash: round(prev.cash - totalCost, 2),
        positions: newPositions,
        history: [
          {
            id: `hist-${Date.now()}`,
            timestamp: nowTime,
            stockCode,
            stockTitle,
            side: 'BUY',
            shares,
            price,
            amount: tradeAmount,
          },
          ...prev.history,
        ],
      }));

      return { success: true, message: `成功做多买入 ${stockTitle} ${shares}股 @ ¥${price.toFixed(2)}` };
    }

    if (side === 'SELL') {
      const existingPos = account.positions.find(p => p.stockCode === stockCode && p.type === 'LONG');
      if (!existingPos || existingPos.shares < shares) {
        return { success: false, message: `多头持仓不足，可平仓股数: ${existingPos ? existingPos.shares : 0}` };
      }

      const proceeds = round(tradeAmount - fee, 2);
      const realizedPnL = round((price - existingPos.averageCost) * shares - fee, 2);

      let newPositions: Position[] = [];
      if (existingPos.shares === shares) {
        newPositions = account.positions.filter(p => p.id !== existingPos.id);
      } else {
        newPositions = account.positions.map(p =>
          p.id === existingPos.id ? { ...p, shares: p.shares - shares } : p
        );
      }

      setAccount(prev => ({
        ...prev,
        cash: round(prev.cash + proceeds, 2),
        positions: newPositions,
        history: [
          {
            id: `hist-${Date.now()}`,
            timestamp: nowTime,
            stockCode,
            stockTitle,
            side: 'SELL',
            shares,
            price,
            amount: tradeAmount,
            realizedPnL,
          },
          ...prev.history,
        ],
      }));

      return {
        success: true,
        message: `成功卖出平仓 ${stockTitle} ${shares}股，锁定盈亏 ¥${realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(2)}`,
      };
    }

    if (side === 'SHORT') {
      const requiredMargin = calculateShortCollateral(shares, price);
      const totalNeed = requiredMargin + fee;

      if (account.cash < totalNeed) {
        return { success: false, message: `做空保证金不足，需质押保证金 ¥${totalNeed.toLocaleString()}` };
      }

      const liqPrice = calculateShortLiquidationPrice(price);
      const existingPos = account.positions.find(p => p.stockCode === stockCode && p.type === 'SHORT');
      let newPositions: Position[] = [];

      if (existingPos) {
        const totalOldCost = existingPos.shares * existingPos.averageCost;
        const newTotalShares = existingPos.shares + shares;
        const newAvgCost = round((totalOldCost + tradeAmount) / newTotalShares, 2);
        const newCollateral = round(existingPos.marginCollateral! + requiredMargin, 2);
        const newLiq = calculateShortLiquidationPrice(newAvgCost);

        newPositions = account.positions.map(p =>
          p.id === existingPos.id
            ? {
                ...p,
                shares: newTotalShares,
                averageCost: newAvgCost,
                marginCollateral: newCollateral,
                liquidationPrice: newLiq,
              }
            : p
        );
      } else {
        const newPos: Position = {
          id: `pos-${Date.now()}`,
          stockCode,
          stockTitle,
          type: 'SHORT',
          shares,
          averageCost: price,
          marginCollateral: requiredMargin,
          liquidationPrice: liqPrice,
          openedAt: nowTime,
        };
        newPositions = [...account.positions, newPos];
      }

      setAccount(prev => ({
        ...prev,
        cash: round(prev.cash - totalNeed, 2),
        positions: newPositions,
        history: [
          {
            id: `hist-${Date.now()}`,
            timestamp: nowTime,
            stockCode,
            stockTitle,
            side: 'SHORT',
            shares,
            price,
            amount: tradeAmount,
          },
          ...prev.history,
        ],
      }));

      return {
        success: true,
        message: `成功融券做空 ${stockTitle} ${shares}股 @ ¥${price.toFixed(2)} (强平线: ¥${liqPrice.toFixed(2)})`,
      };
    }

    if (side === 'COVER') {
      const existingPos = account.positions.find(p => p.stockCode === stockCode && p.type === 'SHORT');
      if (!existingPos || existingPos.shares < shares) {
        return { success: false, message: `空头仓位不足，当前可平空股数: ${existingPos ? existingPos.shares : 0}` };
      }

      // Calculate collateral to release & short pnl
      const portion = shares / existingPos.shares;
      const releasedCollateral = round(existingPos.marginCollateral! * portion, 2);
      const shortPnL = round((existingPos.averageCost - price) * shares - fee, 2);
      const returnedCash = round(releasedCollateral + shortPnL, 2);

      let newPositions: Position[] = [];
      if (existingPos.shares === shares) {
        newPositions = account.positions.filter(p => p.id !== existingPos.id);
      } else {
        newPositions = account.positions.map(p =>
          p.id === existingPos.id
            ? {
                ...p,
                shares: p.shares - shares,
                marginCollateral: round(p.marginCollateral! - releasedCollateral, 2),
              }
            : p
        );
      }

      setAccount(prev => ({
        ...prev,
        cash: round(prev.cash + returnedCash, 2),
        positions: newPositions,
        history: [
          {
            id: `hist-${Date.now()}`,
            timestamp: nowTime,
            stockCode,
            stockTitle,
            side: 'COVER',
            shares,
            price,
            amount: tradeAmount,
            realizedPnL: shortPnL,
          },
          ...prev.history,
        ],
      }));

      return {
        success: true,
        message: `成功买入平空 ${stockTitle} ${shares}股，归还融券，结清盈亏 ¥${shortPnL >= 0 ? '+' : ''}${shortPnL.toFixed(2)}`,
      };
    }

    return { success: false, message: '未知交易类型' };
  };

  // Close Position Quick Action from Portfolio
  const handleClosePosition = (position: Position) => {
    const s = stocks.find(st => st.code === position.stockCode);
    const p = s ? s.currentPrice : position.averageCost;
    const sideToExecute = position.type === 'LONG' ? 'SELL' : 'COVER';

    handleExecuteTrade({
      stockCode: position.stockCode,
      stockTitle: position.stockTitle,
      side: sideToExecute,
      shares: position.shares,
      price: p,
    });
  };

  // Subscribe IPO Handler
  const handleSubscribeIPO = (campaignId: string, shares: number): { success: boolean; message: string } => {
    const campaign = ipoCampaigns.find(c => c.id === campaignId);
    if (!campaign) return { success: false, message: '未找到该新番发行企划' };

    const totalCashNeeded = round(shares * campaign.issuePrice, 2);
    if (account.cash < totalCashNeeded) {
      return { success: false, message: `可用现金不足，申购需冻结 ¥${totalCashNeeded.toLocaleString()}` };
    }

    // Freeze cash and record in subscribedIpos
    const existingSub = account.subscribedIpos.find(item => item.campaignId === campaignId);
    let updatedIpos = [];

    if (existingSub) {
      updatedIpos = account.subscribedIpos.map(item =>
        item.campaignId === campaignId
          ? {
              ...item,
              shares: item.shares + shares,
              frozenCash: round(item.frozenCash + totalCashNeeded, 2),
            }
          : item
      );
    } else {
      updatedIpos = [
        ...account.subscribedIpos,
        {
          campaignId,
          stockCode: campaign.stockCode,
          shares,
          frozenCash: totalCashNeeded,
        },
      ];
    }

    // Update campaign userSubscribedShares and overall subscription
    setIpoCampaigns(prev =>
      prev.map(c =>
        c.id === campaignId
          ? {
              ...c,
              userSubscribedShares: (c.userSubscribedShares || 0) + shares,
              subscribedShares: c.subscribedShares + shares,
              subscriptionMultiplier: round((c.subscribedShares + shares) / c.totalSharesOffered, 2),
            }
          : c
      )
    );

    setAccount(prev => ({
      ...prev,
      cash: round(prev.cash - totalCashNeeded, 2),
      subscribedIpos: updatedIpos,
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          stockCode: campaign.stockCode,
          stockTitle: campaign.title,
          side: 'IPO_SUBSCRIBE',
          shares,
          price: campaign.issuePrice,
          amount: totalCashNeeded,
        },
        ...prev.history,
      ],
    }));

    return {
      success: true,
      message: `成功参与《${campaign.title}》新番IPO认购！已冻结资金 ¥${totalCashNeeded.toLocaleString()}`,
    };
  };

  // Simulate IPO Listing & Lottery Day
  const handleSimulateListing = (campaignId: string) => {
    const campaign = ipoCampaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const userSub = account.subscribedIpos.find(s => s.campaignId === campaignId);
    const userSubShares = userSub ? userSub.shares : 0;

    // Calculate allocation
    const allocation = calculateIpoAllocation({
      subscribedShares: userSubShares,
      totalOffered: campaign.totalSharesOffered,
      totalSubscribed: campaign.subscribedShares,
      issuePrice: campaign.issuePrice,
    });

    // Opening day surge (25% to 44% IPO early bird dividend bonus!)
    const surgeMultiplier = 1 + (0.28 + Math.random() * 0.16);
    const openingPrice = round(campaign.issuePrice * surgeMultiplier, 2);
    const profitFirstDay = round((openingPrice - campaign.issuePrice) * allocation.wonShares, 2);

    // Create new active stock from listed IPO
    const newStock: AnimeStock = {
      id: `stock-${campaign.stockCode}`,
      code: campaign.stockCode,
      title: campaign.title,
      originalTitle: campaign.originalTitle,
      season: campaign.targetSeason,
      seasonTag: '2026_FALL',
      studio: campaign.studio,
      director: campaign.director,
      genres: campaign.genres,
      episodesTotal: 12,
      currentEpisode: 1,
      currentPrice: openingPrice,
      previousClose: campaign.issuePrice,
      openPrice: openingPrice,
      highPrice: openingPrice,
      lowPrice: campaign.issuePrice,
      volume: 125000,
      turnover: 125000 * openingPrice,
      ...calculateLimitPrices(campaign.issuePrice),
      isLimitUp: true,
      isLimitDown: false,
      shortInterestRatio: 3.5,
      marketCap: Math.round((campaign.totalSharesOffered * openingPrice) / 1000000) * 10,
      malScore: 8.80,
      hypeIndex: 96,
      status: 'TRADING',
      sparkline: [campaign.issuePrice, openingPrice],
      priceHistory: [
        {
          time: '09:30',
          open: campaign.issuePrice,
          high: openingPrice,
          low: campaign.issuePrice,
          close: openingPrice,
          volume: 125000,
        },
      ],
      description: `${campaign.title} 首日上市轰动全场！首发认购大丰收，开盘跳空高开高走，红利收益狂飙！`,
      themeColor: campaign.themeColor,
    };

    // Update stocks list
    setStocks(prev => [newStock, ...prev]);

    // Mark campaign as listed
    setIpoCampaigns(prev =>
      prev.map(c => (c.id === campaignId ? { ...c, status: 'LISTED' } : c))
    );

    // Update user account: unfreeze cash, refund unallocated, add new won position
    let newPositions = [...account.positions];
    if (allocation.wonShares > 0) {
      newPositions.push({
        id: `pos-${Date.now()}`,
        stockCode: campaign.stockCode,
        stockTitle: campaign.title,
        type: 'LONG',
        shares: allocation.wonShares,
        averageCost: campaign.issuePrice,
        openedAt: 'IPO首日上市',
      });
    }

    const remainingSubscribed = account.subscribedIpos.filter(s => s.campaignId !== campaignId);

    setAccount(prev => ({
      ...prev,
      cash: round(prev.cash + allocation.refundedCash, 2),
      positions: newPositions,
      subscribedIpos: remainingSubscribed,
      history: [
        {
          id: `hist-allot-${Date.now()}`,
          timestamp: 'IPO首日上市',
          stockCode: campaign.stockCode,
          stockTitle: campaign.title,
          side: 'IPO_ALLOT',
          shares: allocation.wonShares,
          price: campaign.issuePrice,
          amount: round(allocation.wonShares * campaign.issuePrice, 2),
          realizedPnL: profitFirstDay,
        },
        ...prev.history,
      ],
    }));

    // Add News headline
    const newHeadline: MarketNews = {
      id: `news-${Date.now()}`,
      timestamp: '09:30',
      season: campaign.targetSeason,
      episode: 1,
      stockCode: campaign.stockCode,
      stockTitle: campaign.title,
      type: 'SURPRISE',
      sentiment: 'BULLISH',
      impactPercent: round(((openingPrice - campaign.issuePrice) / campaign.issuePrice) * 100, 1),
      title: `【重磅上市】《${campaign.title}》IPO首日高开+${round(((openingPrice - campaign.issuePrice) / campaign.issuePrice) * 100, 1)}%！`,
      summary: `新番摇号圆满结束，认购倍数达${campaign.subscriptionMultiplier}倍。开盘敲钟后引发机构抢筹狂潮，成功中签者斩获丰厚早期红利！`,
    };
    setNews(prev => [newHeadline, ...prev]);

    // Show celebration modal
    setLotteryModalResult({
      title: campaign.title,
      stockCode: campaign.stockCode,
      subscribedShares: userSubShares,
      wonShares: allocation.wonShares,
      issuePrice: campaign.issuePrice,
      openingPrice,
      refundedCash: allocation.refundedCash,
      multiplier: campaign.subscriptionMultiplier,
      profitFirstDay,
    });

    setSelectedStockCode(campaign.stockCode);
  };

  // Advance Week (Simulate Episode Broadcast & Market Ticks)
  const handleAdvanceWeek = () => {
    const nextWk = currentWeek + 1;
    setCurrentWeek(nextWk);

    // Pick random catalysts
    const catalysts = [
      {
        type: 'SAKUGA' as const,
        sentiment: 'BULLISH' as const,
        impact: 0.08,
        title: '【作画神回】单集原画张数突破1.5万张！海外热议登顶',
        summary: '最新一集高潮决战分镜神乎其神，社交网络二创暴增，主力买盘持续追高！',
      },
      {
        type: 'DELAY' as const,
        sentiment: 'BEARISH' as const,
        impact: -0.09,
        title: '【播报延期】原画工期告急，下周临时调整为声优座谈会',
        summary: '制作公司发表致歉公告，多头信心受挫，空头部队迅速发难集中抛售！',
      },
      {
        type: 'SALES' as const,
        sentiment: 'BULLISH' as const,
        impact: 0.06,
        title: '【BD大爆】首卷蓝光光盘预约突破白金标准，衍生授权翻倍',
        summary: '粉丝热情高涨，预订量大幅超出市场普遍预期，估值中枢全面上移！',
      },
      {
        type: 'SCANDAL' as const,
        sentiment: 'BEARISH' as const,
        impact: -0.07,
        title: '【舆论波澜】原作剧情改编引发原著粉与动画党激烈争议',
        summary: '第' + nextWk + '集原创删减关键人设，评分出现波动，获利盘纷纷回吐避险。',
      },
    ];

    const chosenCatalyst = catalysts[Math.floor(Math.random() * catalysts.length)];
    const targetStockIndex = Math.floor(Math.random() * stocks.length);
    const targetStock = stocks[targetStockIndex];

    // Simulate price movements for all stocks with higher episode volatility
    const updatedStocks = stocks.map((stk, idx) => {
      const isTarget = idx === targetStockIndex;
      const bias = isTarget ? chosenCatalyst.impact : (Math.random() - 0.48) * 0.03;
      const tick = simulatePriceTick(stk.currentPrice, stk.currentPrice, 0.035, bias);

      const newPoint = {
        time: `EP-${nextWk}`,
        open: stk.currentPrice,
        high: Math.max(stk.currentPrice, tick.newPrice),
        low: Math.min(stk.currentPrice, tick.newPrice),
        close: tick.newPrice,
        volume: Math.floor(800 + Math.random() * 4000) * 10,
      };

      const newHistory = [...stk.priceHistory, newPoint];
      if (newHistory.length > 30) newHistory.shift();

      return {
        ...stk,
        currentEpisode: Math.min(stk.episodesTotal, stk.currentEpisode + 1),
        currentPrice: tick.newPrice,
        previousClose: stk.currentPrice,
        openPrice: stk.currentPrice,
        highPrice: tick.newPrice,
        lowPrice: tick.newPrice,
        limitUpPrice: calculateLimitPrices(stk.currentPrice).limitUpPrice,
        limitDownPrice: calculateLimitPrices(stk.currentPrice).limitDownPrice,
        isLimitUp: tick.isLimitUp,
        isLimitDown: tick.isLimitDown,
        volume: stk.volume + newPoint.volume,
        turnover: stk.turnover + newPoint.volume * tick.newPrice,
        sparkline: [...stk.sparkline.slice(1), tick.newPrice],
        priceHistory: newHistory,
      };
    });

    setStocks(updatedStocks);

    // Advance IPO countdowns
    setIpoCampaigns(prev =>
      prev.map(c => (c.status === 'OPEN' ? { ...c, daysLeft: Math.max(0, c.daysLeft - 1) } : c))
    );

    // Create News
    const newsItem: MarketNews = {
      id: `news-${Date.now()}`,
      timestamp: `第${nextWk}周`,
      season: currentSeasonName,
      episode: nextWk,
      stockCode: targetStock.code,
      stockTitle: targetStock.title,
      type: chosenCatalyst.type,
      sentiment: chosenCatalyst.sentiment,
      impactPercent: round(Math.abs(chosenCatalyst.impact) * 100, 1),
      title: chosenCatalyst.title,
      summary: `【${targetStock.title}】` + chosenCatalyst.summary,
    };
    setNews(prev => [newsItem, ...prev]);

    setBroadcastModalOpen(true);
  };

  // Reset Account
  const handleResetAccount = () => {
    if (window.confirm('确认重置模拟股票账户资金为 ¥200,000.00 并清空持仓？')) {
      setAccount({
        cash: INITIAL_CASH,
        initialCash: INITIAL_CASH,
        positions: [],
        history: [],
        subscribedIpos: [],
      });
      localStorage.removeItem('animex_account_v1');
    }
  };

  // Filter stocks for quick selector
  const filteredStocksList = stocks.filter(
    s => s.title.includes(searchQuery) || s.code.includes(searchQuery) || s.studio.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Universal Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cash={account.cash}
        totalAssets={totalAssets}
        currentEpisodeWeek={currentWeek}
        currentSeasonName={currentSeasonName}
        onAdvanceWeek={handleAdvanceWeek}
        onResetAccount={handleResetAccount}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 pb-20 md:pb-6 flex flex-col gap-6">
        {/* VIEW 1: TRADING TERMINAL */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col gap-5">
            {/* Stock Header & Quick Switcher Strip */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Stock Profile info */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white shrink-0 shadow-lg"
                  style={{ backgroundColor: activeStock.themeColor }}
                >
                  {activeStock.code.slice(0, 2)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 font-bold text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {activeStock.code}
                    </span>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {activeStock.title}
                    </h2>
                    <span className="text-xs text-slate-400 hidden sm:inline">{activeStock.originalTitle}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{activeStock.season}</span>
                    <span>·</span>
                    <span>制作: {activeStock.studio}</span>
                    <span>·</span>
                    <span>监督: {activeStock.director}</span>
                    <span>·</span>
                    <span className="text-amber-300 font-mono">评分 ★{activeStock.malScore}</span>
                    <span>·</span>
                    <span className="text-slate-300">已开播 第{activeStock.currentEpisode}/{activeStock.episodesTotal}集</span>
                  </div>
                </div>
              </div>

              {/* Right: Key Price Metric Strip */}
              <div className="flex items-center gap-4 lg:gap-6 font-mono tabular-nums text-xs overflow-x-auto pb-1 lg:pb-0">
                <div className="flex flex-col items-start lg:items-end">
                  <span className="text-slate-400 text-[10px]">最新价 (日元)</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-2xl font-black ${activeStock.currentPrice >= activeStock.previousClose ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ¥{activeStock.currentPrice.toFixed(2)}
                    </span>
                    {activeStock.currentPrice >= activeStock.previousClose ? (
                      <TrendingUp className="w-5 h-5 text-rose-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <span className={`font-bold ${activeStock.currentPrice >= activeStock.previousClose ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {activeStock.currentPrice >= activeStock.previousClose ? '+' : ''}
                    {(((activeStock.currentPrice - activeStock.previousClose) / activeStock.previousClose) * 100).toFixed(2)}%
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden sm:block" />

                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px]">今日涨跌停</span>
                  <span className="text-rose-400">停: ¥{activeStock.limitUpPrice.toFixed(2)}</span>
                  <span className="text-emerald-400">跌: ¥{activeStock.limitDownPrice.toFixed(2)}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px]">最高 / 最低</span>
                  <span className="text-slate-200">高: ¥{activeStock.highPrice.toFixed(2)}</span>
                  <span className="text-slate-400">低: ¥{activeStock.lowPrice.toFixed(2)}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px]">做空比率 / 市值</span>
                  <span className="text-amber-400 font-bold">空: {activeStock.shortInterestRatio.toFixed(1)}%</span>
                  <span className="text-slate-300">值: ¥{activeStock.marketCap}亿</span>
                </div>
              </div>
            </div>

            {/* Quick Stock Selector Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
              <span className="text-slate-500 whitespace-nowrap text-xs">快速切换标的:</span>
              {stocks.map(s => {
                const isSelected = s.code === activeStock.code;
                const changePct = ((s.currentPrice - s.previousClose) / s.previousClose) * 100;
                return (
                  <button
                    key={s.code}
                    onClick={() => setSelectedStockCode(s.code)}
                    className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white border-amber-400 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-amber-400 font-bold">{s.code}</span>
                    <span className="font-sans font-medium text-slate-200">{s.title.slice(0, 6)}..</span>
                    <span className={changePct >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                    </span>
                    {s.isLimitUp && <span className="text-[10px] bg-rose-950 text-rose-300 px-1 rounded">涨停</span>}
                    {s.isLimitDown && <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1 rounded">跌停</span>}
                  </button>
                );
              })}
            </div>

            {/* Terminal Grid: Chart (Left) + Trading & OrderBook (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Candlestick / Tick Chart */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <CandleChart stock={activeStock} />

                {/* Stock synopsis / backstory */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1.5">
                    <Info className="w-4 h-4 text-amber-400" />
                    <span>基本面与制作委员会动态</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {activeStock.description}
                  </p>
                </div>
              </div>

              {/* Order Book & Trade Execution Form */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <TradingPanel
                  stock={activeStock}
                  orderBook={orderBook}
                  cash={account.cash}
                  positions={account.positions}
                  onExecuteTrade={handleExecuteTrade}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: IPO LAUNCHPAD */}
        {activeTab === 'ipo' && (
          <IPOLaunchpad
            campaigns={ipoCampaigns}
            cash={account.cash}
            onSubscribeIPO={handleSubscribeIPO}
            onSimulateListing={handleSimulateListing}
            onSelectStockToTrade={(code) => {
              setSelectedStockCode(code);
              setActiveTab('terminal');
            }}
          />
        )}

        {/* VIEW 3: MARKET RANKINGS */}
        {activeTab === 'rankings' && (
          <MarketRankings
            stocks={stocks}
            onSelectStock={(code) => {
              setSelectedStockCode(code);
              setActiveTab('terminal');
            }}
          />
        )}

        {/* VIEW 4: PORTFOLIO & ASSETS */}
        {activeTab === 'portfolio' && (
          <PortfolioView
            account={account}
            stocks={stocks}
            onClosePosition={handleClosePosition}
            onSelectStock={(code) => {
              setSelectedStockCode(code);
              setActiveTab('terminal');
            }}
          />
        )}

        {/* VIEW 5: INDUSTRY NEWS */}
        {activeTab === 'news' && (
          <NewsFeed
            news={news}
            onSelectStock={(code) => {
              setSelectedStockCode(code);
              setActiveTab('terminal');
            }}
          />
        )}
      </main>

      {/* MODAL 1: IPO ALLOTMENT & WINDFALL CELEBRATION */}
      {lotteryModalResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-400 to-indigo-500" />

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-400/40">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">新番IPO敲钟上市 · 摇号中签结果公布</h3>
              <p className="text-xs text-slate-400 mt-1">
                《{lotteryModalResult.title}》[{lotteryModalResult.stockCode}] 荣耀上市！
              </p>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs font-mono flex flex-col gap-2.5 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-400">认购超额倍数:</span>
                <span className="text-amber-400 font-bold">{lotteryModalResult.multiplier}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">申请认购股数:</span>
                <span className="text-white">{lotteryModalResult.subscribedShares} 股</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>成功中签分配股数:</span>
                <span>{lotteryModalResult.wonShares} 股</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">退还未中签资金:</span>
                <span className="text-slate-200">¥{lotteryModalResult.refundedCash.toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between">
                <span className="text-slate-400">IPO发行基准价:</span>
                <span className="text-slate-300">¥{lotteryModalResult.issuePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">首日开盘激增价:</span>
                <span className="text-rose-400 font-bold">¥{lotteryModalResult.openingPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-300">中签首日暴赚红利:</span>
                <span className="text-rose-400">+¥{lotteryModalResult.profitFirstDay.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setLotteryModalResult(null);
                setActiveTab('terminal');
              }}
              className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm rounded-lg shadow-lg cursor-pointer transition-all"
            >
              收获红利，前往交易大厅看盘！
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: BROADCAST WEEK SUMMARY NOTIFICATION */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FastForward className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">第 {currentWeek} 周新番开播结算完成</h3>
              </div>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              周末黄金档新番已全部放送完毕！各制作组作画发挥、剧情口碑已反馈至二级交易市场，股票行情已完成最新一轮结算跳动。
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 mb-5">
              <span className="text-amber-400 font-semibold block mb-1">本周头条舆情:</span>
              <p className="text-slate-400 leading-relaxed">
                {news[0]?.title} - {news[0]?.summary}
              </p>
            </div>

            <button
              onClick={() => setBroadcastModalOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              查看看盘行情
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
