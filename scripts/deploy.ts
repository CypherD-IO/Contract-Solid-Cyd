import { ethers } from "hardhat";

async function main() {

  // 1. Get the contract to deploy
  const reqContract = await ethers.getContractFactory("CypherAutoLoad");

  console.log("Started deployement")

  // Change the gasPrice and gasLimit before deploying
  const config = { gasPrice: 35 * 1000000000, gasLimit: 10000000 }
  const objOfReqContract = await reqContract.deploy('0x8E514594e7e75Bd27F81933859E965152B256636', '0x2BCCEf8e63c0869d26826418fE8C319fc103dEAD', '0x3d063C72b5A5b5457cb02076d134c806eca63Cff', config)

  console.log("deployed")
  await objOfReqContract.waitForDeployment();
  console.log("done");

  console.log(`Contract deployed to ${objOfReqContract}`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
