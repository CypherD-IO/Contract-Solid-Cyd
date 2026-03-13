// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockSwapRouter {
    /// @notice Simulates a successful swap by sending tokenOut to the caller
    function swap(address tokenOut, uint256 amountOut) external payable {
        IERC20(tokenOut).transfer(msg.sender, amountOut);
    }

    /// @notice Always reverts to simulate a failed swap
    function failingSwap() external payable {
        revert("MockSwapRouter: swap failed");
    }

    /// @notice Does nothing — simulates a swap that produces zero output
    function zeroOutputSwap() external payable {}

    receive() external payable {}
}
