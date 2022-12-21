import { ethers } from "hardhat";

async function main() {

  // 1. Get the contract to deploy
  const reqContract = await ethers.getContractFactory("ERC721BALANCEAGGREGATOR");

  // 2. Deploying the smart contract
  const objOfReqContract = await reqContract.deploy();

  // 3. Waiting for the deployment to resolve
  await objOfReqContract.deployed();

  console.log(`Contract deployed to ${objOfReqContract.address}\nTxnHash: ${objOfReqContract.deployTransaction.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
