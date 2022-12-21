import { ethers } from "hardhat";

async function main() {

  // 1. Get the contract to deploy
  const reqContract = await ethers.getContractFactory("ERC721BALANCEAGGREGATOR");

  // 2. Interact with the deployed smart contract
  const objOfReqContract = await reqContract.attach('0x320C41470b74b7E2Eed202c5B57C36D40Fa14De9');

  // 3. Waiting for the deployment to resolve
  const reqData = await objOfReqContract.addr(15);

  console.log(`Data ${JSON.stringify(reqData)}, ${reqData}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
