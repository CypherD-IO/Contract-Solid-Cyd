import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { CypherTargetRouter } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * CypherTargetRouter Test Suite
 * 
 * Comprehensive tests covering all contract functionality:
 * - Deployment and initialization
 * - setTarget (single target operations)
 * - setTargets (bulk target operations)
 * - removeTarget (target removal)
 * - Ownership management (inherited from Ownable)
 * - Edge cases and special scenarios
 * 
 * Test data mirrors production structure:
 * - Programs: CB2B, CYPHER_CARD, MW, OSMOSIS
 * - Providers: pc, rc
 * - Chains: ETH, NOBLE, OSMOSIS, SOLANA, TRON
 */
describe("CypherTargetRouter", function () {
    // =========================================================================
    // Production-like Test Constants
    // =========================================================================

    /**
     * Programs supported by the router
     */
    const PROGRAMS = {
        CB2B: "CB2B",
        CYPHER_CARD: "CYPHER_CARD",
        MW: "MW",
        OSMOSIS: "OSMOSIS"
    } as const;

    /**
     * Providers (client types)
     */
    const PROVIDERS = {
        PC: "pc",
        RC: "rc"
    } as const;

    /**
     * Supported blockchain networks
     */
    const CHAINS = {
        ETH: "ETH",
        NOBLE: "NOBLE",
        OSMOSIS: "OSMOSIS",
        SOLANA: "SOLANA",
        TRON: "TRON"
    } as const;

    /**
     * Sample target addresses
     */
    const SAMPLE_TARGETS = {
        // EVM-compatible addresses (ETH, etc.)
        EVM_PRIMARY: "0xd19edd84f9770d573cfa02f37a45938cb8cd7b5b",
        EVM_SECONDARY: "0xa1b2c3d4e5f6789012345678901234567890abcd",
        EVM_TERTIARY: "0x1234567890abcdef1234567890abcdef12345678",
        // Cosmos-based addresses (NOBLE, OSMOSIS)
        NOBLE: "noble1d19edd84f9770d573cfa02f37a45938cb8cd7b5",
        OSMOSIS: "osmo1d19edd84f9770d573cfa02f37a45938cb8cd7b5",
        // Solana addresses (base58)
        SOLANA: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        // Tron addresses (base58check)
        TRON: "TJYeasTPa6gpMJN9z5r3x4zKnQ7YqMGjUp"
    } as const;

    /**
     * Full production-like initialization data matching the expected structure:
     * targets[program][provider][chain] = target
     */
    const PRODUCTION_TARGETS = [
        // CB2B - pc targets
        { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
        { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE },
        { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.OSMOSIS, target: SAMPLE_TARGETS.OSMOSIS },
        { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.TRON, target: SAMPLE_TARGETS.TRON },
        // CB2B - rc targets
        { program: PROGRAMS.CB2B, provider: PROVIDERS.RC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
        { program: PROGRAMS.CB2B, provider: PROVIDERS.RC, chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE },
        // CYPHER_CARD - pc targets
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.PC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.PC, chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE },
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.PC, chain: CHAINS.OSMOSIS, target: SAMPLE_TARGETS.OSMOSIS },
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.PC, chain: CHAINS.SOLANA, target: SAMPLE_TARGETS.SOLANA },
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.PC, chain: CHAINS.TRON, target: SAMPLE_TARGETS.TRON },
        // CYPHER_CARD - rc targets
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.RC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.RC, chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE },
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.RC, chain: CHAINS.OSMOSIS, target: SAMPLE_TARGETS.OSMOSIS },
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.RC, chain: CHAINS.SOLANA, target: SAMPLE_TARGETS.SOLANA },
        { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.RC, chain: CHAINS.TRON, target: SAMPLE_TARGETS.TRON },
        // MW - rc only
        { program: PROGRAMS.MW, provider: PROVIDERS.RC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
        // OSMOSIS - rc only
        { program: PROGRAMS.OSMOSIS, provider: PROVIDERS.RC, chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE },
        { program: PROGRAMS.OSMOSIS, provider: PROVIDERS.RC, chain: CHAINS.OSMOSIS, target: SAMPLE_TARGETS.OSMOSIS }
    ];

    // =========================================================================
    // Test Fixture
    // =========================================================================

    /**
     * Deploys a fresh CypherTargetRouter contract for each test.
     * Uses loadFixture for efficient snapshot/revert pattern.
     * @returns Contract instance and test accounts
     */
    async function deployRouterFixture(): Promise<{
        router: CypherTargetRouter;
        owner: HardhatEthersSigner;
        otherAccount: HardhatEthersSigner;
        thirdAccount: HardhatEthersSigner;
    }> {
        // Get test signers - owner will be the deployer
        const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

        // Deploy the CypherTargetRouter contract with owner address
        const RouterFactory = await ethers.getContractFactory("CypherTargetRouter");
        const router = await RouterFactory.deploy(owner.address);
        await router.waitForDeployment();

        console.log(`    [Fixture] Router deployed at: ${await router.getAddress()}`);
        console.log(`    [Fixture] Owner set to: ${owner.address}`);

        return { router, owner, otherAccount, thirdAccount };
    }

    // =========================================================================
    // 1. Deployment Tests
    // =========================================================================

    describe("Deployment", function () {
        it("should deploy successfully with a valid owner address", async function () {
            const { router } = await loadFixture(deployRouterFixture);

            // Verify contract is deployed by checking it has an address
            const contractAddress = await router.getAddress();
            expect(contractAddress).to.be.properAddress;
            console.log(`      [Test] Contract deployed at: ${contractAddress}`);
        });

        it("should set the correct owner upon deployment", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Verify the owner is set correctly
            const contractOwner = await router.owner();
            expect(contractOwner).to.equal(owner.address);
            console.log(`      [Test] Owner verified: ${contractOwner}`);
        });

        it("should deploy with a different owner than the deployer", async function () {
            const [deployer, customOwner] = await ethers.getSigners();

            // Deploy with a custom owner address (not the deployer)
            const RouterFactory = await ethers.getContractFactory("CypherTargetRouter");
            const router = await RouterFactory.connect(deployer).deploy(customOwner.address);
            await router.waitForDeployment();

            // Verify the custom owner is set correctly
            const contractOwner = await router.owner();
            expect(contractOwner).to.equal(customOwner.address);
            expect(contractOwner).to.not.equal(deployer.address);
            console.log(`      [Test] Custom owner set: ${contractOwner}`);
        });
    });

    // =========================================================================
    // 2. setTarget Tests
    // =========================================================================

    describe("setTarget", function () {
        // Using production-like test data
        const PROGRAM = PROGRAMS.CYPHER_CARD;
        const PROVIDER = PROVIDERS.PC;
        const CHAIN = CHAINS.ETH;
        const TARGET = SAMPLE_TARGETS.EVM_PRIMARY;

        it("should allow owner to set a target successfully", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Owner sets a CYPHER_CARD target for ETH chain via pc provider
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET);

            // Verify the target was set
            const storedTarget = await router.targets(PROGRAM, PROVIDER, CHAIN);
            expect(storedTarget).to.equal(TARGET);
            console.log(`      [Test] Target set: ${PROGRAM}/${PROVIDER}/${CHAIN} -> ${storedTarget}`);
        });

        it("should make the target retrievable via the public mapping", async function () {
            const { router, owner, otherAccount } = await loadFixture(deployRouterFixture);

            // Owner sets a target
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET);

            // Any account should be able to read the target (public mapping)
            const storedTarget = await router.connect(otherAccount).targets(PROGRAM, PROVIDER, CHAIN);
            expect(storedTarget).to.equal(TARGET);
            console.log(`      [Test] Target readable by non-owner: ${storedTarget}`);
        });

        it("should allow updating an existing target", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);
            const NEW_TARGET = SAMPLE_TARGETS.EVM_SECONDARY;

            // Owner sets initial target
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET);
            
            // Owner updates the target to a new address
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, NEW_TARGET);

            // Verify the target was updated
            const storedTarget = await router.targets(PROGRAM, PROVIDER, CHAIN);
            expect(storedTarget).to.equal(NEW_TARGET);
            console.log(`      [Test] Target updated from ${TARGET} to ${storedTarget}`);
        });

        it("should emit TargetSet event with correct parameters", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Verify the TargetSet event is emitted with correct parameters
            await expect(router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET))
                .to.emit(router, "TargetSet")
                .withArgs(PROGRAM, PROVIDER, CHAIN, TARGET);
            
            console.log(`      [Test] TargetSet event emitted correctly`);
        });

        it("should revert when non-owner tries to set a target", async function () {
            const { router, otherAccount } = await loadFixture(deployRouterFixture);

            // Non-owner attempts to set a target - should revert
            await expect(
                router.connect(otherAccount).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
                .withArgs(otherAccount.address);
            
            console.log(`      [Test] Non-owner correctly rejected`);
        });

        it("should revert when program is empty", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(owner).setTarget("", PROVIDER, CHAIN, TARGET)
            ).to.be.revertedWith("Program must not be empty");
            
            console.log(`      [Test] Empty program correctly rejected`);
        });

        it("should revert when provider is empty", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(owner).setTarget(PROGRAM, "", CHAIN, TARGET)
            ).to.be.revertedWith("Provider must not be empty");
            
            console.log(`      [Test] Empty provider correctly rejected`);
        });

        it("should revert when chain is empty", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(owner).setTarget(PROGRAM, PROVIDER, "", TARGET)
            ).to.be.revertedWith("Chain must not be empty");
            
            console.log(`      [Test] Empty chain correctly rejected`);
        });

        it("should revert when target is empty", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, "")
            ).to.be.revertedWith("Target must not be empty");
            
            console.log(`      [Test] Empty target correctly rejected`);
        });
    });

    // =========================================================================
    // 3. setTargets (Bulk) Tests
    // =========================================================================

    describe("setTargets (bulk)", function () {
        // Subset of production targets for bulk operations
        const BULK_TARGETS = [
            { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
            { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE },
            { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.TRON, target: SAMPLE_TARGETS.TRON }
        ];

        it("should allow owner to set multiple targets at once", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Owner sets multiple CB2B targets
            await router.connect(owner).setTargets(BULK_TARGETS);

            // Verify all targets were set
            for (const item of BULK_TARGETS) {
                const storedTarget = await router.targets(item.program, item.provider, item.chain);
                expect(storedTarget).to.equal(item.target);
            }
            console.log(`      [Test] ${BULK_TARGETS.length} targets set successfully`);
        });

        it("should make all targets retrievable after bulk set", async function () {
            const { router, owner, otherAccount } = await loadFixture(deployRouterFixture);

            // Owner sets multiple targets
            await router.connect(owner).setTargets(BULK_TARGETS);

            // Non-owner should be able to read all targets
            for (const item of BULK_TARGETS) {
                const storedTarget = await router.connect(otherAccount).targets(
                    item.program, 
                    item.provider, 
                    item.chain
                );
                expect(storedTarget).to.equal(item.target);
            }
            console.log(`      [Test] All ${BULK_TARGETS.length} targets readable by anyone`);
        });

        it("should emit TargetSet event for each target in bulk operation", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Execute bulk set and capture transaction
            const tx = await router.connect(owner).setTargets(BULK_TARGETS);
            const receipt = await tx.wait();

            // Verify events were emitted - one for each target
            for (const item of BULK_TARGETS) {
                await expect(tx)
                    .to.emit(router, "TargetSet")
                    .withArgs(item.program, item.provider, item.chain, item.target);
            }
            console.log(`      [Test] ${BULK_TARGETS.length} TargetSet events emitted`);
        });

        it("should revert when non-owner tries to set targets in bulk", async function () {
            const { router, otherAccount } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(otherAccount).setTargets(BULK_TARGETS)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
                .withArgs(otherAccount.address);
            
            console.log(`      [Test] Non-owner correctly rejected for bulk set`);
        });

        it("should revert when any program is empty in bulk set", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            const invalidTargets = [
                { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
                { program: "", provider: PROVIDERS.RC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY } // Invalid
            ];

            await expect(
                router.connect(owner).setTargets(invalidTargets)
            ).to.be.revertedWith("Program must not be empty");
            
            console.log(`      [Test] Empty program in bulk correctly rejected`);
        });

        it("should revert when any provider is empty in bulk set", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            const invalidTargets = [
                { program: PROGRAMS.CYPHER_CARD, provider: PROVIDERS.PC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
                { program: PROGRAMS.CYPHER_CARD, provider: "", chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE } // Invalid
            ];

            await expect(
                router.connect(owner).setTargets(invalidTargets)
            ).to.be.revertedWith("Provider must not be empty");
            
            console.log(`      [Test] Empty provider in bulk correctly rejected`);
        });

        it("should revert when any chain is empty in bulk set", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            const invalidTargets = [
                { program: PROGRAMS.MW, provider: PROVIDERS.RC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
                { program: PROGRAMS.MW, provider: PROVIDERS.RC, chain: "", target: SAMPLE_TARGETS.EVM_SECONDARY } // Invalid
            ];

            await expect(
                router.connect(owner).setTargets(invalidTargets)
            ).to.be.revertedWith("Chain must not be empty");
            
            console.log(`      [Test] Empty chain in bulk correctly rejected`);
        });

        it("should revert when any target is empty in bulk set", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            const invalidTargets = [
                { program: PROGRAMS.OSMOSIS, provider: PROVIDERS.RC, chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE },
                { program: PROGRAMS.OSMOSIS, provider: PROVIDERS.RC, chain: CHAINS.OSMOSIS, target: "" } // Invalid
            ];

            await expect(
                router.connect(owner).setTargets(invalidTargets)
            ).to.be.revertedWith("Target must not be empty");
            
            console.log(`      [Test] Empty target in bulk correctly rejected`);
        });

        it("should handle empty array gracefully", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Empty array should succeed without setting anything
            await expect(router.connect(owner).setTargets([]))
                .to.not.be.reverted;
            
            console.log(`      [Test] Empty array handled gracefully`);
        });

        it("should handle single item array", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            const singleTarget = [BULK_TARGETS[0]];
            
            await router.connect(owner).setTargets(singleTarget);

            const storedTarget = await router.targets(
                singleTarget[0].program,
                singleTarget[0].provider,
                singleTarget[0].chain
            );
            expect(storedTarget).to.equal(singleTarget[0].target);
            
            console.log(`      [Test] Single item array processed correctly`);
        });

        it("should initialize full production targets structure", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set all 19 production targets in one transaction
            await router.connect(owner).setTargets(PRODUCTION_TARGETS);

            // Verify CB2B targets
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_PRIMARY);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.NOBLE)).to.equal(SAMPLE_TARGETS.NOBLE);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.OSMOSIS)).to.equal(SAMPLE_TARGETS.OSMOSIS);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.TRON)).to.equal(SAMPLE_TARGETS.TRON);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.RC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_PRIMARY);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.RC, CHAINS.NOBLE)).to.equal(SAMPLE_TARGETS.NOBLE);

            // Verify CYPHER_CARD targets
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_PRIMARY);
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.SOLANA)).to.equal(SAMPLE_TARGETS.SOLANA);
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.RC, CHAINS.TRON)).to.equal(SAMPLE_TARGETS.TRON);

            // Verify MW target (only rc/ETH)
            expect(await router.targets(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_PRIMARY);

            // Verify OSMOSIS targets
            expect(await router.targets(PROGRAMS.OSMOSIS, PROVIDERS.RC, CHAINS.NOBLE)).to.equal(SAMPLE_TARGETS.NOBLE);
            expect(await router.targets(PROGRAMS.OSMOSIS, PROVIDERS.RC, CHAINS.OSMOSIS)).to.equal(SAMPLE_TARGETS.OSMOSIS);

            console.log(`      [Test] Full production structure (${PRODUCTION_TARGETS.length} targets) initialized successfully`);
        });
    });

    // =========================================================================
    // 4. removeTarget Tests
    // =========================================================================

    describe("removeTarget", function () {
        const PROGRAM = PROGRAMS.CYPHER_CARD;
        const PROVIDER = PROVIDERS.RC;
        const CHAIN = CHAINS.SOLANA;
        const TARGET = SAMPLE_TARGETS.SOLANA;

        it("should allow owner to remove an existing target", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // First, set a CYPHER_CARD/rc/SOLANA target
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET);
            
            // Verify it was set
            let storedTarget = await router.targets(PROGRAM, PROVIDER, CHAIN);
            expect(storedTarget).to.equal(TARGET);

            // Remove the target
            await router.connect(owner).removeTarget(PROGRAM, PROVIDER, CHAIN);

            // Verify it was removed (should return empty string)
            storedTarget = await router.targets(PROGRAM, PROVIDER, CHAIN);
            expect(storedTarget).to.equal("");
            
            console.log(`      [Test] Target removed successfully: ${PROGRAM}/${PROVIDER}/${CHAIN}`);
        });

        it("should return empty string after target removal", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set and remove a target
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET);
            await router.connect(owner).removeTarget(PROGRAM, PROVIDER, CHAIN);

            // Verify empty string is returned
            const storedTarget = await router.targets(PROGRAM, PROVIDER, CHAIN);
            expect(storedTarget).to.equal("");
            expect(storedTarget.length).to.equal(0);
            
            console.log(`      [Test] Removed target returns empty string`);
        });

        it("should emit TargetRemoved event with correct parameters", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set a target first
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET);

            // Verify TargetRemoved event is emitted
            await expect(router.connect(owner).removeTarget(PROGRAM, PROVIDER, CHAIN))
                .to.emit(router, "TargetRemoved")
                .withArgs(PROGRAM, PROVIDER, CHAIN);
            
            console.log(`      [Test] TargetRemoved event emitted correctly`);
        });

        it("should revert when non-owner tries to remove a target", async function () {
            const { router, owner, otherAccount } = await loadFixture(deployRouterFixture);

            // Set a target as owner
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET);

            // Non-owner attempts to remove - should revert
            await expect(
                router.connect(otherAccount).removeTarget(PROGRAM, PROVIDER, CHAIN)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
                .withArgs(otherAccount.address);
            
            console.log(`      [Test] Non-owner correctly rejected for removal`);
        });

        it("should revert when program is empty", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(owner).removeTarget("", PROVIDER, CHAIN)
            ).to.be.revertedWith("Program must not be empty");
            
            console.log(`      [Test] Empty program rejection on remove`);
        });

        it("should revert when provider is empty", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(owner).removeTarget(PROGRAM, "", CHAIN)
            ).to.be.revertedWith("Provider must not be empty");
            
            console.log(`      [Test] Empty provider rejection on remove`);
        });

        it("should revert when chain is empty", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(owner).removeTarget(PROGRAM, PROVIDER, "")
            ).to.be.revertedWith("Chain must not be empty");
            
            console.log(`      [Test] Empty chain rejection on remove`);
        });

        it("should succeed when removing a non-existent target", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Remove a target that was never set - should not revert
            // Using a non-existent program/provider/chain combination
            await expect(
                router.connect(owner).removeTarget(PROGRAMS.MW, PROVIDERS.PC, CHAINS.SOLANA)
            ).to.not.be.reverted;

            // Event should still be emitted
            await expect(
                router.connect(owner).removeTarget(PROGRAMS.OSMOSIS, PROVIDERS.PC, CHAINS.ETH)
            ).to.emit(router, "TargetRemoved");
            
            console.log(`      [Test] Non-existent target removal succeeds`);
        });

        it("should not affect other targets when one is removed", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set two CYPHER_CARD targets for different chains
            await router.connect(owner).setTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.ETH, SAMPLE_TARGETS.EVM_PRIMARY);
            await router.connect(owner).setTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.SOLANA, SAMPLE_TARGETS.SOLANA);

            // Remove ETH target
            await router.connect(owner).removeTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.ETH);

            // Verify ETH is removed but SOLANA remains
            const storedETH = await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.ETH);
            const storedSOLANA = await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.SOLANA);
            
            expect(storedETH).to.equal("");
            expect(storedSOLANA).to.equal(SAMPLE_TARGETS.SOLANA);
            
            console.log(`      [Test] Other targets unaffected by removal`);
        });
    });

    // =========================================================================
    // 5. Ownership Tests (Ownable Inheritance)
    // =========================================================================

    describe("Ownership", function () {
        const PROGRAM = PROGRAMS.MW;
        const PROVIDER = PROVIDERS.RC;
        const CHAIN = CHAINS.ETH;
        const TARGET = SAMPLE_TARGETS.EVM_PRIMARY;

        it("should allow owner to transfer ownership", async function () {
            const { router, owner, otherAccount } = await loadFixture(deployRouterFixture);

            // Transfer ownership to otherAccount
            await router.connect(owner).transferOwnership(otherAccount.address);

            // Verify new owner
            const newOwner = await router.owner();
            expect(newOwner).to.equal(otherAccount.address);
            
            console.log(`      [Test] Ownership transferred to ${newOwner}`);
        });

        it("should grant new owner access to owner functions", async function () {
            const { router, owner, otherAccount } = await loadFixture(deployRouterFixture);

            // Transfer ownership
            await router.connect(owner).transferOwnership(otherAccount.address);

            // New owner should be able to setTarget
            await expect(
                router.connect(otherAccount).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET)
            ).to.not.be.reverted;

            // Verify it worked
            const storedTarget = await router.targets(PROGRAM, PROVIDER, CHAIN);
            expect(storedTarget).to.equal(TARGET);
            
            console.log(`      [Test] New owner can call owner functions`);
        });

        it("should revoke old owner's access after transfer", async function () {
            const { router, owner, otherAccount } = await loadFixture(deployRouterFixture);

            // Transfer ownership
            await router.connect(owner).transferOwnership(otherAccount.address);

            // Old owner should no longer be able to setTarget
            await expect(
                router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
                .withArgs(owner.address);
            
            console.log(`      [Test] Old owner correctly rejected after transfer`);
        });

        it("should emit OwnershipTransferred event on transfer", async function () {
            const { router, owner, otherAccount } = await loadFixture(deployRouterFixture);

            await expect(router.connect(owner).transferOwnership(otherAccount.address))
                .to.emit(router, "OwnershipTransferred")
                .withArgs(owner.address, otherAccount.address);
            
            console.log(`      [Test] OwnershipTransferred event emitted`);
        });

        it("should prevent non-owner from transferring ownership", async function () {
            const { router, otherAccount, thirdAccount } = await loadFixture(deployRouterFixture);

            await expect(
                router.connect(otherAccount).transferOwnership(thirdAccount.address)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
                .withArgs(otherAccount.address);
            
            console.log(`      [Test] Non-owner cannot transfer ownership`);
        });

        it("should allow owner to renounce ownership", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await router.connect(owner).renounceOwnership();

            // Owner should now be zero address
            const newOwner = await router.owner();
            expect(newOwner).to.equal(ethers.ZeroAddress);
            
            console.log(`      [Test] Ownership renounced, owner is now zero address`);
        });

        it("should emit OwnershipTransferred event on renounce", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await expect(router.connect(owner).renounceOwnership())
                .to.emit(router, "OwnershipTransferred")
                .withArgs(owner.address, ethers.ZeroAddress);
            
            console.log(`      [Test] OwnershipTransferred event emitted on renounce`);
        });

        it("should prevent all owner actions after ownership is renounced", async function () {
            const { router, owner, otherAccount } = await loadFixture(deployRouterFixture);

            // Renounce ownership
            await router.connect(owner).renounceOwnership();

            // Former owner should not be able to call owner functions
            await expect(
                router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
                .withArgs(owner.address);

            // No one else can either
            await expect(
                router.connect(otherAccount).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
                .withArgs(otherAccount.address);
            
            console.log(`      [Test] All owner actions blocked after renounce`);
        });

        it("should prevent owner functions after renouncing - setTargets", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            await router.connect(owner).renounceOwnership();

            const targets = [{ program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY }];
            
            await expect(
                router.connect(owner).setTargets(targets)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
            
            console.log(`      [Test] setTargets blocked after renounce`);
        });

        it("should prevent owner functions after renouncing - removeTarget", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set a target before renouncing
            await router.connect(owner).setTarget(PROGRAM, PROVIDER, CHAIN, TARGET);
            
            // Renounce
            await router.connect(owner).renounceOwnership();

            // Cannot remove after renouncing
            await expect(
                router.connect(owner).removeTarget(PROGRAM, PROVIDER, CHAIN)
            ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
            
            console.log(`      [Test] removeTarget blocked after renounce`);
        });
    });

    // =========================================================================
    // 6. Edge Cases
    // =========================================================================

    describe("Edge Cases", function () {
        it("should maintain independent storage for different program/provider/chain combinations", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set targets for multiple combinations that share partial keys
            await router.connect(owner).setTarget(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.ETH, SAMPLE_TARGETS.EVM_PRIMARY);
            await router.connect(owner).setTarget(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.NOBLE, SAMPLE_TARGETS.NOBLE);
            await router.connect(owner).setTarget(PROGRAMS.CB2B, PROVIDERS.RC, CHAINS.ETH, SAMPLE_TARGETS.EVM_SECONDARY);
            await router.connect(owner).setTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.ETH, SAMPLE_TARGETS.EVM_TERTIARY);

            // Verify all are stored independently
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_PRIMARY);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.NOBLE)).to.equal(SAMPLE_TARGETS.NOBLE);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.RC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_SECONDARY);
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_TERTIARY);

            // Non-existent combinations should return empty
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.RC, CHAINS.NOBLE)).to.equal("");
            expect(await router.targets(PROGRAMS.MW, PROVIDERS.PC, CHAINS.ETH)).to.equal("");
            
            console.log(`      [Test] All combinations stored independently`);
        });

        it("should handle very long string values", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Create long strings (256 characters each)
            const longProgram = "PROGRAM_".padEnd(256, "X");
            const longProvider = "PROVIDER_".padEnd(256, "Y");
            const longChain = "CHAIN_".padEnd(256, "Z");
            const longTarget = "0x".padEnd(256, "a");

            // Should successfully set and retrieve long strings
            await router.connect(owner).setTarget(longProgram, longProvider, longChain, longTarget);

            const storedTarget = await router.targets(longProgram, longProvider, longChain);
            expect(storedTarget).to.equal(longTarget);
            expect(storedTarget.length).to.equal(256);
            
            console.log(`      [Test] Long strings (256 chars) handled correctly`);
        });

        it("should handle special characters in strings", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Test with various special characters (realistic edge cases)
            const specialProgram = "CYPHER_CARD_V2.0-beta";
            const specialProvider = "pc/v2";
            const specialChain = "ETH:mainnet";
            const specialTarget = "0xd19edd84f9770d573cfa02f37a45938cb8cd7b5b";

            await router.connect(owner).setTarget(
                specialProgram,
                specialProvider,
                specialChain,
                specialTarget
            );

            const storedTarget = await router.targets(specialProgram, specialProvider, specialChain);
            expect(storedTarget).to.equal(specialTarget);
            
            console.log(`      [Test] Special characters handled correctly`);
        });

        it("should handle different address formats per chain", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set targets with different address formats as they would appear per chain
            await router.connect(owner).setTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.ETH, SAMPLE_TARGETS.EVM_PRIMARY);
            await router.connect(owner).setTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.NOBLE, SAMPLE_TARGETS.NOBLE);
            await router.connect(owner).setTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.OSMOSIS, SAMPLE_TARGETS.OSMOSIS);
            await router.connect(owner).setTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.SOLANA, SAMPLE_TARGETS.SOLANA);
            await router.connect(owner).setTarget(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.TRON, SAMPLE_TARGETS.TRON);

            // Verify all different format addresses are stored correctly
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_PRIMARY);
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.NOBLE)).to.equal(SAMPLE_TARGETS.NOBLE);
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.OSMOSIS)).to.equal(SAMPLE_TARGETS.OSMOSIS);
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.SOLANA)).to.equal(SAMPLE_TARGETS.SOLANA);
            expect(await router.targets(PROGRAMS.CYPHER_CARD, PROVIDERS.PC, CHAINS.TRON)).to.equal(SAMPLE_TARGETS.TRON);
            
            console.log(`      [Test] Different address formats per chain handled correctly`);
        });

        it("should handle whitespace-only strings as valid (non-empty)", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Whitespace-only strings are technically not empty (bytes.length > 0)
            const whitespaceProgram = "   ";
            const whitespaceProvider = "\t\t";
            const whitespaceChain = " \t ";
            const whitespaceTarget = "    ";

            // Should succeed as these are not empty strings
            await router.connect(owner).setTarget(
                whitespaceProgram,
                whitespaceProvider,
                whitespaceChain,
                whitespaceTarget
            );

            const storedTarget = await router.targets(
                whitespaceProgram,
                whitespaceProvider,
                whitespaceChain
            );
            expect(storedTarget).to.equal(whitespaceTarget);
            
            console.log(`      [Test] Whitespace-only strings accepted as non-empty`);
        });

        it("should correctly handle updating targets in bulk after initial single sets", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set initial CB2B targets one by one
            await router.connect(owner).setTarget(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.ETH, SAMPLE_TARGETS.EVM_PRIMARY);
            await router.connect(owner).setTarget(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.NOBLE, SAMPLE_TARGETS.NOBLE);

            // Update via bulk with new addresses
            const NEW_ETH_TARGET = SAMPLE_TARGETS.EVM_SECONDARY;
            const NEW_NOBLE_TARGET = "noble1newaddress123456789012345678901234567";
            
            await router.connect(owner).setTargets([
                { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.ETH, target: NEW_ETH_TARGET },
                { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.NOBLE, target: NEW_NOBLE_TARGET },
                { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.TRON, target: SAMPLE_TARGETS.TRON } // New entry
            ]);

            // Verify updates and new entry
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.ETH)).to.equal(NEW_ETH_TARGET);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.NOBLE)).to.equal(NEW_NOBLE_TARGET);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.TRON)).to.equal(SAMPLE_TARGETS.TRON);
            
            console.log(`      [Test] Mixed update and new entries in bulk work correctly`);
        });

        it("should allow setting and removing the same target multiple times", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set -> Remove -> Set -> Remove cycle for MW/rc/ETH
            await router.connect(owner).setTarget(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH, SAMPLE_TARGETS.EVM_PRIMARY);
            expect(await router.targets(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_PRIMARY);

            await router.connect(owner).removeTarget(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH);
            expect(await router.targets(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH)).to.equal("");

            await router.connect(owner).setTarget(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH, SAMPLE_TARGETS.EVM_SECONDARY);
            expect(await router.targets(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH)).to.equal(SAMPLE_TARGETS.EVM_SECONDARY);

            await router.connect(owner).removeTarget(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH);
            expect(await router.targets(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH)).to.equal("");
            
            console.log(`      [Test] Set-remove cycles work correctly`);
        });

        it("should handle large batch of targets in setTargets", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Create a large batch of 50 targets with unique program/chain combinations
            const largeTargets = [];
            for (let i = 0; i < 50; i++) {
                largeTargets.push({
                    program: `${PROGRAMS.CYPHER_CARD}_batch_${i}`,
                    provider: i % 2 === 0 ? PROVIDERS.PC : PROVIDERS.RC,
                    chain: `${CHAINS.ETH}_${i}`,
                    target: `0x${i.toString(16).padStart(40, '0')}`
                });
            }

            // Should handle large batch
            await router.connect(owner).setTargets(largeTargets);

            // Verify first, middle, and last entries
            expect(await router.targets(largeTargets[0].program, largeTargets[0].provider, largeTargets[0].chain))
                .to.equal(largeTargets[0].target);
            expect(await router.targets(largeTargets[25].program, largeTargets[25].provider, largeTargets[25].chain))
                .to.equal(largeTargets[25].target);
            expect(await router.targets(largeTargets[49].program, largeTargets[49].provider, largeTargets[49].chain))
                .to.equal(largeTargets[49].target);
            
            console.log(`      [Test] Large batch (${largeTargets.length} targets) processed successfully`);
        });

        it("should verify production structure independence between providers", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set full production targets
            await router.connect(owner).setTargets(PRODUCTION_TARGETS);

            // Verify pc and rc are independent for CB2B
            // CB2B has: pc -> ETH, NOBLE, OSMOSIS, TRON
            //           rc -> ETH, NOBLE only
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.OSMOSIS)).to.equal(SAMPLE_TARGETS.OSMOSIS);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.RC, CHAINS.OSMOSIS)).to.equal(""); // Not set for rc

            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.PC, CHAINS.TRON)).to.equal(SAMPLE_TARGETS.TRON);
            expect(await router.targets(PROGRAMS.CB2B, PROVIDERS.RC, CHAINS.TRON)).to.equal(""); // Not set for rc
            
            console.log(`      [Test] Provider independence verified for production structure`);
        });
    });

    // =========================================================================
    // 7. Gas Estimation Tests (Informational)
    // =========================================================================

    describe("Gas Usage (Informational)", function () {
        it("should report gas used for setTarget", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            const tx = await router.connect(owner).setTarget(
                PROGRAMS.CYPHER_CARD,
                PROVIDERS.PC,
                CHAINS.ETH,
                SAMPLE_TARGETS.EVM_PRIMARY
            );
            const receipt = await tx.wait();

            console.log(`      [Gas] setTarget: ${receipt?.gasUsed.toString()} gas`);
        });

        it("should report gas used for setTargets with 5 items", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            const targets = [
                { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY },
                { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.NOBLE, target: SAMPLE_TARGETS.NOBLE },
                { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.OSMOSIS, target: SAMPLE_TARGETS.OSMOSIS },
                { program: PROGRAMS.CB2B, provider: PROVIDERS.PC, chain: CHAINS.TRON, target: SAMPLE_TARGETS.TRON },
                { program: PROGRAMS.CB2B, provider: PROVIDERS.RC, chain: CHAINS.ETH, target: SAMPLE_TARGETS.EVM_PRIMARY }
            ];

            const tx = await router.connect(owner).setTargets(targets);
            const receipt = await tx.wait();

            console.log(`      [Gas] setTargets (5 items): ${receipt?.gasUsed.toString()} gas`);
        });

        it("should report gas used for full production initialization (19 items)", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            const tx = await router.connect(owner).setTargets(PRODUCTION_TARGETS);
            const receipt = await tx.wait();

            console.log(`      [Gas] setTargets (${PRODUCTION_TARGETS.length} production items): ${receipt?.gasUsed.toString()} gas`);
        });

        it("should report gas used for removeTarget", async function () {
            const { router, owner } = await loadFixture(deployRouterFixture);

            // Set a target first
            await router.connect(owner).setTarget(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH, SAMPLE_TARGETS.EVM_PRIMARY);

            const tx = await router.connect(owner).removeTarget(PROGRAMS.MW, PROVIDERS.RC, CHAINS.ETH);
            const receipt = await tx.wait();

            console.log(`      [Gas] removeTarget: ${receipt?.gasUsed.toString()} gas`);
        });
    });
});
