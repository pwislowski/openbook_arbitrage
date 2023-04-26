import {
  arrangeMarkets,
  findAccountForMint,
} from "./utils.js";
import { Market } from "@project-serum/serum";
import { Connection, PublicKey, Account } from "@solana/web3.js";
import { TokenAccountHashMap, BestPriceSize, InstructionConfig } from "./types.js";
import { OrderType, Side } from "./enums.js";

export { buildTransaction, sendTransactions };

async function buildTransaction(
  conn: Connection,
  market: Market,
  price_size: BestPriceSize,
  side: Side,
  owner: Account,
  payer: TokenAccountHashMap,
  orderType: OrderType,
  offset: number
) {
  const price = price_size.best_price;
  const size = price_size.size * offset;

  const spl_taccount = findAccountForMint(market, payer, side);

  await market.placeOrder(conn, {
    owner: owner,
    payer: spl_taccount as PublicKey,
    side: side,
    price: price,
    size: size,
    orderType: orderType,
  });
}

async function sendTransactions(
  conn: Connection,
  markets: Market[],
  owner: Account,
  payer: TokenAccountHashMap,
  instruct: InstructionConfig,
  details: BestPriceSize[],
  offset: number,
  orderType: OrderType = OrderType.IOC
): Promise<void> {

  const sides = instruct.tranArray;
  const sortedMarkets = arrangeMarkets(markets, instruct.marketArray)

  for (let i = 0; i < sides.length; i++) {
    const s = sides[i] as Side;
    const m = sortedMarkets[i] as Market;
    const p = details[i] as BestPriceSize;

    await buildTransaction(
      conn,
      m,
      p,
      s,
      owner,
      payer,
      orderType,
      offset
    );
  }
}
