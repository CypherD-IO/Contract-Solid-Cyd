import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";

// import {privateKey} from "./secrets.sample.json";

// Get private key from required auth
import {privateKey} from "./secrets.json";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.11",
      },
      {
        version: "0.8.0",
      },
    ],
  },
  // add required networks then deploy
  networks: {
    evmos: {
      url: 'https://evmos-json-rpc.stakely.io',
      chainId: 9001,
      accounts: [privateKey]
    }
  }
};

export default config;
