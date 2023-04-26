import * as web3 from "@solana/web3.js";
import {
  Keypair,
  Connection,
  PublicKey,
  RpcResponseAndContext,
  TokenAmount,
  LAMPORTS_PER_SOL,
  AccountInfo,
  GetProgramAccountsFilter,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Market, Orderbook } from "@project-serum/serum";
import bs58 from "bs58";
import { BestPriceSize, Index, MyOrderbook, TokenAccountDetails, TokenAccountHashMap } from "./types.js";
import { Side } from "./enums.js";

export {
  from_b58_to_seed,
  placeOrder,
  openOrdersFilled,
  checkWalletBalance,
  getAccountDetails,
  getWalletTokenBalance,
  extractFromRPC,
  getTokenAccounts,
  findAccountForMint,
  checkMarketsAndWallet,
  crossCheckMarketAndWallet,
  getBestPriceForSide,
  parseAddressesToMarkets,
  arrangeMarkets
};

function from_b58_to_seed(b58_string: string): Uint8Array {
  const secretKey = bs58.decode(b58_string);
  const seed = web3.Keypair.fromSecretKey(secretKey).secretKey;

  return seed;
}

async function placeOrder(
  market: Market,
  connection: Connection,
  args: any
): Promise<any> {
  const { payer, owner, side, price, size, orderType } = args;

  await market.placeOrder(connection, {
    owner: owner,
    payer: payer,
    side: side, // NOTE: `buy` or `sell`
    price: price,
    size: size,
    orderType: orderType, // NOTE: `limit`, `ioc`, `postOnly, think the best be `ioc`
  });
}

async function openOrdersFilled(
  market: Market,
  connection: Connection,
  kp: Keypair
): Promise<boolean> {
  const openOrders = await market.loadOrdersForOwner(connection, kp.publicKey);

  if (openOrders.length > 0) {
    console.log(openOrders);
    return false;
  } else {
    return true;
  }
}

async function checkWalletBalance(
  conn: Connection,
  wallet: PublicKey
): Promise<number> {
  const res = await conn.getBalance(wallet);

  // Returns in LAMPORTS so / 10 ** 9 to get SOL
  return res / LAMPORTS_PER_SOL; // SOL
}

async function getAccountDetails(
  conn: Connection,
  wallet: PublicKey
): Promise<null | AccountInfo<Buffer>> {
  const res = await conn.getAccountInfo(wallet);

  return res;
}

async function getWalletTokenBalance(
  conn: Connection,
  token_account: PublicKey
): Promise<RpcResponseAndContext<TokenAmount>> {
  const res = await conn.getTokenAccountBalance(token_account);

  return res;
}

function extractFromRPC(
  json: RpcResponseAndContext<TokenAmount>
): number | null {
  const val = json["value"]["uiAmount"];

  return val;
}

async function getTokenAccounts(
  conn: Connection,
  wallet: PublicKey
): Promise<TokenAccountHashMap> {
  const filters: GetProgramAccountsFilter[] = [
    {
      dataSize: 165, //size of account (bytes)
    },
    {
      memcmp: {
        offset: 32, //location of our query in the account (bytes)
        bytes: wallet.toBase58(), //our search criteria, a base58 encoded string
      },
    },
  ];
  const accounts = await conn.getParsedProgramAccounts(
    TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    { filters: filters }
  );
  // console.log(
  //   `Found ${accounts.length} token account(s) for wallet ${wallet}.`
  // );

  const acc: TokenAccountHashMap = new Map();

  for (const a of accounts) {
    const parsedAccountInfo: any = a.account.data;
    const mintAddress: string = parsedAccountInfo["parsed"]["info"]["mint"];
    const tokenBalance: number =
      parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
    const token_account_address = a.pubkey.toBase58();

    acc.set(mintAddress, {
      pubkey: token_account_address,
      balance: tokenBalance,
    } as TokenAccountDetails);
  }

  return acc;
  // accounts.forEach((account, i) => {
  //     //Parse the account data
  //     const parsedAccountInfo:any = account.account.data;
  //     const mintAddress:string = parsedAccountInfo["parsed"]["info"]["mint"];
  //     const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
  //     //Log results
  //     console.log(`Token Account No. ${i + 1}: ${account.pubkey.toString()}`);
  //     console.log(`--Token Mint: ${mintAddress}`);
  //     console.log(`--Token Balance: ${tokenBalance}`);
  // });
}

function findAccountForMint(
  market: Market,
  token_accounts: TokenAccountHashMap,
  side: Side
): PublicKey | null {
  if (side === Side.Buy) {
    const qouteMint = market.quoteMintAddress.toBase58();

    if (token_accounts.has(qouteMint)) {
      const pubkey = token_accounts.get(qouteMint)?.pubkey;

      return new PublicKey(pubkey as string);
    }

    return null;
  } else {
    const baseMint = market.baseMintAddress.toBase58();

    if (token_accounts.has(baseMint)) {
      const pubkey = token_accounts.get(baseMint)?.pubkey;

      return new PublicKey(pubkey as string);
    }

    return null;
  }
}

function iterateThroughOrderBook(
  orderbook: Orderbook,
  depth: number
): MyOrderbook {
  const prices = [];
  const sizes = [];

  for (const [p, s] of orderbook.getL2(depth)) {
    prices.push(p);
    sizes.push(s);
  }

  return {
    price: prices,
    size: sizes,
  } as MyOrderbook;
}

function bestPriceAndSize(
  prices: number[],
  sizes: number[],
  f: Function
): BestPriceSize {
  const best_price = f(...prices);
  const best_price_idx = prices.indexOf(best_price);

  return {
    best_price: best_price,
    size: sizes[best_price_idx] as number,
  } as BestPriceSize;
}

async function getBestPriceForSide(
  conn: Connection,
  market: Market,
  side: Side,
  recur_depth = 10
): Promise<BestPriceSize> {
  if (side === Side.Buy) {
    // get ask price and size
    const orders = await market.loadAsks(conn);
    const { price, size } = iterateThroughOrderBook(orders, recur_depth);

    return bestPriceAndSize(price, size, Math.min);
  } else {
    // get bid price and size
    const orders = await market.loadBids(conn);
    const { price, size } = iterateThroughOrderBook(orders, recur_depth);

    return bestPriceAndSize(price, size, Math.max);
  }
}

function crossCheckMarketAndWallet(
  market: Market,
  token_accounts: TokenAccountHashMap
): boolean {
  const baseMint = market.baseMintAddress;
  const qouteMint = market.quoteMintAddress;
  const tokenCollection = [...token_accounts.keys()];

  if (
    tokenCollection.includes(baseMint.toBase58()) &&
    tokenCollection.includes(qouteMint.toBase58())
  ) {
    return true;
  } else {
    return false;
  }
}

function checkMarketsAndWallet(
  token_account: TokenAccountHashMap,
  ...markets: Market[]
): boolean {
  for (const market of markets) {
    if (!crossCheckMarketAndWallet(market, token_account)) {
      // flip `true` to `false` to raise misalignment of wallet and markets
      return false;
    }
  }

  return true;
}

async function parseAddressesToMarkets(conn: Connection, program_id: PublicKey, ...addresses: string[]): Promise<Promise<Market>[]> {
  const ms = []

  for (const a of addresses) {
    const mm = Market.load(
      conn,
      new PublicKey(a),
      {},
      program_id
    )

      ms.push(mm)
  }

  return ms

}

function arrangeMarkets(markets: Market[], orders: Index[]): Market[] {
  if (markets.length !== orders.length) {
    throw TypeError(
      `Length mismatch between markets' and orders' lengths.\nMarkets' length: ${markets.length}\nOrders' length: ${orders.length}`
    )
  }

  const ret = []
  for (const i of orders){
    const m = markets[i]
    ret.push(m)
  }

  return ret as Market[]
}