# Contracts of Cyd

This repo contains various contracts written for specific purposes.

-   [ERC20_AGGREGATOR](./contracts/ERC20_AGGREGATOR.sol) is used to aggregate the balances of the whitelisted erc20 contracts in the respective chains.
-   [ERC721_AGGREGATOR](./contracts/ERC721_AGGREGATOR.sol) is used to aggregate the owneship of an address of whitelisted erc721 contracts in the respective chains.

## ERC20_AUTOLOAD_SIMPLE.sol

-   This contract is audited by Oak Security. [Cypher EVM Autoload Audit Report](https://github.com/oak-security/audit-reports/blob/main/Cypher%20Wallet/2024-08-08%20Audit%20Report%20-%20Cypher%20Autoload%20Simple%20v1.0.pdf)

## To setup HardHat

```shell
npm install
```

## Other Operations

```shell
# To run tests
npm test

# To compile and create artifacts before deploying
npm run compile

# To deploy to the network (should be specified in the hardhat.config.ts). i.e:
npm run deploy --network=evmos

# To interact with the deployed contract. i.e:
npm run interact --network=evmos
```

## TO-DO

-   Upgradable SmartContract support: [https://docs.openzeppelin.com/learn/upgrading-smart-contracts](https://docs.openzeppelin.com/learn/upgrading-smart-contracts)

## USEFUL Links

-   [https://docs.openzeppelin.com/learn/deploying-and-interacting](https://docs.openzeppelin.com/learn/deploying-and-interacting)
