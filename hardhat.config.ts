import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "@nomicfoundation/hardhat-ethers"
import "@nomicfoundation/hardhat-ledger"

import { privateKey } from "./secrets.json"
import { id } from "ethers"

// Comment the accounts and add ledger accounts to deploy with ledger
// ledgerAccounts: ["0xa809931e3b38059adae9bc5455bc567d0509ab92"]

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.30",
            },
            {
                version: "0.8.20",
            },
            {
                version: "0.8.11",
            },
            {
                version: "0.8.0",
            },
        ],
    },
    networks: {
        EVMOS: {
            url: "https://evmos-json-rpc.stakely.io",
            chainId: 9001,
            accounts: [privateKey],
        },
        POLYGON: {
            url: "https://weathered-black-cherry.matic.quiknode.pro/47214a099ef5c415d7643c9708641730618fae60/",
            chainId: 137,
            accounts: [privateKey],
            // ledgerAccounts: ["0xa809931e3b38059adae9bc5455bc567d0509ab92"], // comment the accounts above and add ledger accounts to deploy with ledger
        },
        AVALANCHE: {
            url: "https://rpc.ankr.com/avalanche",
            chainId: 43114,
            accounts: [privateKey],
        },
        ETH: {
            url: "https://eth.llamarpc.com",
            chainId: 1,
            accounts: [privateKey],
        },
        BSC: {
            url: "https://binance.llamarpc.com",
            chainId: 56,
            accounts: [privateKey],
        },
        ARBITRUM: {
            url: "https://rpc.ankr.com/arbitrum",
            chainId: 42161,
            accounts: [privateKey],
        },
        OPTIMISM: {
            url: "https://optimism.publicnode.com",
            chainId: 10,
            accounts: [privateKey],
        },
        BASE: {
            url: "https://developer-access-mainnet.base.org",
            chainId: 8453,
            accounts: [privateKey],
        },
        FANTOM: {
            url: "https://rpc3.fantom.network",
            chainId: 250,
            accounts: [privateKey],
        },
        AURORA: {
            url: "https://mainnet.aurora.dev",
            chainId: 1313161554,
            accounts: [privateKey],
        },
        ZKSYNC_ERA: {
            url: "https://mainnet.era.zksync.io",
            chainId: 324,
            accounts: [privateKey],
        },
        POLYGON_ZKEVM: {
            url: "https://rpc.ankr.com/polygon_zkevm",
            chainId: 1101,
            accounts: [privateKey],
        },
        MOONBEAM: {
            url: "https://rpc.ankr.com/moonbeam",
            chainId: 1284,
            accounts: [privateKey],
        },
        MOONRIVER: {
            url: "https://moonriver.public.blastapi.io",
            chainId: 1285,
            accounts: [privateKey],
        },
    },
    ignition: {
        strategyConfig: {
            create2: {
                // To learn more about salts, see the CreateX documentation
                salt: id("cypher-evm-autoload"),
            },
        },
    },
}

export default config
