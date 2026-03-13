import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

export default buildModule("Cypher7702SwapExecutor", (m) => {
    // const nonceTracker = m.contract("NonceTracker", [])

    const swapExecutor = m.contract("Cypher7702SwapExecutor", [
        "0xDF18FEA7c3Bc247f57ae75D807F7650Cbf475C8A",
    ])

    return { swapExecutor }
})
