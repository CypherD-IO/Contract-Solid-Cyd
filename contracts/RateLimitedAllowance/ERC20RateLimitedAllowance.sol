// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {RateLimitedAllowance} from "./RateLimitedAllowance.sol";

/// @title ERC20RateLimitedAllowance
/// @notice A contract that implements rate-limited allowances for ERC20 tokens
/// @dev Inherits from RateLimitedAllowance and provides specific implementation for ERC20 token transfers
contract ERC20RateLimitedAllowance is RateLimitedAllowance {
    using SafeERC20 for IERC20;
    /// @notice Constructs a new ERC20RateLimitedAllowance instance
    /// @param owner The address of the owner of the allowance
    /// @param spender The address of the spender of the allowance
    constructor(
        address owner,
        address spender
    ) RateLimitedAllowance(owner, spender) {}

    /// @notice Transfers ERC20 tokens
    /// @dev Overrides the _transfer function in the parent contract
    /// @param from The address to transfer from
    /// @param to The address to transfer to
    /// @param amount The amount of tokens to transfer
    /// @param token The address of the ERC20 token
    function _transfer(
        address from,
        address to,
        uint256 amount,
        address token
    ) internal override {
        require(from != address(0), "Invalid from address");
        IERC20(token).safeTransferFrom(from, to, amount);
    }
}
