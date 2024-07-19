// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CypherAutoLoad is Pausable, AccessControl, ReentrancyGuard {
    bytes32 public constant EXECUTIONER_ROLE = keccak256("EXECUTIONER_ROLE");
    bytes32 public constant BENEFICIARY_ROLE = keccak256("BENEFICIARY_ROLE");
    using SafeERC20 for IERC20;

    uint private _maxWithdrawalLimitPerTransaction = 10000; // Default limit, can be updated by admin

    event Withdraw(
        address indexed token,
        address indexed user,
        address indexed beneficiary,
        uint amount
    );

    event MaxWithdrawalLimit(address indexed caller, uint newLimit);

    constructor(
        address _defaultAdmin,
        address _executioner,
        address _beneficiary
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(EXECUTIONER_ROLE, _executioner);
        _setRoleAdmin(EXECUTIONER_ROLE, DEFAULT_ADMIN_ROLE);
        _grantRole(BENEFICIARY_ROLE, _beneficiary);
        _setRoleAdmin(BENEFICIARY_ROLE, DEFAULT_ADMIN_ROLE);
    }

    modifier checkBeneficiaryRole(address beneficiaryAddress) {
        require(
            hasRole(BENEFICIARY_ROLE, beneficiaryAddress),
            "Provided address does not have beneficiary role"
        );
        _;
    }

    modifier checkWithdrawalLimit(address tokenAddress, uint amount) {
        require(amount > 0, "Amount must be greater than zero");

        IERC20Metadata token = IERC20Metadata(tokenAddress);
        uint decimalFactor = 10 ** uint(token.decimals());
        require(
            amount <= _maxWithdrawalLimitPerTransaction * decimalFactor,
            "Withdrawal amount exceeds limit"
        );
        _;
    }

    modifier anyPrivilagedUser() {
        bool authorized = false;

        if (hasRole(EXECUTIONER_ROLE, _msgSender())) {
            authorized = true;
        } else if (hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            authorized = true;
        }

        require(authorized, "AccessControl: sender does not have permission");
        _;
    }

    function setMaxWithdrawalLimit(
        uint newLimit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _maxWithdrawalLimitPerTransaction = newLimit;
        emit MaxWithdrawalLimit(_msgSender(), newLimit);
    }

    function getMaxWithdrawalLimit() external view returns (uint) {
        return _maxWithdrawalLimitPerTransaction;
    }

    function pause() external whenNotPaused anyPrivilagedUser {
        _pause();
    }

    function unpause() external whenPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function safeTransfer(
        IERC20 token,
        address userAddress,
        address beneficiaryAddress,
        uint amount
    ) external {
        token.safeTransferFrom(userAddress, beneficiaryAddress, amount);
    }

    /**
     * @notice Debit tokens from a user's account and transfer to a beneficiary.
     * @dev Only the EXECUTIONER_ROLE can call this function.
     * @param tokenAddress The address of the token to be debited.
     * @param userAddress The address of the user from whom tokens will be debited.
     * @param beneficiaryAddress The address of the beneficiary receiving the tokens.
     * @param amount The amount of tokens to debit and transfer.
     * @return A boolean indicating the success of the transfer.
     */
    function debit(
        address tokenAddress,
        address userAddress,
        address beneficiaryAddress,
        uint amount
    )
        external
        whenNotPaused
        nonReentrant
        onlyRole(EXECUTIONER_ROLE)
        checkBeneficiaryRole(beneficiaryAddress)
        checkWithdrawalLimit(tokenAddress, amount)
        returns (bool)
    {
        require(userAddress != address(0), "Invalid user address");

        IERC20 token = IERC20(tokenAddress);

        try this.safeTransfer(token, userAddress, beneficiaryAddress, amount) {
            emit Withdraw(
                tokenAddress,
                userAddress,
                beneficiaryAddress,
                amount
            );
            return true;
        } catch {
            revert("Token transfer failed");
        }
    }
}
