// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {NonceTracker} from "./nonceTracker.sol";


contract Cypher7702SwapExecutor is ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    error InvalidSignature();
    error SignatureExpired();
    error NonceMismatch(uint256 expected, uint256 got);
    error SelfCallOnly();

    // ==================== Events ====================

    /// @notice Emitted when a successful swap is executed
    /// @param tokenIn The token that was swapped from
    /// @param tokenOut The token that was swapped to
    /// @param amountIn The amount of input tokens swapped
    /// @param amountOut The amount of output tokens received
    /// @param recipient The address that received the tokenOut
    /// @param swapCalldata The calldata used to execute the swap
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient,
        bytes swapCalldata
    );


    struct Call {
        address to;
        uint256 value;
        bytes data;
    }

    bytes32 private constant CALL_TYPEHASH =
        keccak256("Call(address to,uint256 value,bytes data)");

    bytes32 private constant EXECUTE_TYPEHASH =
        keccak256(
            "Cypher7702Execute(uint256 chainId,address account,uint256 nonce,bytes32 callsHash,uint256 expiry)"
        );

    /// @notice Address of the global nonce tracker for initialization
    NonceTracker public immutable nonceTracker;

    modifier onlySelf() {
        if (msg.sender != address(this)) revert SelfCallOnly();
        _;
    }

    // ==================== Errors ====================

    /// @notice Thrown when a zero address is provided where not allowed
    error ZeroAddress(string param);

    /// @notice Thrown when insufficient tokens were received after Permit2 transfer
    error InsufficientTokenReceived(uint256 expected, uint256 received);

    /// @notice Thrown when the swap call fails
    error SwapFailed(bytes reason);

    /// @notice Thrown when no output token is received from the swap
    error NoTokenReceived();

    /// @notice Thrown when the output amount is less than minimum required
    error MinOutNotMet(uint256 minOut, uint256 actual);

    constructor(address nonceTracker_) EIP712("Cypher7702SwapExecutor", "1") {
        if(nonceTracker_ == address(0)) revert ZeroAddress("nonceTracker");
        nonceTracker = NonceTracker(nonceTracker_);
    }

    function executeWithSig(
        uint256 expiry,
        Call[] calldata calls,
        bytes calldata signature
    ) external payable nonReentrant {
        if (block.timestamp >= expiry) revert SignatureExpired();
        
        bytes32 callsHash = _hashCalls(calls);
        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTE_TYPEHASH,
                block.chainid,
                address(this),
                nonceTracker.useNonce(),
                callsHash,
                expiry
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);

        if (ECDSA.recover(digest, signature) != address(this)) revert InvalidSignature();

        _exec(calls);
    }


    function execute(Call[] calldata calls) external payable onlySelf nonReentrant{
        _exec(calls);
    }

    function swapNative(
        address tokenOut,
        address swapRouter,
        bytes calldata swapCalldata,
        uint256 minOutAmount,
        address recipient
    ) external payable onlySelf nonReentrant {
        if (swapRouter == address(0)) revert ZeroAddress("swapRouter");
        if (msg.value == 0) revert InsufficientTokenReceived(1, 0);
        if (tokenOut == address(0)) revert ZeroAddress("tokenOut");
        if (recipient == address(0)) revert ZeroAddress("recipient");

        _executeSwap(address(0), tokenOut, msg.value, swapRouter, swapCalldata, minOutAmount, recipient);
    }

    
    function swapERC20(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address approvalAddress,
        address swapRouter,
        bytes calldata swapCalldata,
        uint256 minOutAmount,
        address recipient
    ) external onlySelf nonReentrant {
        // ===== Input Validation =====
        // Validate required addresses are not zero
        if (tokenIn == address(0)) revert ZeroAddress("tokenIn");
        if (swapRouter == address(0)) revert ZeroAddress("swapRouter");
        if (tokenOut == address(0)) revert ZeroAddress("tokenOut");
        if (recipient == address(0)) revert ZeroAddress("recipient");

        IERC20 token = IERC20(tokenIn);

        // 3. Sanity check
        uint256 tokenBalance = token.balanceOf(address(this));
        if (tokenBalance < amountIn) {
            revert InsufficientTokenReceived(amountIn, tokenBalance);
        }

        // 4. Set allowance JUST for this swap (reset to 0 first for ERC20 safety)p
        token.forceApprove(approvalAddress, 0);
        token.forceApprove(approvalAddress, amountIn);

        // 5. Do aggregator-agnostic swap
        _executeSwap(tokenIn, tokenOut, amountIn, swapRouter, swapCalldata, minOutAmount, recipient);

        // 6. Clear allowance so router cannot reuse it in later txs
        token.forceApprove(approvalAddress, 0);

    }

    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address swapRouter,
        bytes calldata swapCalldata,
        uint256 minOutAmount,
        address recipient
    ) internal {
        
        uint256 tokenOutBalanceBefore = IERC20(tokenOut).balanceOf(address(this));

        (bool success, bytes memory swapResult) = swapRouter.call{value: msg.value}(swapCalldata);
        if (!success) {
            revert SwapFailed(swapResult);
        }

        uint256 tokenOutBalanceAfter = IERC20(tokenOut).balanceOf(address(this));

        uint256 outAmount = tokenOutBalanceAfter - tokenOutBalanceBefore;

        if (outAmount == 0) revert NoTokenReceived();
        
        if(outAmount < minOutAmount) revert MinOutNotMet(minOutAmount, outAmount);

        // Emit event for off-chain tracking and indexing
        emit SwapExecuted(tokenIn, tokenOut, amountIn, outAmount, recipient, swapCalldata);

        IERC20(tokenOut).safeTransfer(recipient, outAmount);
    }
    

    function _exec(Call[] calldata calls) internal {
        for (uint256 i; i < calls.length; ++i) {
            (bool ok, bytes memory res) = calls[i].to.call{value: calls[i].value}(calls[i].data);
            if (!ok) assembly { revert(add(res, 32), mload(res)) }
        }
    }

    function _hashCalls(Call[] calldata calls) internal pure returns (bytes32) {
        bytes32[] memory hs = new bytes32[](calls.length);
        for (uint256 i; i < calls.length; ++i) {
            hs[i] = keccak256(
                abi.encode(
                    CALL_TYPEHASH,
                    calls[i].to,
                    calls[i].value,
                    keccak256(calls[i].data)
                )
            );
        }
        return keccak256(abi.encodePacked(hs));
    }

    receive() external payable {}
}
