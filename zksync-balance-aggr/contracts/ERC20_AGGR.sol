// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.11;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20BALANCEAGGR {
    constructor() {}

    function getBalanceOfToken(
        address userAddress,
        address _address
    ) public view returns (uint) {
        return (ERC20(_address).balanceOf(userAddress));
    }

    function getBalances(
        address userAddress,
        address[] calldata tokens
    ) public view returns (uint[] memory) {
        uint size = tokens.length + 1;
        uint[] memory balance = new uint[](size);
        balance[0] = userAddress.balance;
        for (uint i = 0; i < size-1; i++) {
            balance[i+1] = getBalanceOfToken(userAddress, tokens[i]);
        }
        return balance;
    }
}
