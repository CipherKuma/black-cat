// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BlackCat.sol";
import "../src/TestUSDC.sol";

contract BlackCatTest is Test {
    BlackCat public blackCat;
    TestUSDC public usdc;
    address public deployer = address(this);
    address public master1 = address(0x1);
    address public master2 = address(0x2);
    address public subscriber = address(0x3);
    address public forwarder = address(0x4);

    function setUp() public {
        usdc = new TestUSDC();
        blackCat = new BlackCat(address(usdc), forwarder);
    }

    function test_RegisterMaster() public {
        vm.prank(master1);
        blackCat.registerMaster("ShadowAlpha");
        (address addr, string memory name, , bool active) = blackCat.masters(master1);
        assertEq(addr, master1);
        assertEq(name, "ShadowAlpha");
        assertTrue(active);
    }

    function test_RevertDoubleRegister() public {
        vm.startPrank(master1);
        blackCat.registerMaster("ShadowAlpha");
        vm.expectRevert("Already registered");
        blackCat.registerMaster("ShadowAlpha2");
        vm.stopPrank();
    }

    function test_RevertEmptyName() public {
        vm.prank(master1);
        vm.expectRevert("Name required");
        blackCat.registerMaster("");
    }
}
