import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLimitPrices,
  checkLimitStatus,
  clampPriceToLimits,
  calculateLongPnL,
  calculateShortCollateral,
  calculateShortLiquidationPrice,
  calculateShortPnL,
  calculateIpoAllocation,
  simulatePriceTick,
  generateOrderBook,
} from './stockEngine.ts';

test('calculateLimitPrices correctly computes 10% daily limit up and down', () => {
  const { limitUpPrice, limitDownPrice } = calculateLimitPrices(100);
  assert.equal(limitUpPrice, 110);
  assert.equal(limitDownPrice, 90);
});

test('checkLimitStatus detects limit-up and limit-down thresholds', () => {
  const { isLimitUp, isLimitDown } = checkLimitStatus(110, 110, 90);
  assert.equal(isLimitUp, true);
  assert.equal(isLimitDown, false);

  const downStatus = checkLimitStatus(90, 110, 90);
  assert.equal(downStatus.isLimitUp, false);
  assert.equal(downStatus.isLimitDown, true);

  const normalStatus = checkLimitStatus(102, 110, 90);
  assert.equal(normalStatus.isLimitUp, false);
  assert.equal(normalStatus.isLimitDown, false);
});

test('clampPriceToLimits clamps price within limits', () => {
  assert.equal(clampPriceToLimits(115, 110, 90), 110);
  assert.equal(clampPriceToLimits(85, 110, 90), 90);
  assert.equal(clampPriceToLimits(99.5, 110, 90), 99.5);
});

test('calculateLongPnL computes profit and percentage correctly', () => {
  const { pnl, pnlPercent } = calculateLongPnL(100, 50, 60);
  assert.equal(pnl, 1000);
  assert.equal(pnlPercent, 20);

  const lossResult = calculateLongPnL(100, 50, 45);
  assert.equal(lossResult.pnl, -500);
  assert.equal(lossResult.pnlPercent, -10);
});

test('calculateShortCollateral computes 50% margin requirement', () => {
  const collateral = calculateShortCollateral(200, 50); // 200 shares * 50 * 0.5
  assert.equal(collateral, 5000);
});

test('calculateShortLiquidationPrice computes correct margin call trigger price', () => {
  // cost 100, initial margin 50%, maintenance 20%
  // P = 100 * 1.5 / 1.2 = 125
  const liqPrice = calculateShortLiquidationPrice(100);
  assert.equal(liqPrice, 125);
});

test('calculateShortPnL gains when price drops and loses when price rises', () => {
  // Shorted at 100, price drops to 80 -> profit 20 per share
  const winShort = calculateShortPnL(100, 100, 80);
  assert.equal(winShort.pnl, 2000);
  assert.equal(winShort.pnlPercent, 20);

  // Shorted at 100, price surges to 110 -> loss 10 per share
  const lossShort = calculateShortPnL(100, 100, 110);
  assert.equal(lossShort.pnl, -1000);
  assert.equal(lossShort.pnlPercent, -10);
});

test('calculateIpoAllocation properly calculates oversubscription and refunds', () => {
  // Offered 1,000, Subscribed 2,000 => Multiplier 2.0x, Win Rate 50%
  // User subscribes 100 shares at 50/share
  const result = calculateIpoAllocation({
    subscribedShares: 100,
    totalOffered: 1000,
    totalSubscribed: 2000,
    issuePrice: 50,
  });

  assert.equal(result.multiplier, 2);
  assert.equal(result.winRate, 50);
  assert.equal(result.wonShares, 50);
  assert.equal(result.refundedCash, 2500); // 50 refunded shares * 50
});

test('simulatePriceTick respects limits even with extreme catalyst', () => {
  // Extreme bullish catalyst (+50%)
  const tick = simulatePriceTick(100, 100, 0.02, 0.50);
  assert.ok(tick.newPrice <= 110);
  assert.equal(tick.isLimitUp, true);

  // Extreme bearish catalyst (-50%)
  const bearTick = simulatePriceTick(100, 100, 0.02, -0.50);
  assert.ok(bearTick.newPrice >= 90);
  assert.equal(bearTick.isLimitDown, true);
});

test('generateOrderBook produces structured depth data', () => {
  const book = generateOrderBook(100, 110, 90);
  assert.equal(book.bids.length, 5);
  assert.equal(book.asks.length, 5);
  assert.ok(book.bids[0].price < 100);
  assert.ok(book.asks[0].price > 100);
});
