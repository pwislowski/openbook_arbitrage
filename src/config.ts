import * as fs from 'fs';
import * as toml from 'toml';
import { Account, Keypair } from '@solana/web3.js';
import { Market } from '@project-serum/serum';
import { BotParams, Index, InstructionConfig, MarketAddress, TomlConfig } from './types.js';
import { DepthStd, Side } from './enums.js';

export {
    loadConfigs,
    configProgramId,
    configRpcUrl,
    configWallet,
    configRoutes,
    configMarkets,
    configParams,
    configSerumAccount,
}

function loadConfigs(path: string): TomlConfig {
    return toml.parse(
        fs.readFileSync(
          path,
          'utf-8'
        )
      ) as TomlConfig
}

function configProgramId(config: TomlConfig): string {
    return config.programId
}

function configRpcUrl(config: TomlConfig): string {
    return config.rpcUrl
}

function configWallet(config: TomlConfig): Keypair {
    const secretKey = Uint8Array.from(config.secretKey)

    return Keypair.fromSecretKey(secretKey)
}

function configSerumAccount(config: TomlConfig): Account {
    const secretKey = config.secretKey

    return new Account(secretKey)
}

function configParams(config: TomlConfig): BotParams {
    const params = config.params

    return {
        offset: params.offset,
        profit_threshold: params.profit_threshold,
        takerFee: params.takerFee
    } as BotParams
}

function configMarkets(config:TomlConfig): MarketAddress[] {
    const maddresses = config.mAddresses

    return maddresses as MarketAddress[]
}

function configRoutes(config: TomlConfig): InstructionConfig[] {
    const routes = config.routes

    for (const r of routes) {
        const {mOrder, pair_proxy} = r
        let { tOrder} = r
        
        const size_feat = _parseIntsToDepthTypes(mOrder, pair_proxy)
        tOrder = _parseStringsToSides(...tOrder)

        r.size_feat = size_feat
    }

    return [...routes]
}

function _parseStringsToSides(...tOrders: string[]): Side[] {
    const res = []

    for (const t of tOrders) {
        if (t === 'buy') {
            res.push(Side.Buy)
        } else {
            res.push(Side.Sell)
        }
    }

    return res
}

function _parseIntsToDepthTypes(array: Market[], proxy: Index): DepthStd[] {
    const res = []

    for (let i = 0; i < array.length; i ++) {
        if (i === proxy) {
            res.push(DepthStd.Indirect)
        } else {
            res.push(DepthStd.Direct)
        }
    }

    return res
}