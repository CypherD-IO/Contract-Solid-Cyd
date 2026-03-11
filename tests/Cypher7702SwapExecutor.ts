import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Cypher7702SwapExecutor + NonceTracker Integration Tests
 *
 * EIP-7702 simulation: `hardhat_setCode` copies the executor's runtime bytecode
 * (including all immutables: nonceTracker address, EIP-712 domain hashes) to an
 * EOA address.  The EOA's private key can then produce valid EIP-712 signatures
 * where `ECDSA.recover(...) == address(this)`.
 *
 * Test categories:
 *  - Deployment & constructor validation
 *  - Access control (onlySelf modifier)
 *  - receive() ETH acceptance
 *  - executeWithSig: signature validation, nonce management, call execution
 *  - execute: self-call batching, revert propagation
 *  - swapERC20: full swap flow, event emission, approval lifecycle, error paths
 *  - swapNative: ETH-for-token swaps, error paths
 */
describe("Cypher7702SwapExecutor", function () {
    // =========================================================================
    // EIP-712 Helpers
    // =========================================================================

    const CALL_TYPEHASH = ethers.keccak256(
        ethers.toUtf8Bytes("Call(address to,uint256 value,bytes data)")
    );

    interface CallStruct {
        to: string;
        value: bigint;
        data: string;
    }

    function hashCalls(calls: CallStruct[]): string {
        const hashes = calls.map((call) =>
            ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["bytes32", "address", "uint256", "bytes32"],
                    [CALL_TYPEHASH, call.to, call.value, ethers.keccak256(call.data)]
                )
            )
        );
        if (hashes.length === 0) {
            return ethers.keccak256("0x");
        }
        return ethers.keccak256(ethers.concat(hashes));
    }

    async function signExecute(
        signer: HardhatEthersSigner,
        verifyingContract: string,
        nonce: bigint,
        calls: CallStruct[],
        expiry: bigint
    ): Promise<string> {
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const callsHash = hashCalls(calls);

        return signer.signTypedData(
            {
                name: "Cypher7702SwapExecutor",
                version: "1",
                chainId,
                verifyingContract,
            },
            {
                Cypher7702Execute: [
                    { name: "chainId", type: "uint256" },
                    { name: "account", type: "address" },
                    { name: "nonce", type: "uint256" },
                    { name: "callsHash", type: "bytes32" },
                    { name: "expiry", type: "uint256" },
                ],
            },
            {
                chainId,
                account: verifyingContract,
                nonce,
                callsHash,
                expiry,
            }
        );
    }

    // =========================================================================
    // Fixtures
    // =========================================================================

    /**
     * Basic fixture without 7702 simulation — for deployment and access-control tests.
     */
    async function deployBasicFixture() {
        const [deployer, other] = await ethers.getSigners();
        const nonceTracker = await (await ethers.getContractFactory("NonceTracker")).deploy();
        const ExecutorFactory = await ethers.getContractFactory("Cypher7702SwapExecutor");
        const executor = await ExecutorFactory.deploy(await nonceTracker.getAddress());
        return { executor, nonceTracker, deployer, other, ExecutorFactory };
    }

    /**
     * Full 7702-simulated fixture:
     *  - Deploys NonceTracker, MockERC20 (tokenIn/tokenOut), MockSwapRouter
     *  - Deploys executor implementation to capture bytecode with immutables
     *  - Sets that bytecode at `owner`'s address (simulating 7702 delegation)
     *  - Funds the 7702 account and swap router for testing
     */
    async function deploy7702Fixture() {
        const [owner, relayer, recipient, other] = await ethers.getSigners();

        const nonceTracker = await (await ethers.getContractFactory("NonceTracker")).deploy();
        const tokenIn = await (await ethers.getContractFactory("MockERC20")).deploy("Token In", "TIN");
        const tokenOut = await (await ethers.getContractFactory("MockERC20")).deploy("Token Out", "TOUT");
        const swapRouter = await (await ethers.getContractFactory("MockSwapRouter")).deploy();

        const ExecutorFactory = await ethers.getContractFactory("Cypher7702SwapExecutor");
        const executorImpl = await ExecutorFactory.deploy(await nonceTracker.getAddress());

        // EIP-7702 simulation: copy executor runtime bytecode to owner's address.
        // All immutables (_hashedName, _hashedVersion, nonceTracker, etc.) are
        // embedded in the bytecode, so they transfer correctly.
        const code = await ethers.provider.getCode(await executorImpl.getAddress());
        await ethers.provider.send("hardhat_setCode", [owner.address, code]);
        const executor = ExecutorFactory.attach(owner.address) as Awaited<ReturnType<typeof ExecutorFactory.deploy>>;

        // Fund the swap router with output tokens
        const AMOUNT_OUT = ethers.parseEther("100");
        await tokenOut.mint(await swapRouter.getAddress(), AMOUNT_OUT * 10n);

        // Fund the 7702 account (owner) with input tokens
        const AMOUNT_IN = ethers.parseEther("50");
        await tokenIn.mint(owner.address, AMOUNT_IN);

        console.log(`    [Fixture] NonceTracker: ${await nonceTracker.getAddress()}`);
        console.log(`    [Fixture] 7702 Account: ${owner.address}`);

        return {
            executor, executorImpl, nonceTracker,
            tokenIn, tokenOut, swapRouter,
            owner, relayer, recipient, other,
            AMOUNT_IN, AMOUNT_OUT,
        };
    }

    // =========================================================================
    // 1. Deployment
    // =========================================================================

    describe("Deployment", function () {
        it("should set the nonceTracker address correctly", async function () {
            const { executor, nonceTracker } = await loadFixture(deployBasicFixture);
            expect(await executor.nonceTracker()).to.equal(await nonceTracker.getAddress());
            console.log(`      [Test] nonceTracker set to ${await nonceTracker.getAddress()}`);
        });

        it("should revert when nonceTracker is zero address", async function () {
            const { ExecutorFactory } = await loadFixture(deployBasicFixture);
            await expect(ExecutorFactory.deploy(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(ExecutorFactory, "ZeroAddress")
                .withArgs("nonceTracker");
            console.log(`      [Test] Zero address constructor correctly rejected`);
        });
    });

    // =========================================================================
    // 2. Access Control (onlySelf)
    // =========================================================================

    describe("Access Control", function () {
        it("should revert execute when called by non-self", async function () {
            const { executor, other } = await loadFixture(deployBasicFixture);
            await expect(
                executor.connect(other).execute([])
            ).to.be.revertedWithCustomError(executor, "SelfCallOnly");
            console.log(`      [Test] execute correctly rejected for non-self caller`);
        });

        it("should revert swapNative when called by non-self", async function () {
            const { executor, other } = await loadFixture(deployBasicFixture);
            await expect(
                executor.connect(other).swapNative(
                    other.address, other.address, "0x", 0, other.address, { value: 1 }
                )
            ).to.be.revertedWithCustomError(executor, "SelfCallOnly");
            console.log(`      [Test] swapNative correctly rejected for non-self caller`);
        });

        it("should revert swapERC20 when called by non-self", async function () {
            const { executor, other } = await loadFixture(deployBasicFixture);
            await expect(
                executor.connect(other).swapERC20(
                    other.address, other.address, 0,
                    other.address, other.address, "0x", 0, other.address
                )
            ).to.be.revertedWithCustomError(executor, "SelfCallOnly");
            console.log(`      [Test] swapERC20 correctly rejected for non-self caller`);
        });
    });

    // =========================================================================
    // 3. receive
    // =========================================================================

    describe("receive", function () {
        it("should accept plain ETH transfers", async function () {
            const { executor, deployer } = await loadFixture(deployBasicFixture);
            const executorAddr = await executor.getAddress();
            const amount = ethers.parseEther("1");

            await deployer.sendTransaction({ to: executorAddr, value: amount });
            expect(await ethers.provider.getBalance(executorAddr)).to.equal(amount);
            console.log(`      [Test] Received ${ethers.formatEther(amount)} ETH`);
        });
    });

    // =========================================================================
    // 4. executeWithSig
    // =========================================================================

    describe("executeWithSig", function () {
        it("should revert when signature is expired", async function () {
            const { executor, owner, relayer, nonceTracker } = await loadFixture(deploy7702Fixture);

            const expiry = BigInt(await time.latest());  // already expired (>=)
            const calls: CallStruct[] = [];
            const nonce = await nonceTracker.nonces(owner.address);
            const signature = await signExecute(owner, owner.address, nonce, calls, expiry);

            await expect(
                executor.connect(relayer).executeWithSig(expiry, calls, signature)
            ).to.be.revertedWithCustomError(executor, "SignatureExpired");
            console.log(`      [Test] Expired signature correctly rejected`);
        });

        it("should revert with invalid signature (wrong signer)", async function () {
            const { executor, owner, relayer, other } = await loadFixture(deploy7702Fixture);

            const expiry = BigInt(await time.latest()) + 3600n;
            const calls: CallStruct[] = [];
            // Sign with `other` instead of `owner`
            const signature = await signExecute(other, owner.address, 0n, calls, expiry);

            await expect(
                executor.connect(relayer).executeWithSig(expiry, calls, signature)
            ).to.be.revertedWithCustomError(executor, "InvalidSignature");
            console.log(`      [Test] Wrong signer correctly rejected`);
        });

        it("should execute calls with valid signature", async function () {
            const { executor, owner, relayer, recipient, nonceTracker } =
                await loadFixture(deploy7702Fixture);

            const ethAmount = ethers.parseEther("1");
            const recipientBalBefore = await ethers.provider.getBalance(recipient.address);

            const calls: CallStruct[] = [
                { to: recipient.address, value: ethAmount, data: "0x" },
            ];
            const expiry = BigInt(await time.latest()) + 3600n;
            const nonce = await nonceTracker.nonces(owner.address);
            const signature = await signExecute(owner, owner.address, nonce, calls, expiry);

            await executor.connect(relayer).executeWithSig(
                expiry, calls, signature, { value: ethAmount }
            );

            const recipientBalAfter = await ethers.provider.getBalance(recipient.address);
            expect(recipientBalAfter - recipientBalBefore).to.equal(ethAmount);
            console.log(`      [Test] ${ethers.formatEther(ethAmount)} ETH transferred via executeWithSig`);
        });

        it("should increment nonce after execution", async function () {
            const { executor, owner, relayer, nonceTracker } =
                await loadFixture(deploy7702Fixture);

            expect(await nonceTracker.nonces(owner.address)).to.equal(0);

            const calls: CallStruct[] = [];
            const expiry = BigInt(await time.latest()) + 3600n;
            const signature = await signExecute(owner, owner.address, 0n, calls, expiry);

            await executor.connect(relayer).executeWithSig(expiry, calls, signature);

            expect(await nonceTracker.nonces(owner.address)).to.equal(1);
            console.log(`      [Test] Nonce incremented from 0 to 1`);
        });

        it("should reject replayed signature (nonce protection)", async function () {
            const { executor, owner, relayer } = await loadFixture(deploy7702Fixture);

            const calls: CallStruct[] = [];
            const expiry = BigInt(await time.latest()) + 3600n;
            const signature = await signExecute(owner, owner.address, 0n, calls, expiry);

            // First call succeeds
            await executor.connect(relayer).executeWithSig(expiry, calls, signature);

            // Replay with the same signature — nonce advanced, digest differs
            await expect(
                executor.connect(relayer).executeWithSig(expiry, calls, signature)
            ).to.be.revertedWithCustomError(executor, "InvalidSignature");
            console.log(`      [Test] Replay correctly rejected`);
        });

        it("should execute multiple calls in a single batch", async function () {
            const { executor, owner, relayer, recipient, other, nonceTracker } =
                await loadFixture(deploy7702Fixture);

            const amount1 = ethers.parseEther("0.5");
            const amount2 = ethers.parseEther("0.3");

            const calls: CallStruct[] = [
                { to: recipient.address, value: amount1, data: "0x" },
                { to: other.address, value: amount2, data: "0x" },
            ];

            const recipientBefore = await ethers.provider.getBalance(recipient.address);
            const otherBefore = await ethers.provider.getBalance(other.address);

            const expiry = BigInt(await time.latest()) + 3600n;
            const nonce = await nonceTracker.nonces(owner.address);
            const signature = await signExecute(owner, owner.address, nonce, calls, expiry);

            await executor.connect(relayer).executeWithSig(
                expiry, calls, signature, { value: amount1 + amount2 }
            );

            expect(
                (await ethers.provider.getBalance(recipient.address)) - recipientBefore
            ).to.equal(amount1);
            expect(
                (await ethers.provider.getBalance(other.address)) - otherBefore
            ).to.equal(amount2);
            console.log(`      [Test] 2 calls executed in batch`);
        });
    });

    // =========================================================================
    // 5. execute (self-call — simulates EOA calling itself under 7702)
    // =========================================================================

    describe("execute (self-call)", function () {
        it("should execute calls when called by self", async function () {
            const { executor, owner, recipient } = await loadFixture(deploy7702Fixture);

            const ethAmount = ethers.parseEther("0.5");
            const recipientBefore = await ethers.provider.getBalance(recipient.address);

            // owner sends TX to own address → msg.sender == address(this) → onlySelf passes
            await executor.connect(owner).execute(
                [{ to: recipient.address, value: ethAmount, data: "0x" }]
            );

            const recipientAfter = await ethers.provider.getBalance(recipient.address);
            expect(recipientAfter - recipientBefore).to.equal(ethAmount);
            console.log(`      [Test] ${ethers.formatEther(ethAmount)} ETH sent via execute self-call`);
        });

        it("should propagate reverts from sub-calls", async function () {
            const { executor, owner, swapRouter } = await loadFixture(deploy7702Fixture);

            const routerAddr = await swapRouter.getAddress();
            const failData = swapRouter.interface.encodeFunctionData("failingSwap");

            await expect(
                executor.connect(owner).execute(
                    [{ to: routerAddr, value: 0n, data: failData }]
                )
            ).to.be.revertedWith("MockSwapRouter: swap failed");
            console.log(`      [Test] Sub-call revert propagated correctly`);
        });
    });

    // =========================================================================
    // 6. swapERC20 (self-call)
    // =========================================================================

    describe("swapERC20 (self-call)", function () {
        it("should swap ERC20 tokens successfully", async function () {
            const { executor, owner, recipient, tokenIn, tokenOut, swapRouter, AMOUNT_IN } =
                await loadFixture(deploy7702Fixture);

            const routerAddr = await swapRouter.getAddress();
            const tokenOutAddr = await tokenOut.getAddress();
            const tokenInAddr = await tokenIn.getAddress();
            const amountOut = ethers.parseEther("90");
            const swapCalldata = swapRouter.interface.encodeFunctionData("swap", [tokenOutAddr, amountOut]);

            await executor.connect(owner).swapERC20(
                tokenInAddr, tokenOutAddr, AMOUNT_IN,
                routerAddr, routerAddr, swapCalldata,
                amountOut, recipient.address
            );

            expect(await tokenOut.balanceOf(recipient.address)).to.equal(amountOut);
            console.log(`      [Test] ERC20 swap: recipient received ${ethers.formatEther(amountOut)} TOUT`);
        });

        it("should emit SwapExecuted event with correct params", async function () {
            const { executor, owner, recipient, tokenIn, tokenOut, swapRouter, AMOUNT_IN } =
                await loadFixture(deploy7702Fixture);

            const routerAddr = await swapRouter.getAddress();
            const tokenOutAddr = await tokenOut.getAddress();
            const tokenInAddr = await tokenIn.getAddress();
            const amountOut = ethers.parseEther("90");
            const swapCalldata = swapRouter.interface.encodeFunctionData("swap", [tokenOutAddr, amountOut]);

            await expect(
                executor.connect(owner).swapERC20(
                    tokenInAddr, tokenOutAddr, AMOUNT_IN,
                    routerAddr, routerAddr, swapCalldata,
                    amountOut, recipient.address
                )
            )
                .to.emit(executor, "SwapExecuted")
                .withArgs(tokenInAddr, tokenOutAddr, AMOUNT_IN, amountOut, recipient.address, swapCalldata);
            console.log(`      [Test] SwapExecuted event emitted`);
        });

        it("should clear approval after swap", async function () {
            const { executor, owner, recipient, tokenIn, tokenOut, swapRouter, AMOUNT_IN } =
                await loadFixture(deploy7702Fixture);

            const routerAddr = await swapRouter.getAddress();
            const tokenOutAddr = await tokenOut.getAddress();
            const tokenInAddr = await tokenIn.getAddress();
            const amountOut = ethers.parseEther("90");
            const swapCalldata = swapRouter.interface.encodeFunctionData("swap", [tokenOutAddr, amountOut]);

            await executor.connect(owner).swapERC20(
                tokenInAddr, tokenOutAddr, AMOUNT_IN,
                routerAddr, routerAddr, swapCalldata,
                amountOut, recipient.address
            );

            expect(await tokenIn.allowance(owner.address, routerAddr)).to.equal(0);
            console.log(`      [Test] Allowance cleared to 0 after swap`);
        });

        it("should revert with zero tokenIn", async function () {
            const { executor, owner, recipient, tokenOut, swapRouter } =
                await loadFixture(deploy7702Fixture);
            await expect(
                executor.connect(owner).swapERC20(
                    ethers.ZeroAddress, await tokenOut.getAddress(), 1,
                    await swapRouter.getAddress(), await swapRouter.getAddress(),
                    "0x", 0, recipient.address
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAddress").withArgs("tokenIn");
        });

        it("should revert with zero swapRouter", async function () {
            const { executor, owner, recipient, tokenIn, tokenOut } =
                await loadFixture(deploy7702Fixture);
            await expect(
                executor.connect(owner).swapERC20(
                    await tokenIn.getAddress(), await tokenOut.getAddress(), 1,
                    ethers.ZeroAddress, ethers.ZeroAddress,
                    "0x", 0, recipient.address
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAddress").withArgs("swapRouter");
        });

        it("should revert with zero tokenOut", async function () {
            const { executor, owner, recipient, tokenIn, swapRouter } =
                await loadFixture(deploy7702Fixture);
            await expect(
                executor.connect(owner).swapERC20(
                    await tokenIn.getAddress(), ethers.ZeroAddress, 1,
                    await swapRouter.getAddress(), await swapRouter.getAddress(),
                    "0x", 0, recipient.address
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAddress").withArgs("tokenOut");
        });

        it("should revert with zero recipient", async function () {
            const { executor, owner, tokenIn, tokenOut, swapRouter } =
                await loadFixture(deploy7702Fixture);
            await expect(
                executor.connect(owner).swapERC20(
                    await tokenIn.getAddress(), await tokenOut.getAddress(), 1,
                    await swapRouter.getAddress(), await swapRouter.getAddress(),
                    "0x", 0, ethers.ZeroAddress
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAddress").withArgs("recipient");
        });

        it("should revert with insufficient token balance", async function () {
            const { executor, owner, recipient, tokenIn, tokenOut, swapRouter } =
                await loadFixture(deploy7702Fixture);

            const excessiveAmount = ethers.parseEther("1000");

            await expect(
                executor.connect(owner).swapERC20(
                    await tokenIn.getAddress(), await tokenOut.getAddress(), excessiveAmount,
                    await swapRouter.getAddress(), await swapRouter.getAddress(),
                    "0x", 0, recipient.address
                )
            ).to.be.revertedWithCustomError(executor, "InsufficientTokenReceived");
            console.log(`      [Test] Insufficient balance correctly rejected`);
        });

        it("should revert when swap call fails", async function () {
            const { executor, owner, recipient, tokenIn, tokenOut, swapRouter, AMOUNT_IN } =
                await loadFixture(deploy7702Fixture);

            const failData = swapRouter.interface.encodeFunctionData("failingSwap");

            await expect(
                executor.connect(owner).swapERC20(
                    await tokenIn.getAddress(), await tokenOut.getAddress(), AMOUNT_IN,
                    await swapRouter.getAddress(), await swapRouter.getAddress(),
                    failData, 0, recipient.address
                )
            ).to.be.revertedWithCustomError(executor, "SwapFailed");
            console.log(`      [Test] Swap failure correctly reverted`);
        });

        it("should revert when no output tokens received", async function () {
            const { executor, owner, recipient, tokenIn, tokenOut, swapRouter, AMOUNT_IN } =
                await loadFixture(deploy7702Fixture);

            const zeroData = swapRouter.interface.encodeFunctionData("zeroOutputSwap");

            await expect(
                executor.connect(owner).swapERC20(
                    await tokenIn.getAddress(), await tokenOut.getAddress(), AMOUNT_IN,
                    await swapRouter.getAddress(), await swapRouter.getAddress(),
                    zeroData, 0, recipient.address
                )
            ).to.be.revertedWithCustomError(executor, "NoTokenReceived");
            console.log(`      [Test] Zero output correctly rejected`);
        });

        it("should revert when output amount is below minOutAmount", async function () {
            const { executor, owner, recipient, tokenIn, tokenOut, swapRouter, AMOUNT_IN } =
                await loadFixture(deploy7702Fixture);

            const routerAddr = await swapRouter.getAddress();
            const tokenOutAddr = await tokenOut.getAddress();
            const amountOut = ethers.parseEther("10");
            const minOutAmount = ethers.parseEther("20");
            const swapCalldata = swapRouter.interface.encodeFunctionData("swap", [tokenOutAddr, amountOut]);

            await expect(
                executor.connect(owner).swapERC20(
                    await tokenIn.getAddress(), tokenOutAddr, AMOUNT_IN,
                    routerAddr, routerAddr, swapCalldata,
                    minOutAmount, recipient.address
                )
            ).to.be.revertedWithCustomError(executor, "MinOutNotMet")
                .withArgs(minOutAmount, amountOut);
            console.log(`      [Test] MinOutNotMet correctly rejected`);
        });
    });

    // =========================================================================
    // 7. swapNative (self-call)
    // =========================================================================

    describe("swapNative (self-call)", function () {
        it("should swap native ETH for tokens", async function () {
            const { executor, owner, recipient, tokenOut, swapRouter } =
                await loadFixture(deploy7702Fixture);

            const tokenOutAddr = await tokenOut.getAddress();
            const routerAddr = await swapRouter.getAddress();
            const ethAmount = ethers.parseEther("1");
            const amountOut = ethers.parseEther("90");
            const swapCalldata = swapRouter.interface.encodeFunctionData("swap", [tokenOutAddr, amountOut]);

            await executor.connect(owner).swapNative(
                tokenOutAddr, routerAddr, swapCalldata, amountOut, recipient.address,
                { value: ethAmount }
            );

            expect(await tokenOut.balanceOf(recipient.address)).to.equal(amountOut);
            console.log(`      [Test] Native swap: recipient received ${ethers.formatEther(amountOut)} TOUT`);
        });

        it("should emit SwapExecuted event for native swap", async function () {
            const { executor, owner, recipient, tokenOut, swapRouter } =
                await loadFixture(deploy7702Fixture);

            const tokenOutAddr = await tokenOut.getAddress();
            const routerAddr = await swapRouter.getAddress();
            const ethAmount = ethers.parseEther("1");
            const amountOut = ethers.parseEther("90");
            const swapCalldata = swapRouter.interface.encodeFunctionData("swap", [tokenOutAddr, amountOut]);

            await expect(
                executor.connect(owner).swapNative(
                    tokenOutAddr, routerAddr, swapCalldata, amountOut, recipient.address,
                    { value: ethAmount }
                )
            )
                .to.emit(executor, "SwapExecuted")
                .withArgs(ethers.ZeroAddress, tokenOutAddr, ethAmount, amountOut, recipient.address, swapCalldata);
            console.log(`      [Test] SwapExecuted event emitted for native swap`);
        });

        it("should revert with zero msg.value", async function () {
            const { executor, owner, recipient, tokenOut, swapRouter } =
                await loadFixture(deploy7702Fixture);
            await expect(
                executor.connect(owner).swapNative(
                    await tokenOut.getAddress(), await swapRouter.getAddress(),
                    "0x", 0, recipient.address,
                    { value: 0 }
                )
            ).to.be.revertedWithCustomError(executor, "InsufficientTokenReceived")
                .withArgs(1, 0);
        });

        it("should revert with zero swapRouter", async function () {
            const { executor, owner, recipient, tokenOut } =
                await loadFixture(deploy7702Fixture);
            await expect(
                executor.connect(owner).swapNative(
                    await tokenOut.getAddress(), ethers.ZeroAddress,
                    "0x", 0, recipient.address,
                    { value: ethers.parseEther("1") }
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAddress").withArgs("swapRouter");
        });

        it("should revert with zero tokenOut", async function () {
            const { executor, owner, recipient, swapRouter } =
                await loadFixture(deploy7702Fixture);
            await expect(
                executor.connect(owner).swapNative(
                    ethers.ZeroAddress, await swapRouter.getAddress(),
                    "0x", 0, recipient.address,
                    { value: ethers.parseEther("1") }
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAddress").withArgs("tokenOut");
        });

        it("should revert with zero recipient", async function () {
            const { executor, owner, tokenOut, swapRouter } =
                await loadFixture(deploy7702Fixture);
            await expect(
                executor.connect(owner).swapNative(
                    await tokenOut.getAddress(), await swapRouter.getAddress(),
                    "0x", 0, ethers.ZeroAddress,
                    { value: ethers.parseEther("1") }
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAddress").withArgs("recipient");
        });
    });
});
