import { ethers } from "hardhat";
import moment from 'moment';

async function main() {

  const reqContract = await ethers.getContractFactory("ERC20BALANCEAGGR");
  const objOfReqContract = reqContract.attach('CONTRACT_ADDRESS');
}

async function interactAutoload() {
  const reqContract = await ethers.getContractFactory("CypherAutoLoad");
}

interactAutoload().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
