// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title BalanceAggregator
/// @notice A utility contract that aggregates native and ERC20 token balances in a single call.
/// @dev Useful for efficiently fetching multiple balances without multiple RPC calls.
contract BalanceAggregator {
    /// @notice Initializes the BalanceAggregator contract.
    constructor() {}

    /// @notice Retrieves the ERC20 token balance for a specific user and token.
    /// @dev Directly calls the balanceOf function on the target ERC20 contract.
    /// @param userAddress The address of the user whose balance is being queried.
    /// @param tokenAddress The address of the ERC20 token contract.
    /// @return The token balance of the user.
    function getBalanceOfToken(
        address userAddress,
        address tokenAddress
    ) public view returns (uint) {
        return (ERC20(tokenAddress).balanceOf(userAddress));
    }

    /// @notice Retrieves native currency and multiple ERC20 token balances in a single call.
    /// @dev Returns an array where index 0 is the native balance, and subsequent indices are token balances.
    ///      Uses try/catch to handle tokens that may revert, returning 0 for failed calls.
    /// @param userAddress The address of the user whose balances are being queried.
    /// @param tokens Array of ERC20 token contract addresses to query.
    /// @return An array of balances where [0] = native balance, [1..n] = token balances.
    function getBalances(
        address userAddress,
        address[] calldata tokens
    ) public view returns (uint[] memory) {
        uint size = tokens.length + 1;
        uint[] memory balance = new uint[](size);
        balance[0] = userAddress.balance;
        for (uint i = 0; i < size - 1; i++) {
            try ERC20(tokens[i]).balanceOf(userAddress) returns (uint bal) {
                balance[i + 1] = bal;
            } catch {
                balance[i + 1] = 0;
            }
        }
        return balance;
    }
}
