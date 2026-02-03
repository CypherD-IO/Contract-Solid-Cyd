import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

export default buildModule("BalanceAggregator", (m) => {
    const balanceAggregator = m.contract("BalanceAggregator", [])
    return { balanceAggregator }
})
