// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ReputationTracker} from "../src/ReputationTracker.sol";

/// @notice Deploy ReputationTracker directly (no factory) for local testing.
/// Deployer becomes the permanent tracker — can call register/updateReputation.
contract DeployDirect is Script {
    function run() external {
        vm.startBroadcast();
        ReputationTracker tracker = new ReputationTracker(msg.sender, address(0));
        console.log("ReputationTracker:", address(tracker));
        console.log("tracker (backend):", tracker.TRACKER());
        vm.stopBroadcast();
    }
}
