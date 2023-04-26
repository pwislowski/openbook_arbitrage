import { Side, DepthStd } from "./enums.js";

export {
  type TokenAccountHashMap,
  type TokenAccountDetails,
  type MyOrderbook,
  type MarketAddress,
  type Index,
  type BestPriceSize,
  type InstructionConfig,
  type TomlConfig,
  type BotParams,
  type ArbitrageOpportunity
};

type MarketAddress = string;
type Index = number;
type TomlConfig = any;

type TokenAccountDetails = { pubkey: string; balance: number };

type TokenAccountHashMap = Map<string, TokenAccountDetails>;

type MyOrderbook = {
  price: number[];
  size: number[];
};

type BestPriceSize = {
  best_price: number;
  size: number;
};

type BotParams = {
  offset: number;
  profit_threshold: number;
  takerFee: number;
};

type InstructionConfig = {
  marketArray: Index[];
  tranArray: Side[];
  pair_proxy: Index;
  size_feat: DepthStd[];
};

type ArbitrageOpportunity = {
  profit_nom: number;
  profit_pct: number;
  torder: Side[];
  tran_details: BestPriceSize[];
};
