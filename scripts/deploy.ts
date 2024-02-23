import { ethers } from "hardhat";

async function main() {

  // 1. Get the contract to deploy
  const reqContract = await ethers.getContractFactory("ERC20BALANCEAGGR");

  console.log("Started deployement")

  // Change the gasPrice and gasLimit before deploying
  const config = { gasPrice: 0.11 * 1000000000, gasLimit: 1000000 }
  const objOfReqContract = await reqContract.deploy(config);

  console.log("deployed")

  // 3. Waiting for the deployment to resolve
  await objOfReqContract.deployed();

  console.log("done");

  console.log(`Contract deployed to ${objOfReqContract.address}\nTxnHash: ${objOfReqContract.deployTransaction.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
