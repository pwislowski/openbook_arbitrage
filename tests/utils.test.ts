import { Market } from "@project-serum/serum";
import {
  checkWalletBalance,
  extractFromRPC,
  getTokenAccounts,
  getWalletTokenBalance,
  findAccountForMint,
  checkMarketsAndWallet,
  crossCheckMarketAndWallet,
} from "../src/utils";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TokenAccountHashMap } from "../src/types"
import { Side } from "../src/enums"

// Constants
const SECRET_KEY = Uint8Array.from([
  185, 64, 60, 207, 15, 211, 103, 100, 155, 108, 12, 246, 52, 58, 112, 72, 74,
  231, 19, 167, 248, 151, 153, 167, 75, 42, 131, 212, 168, 89, 182, 27, 244, 43,
  146, 40, 65, 154, 215, 142, 255, 33, 32, 78, 205, 25, 235, 104, 225, 220, 119,
  171, 17, 248, 200, 122, 237, 130, 21, 22, 21, 214, 22, 24,
]);
const KEYPAIR = Keypair.fromSecretKey(SECRET_KEY);
// const CONN = new Connection(clusterApiUrl('mainnet-beta'))
/* Must use priv conneciton to get SPL Token Account details */
const CONN = new Connection(
  "https://cosmopolitan-still-spree.solana-mainnet.discover.quiknode.pro/71d70ef13bdd0660fcfbb8e1249a58fe8de693c1/"
);

// test market
const MARKET_ADDRESS = new PublicKey(
  "8BnEgHoWFysVcuFFX7QztDmzuH8r5ZFvyP3sYwn1XTh6"
);
const PROGRAM_ID = new PublicKey("srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX");
const TEST_MARKET = Market.load(CONN, MARKET_ADDRESS, {}, PROGRAM_ID);
const TOKEN_ACCOUNTS_FUNC = getTokenAccounts(CONN, KEYPAIR.publicKey);

const TEST_MARKET_2 = Market.load(
  CONN,
  new PublicKey("B2na8Awyd7cpC59iEU43FagJAPLigr3AP3s38KM982bu"),
  {},
  PROGRAM_ID
);

const TEST_MARKET_3 = Market.load(
  CONN,
  new PublicKey("FZxi3yWkE5mMjyaZj6utmYL54QQYfMCKMcLaQZq4UwnA"),
  {},
  PROGRAM_ID
);

// Matching
const USDC_TA = new PublicKey("4QBkqP9A71T5pZ3DASHKPepo9PYmFLFBKxsxi67cf7DW");
const WSOL_TA = new PublicKey("4SYY1mNZsRvwHV5rh5pj5R3nWkmCMyKSFMgjNFc2zHCr");
const SOL_BALANCE = 0.490362443;
const WSOL_BALANCE = 0.49796072;
const USDC_BALANCE = 0;
const TOKEN_ACCOUNTS: TokenAccountHashMap = new Map([
  [
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    {
      pubkey: "4QBkqP9A71T5pZ3DASHKPepo9PYmFLFBKxsxi67cf7DW",
      balance: USDC_BALANCE,
    },
  ],
  [
    "So11111111111111111111111111111111111111112",
    {
      pubkey: "4SYY1mNZsRvwHV5rh5pj5R3nWkmCMyKSFMgjNFc2zHCr",
      balance: WSOL_BALANCE,
    },
  ],
]);

// Unit Test

describe("Testing utils file", () => {
  test("Account balance should be current SOL balance", async () => {
    expect(await checkWalletBalance(CONN, KEYPAIR.publicKey)).toBe(SOL_BALANCE);
  });

  // test('Get account details', async () => {
  //   expect(
  //     await getAccountDetails(CONN, KEYPAIR.publicKey)
  //   ).toContainEqual(ACCOUNT_DETAILS);
  // });

  test("Get wallet token balace for WSOL", async () => {
    expect(extractFromRPC(await getWalletTokenBalance(CONN, WSOL_TA))).toBe(
      WSOL_BALANCE
    );
  });

  test("Get wallet token balace for USDC", async () => {
    expect(extractFromRPC(await getWalletTokenBalance(CONN, USDC_TA))).toBe(
      USDC_BALANCE
    );
  });

  test("Get Token Accounts for a Wallet", async () => {
    expect(
      await (async () => {
        const res = await getTokenAccounts(CONN, KEYPAIR.publicKey);
        const map2 = TOKEN_ACCOUNTS;
        for (const [key, val] of res) {
          const testVal = map2.get(key);

          if (testVal === undefined && !map2.has(key)) {
            return false;
          }

          if (val.pubkey != testVal?.pubkey) {
            return false;
          }

          if (val.balance != testVal?.balance) {
            return false;
          }
        }

        return true;
      })()
    ).toBeTruthy();
  });

  // test("test_valid_b58_string_input", () => {
  //   expect( (() => {
  //     const b58_string = "3yZe7J8J5zvJ6j5zvJ6j5zvJ6j5zvJ6j5zvJ6j5zvJ6j";
  //     const result = from_b58_to_seed(b58_string);
      
  //     return result
  //   })()
  //   ).toBe(new Uint8Array([201,  94,  70,  98,  68,  80,  97,  98,  68,  80,  97,  98,  68,  80,  97,  98,  68,  80,  97,  98,  68,  80,  97,  98,  68,  80,  97,  98,  68,  80,  97,  98]))
  // });

  test("Get Token Account for an Openbook Market - Qoute", async () => {
    expect(
      await (async () => {
        const taccounts = await TOKEN_ACCOUNTS_FUNC;
        const testMarket = await TEST_MARKET;

        return findAccountForMint(testMarket, taccounts, Side.Sell);
      })()
    ).toStrictEqual(WSOL_TA);
  });

  test("Get Token Account for an Openbook Market - Base", async () => {
    expect(
      await (async () => {
        const taccounts = await TOKEN_ACCOUNTS_FUNC;
        const testMarket = await TEST_MARKET;

        return findAccountForMint(testMarket, taccounts, Side.Buy);
      })()
    ).toStrictEqual(USDC_TA);
  });

  test("Check Market's Tokens in Token Accounts", async () => {
    expect(
      await (async () => {
        const taccounts = await TOKEN_ACCOUNTS_FUNC;
        const testMarket = await TEST_MARKET;

        return crossCheckMarketAndWallet(testMarket, taccounts);
      })()
    ).toBeTruthy();
  });

  test("Check all Market' Tokens in Token Accounts", async () => {
    expect(
      await (async () => {
        const taccounts = await TOKEN_ACCOUNTS_FUNC;
        const testMarketOne = await TEST_MARKET;
        const testMarketTwo = await TEST_MARKET_2;
        const testMarketThree = await TEST_MARKET_3;

        return checkMarketsAndWallet(
          taccounts,
          testMarketOne,
          testMarketTwo,
          testMarketThree
        );
      })()
    ).toBeFalsy();
  });
});
