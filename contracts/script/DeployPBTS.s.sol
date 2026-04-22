// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {RepFactory} from "../src/RepFactory.sol";

contract DeployPBTS is Script {
    function run() external {
        vm.startBroadcast();
        RepFactory factory = new RepFactory();
        console.log("RepFactory:", address(factory));

        address tracker = factory.deployNewTracker(address(0));
        console.log("ReputationTracker:", tracker);
        vm.stopBroadcast();
    }
}
