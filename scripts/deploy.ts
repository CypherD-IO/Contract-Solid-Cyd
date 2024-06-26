import { ethers } from "hardhat"

async function main() {
    // 1. Get the contract to deploy
    const reqContract = await ethers.getContractFactory("CypherAutoLoad")

    console.log("Started deployement")

    // Change the gasPrice and gasLimit before deploying
    const config = { gasPrice: 800 * 1000000000, gasLimit: 1800000 }
    const objOfReqContract = await reqContract.deploy(
        "0x302633bae6eae1ab5a7d676e52ff080c70794b42",
        "0x302633bae6eae1ab5a7d676e52ff080c70794b42",
        "0x2860f3a9C202dbec6C74aB9cAE43DE6aeaE59E22",
        config
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
