import * as web3 from "@solana/web3.js";
import * as utils from "./utils.js";
import { Market } from "@project-serum/serum";
import { ArbitrageOpportunity, BestPriceSize, InstructionConfig } from "./types.js";
import { DepthStd, Side } from "./enums.js";
import { configParams, loadConfigs } from "./config.js";

export {
  arbitrage
};

const TAKER_FEE: number = configParams(loadConfigs('./config.toml')).takerFee

/* 
Openbook Arbitrage Bot Algo:

Loads the best single ask and bid prices and their respective sizes (market depth).
Gets target-asset-standardized size intersection across markets and offsets it by a user-specified value.
The offset is to mitigate moving markets.
Finally, executes a transaction if it exceeds a user-specified profit threshold

- Target: USDT | USDC
*/
async function arbitrage(
  markets: Market[],
  instruct: InstructionConfig,
  conn: web3.Connection,
  offset: number,
  takerFee = TAKER_FEE
): Promise<ArbitrageOpportunity> {
  
  // Deconstruct instructions
  const marketsIndex = instruct.marketArray
  const sortedMarkets = utils.arrangeMarkets(markets, marketsIndex)
  const tranSides = instruct.tranArray

  if (tranSides.length != sortedMarkets.length) {
    throw TypeError(
      `Mismatch between Arbitrage Triangle:\nTran len: ${tranSides.length}\nMarkets len: ${sortedMarkets.length}`
    );
  }

  const async_join: Promise<BestPriceSize>[] = [];
  for (let i = 0; i < tranSides.length; i++) {
    const m = sortedMarkets[i]
    const s = tranSides[i]

    const res = utils.getBestPriceForSide(
      conn,
      m as Market,
      s as Side
    );

    async_join.push(res);
  }

  const res: BestPriceSize[] = await Promise.all(async_join);
  const takerFee_acc = (1 + takerFee) ** sortedMarkets.length - 1;

  let pft_pct = tranSimulator(1, tranSides, res);
  pft_pct = (1 + takerFee_acc - pft_pct)


  const size_intersection = marketDepthStandardize(instruct, res);

  // takerFee expressed as a bps, e.g. 4bps = 0.0004

  const profit = pft_pct * size_intersection * offset;

  return {
    profit_nom: profit,
    profit_pct: pft_pct,
    torder: tranSides,
    tran_details: res
  } as ArbitrageOpportunity;
}

function marketDepthStandardize(
  instruct: InstructionConfig,
  best_prices: BestPriceSize[],
): number {
  // Deconstruct instruct
  const tranSides = instruct.tranArray
  const pair_proxy = instruct.pair_proxy
  const size_feat = instruct.size_feat

  if (tranSides.length !== best_prices.length) {
    throw TypeError(
      `Transaction Sides' and Fetched Prices' array length mismatch.\nTrasnactions' length: ${tranSides.length}\nPrices' array length: ${best_prices.length}`
    )
  }

  const res: number[] = [];

  for (let i = 0; i < tranSides.length; i++) {
    const sizeProxyType = size_feat[i]

    if (sizeProxyType === DepthStd.Direct) {
      const bprice = best_prices[i] as BestPriceSize;
      const price = bprice.best_price;
      const size = bprice.size;

      const target_size = price * size;

      res.push(target_size);
    } else {
      const bp = best_prices[i] as BestPriceSize;
      const price_proxy = bp.best_price;
      const size = bp.size;

      const price_target = best_prices[pair_proxy]?.best_price as number;
      const target_size = price_proxy * size * price_target;

      res.push(target_size);
    }
  }

  return Math.min(...res);
}

function calcArbTran(
  balance: number,
  side: Side,
  best_price: BestPriceSize
): number {
  const bprice = best_price.best_price;

  if (side === Side.Buy) {
    return balance / bprice;
  } else {
    return balance * bprice;
  }
}

function tranSimulator(
  balance: number,
  tranSides: Side[],
  best_prices: BestPriceSize[]
): number {
  let b = balance;
  
  for (let i = 0; i < tranSides.length; i++) {
    const tran = tranSides[i]
    const bprice = best_prices[i]

    b = calcArbTran(
      b,
      tran as Side,
      bprice as BestPriceSize);
  }

  return b;
}
