import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

export default buildModule("Cypher7702SwapExecutor", (m) => {
    const nonceTracker = m.contract("NonceTracker", [])

    const swapExecutor = m.contract("Cypher7702SwapExecutor", [nonceTracker])

    return { nonceTracker, swapExecutor }
})
