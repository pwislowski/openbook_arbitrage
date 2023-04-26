import * as cfg from '../src/config'
import { Side } from '../src/enums'

// Matching
const PROGRAM_ID = "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"
const PRIV_RPC = "https://cosmopolitan-still-spree.solana-mainnet.discover.quiknode.pro/71d70ef13bdd0660fcfbb8e1249a58fe8de693c1/"
const PARAMS = {
    offset: 0.9,
    profit_threshold: 1.01,
    takerFee: 0.0004
}

const MARKET_ADDRESSES = [
    "B2na8Awyd7cpC59iEU43FagJAPLigr3AP3s38KM982bu",
    "FZxi3yWkE5mMjyaZj6utmYL54QQYfMCKMcLaQZq4UwnA",
    "B2na8Awyd7cpC59iEU43FagJAPLigr3AP3s38KM982b"
]

const ROUTES = [
    {
        mOrder:  [
            0,
            1,
            2
        ],

        tOrder: [
            Side.Buy,
            Side.Buy,
            Side.Sell
        ],
        pair_proxy: 0,
        size_feat: [1, 0, 0] // proxy qoute at the beginning
    },
    {
        mOrder:  [
            2,
            1,
            0
        ],

        tOrder: [
            Side.Buy,
            Side.Sell,
            Side.Sell
        ],
        pair_proxy: 2,
        size_feat: [0, 0, 1] //proxy qoute at the end
    },
]

// Constants
const config = cfg.loadConfigs('./config.toml')

describe('Test Configuration File', () => {
    test('Load Program Id', () => {
        expect(
            cfg.configProgramId(config)
        ).toBe(PROGRAM_ID)
    });

    test('Load RPC Connection', () => {
        expect(
            cfg.configRpcUrl(config)
        ).toBe(PRIV_RPC)
    });

    test('Load Params', () => {
        expect(
            Object.entries(cfg.configParams(config)).toString()
        ).toStrictEqual(
            Object.entries(PARAMS).toString()
        )
    });

    test('Load RoutesConfig', () => {
        expect(
            JSON.stringify(
                cfg.configRoutes(config)
            )
        ).toStrictEqual(
            JSON.stringify(ROUTES)
        )
    });

    test('Load Markets\' Addresses', () => {
        expect(
            cfg.configMarkets(config)
        ).toStrictEqual(MARKET_ADDRESSES)
    }
    );
    }
)


