import { ethers } from "hardhat"

async function main() {
    // 1. Get the contract to deploy
    const reqContract = await ethers.getContractFactory(
        "ERC20RateLimitedAllowance"
    )

    console.log("Started deployement")

    // Change the gasPrice and gasLimit before deploying
    // Set gas configuration for Base ETH network
    const gasPrice = ethers.parseUnits("0.0000001", "gwei") // 0.1 gwei
    const gasLimit = 1000000 // 1M gas units
    const config = { gasPrice, gasLimit }
    const objOfReqContract = await reqContract.deploy(
        "0x2860f3a9C202dbec6C74aB9cAE43DE6aeaE59E22",
        "0x4F3299D378ee4643DfF92D5e76716682A321A650"
    )

    console.log(objOfReqContract)

    console.log("deployed")
    await objOfReqContract.waitForDeployment()
    console.log("done")

    console.log(`Contract deployed to ${objOfReqContract}`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
