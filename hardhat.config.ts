import "dotenv/config"
import { readFileSync } from "node:fs"
import { configVariable, defineConfig } from "hardhat/config"
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers"
import hardhatLedgerPlugin from "@nomicfoundation/hardhat-ledger"
import { id } from "ethers"

const { privateKey } = JSON.parse(
    readFileSync(new URL("./secrets.json", import.meta.url), "utf8")
) as { privateKey: string }

function httpNetwork(
    url: string,
    chainId: number,
    chainType: "generic" | "l1" | "op" = "generic"
) {
    return {
        type: "http" as const,
        chainType,
        url,
        chainId,
        accounts: [privateKey],
    }
}

// Comment the accounts and add ledger accounts to deploy with ledger
// ledgerAccounts: ["0xa809931e3b38059adae9bc5455bc567d0509ab92"]

export default defineConfig({
    plugins: [hardhatToolboxMochaEthers, hardhatLedgerPlugin],
    paths: {
        tests: {
            mocha: "./tests",
        },
    },
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
    typechain: {
        outDir: "./typechain-types",
    },
    networks: {
        EVMOS: httpNetwork("https://evmos-json-rpc.stakely.io", 9001),
        POLYGON: httpNetwork(
            "https://weathered-black-cherry.matic.quiknode.pro/47214a099ef5c415d7643c9708641730618fae60/",
            137
        ),
        AVALANCHE: httpNetwork(
            "https://twilight-sparkling-layer.avalanche-mainnet.quiknode.pro/3771bdace7c2172a058d51e540e6ce0796036fa2/ext/bc/C/rpc/",
            43114
        ),
        ETH: httpNetwork(
            "https://neat-omniscient-wish.quiknode.pro/52c670a6699d414fec240a056bc320bc2700de38/",
            1,
            "l1"
        ),
        BSC: httpNetwork(
            "https://red-autumn-surf.bsc.quiknode.pro/c2dceda201837f15456e87e59ace94e9a80c88f4/",
            56
        ),
        ARBITRUM: httpNetwork(
            "https://icy-spring-sunset.arbitrum-mainnet.quiknode.pro/9b40e5a481167ceb136c060824705bc542343817",
            42161
        ),
        OPTIMISM: httpNetwork(
            "https://long-quaint-panorama.optimism.quiknode.pro/dd7c3f760930c3b09662d38d331ea79bfcb67c85/",
            10,
            "op"
        ),
        BASE: httpNetwork(
            "https://developer-access-mainnet.base.org",
            8453,
            "op"
        ),
        FANTOM: httpNetwork("https://rpc3.fantom.network", 250),
        AURORA: httpNetwork("https://mainnet.aurora.dev", 1313161554),
        ZKSYNC_ERA: httpNetwork(
            "https://withered-lively-hill.zksync-mainnet.quiknode.pro/148ef92c54b60c380b04e6e549583c82ae428b90/",
            324
        ),
        POLYGON_ZKEVM: httpNetwork("https://rpc.ankr.com/polygon_zkevm", 1101),
        MOONBEAM: httpNetwork("https://rpc.ankr.com/moonbeam", 1284),
        MOONRIVER: httpNetwork("https://moonriver.public.blastapi.io", 1285),
    },
    verify: {
        etherscan: {
            apiKey: configVariable("ETHERSCAN_API_KEY"),
        },
    },
    ignition: {
        strategyConfig: {
            create2: {
                // To learn more about salts, see the CreateX documentation
                salt: id("cypher-evm-eip7702-swapExecutor"),
            },
        },
    },
})
