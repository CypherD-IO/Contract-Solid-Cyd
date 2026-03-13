# Cyd Contracts

Smart contracts for the Cyd ecosystem.

## Contracts

| Contract                  | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `BalanceAggregator`       | Aggregates ERC20 balances across whitelisted tokens     |
| `ERC721_AGGREGATOR`       | Aggregates NFT ownership across whitelisted collections |
| `ERC20_AUTOLOAD_SIMPLE`   | Autoload functionality for ERC20 tokens                 |
| `ERC20_AUTOLOAD_EXTENDED` | Extended autoload with additional features              |
| `CypherTargetRouter`      | Router for Cypher target operations                     |

### Audits

-   **ERC20_AUTOLOAD_SIMPLE** — Audited by Oak Security: [Audit Report](https://github.com/oak-security/audit-reports/blob/main/Cypher%20Wallet/2024-08-08%20Audit%20Report%20-%20Cypher%20Autoload%20Simple%20v1.0.pdf)

## Setup

Use Node.js 22+ (see `.nvmrc`), then install dependencies:

```bash
npm install
```

Add your explorer API key to `.env` if you want automatic verification on supported chains:

```bash
ETHERSCAN_API_KEY=your_api_key_here
```

## Commands

```bash
npm run compile              # Compile contracts
npm test                     # Run Mocha tests from tests/
npm run deploy --network=<network>   # Deploy contracts
npm run deploy-create2 --network=<network>   # Deploy the module referenced by ignition/modules/deployWithCreate2.ts with Create2 and verify
npm run deploy-balance-aggregator    # Deploy BalanceAggregator
```

## Create2 Deployment

`npm run deploy-create2` always deploys whatever module is re-exported from `ignition/modules/deployWithCreate2.ts`.

For example:

```ts
export { default } from "./deploy7702SwapExecutor"
```

If you later add a module like `deploy7702SwapAggregator.ts`, just change that one line in `deployWithCreate2.ts` and keep using the same command.
