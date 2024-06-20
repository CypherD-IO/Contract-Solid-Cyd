import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { MetaTransactionData, SafeSignature, SafeTransaction, SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";
import { get } from 'lodash'

// ensure you're using ethers v5 as ethers v6 is not currently supported by @safe-global
// you don't have to use hardhat ethers if you're not in a hardhat project, instead import ethers directly
import { ethers } from "hardhat";

// chain specific config:
enum SupportedChainId {
  ETHEREUM_MAINNET = 1,
  ARBITRUM_MAINNET = 42161,
  POLYGON_MAINNET = 137
}

const SAFE_TRANSACTION_SERVICES: Partial<Record<SupportedChainId, string>> = {
  [SupportedChainId.ETHEREUM_MAINNET]: "https://safe-transaction-mainnet.safe.global",
  [SupportedChainId.ARBITRUM_MAINNET]: "https://safe-transaction-arbitrum.safe.global",
  [SupportedChainId.POLYGON_MAINNET]: "https://safe-transaction-polygon.safe.global"
}

// the following 2 gas configs are only relevant if you plan on using the gas estimation logic
const GAS_REFUND_FRACTION: Record<SupportedChainId, number> = {
  [SupportedChainId.ETHEREUM_MAINNET]: 0.3,
  [SupportedChainId.ARBITRUM_MAINNET]: 0.3,
  [SupportedChainId.POLYGON_MAINNET]: 0.3,
};

const MAX_GAS_PER_TRANSACTION: Record<SupportedChainId, number> = {
  [SupportedChainId.ETHEREUM_MAINNET]: 10_000_000,
  [SupportedChainId.ARBITRUM_MAINNET]: 10_000_000,
  [SupportedChainId.POLYGON_MAINNET]: 10_000_000,
};

export class SafeManager {
  private ethAdapter: EthersAdapter;
  private safeService?: SafeApiKit;
  private safe?: Safe;
  private signer: SignerWithAddress;
  private gasRefundFraction: number | undefined;
  private maxGasPerTx: number | undefined;

  constructor(signer: SignerWithAddress) {
    this.signer = signer;
    this.ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: this.signer,
    });
  }

  canProposeTransaction(): boolean {
    return !!this.safeService;
  }

  async initializeSafe(safeAddress: string): Promise<void> {
    if (!this.ethAdapter) {
      throw new Error('EthersAdapter is not initialized');
    }
    this.safe = await Safe.create({
      ethAdapter: this.ethAdapter,
      safeAddress,
    });

    // NOTE: in a hardhat fork getChainId will fetch the chainId for the forked network
    const chainIdBigInt = await this.ethAdapter.getChainId();
    const chainId = parseInt(chainIdBigInt.toString()) as SupportedChainId;

    this.gasRefundFraction = get(GAS_REFUND_FRACTION, chainId);
    this.maxGasPerTx = MAX_GAS_PER_TRANSACTION[chainId];

    const txServiceUrl = SAFE_TRANSACTION_SERVICES[chainId];
    if (txServiceUrl) {
      this.safeService = new SafeApiKit({
        txServiceUrl,
        chainId: chainIdBigInt,
      });
    } else {
      console.warn(`Safe transaction service does not exist for chain ${chainId}`);
    }
  }

  // you can choose to disable gas estimation(and overestimation if you like)
  async estimateGas(safeTransactionData: SafeTransactionDataPartial | MetaTransactionData[]): Promise<number> {
    if (!this.safe) {
      throw new Error('Safe is not initialized');
    }

    const safeAddress = await this.safe.getAddress();

    function overestimateGasLimit(Goriginal: number, maxRefundFraction: number): number {
      const excess = Goriginal * (maxRefundFraction / (1 - maxRefundFraction));
      return Math.floor(Goriginal + excess);
    }

    // Check if safeTransactionData is an array of MetaTransactionData
    if (Array.isArray(safeTransactionData)) {
      // If so, we'll store the total gas estimate here
      let totalGasEstimate = 0;

      for (const tx of safeTransactionData) {
        // Extract "to", "value", and "data" from each transaction
        const {
          to,
          value,
          data
        } = tx;

        // Create the transaction object for each tx
        const transaction = {
          to: to,
          value: value,
          data: data,
          from: safeAddress
        };

        // Estimate the gas for each transaction
        const gasEstimate = (await (ethers  as any).provider.estimateGas(transaction)).toNumber();

        console.log("gasEstimate:", gasEstimate);

        // Check for maxGasPerTx for each transaction if needed
        if (this.maxGasPerTx && gasEstimate > this.maxGasPerTx) {
          throw new Error(`gasEstimate for a transaction exceeds maxGasPerTx: ${gasEstimate}`);
        }

        // since we're potentially doing many txs we don't want to go above the max tx gas limit so we use a lower gasRefundFraction
        const gasRefundFraction = 0.1;
        const overestimatedTotalGas = overestimateGasLimit(gasEstimate, gasRefundFraction);

        console.log("overestimatedTotalGas:", overestimatedTotalGas);

        // Add the individual gas estimate to the total
        totalGasEstimate += overestimatedTotalGas;
      }

      console.log(totalGasEstimate);

      return totalGasEstimate;

    } else {

      const {
        to,
        value,
        data,
      } = safeTransactionData;

      // Create the transaction object
      const transaction = {
        to: to,
        value: value,
        data: data,
        from: safeAddress
      };

      // Estimate the gas using the impersonated signer
      const gasEstimate = (await (ethers  as any).provider.estimateGas(transaction)).toNumber();

      if (this.maxGasPerTx && gasEstimate > this.maxGasPerTx) {
        throw new Error("gasEstimate exceeds maxGasPerTx");
      }

      const gasRefundFraction = this.gasRefundFraction ?? 0.1;
      // TODO: consider capping overestimatedGas at this.maxGasPerTx
      const overestimatedGas = overestimateGasLimit(gasEstimate, gasRefundFraction);
      return overestimatedGas;
    }
  }

  async createSafeTransaction(safeTransactionData: SafeTransactionDataPartial | MetaTransactionData[]): Promise<SafeTransaction> {
    if (!this.safe) {
      throw new Error('Safe is not initialized');
    }
    const safeTransaction = await this.safe.createTransaction({ transactions: safeTransactionData });

    const estimatedGas = await this.estimateGas(safeTransactionData);
    safeTransaction.data.safeTxGas = estimatedGas.toString();

    return safeTransaction;
  }

  async createEnableModuleTx(module: string): Promise<SafeTransaction> {
    if (!this.safe) {
      throw new Error('Safe is not initialized');
    }
    return this.safe.createEnableModuleTx(module);
  }

  async signTransaction(safeTransaction: SafeTransaction): Promise<{
    safeTxHash: string,
    safeSignature: SafeSignature
  }> {
    if (!this.safe) {
      throw new Error('Safe is not initialized');
    }
    const safeTxHash = await this.safe.getTransactionHash(safeTransaction);
    const safeSignature = await this.safe.signTransactionHash(safeTxHash);

    console.log({
      safeTxHash,
      safeSignature,
      data: safeTransaction.data,
    });

    return {
      safeTxHash,
      safeSignature: safeSignature,
    }
  }

  async proposeTransaction(
    safeTransactionData: SafeTransaction,
    safeSignature: SafeSignature,
  ): Promise<void> {

    if (!this.safe) {
      throw new Error('Safe or SafeService is not initialized');
    }

    if (!this.safeService) {
      console.warn("Cannot propose tx since there is no Gnosis Safe transaction service for this chain");
      return;
    }

    const safeTxHash = await this.safe.getTransactionHash(safeTransactionData);
    const senderAddress = await this.signer.getAddress();

    await this.safeService.proposeTransaction({
      safeAddress: await this.safe.getAddress(),
      safeTransactionData: safeTransactionData.data,
      safeTxHash,
      senderAddress,
      senderSignature: safeSignature.data,
    });
  }
}

export function signTransaction() {
    
}

// Usage example:
// const safe = new SafeManager(signer);
// await safe.initializeSafe(safeAddress);
// const safeTransactionData: SafeTransactionDataPartial = {
//   to: "<0xTO>", // account to call "data" on
//   value: "0",
//   data: "0x",
//   operation: OperationType.Call,
// };
// const safeTx = await safe.createSafeTransaction(safeTransactionData);
// const {safeSignature} = await safe.signTransaction(safeTx);
// await safe.proposeTransaction(safeTx, safeSignature);