// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ConfigurationManager
 * @dev Contract for managing configurations with owner control
 * @notice This contract allows updating configurations only by the owner
 */
contract ConfigurationManager {
    // Events
    event ConfigurationUpdated(
        string indexed key,
        string oldValue,
        string newValue
    );
    event ConfigurationDeleted(string indexed key, string oldValue);

    // Struct to hold key-value pairs
    struct Configuration {
        string key;
        string value;
    }

    // State variables
    mapping(string => string) public configurations;
    string[] private configurationKeys; // Array to track all keys
    address public immutable owner;

    // Custom errors
    error UnauthorizedCaller();
    error InvalidOwnerAddress();
    error SameValueError();
    error KeyDoesNotExist();
    error KeyAlreadyExists();

    /**
     * @dev Constructor to initialize the contract with an owner
     * @param _owner The address that will own the contract
     * @custom:error InvalidOwnerAddress Thrown when _owner is address(0)
     */
    constructor(address _owner) {
        if (_owner == address(0)) revert InvalidOwnerAddress();
        owner = _owner;
    }

    /**
     * @dev Modifier to restrict function access to owner only
     * @custom:error UnauthorizedCaller Thrown when caller is not the owner
     */
    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller();
        _;
    }

    /**
     * @dev Adds a new configuration
     * @param key The key of the configuration to add
     * @param value The value to set
     * @custom:error KeyAlreadyExists Thrown when key already exists
     */
    function addConfiguration(
        string memory key,
        string memory value
    ) external onlyOwner {
        if (bytes(configurations[key]).length > 0) revert KeyAlreadyExists();
        configurations[key] = value;
        configurationKeys.push(key);
        emit ConfigurationUpdated(key, "", value);
    }

    /**
     * @dev Updates an existing configuration value
     * @param key The key of the configuration to update
     * @param value The new value to set
     * @custom:error KeyDoesNotExist Thrown when key doesn't exist
     * @custom:error SameValueError Thrown when new value is same as old value
     */
    function updateConfiguration(
        string memory key,
        string memory value
    ) external onlyOwner {
        string memory oldValue = configurations[key];
        if (bytes(oldValue).length == 0) revert KeyDoesNotExist();
        if (keccak256(bytes(oldValue)) == keccak256(bytes(value)))
            revert SameValueError();

        configurations[key] = value;
        emit ConfigurationUpdated(key, oldValue, value);
    }

    /**
     * @dev Deletes a configuration
     * @param key The key of the configuration to delete
     * @custom:error KeyDoesNotExist Thrown when key doesn't exist
     */
    function deleteConfiguration(string memory key) external onlyOwner {
        string memory oldValue = configurations[key];
        if (bytes(oldValue).length == 0) revert KeyDoesNotExist();

        // Remove key from configurationKeys array
        for (uint i = 0; i < configurationKeys.length; i++) {
            if (
                keccak256(bytes(configurationKeys[i])) == keccak256(bytes(key))
            ) {
                // Replace with last element and pop
                configurationKeys[i] = configurationKeys[
                    configurationKeys.length - 1
                ];
                configurationKeys.pop();
                break;
            }
        }

        delete configurations[key];
        emit ConfigurationDeleted(key, oldValue);
    }

    /**
     * @dev Retrieves all configurations as an array of Configuration structs
     * @return Array of Configuration structs containing all key-value pairs
     */
    function getAllConfigurations()
        external
        view
        returns (Configuration[] memory)
    {
        Configuration[] memory allConfigs = new Configuration[](
            configurationKeys.length
        );

        for (uint i = 0; i < configurationKeys.length; i++) {
            allConfigs[i] = Configuration({
                key: configurationKeys[i],
                value: configurations[configurationKeys[i]]
            });
        }

        return allConfigs;
    }
}
