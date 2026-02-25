// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TestUSDC.sol";
import "../src/BlackCat.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        TestUSDC usdc = new TestUSDC();
        usdc.mint(msg.sender, 1_000_000 * 10 ** 6);
        BlackCat blackCat = new BlackCat(address(usdc), address(0));
        vm.stopBroadcast();
    }
}
