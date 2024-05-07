
// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**

    Responsiblities 

    Open Questions ? 
        1. should be charge some monry to perform admin operations ? 
        2. If Admin seed is leaked
            how to stop from adding / removing managers? 
    
    Admin
        Grant / Revoke Roles with Event
*/

contract MyContract is Pausable, AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant EXECUTIONER_ROLE = keccak256("EXECUTIONER_ROLE");

    struct NewBeneficiaryRequest {
        address beneficiary;
        uint8 approvalCount;
        address[] approvers;
    }

    address public beneficiary;

    NewBeneficiaryRequest private newBeneficiaryRequest;

    event UnpauseRequested(address requester);
    event UnpauseApproved(address approver);
    event UnpauseExecuted();

    mapping(bytes32 role => address[]) private _privilagedUsers;
    mapping(address => bool) public unpauseApprovals;

    event NewBeneficiary(address account);
    event Withdraw(address indexed token, address indexed user, uint amount);

    // Struct to handle role proposals
    struct RoleProposal {
        bytes32 role;
        address account;
        bool isGrant; // true for grant, false for revoke
        mapping(address => bool) approvals;
        uint256 approvalCount;
    }

    mapping(bytes32 => RoleProposal) private roleProposals; // Using keccak256(role, account) as key

    event RoleChangeProposed(bytes32 indexed proposalId);
    event RoleChangeApproved(bytes32 indexed proposalId, address approver);
    event RoleGranted(bytes32 indexed role, address account);
    event RoleRevoked(bytes32 indexed role, address account);

    constructor(
        address _defaultAdmin,
        address _manager,
        address _executioner,
        address _beneficiary
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(MANAGER_ROLE, _manager);
        _privilagedUsers[MANAGER_ROLE].push(_manager);
        _setRoleAdmin(MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _grantRole(EXECUTIONER_ROLE, _executioner);
        _privilagedUsers[EXECUTIONER_ROLE].push(_executioner);
        _setRoleAdmin(EXECUTIONER_ROLE, DEFAULT_ADMIN_ROLE);
        _setBeneficiary(_beneficiary);
    }

    modifier anyPrivilagedUser() {
        bool authorized = false;

        if (hasRole(MANAGER_ROLE, _msgSender())) {
            authorized = true;
        } else if (hasRole(EXECUTIONER_ROLE, _msgSender())) {
            authorized = true;
        } else if (hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            authorized = true;
        }

        require(authorized, "AccessControl: sender does not have permission");
        _;
    }

    function _setBeneficiary(address _beneficiary) private {
        beneficiary = _beneficiary;
        emit NewBeneficiary(_beneficiary);
        _resetNewBeneficiaryRequest();
    }

    function _resetNewBeneficiaryRequest() private {
        newBeneficiaryRequest.beneficiary = address(0); // Reset beneficiary to zero address
        newBeneficiaryRequest.approvalCount = 0; // Reset approval count to zero
        delete newBeneficiaryRequest.approvers;
    }

    function _isAlreadyApprover(address _address) private view returns (bool) {
        for (uint i = 0; i < newBeneficiaryRequest.approvers.length; i++) {
            if (newBeneficiaryRequest.approvers[i] == _address) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Pauses the contract, stopping all actions except for unpause request/approval
     *  by privilaged users.
     *
     * Requirements:
     * - The caller must have the MANAGER_ROLE, EXECUTIONER_ROLE, or DEFAULT_ADMIN_ROLE.
     */

    function pause() public anyPrivilagedUser {
        _pause();
    }

    function _getRequiredApprovalCount() private view returns (uint256) {
        uint256 managerCount = _privilagedUsers[MANAGER_ROLE].length;
        return managerCount > 1 ? managerCount - 1 : 1; // All minus one, or one if only one manager exists
    }

    // Revised unpause method
    function requestUnpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        unpauseApprovals[_msgSender()] = true; // Register the approval from the caller
        emit UnpauseRequested(_msgSender());
        _tryUnpause();
    }

    function approveUnpause() public onlyRole(MANAGER_ROLE) {
        require(
            !unpauseApprovals[_msgSender()],
            "You have already approved the unpause."
        );
        unpauseApprovals[_msgSender()] = true;
        emit UnpauseApproved(_msgSender());
        _tryUnpause();
    }

    function _tryUnpause() private {
        uint256 approvalCount = 0;
        uint256 requiredApprovalCount = _getRequiredApprovalCount();

        // Count approvals
        for (uint256 i = 0; i < _privilagedUsers[MANAGER_ROLE].length; i++) {
            if (unpauseApprovals[_privilagedUsers[MANAGER_ROLE][i]]) {
                approvalCount++;
            }
        }

        // Check if approvals are sufficient
        if (approvalCount >= requiredApprovalCount) {
            _unpause();
            emit UnpauseExecuted();
            _resetUnpauseApprovals(); // Reset approvals after successful unpause
        }
    }

    function _resetUnpauseApprovals() private {
        for (uint256 i = 0; i < _privilagedUsers[MANAGER_ROLE].length; i++) {
            unpauseApprovals[_privilagedUsers[MANAGER_ROLE][i]] = false;
        }
    }

    function _proposeRoleChange(
        bytes32 role,
        address account,
        bool isGrant
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 proposalId = keccak256(
            abi.encodePacked(role, account, block.timestamp)
        ); // Unique ID for each proposal
        RoleProposal storage proposal = roleProposals[proposalId];
        proposal.role = role;
        proposal.account = account;
        proposal.isGrant = isGrant;
        proposal.approvalCount = 0;

        emit RoleChangeProposed(proposalId);
    }

    function _approveRoleChange(bytes32 proposalId) public {
        RoleProposal storage proposal = roleProposals[proposalId];
        require(
            hasRole(proposal.role, _msgSender()),
            "You must have the role to approve its change."
        );
        require(
            !proposal.approvals[_msgSender()],
            "You already approved this change."
        );

        proposal.approvals[_msgSender()] = true;
        proposal.approvalCount += 1;

        emit RoleChangeApproved(proposalId, _msgSender());

        // Check if enough approvals are collected
        if (proposal.approvalCount >= _getRequiredApprovalCount()) {
            if (proposal.isGrant) {
                _grantRole(proposal.role, proposal.account);
                emit RoleGranted(proposal.role, proposal.account);
            } else {
                _revokeRole(proposal.role, proposal.account);
                emit RoleRevoked(proposal.role, proposal.account);
            }
            delete roleProposals[proposalId]; // Clean up the proposal
        }
    }

    function revokeRole(
        bytes32 role,
        address account
    ) public override onlyRole(getRoleAdmin(role)) whenNotPaused {
        bool isSuccessful = _revokeRole(role, account);
        if (isSuccessful) {
            // remove address _privilagedUsers array
        }
    }

    function renounceRole(
        bytes32 role,
        address callerConfirmation
    ) public override {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }
        revokeRole(role, callerConfirmation);
    }

    function grantRole(
        bytes32 role,
        address account
    ) public override onlyRole(getRoleAdmin(role)) whenNotPaused {
        bool isSuccessful = _grantRole(role, account);
        if (isSuccessful) {
            _privilagedUsers[role].push(account);
        }
    }

    function debit(
        address tokenAddress,
        address userAddress,
        uint amount
    ) external onlyRole(EXECUTIONER_ROLE) whenNotPaused returns (bool) {
        /**
         1. check allowance 
         2. check amount available to withdraw 
         3. withdraw amount
         4. emit withdraw event
         5. returns boolean true when successful 
        */

        require(tokenAddress != address(0), "Invalid token address");
        require(userAddress != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than zero");

        IERC20 token = IERC20(tokenAddress);

        // 1. Check allowance
        uint allowed = token.allowance(userAddress, address(this));
        require(allowed >= amount, "Insufficient allowance");

        // 2. Check amount available to withdraw
        uint balance = token.balanceOf(userAddress);
        require(balance >= amount, "Insufficient balance");

        // 3. Withdraw amount
        bool success = token.transferFrom(userAddress, beneficiary, amount);
        require(success, "Token transfer failed");

        // 4. Emit withdraw event
        emit Withdraw(tokenAddress, userAddress, amount);

        // 5. Returns boolean true when successful
        return true;
    }

    function changeBeneficiary(
        address _beneficiary
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _resetNewBeneficiaryRequest();

        newBeneficiaryRequest.beneficiary = _beneficiary;
        newBeneficiaryRequest.approvalCount = 1; // Starting with the requester's implicit approval
        newBeneficiaryRequest.approvers.push(_msgSender());
    }

    function approveBeneficiary(
        address _beneficiary
    ) external onlyRole(MANAGER_ROLE) whenNotPaused {
        require(
            _beneficiary == newBeneficiaryRequest.beneficiary,
            "Beneficiary Address Mismatch"
        );

        require(
            !_isAlreadyApprover(_msgSender()),
            "You have already approved this request."
        );

        newBeneficiaryRequest.approvalCount += 1;
        newBeneficiaryRequest.approvers.push(_msgSender());

        if (
            _getRequiredApprovalCount() >= _privilagedUsers[MANAGER_ROLE].length
        ) {
            _setBeneficiary(_beneficiary);
        }
    }
}
