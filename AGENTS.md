# AGENTS.md

## Cursor Cloud specific instructions

This is a Hardhat Solidity smart contract project (cyd-contracts). No long-running services, databases, or Docker containers are required — all testing uses Hardhat's in-memory EVM node.

### Prerequisites

- Node.js v18.20.2 (specified in `.nvmrc`)
- `secrets.json` must exist in the root (copy from `secrets.sample.json`). The sample has a truncated private key; for local dev/testing, use any valid 32-byte hex key (e.g. `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`). This file is gitignored and only needed for deployment — tests run without network access.

### Key commands (see `package.json` scripts)

- `npm run compile` — compile Solidity contracts
- `npm test -- tests/CypherTargetRouter.ts` — run tests (must specify the path since tests live in `tests/` not `test/`)
- `npx hardhat test tests/CypherTargetRouter.ts` — equivalent direct invocation

### Gotchas

- **Test directory**: Hardhat defaults to `test/` but this repo uses `tests/` (plural). Running `npm test` without specifying the file path finds 0 tests. Always pass the test file path explicitly.
- **No lockfile**: The repo has no `package-lock.json`. When running `npm install`, `@openzeppelin/contracts` (specified as `^5.0.2`) may resolve to a newer 5.x version that uses the `mcopy` instruction (requires Cancun EVM). Pin to `5.0.2` via `npm install @openzeppelin/contracts@5.0.2` after the initial install to avoid compilation errors.
- **zkSync sub-project** (`zksync-balance-aggr/`): Optional. Its `hardhat.config.ts` uses `version: "latest"` for zksolc, which is deprecated. This sub-project will not compile without fixing that config.
- **Hardhat Node.js warning**: Hardhat shows a warning about Node.js v18 not being supported. This is non-blocking; compilation and tests work correctly.
