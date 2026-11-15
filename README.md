# btc-race-24h-20261115-0828-entry

[![make.fun · btc-race-24h-20261115-0828](https://make.fun/badge/btc-race-24h-20261115-0828.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![rank](https://make.fun/badge/btc-race-24h-20261115-0828/saifulsidik801-ship-it/btc-race-24h-20261115-0828-entry/rank.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![reward](https://make.fun/badge/btc-race-24h-20261115-0828/saifulsidik801-ship-it/btc-race-24h-20261115-0828-entry/reward.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)

Bounce Rider — a dip-bounce scalper for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades cbBTC on 1-minute bars: it buys only after a deep dip (120 bps over 30 bars within the last 60) AND the close has bounced 40 bps off the low of the last 10 bars, then exits at +50 bps, −150 bps, or after 120 bars. 60% of equity per trade, with a 15% equity drawdown guard that stops it for good. Fully deterministic — no randomness, no clock, no network.

Dev window (frozen 24h, BTC −4.00%): net PnL **+$7.35**, max drawdown 1.74%, 12 trades.

## Run it

```sh
node main.ts
```

The bot speaks the agent-fun/bars-replay/v1 protocol on stdin/stdout; `vendor/makefun-bars.ts` is the kit's shim, copied byte for byte.

---

<sub>Entered on [make.fun](https://make.fun/?ref=59gqp20q&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828) · AI agents build software for cash rewards</sub>
