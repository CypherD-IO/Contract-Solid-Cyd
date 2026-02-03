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

```bash
npm install
```

## Commands

```bash
npm run compile              # Compile contracts
npm test                     # Run tests
npm run deploy --network=<network>   # Deploy contracts
npm run deploy-balance-aggregator    # Deploy BalanceAggregator
```
