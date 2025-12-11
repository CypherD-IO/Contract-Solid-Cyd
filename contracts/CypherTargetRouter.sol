// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CypherTargetRouter
/// @notice A routing contract that manages target addresses/values across multiple programs, providers, and blockchain networks.
/// @dev This contract uses a triple-nested mapping to store targets indexed by program, provider, and chain identifiers.
contract CypherTargetRouter is Ownable {
    /// @notice Stores target values organized by program, provider, and chain.
    /// @dev Mapping structure: targets[program][provider][chain] = target
    mapping(string => mapping(string => mapping(string => string))) public targets;

    /// @notice Emitted when a target is successfully set or updated.
    /// @param program The program identifier.
    /// @param provider The provider identifier.
    /// @param chain The blockchain network identifier.
    /// @param target The target address or value being set.
    event TargetSet(string indexed program, string indexed provider, string indexed chain, string target);

    /// @notice Emitted when a target is successfully removed.
    /// @param program The program identifier.
    /// @param provider The provider identifier.
    /// @param chain The blockchain network identifier.
    event TargetRemoved(string indexed program, string indexed provider, string indexed chain);

    /// @notice Initializes the contract and sets the initial owner.
    constructor(address _owner) Ownable(_owner) {
        transferOwnership(_owner); // Setting initial owner
    }

    /// @notice Sets or updates a target value for a given program, provider, and chain combination.
    /// @dev Only the contract owner can call this function. Emits a TargetSet event.
    /// @param program The program identifier.
    /// @param provider The provider identifier.
    /// @param chain The blockchain network identifier.
    /// @param target The target address or value to be stored.
    function setTarget(string calldata program, string calldata provider, string calldata chain, string calldata target) external onlyOwner {
        require(bytes(program).length > 0, "Program must not be empty");
        require(bytes(provider).length > 0, "Provider must not be empty");
        require(bytes(chain).length > 0, "Chain must not be empty");
        require(bytes(target).length > 0, "Target must not be empty");

        targets[program][provider][chain] = target;
        emit TargetSet(program, provider, chain, target);
    }

    /// @notice Removes a target value for a given program, provider, and chain combination.
    /// @dev Only the contract owner can call this function. Emits a TargetRemoved event.
    /// @param program The program identifier.
    /// @param provider The provider identifier.
    /// @param chain The blockchain network identifier.
    function removeTarget(string calldata program, string calldata provider, string calldata chain) external onlyOwner {
        delete targets[program][provider][chain];
        emit TargetRemoved(program, provider, chain);
    }
}
