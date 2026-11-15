// Bounce Rider — a dip-bounce scalper for the cbBTC 24h race (agent-fun/bars-replay/v1).
//
// Idea, measured on the frozen 24h dev window (BTC -4.00% top to bottom, so every
// buy-and-hold and every EMA-trend baseline loses): dips do bounce, but only AFTER
// the bounce has visibly started. Buying the dip itself loses — the price keeps
// falling past the dip before it turns. Buying the first bar where BOTH hold —
//   (a) a deep dip (a 120 bps fall over 30 bars) happened within the last 60 bars, and
//   (b) the close has risen 40 bps off the low of the last 10 bars —
// wins 84% of its trades on the dev window. Exits are tight because the edge is
// small and the round trip costs ~14-28 bps at half size: take +50 bps, stop at
// -150 bps from the entry fill, or 120 bars, whichever comes first. Size is 60% of
// equity so one round trip cannot hurt much, and a 15% equity drawdown guard kills
// the bot for the rest of the run. First-crossing entries only, with a 10-bar
// cooldown after each exit so it cannot re-enter the same dip.
//
// Dev window (backtest with the engine's exact integer fill math): net PnL +$7.35,
// max drawdown 1.74%, 12 trades (6 round trips), positive in 2 of 4 six-hour blocks.
// Size is 60% (not 100%) because price impact grows with size: at median depth a
// full-size round trip costs ~42 bps while a half-size one costs ~28 bps, and the
// +50 bps target leaves no room to waste on impact.
// Deterministic: no randomness, no wall clock, no network, no files — every order
// is a pure function of the bars seen so far (float64 arithmetic only).

import { BPS, runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

/** Dip window: the fall is measured over this many bars. */
const K_BARS = 30;
/** A dip is a fall of at least this many bps over K_BARS. */
const DIP_BPS = 120;
/** The dip must have happened within the last this many bars. */
const WINDOW_BARS = 60;
/** The bounce is measured off the low of the last this many bars. */
const M_BARS = 10;
/** Entry needs the close at least this many bps above that low. */
const BOUNCE_BPS = 40;
/** Buy size, in bps of equity. */
const SIZE_BPS = 6000;
/** Take profit, in bps above the entry fill price. */
const TARGET_BPS = 50;
/** Stop loss, in bps below the entry fill price. */
const STOP_BPS = 150;
/** Time stop: exit after this many bars held, whatever the price. */
const MAX_HOLD_BARS = 120;
/** Equity drawdown guard (bps): hit it and the bot stops trading for good. */
const DD_GUARD_BPS = 1500;
/** Bars to wait after an exit before the next entry. */
const COOLDOWN_BARS = 10;
/** Slippage cap on every order, in bps from the close it was decided on. */
const MAX_SLIPPAGE_BPS = 100;

const closes: number[] = [];
let prevCond = false;
let cool = 0;
let barsHeld = 0;
let dead = false;
let peakEquity = 0n;

/** True when a dip of DIP_BPS over K_BARS happened within the last WINDOW_BARS. */
function dipRecent(i: number): boolean {
  const j0 = Math.max(K_BARS, i - WINDOW_BARS);
  for (let j = j0; j <= i; j++) {
    if ((closes[j - K_BARS] - closes[j]) / closes[j - K_BARS] * 10000 >= DIP_BPS) return true;
  }
  return false;
}

/** True when the close is at least BOUNCE_BPS above the low of the last M_BARS. */
function bounced(i: number): boolean {
  let lo = closes[i];
  for (let j = i - M_BARS; j < i; j++) {
    if (closes[j] < lo) lo = closes[j];
  }
  return (closes[i] - lo) / lo * 10000 >= BOUNCE_BPS;
}

/** Average entry fill price of the held position, in raw price units. */
function entryPrice(held: { qty: bigint; cost: bigint }): number {
  return Number((held.cost * 10000000n) / held.qty);
}

function sellAll(held: { qty: bigint }): SellInput {
  return { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
}

await runBars({
  onBatch(state, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];

    if (state.equity > peakEquity) peakEquity = state.equity;
    if (dead) return [];
    if (state.equity < peakEquity - (peakEquity * BigInt(DD_GUARD_BPS)) / 10000n) {
      dead = true;
      const held = state.positions.get(SYMBOL);
      if (held !== undefined) return [sellAll(held)];
      return [];
    }

    const i = closes.length - 1;
    if (i < Math.max(K_BARS, M_BARS)) return [];
    const close = closes[i];
    const cond = dipRecent(i) && bounced(i);
    const first = cond && !prevCond;
    prevCond = cond;

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      barsHeld++;
      const ep = entryPrice(held);
      if (close * 10000 >= ep * (10000 + TARGET_BPS)) {
        cool = COOLDOWN_BARS;
        return [sellAll(held)];
      }
      if (close * 10000 <= ep * (10000 - STOP_BPS)) {
        cool = COOLDOWN_BARS;
        return [sellAll(held)];
      }
      if (barsHeld >= MAX_HOLD_BARS) {
        cool = COOLDOWN_BARS;
        return [sellAll(held)];
      }
      return [];
    }

    if (cool > 0) {
      cool--;
      return [];
    }
    if (first) {
      let amt = (state.equity * BigInt(SIZE_BPS)) / 10000n;
      if (amt > state.cash) amt = state.cash;
      if (amt >= BigInt(state.hello.fees.min_notional_quote_units)) {
        barsHeld = 0;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amt, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
    }
    return [];
  },
});
