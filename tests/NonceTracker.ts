import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("NonceTracker", function () {
    async function deployFixture() {
        const [account1, account2] = await ethers.getSigners();
        const NonceTracker = await ethers.getContractFactory("NonceTracker");
        const nonceTracker = await NonceTracker.deploy();
        return { nonceTracker, account1, account2 };
    }

    describe("Deployment", function () {
        it("should start with nonce 0 for any account", async function () {
            const { nonceTracker, account1, account2 } = await loadFixture(deployFixture);
            expect(await nonceTracker.nonces(account1.address)).to.equal(0);
            expect(await nonceTracker.nonces(account2.address)).to.equal(0);
        });
    });

    describe("useNonce", function () {
        it("should return 0 on first call and increment to 1", async function () {
            const { nonceTracker, account1 } = await loadFixture(deployFixture);

            await nonceTracker.connect(account1).useNonce();
            expect(await nonceTracker.nonces(account1.address)).to.equal(1);
        });

        it("should increment nonce sequentially", async function () {
            const { nonceTracker, account1 } = await loadFixture(deployFixture);

            await nonceTracker.connect(account1).useNonce();
            await nonceTracker.connect(account1).useNonce();
            await nonceTracker.connect(account1).useNonce();

            expect(await nonceTracker.nonces(account1.address)).to.equal(3);
        });

        it("should emit NonceUsed event with correct params", async function () {
            const { nonceTracker, account1 } = await loadFixture(deployFixture);

            await expect(nonceTracker.connect(account1).useNonce())
                .to.emit(nonceTracker, "NonceUsed")
                .withArgs(account1.address, 0);

            await expect(nonceTracker.connect(account1).useNonce())
                .to.emit(nonceTracker, "NonceUsed")
                .withArgs(account1.address, 1);
        });

        it("should track nonces independently per account", async function () {
            const { nonceTracker, account1, account2 } = await loadFixture(deployFixture);

            await nonceTracker.connect(account1).useNonce();
            await nonceTracker.connect(account1).useNonce();
            await nonceTracker.connect(account2).useNonce();

            expect(await nonceTracker.nonces(account1.address)).to.equal(2);
            expect(await nonceTracker.nonces(account2.address)).to.equal(1);
        });
    });
});
