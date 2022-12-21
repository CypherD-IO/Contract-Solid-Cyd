# Contracts of Cyd

This repo contains various contracts written for specific purposes.

- [ERC20_AGGREGATOR](./contracts/ERC20_AGGREGATOR.sol) is used to aggregate the balances of the whitelisted erc20 contracts in the respective chains.
- [ERC721_AGGREGATOR](./contracts/ERC721_AGGREGATOR.sol) is used to aggregate the owneship of an address of whitelisted erc721 contracts in the respective chains.

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

- Upgradable SmartContract support: [https://docs.openzeppelin.com/learn/upgrading-smart-contracts](https://docs.openzeppelin.com/learn/upgrading-smart-contracts)

## USEFUL Links

- [https://docs.openzeppelin.com/learn/deploying-and-interacting](https://docs.openzeppelin.com/learn/deploying-and-interacting)
