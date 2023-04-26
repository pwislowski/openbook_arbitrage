/* https://subscription.packtpub.com/book/programming/9781838828493/13/ch13lvl1sec01/top-level-await#:~:text=Top%2Dlevel%20await%20is%20a,before%20attempting%20to%20use%20it.
https://github.com/solserer-labs/openbook-ts-serum

https://stackoverflow.com/questions/71099311/top-level-await-and-import-in-typescript
https://blog.atomist.com/typescript-imports/
Typescript await setup*/

import { Connection, PublicKey } from "@solana/web3.js";
import { Market } from "@project-serum/serum";
import * as cfg from "./config.js";
import * as utils from "./utils.js";
import { InstructionConfig } from "./types.js";
import { arbitrage } from "./arb.js";
import { sendTransactions } from "./transactions.js";

/* 
Using Quicknode.com Free Plan:
- 10,000,000 API Requests per month
- 25 requests/sec
- 1 Endpoint
*/

// Configuartion init
const CONFIG = cfg.loadConfigs("./config.toml");
const instructs: InstructionConfig[] = cfg.configRoutes(CONFIG);
const program_id = new PublicKey(cfg.configProgramId(CONFIG));
const conn = new Connection(cfg.configRpcUrl(CONFIG));
const markets: Market[] = await Promise.all(
  await utils.parseAddressesToMarkets(
    conn,
    program_id,
    ...cfg.configMarkets(CONFIG)
  )
);
const { offset, profit_threshold } = cfg.configParams(CONFIG);

// Transactions
const owner = cfg.configSerumAccount(CONFIG)
const token_accounts = await utils.getTokenAccounts(conn, owner.publicKey)

async function main(
  conn: Connection,
  markets: Market[],
  instruct: InstructionConfig[],
  offset: number,
  profit_threshold: number
) {
  // check instructions
  if (!instructCheck(instruct)) {
    throw Error(
      `Define exactly two arbitrage routes. Currently: ${instruct.length}`
    );
  }

  // init env
  const [routeOne, routeTwo] = instruct;

  const [resOne, resTwo] = await Promise.all([
    arbitrage(markets, routeOne as InstructionConfig, conn, offset),
    arbitrage(markets, routeTwo as InstructionConfig, conn, offset),
  ]);

  let best_res;
  let best_instr;
  if (resOne.profit_nom > resTwo.profit_nom) {
    best_res = resOne;
    best_instr = routeOne;
  } else {
    best_res = resTwo;
    best_instr = routeTwo;
  }

  if (best_res.profit_pct > profit_threshold) {
    await sendTransactions(
      conn,
      markets,
      owner,
      token_accounts,
      best_instr as InstructionConfig,
      best_res.tran_details,
      offset
    );
  }
}

function instructCheck(instrucs: InstructionConfig[]): boolean {
  if (instrucs.length == 2) {
    return true;
  } else {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

while (true) {
  await main(conn, markets, instructs, offset, profit_threshold);

  await sleep(30 * 1000); // 30 seconds timeout
}
