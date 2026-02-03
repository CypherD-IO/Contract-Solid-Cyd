import { execSync } from "child_process"

// Configure target chains here
const TARGET_CHAINS = [
    "ARBITRUM",
    "AVALANCHE",
    "BASE",
    "BSC",
    "ETH",
    "OPTIMISM",
    "POLYGON",
    "ZKSYNC_ERA",
]

interface DeploymentResult {
    chain: string
    success: boolean
    address?: string
}

async function main() {
    console.log("=".repeat(60))
    console.log("BalanceAggregator Multi-Chain Deployment (CREATE2)")
    console.log("=".repeat(60))
    console.log(`\nTarget chains: ${TARGET_CHAINS.join(", ")}`)
    console.log(`Total chains: ${TARGET_CHAINS.length}\n`)

    const results: DeploymentResult[] = []

    for (let i = 0; i < TARGET_CHAINS.length; i++) {
        const chain = TARGET_CHAINS[i]
        console.log("-".repeat(60))
        console.log(`[${i + 1}/${TARGET_CHAINS.length}] Deploying to ${chain}...`)
        console.log("-".repeat(60))

        try {
            const command = `npx hardhat ignition deploy ignition/modules/BalanceAggregator.ts --network ${chain} --strategy create2`
            console.log(`Executing: ${command}\n`)

            const output = execSync(command, {
                encoding: "utf-8",
                stdio: "inherit",
            })

            results.push({ chain, success: true })
            console.log(`\n✓ ${chain} deployment successful\n`)
        } catch (error) {
            console.error(`\n✗ ${chain} deployment failed`)
            results.push({ chain, success: false })

            // Print summary of what was deployed before failing
            console.log("\n" + "=".repeat(60))
            console.log("DEPLOYMENT HALTED - Summary")
            console.log("=".repeat(60))
            results.forEach((r) => {
                const status = r.success ? "✓" : "✗"
                console.log(`${status} ${r.chain}`)
            })

            // Log remaining chains that weren't deployed
            const remaining = TARGET_CHAINS.slice(i + 1)
            if (remaining.length > 0) {
                console.log(`\nRemaining (not deployed): ${remaining.join(", ")}`)
            }

            process.exit(1)
        }
    }

    // Print final summary
    console.log("\n" + "=".repeat(60))
    console.log("DEPLOYMENT COMPLETE - Summary")
    console.log("=".repeat(60))
    results.forEach((r) => {
        const status = r.success ? "✓" : "✗"
        console.log(`${status} ${r.chain}`)
    })
    console.log("\nAll deployments successful!")
    console.log("Contract address is the same on all chains (CREATE2)")
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
