import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

export default buildModule("Apollo", (m) => {
    const apollo = m.contract("CypherAutoLoad", [
        "0x302633bae6eae1ab5a7d676e52ff080c70794b42",
        "0x302633bae6eae1ab5a7d676e52ff080c70794b42",
        "0x2860f3a9C202dbec6C74aB9cAE43DE6aeaE59E22",
    ])

    return { apollo }
})
