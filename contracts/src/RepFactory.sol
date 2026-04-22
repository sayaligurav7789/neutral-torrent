// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReputationTracker} from "./ReputationTracker.sol";

/**
 * @title  RepFactory
 * @notice Public, immutable factory that deploys new ReputationTracker
 *         contracts.  Anyone can call `deployNewTracker`; the caller becomes
 *         the permanent tracker of the deployed contract.
 */
contract RepFactory {
    event NewReputationTracker(
        address indexed newContract,
        address indexed referrer,
        address indexed caller
    );

    error InvalidReferrer();

    /**
     * @notice Deploy a new ReputationTracker.
     * @param _referrer Address of a previous ReputationTracker for single-hop
     *                  reputation delegation, or address(0) for a fresh start.
     * @return The address of the newly deployed ReputationTracker.
     */
    function deployNewTracker(address _referrer) external returns (address) {
        // Guard: referrer must be a deployed contract (not an EOA or garbage).
        if (_referrer != address(0)) {
            uint256 codeSize;
            assembly { codeSize := extcodesize(_referrer) }
            if (codeSize == 0) revert InvalidReferrer();
        }

        ReputationTracker newTracker = new ReputationTracker(msg.sender, _referrer);
        emit NewReputationTracker(address(newTracker), _referrer, msg.sender);
        return address(newTracker);
    }
}
