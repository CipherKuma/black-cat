// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TestUSDC.sol";
import "../src/BlackCat.sol";

contract BlackCatTest is Test {
    TestUSDC public usdc;
    BlackCat public blackCat;

    address public deployer = address(this);
    address public forwarder = address(0xF0);
    address public master1 = address(0x1);
    address public master2 = address(0x2);
    address public master3 = address(0x3);
    address public subscriber1 = address(0x4);

    function setUp() public {
        usdc = new TestUSDC();
        blackCat = new BlackCat(address(usdc), forwarder);
    }

    // --- TestUSDC Tests ---
    function test_USDCDecimals() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_USDCMint() public {
        usdc.mint(master1, 1000e6);
        assertEq(usdc.balanceOf(master1), 1000e6);
    }

    function test_USDCFaucet() public {
        vm.prank(subscriber1);
        usdc.faucet(1000e6);
        assertEq(usdc.balanceOf(subscriber1), 1000e6);
    }

    function test_USDCFaucetMaxLimit() public {
        vm.prank(subscriber1);
        vm.expectRevert("Max 1000 USDC per faucet call");
        usdc.faucet(1001e6);
    }

    // --- Master Registration ---
    function test_RegisterMaster() public {
        vm.prank(master1);
        blackCat.registerMaster("Alpha Trader");

        BlackCat.Master memory m = blackCat.getMaster(master1);
        assertEq(m.name, "Alpha Trader");
        assertTrue(m.active);
        assertEq(blackCat.getMasterCount(), 1);
    }

    function test_RegisterMasterTwiceFails() public {
        vm.prank(master1);
        blackCat.registerMaster("Alpha");

        vm.prank(master1);
        vm.expectRevert("Already registered");
        blackCat.registerMaster("Alpha Again");
    }

    function test_RegisterMasterEmptyNameFails() public {
        vm.prank(master1);
        vm.expectRevert("Name required");
        blackCat.registerMaster("");
    }

    // --- Signal Posting ---
    function test_PostSignal() public {
        vm.prank(master1);
        blackCat.registerMaster("Alpha");

        vm.prank(master1);
        blackCat.postSignal(0, "ETH/USD", 2000e18, 2200e18, 1900e18);

        assertEq(blackCat.signalCount(), 1);
        BlackCat.Signal memory sig = blackCat.getSignal(0);
        assertEq(sig.master, master1);
        assertEq(sig.direction, 0);
        assertEq(sig.entryPrice, 2000e18);
        assertEq(sig.status, 0);
    }

    function test_PostSignalNotMasterFails() public {
        vm.prank(master1);
        vm.expectRevert("Not a registered master");
        blackCat.postSignal(0, "ETH/USD", 2000e18, 2200e18, 1900e18);
    }

    function test_GetMasterSignals() public {
        vm.prank(master1);
        blackCat.registerMaster("Alpha");

        vm.prank(master1);
        blackCat.postSignal(0, "ETH/USD", 2000e18, 2200e18, 1900e18);
        vm.prank(master1);
        blackCat.postSignal(1, "BTC/USD", 60000e18, 55000e18, 62000e18);

        BlackCat.Signal[] memory sigs = blackCat.getMasterSignals(master1);
        assertEq(sigs.length, 2);
        assertEq(sigs[0].direction, 0);
        assertEq(sigs[1].direction, 1);
    }

    // --- Subscriptions ---
    function test_SubscribeFree() public {
        vm.prank(subscriber1);
        blackCat.subscribe(0);

        (address sub, uint8 tier, uint256 expiresAt) = blackCat.subscriptions(subscriber1);
        assertEq(sub, subscriber1);
        assertEq(tier, 0);
        assertEq(expiresAt, type(uint256).max);
    }

    function test_SubscribePro() public {
        usdc.mint(subscriber1, 100e6);
        vm.prank(subscriber1);
        usdc.approve(address(blackCat), 100e6);
        vm.prank(subscriber1);
        blackCat.subscribe(1);

        (, uint8 tier,) = blackCat.subscriptions(subscriber1);
        assertEq(tier, 1);
        assertEq(usdc.balanceOf(address(blackCat)), 100e6);
    }

    // --- CRE onReport ---
    function test_OnReport() public {
        // Register masters and post signals
        vm.prank(master1);
        blackCat.registerMaster("Alpha");
        vm.prank(master2);
        blackCat.registerMaster("Beta");

        vm.prank(master1);
        blackCat.postSignal(0, "ETH/USD", 2000e18, 2200e18, 1900e18);
        vm.prank(master2);
        blackCat.postSignal(1, "BTC/USD", 60000e18, 55000e18, 62000e18);

        // Prepare report
        uint256[] memory signalIds = new uint256[](2);
        signalIds[0] = 0;
        signalIds[1] = 1;

        int256[] memory pnlBps = new int256[](2);
        pnlBps[0] = 500; // +5%
        pnlBps[1] = -300; // -3%

        uint8[] memory statuses = new uint8[](2);
        statuses[0] = 1; // TARGET_HIT
        statuses[1] = 2; // STOPPED_OUT

        address[] memory ranked = new address[](2);
        ranked[0] = master1;
        ranked[1] = master2;

        bytes memory report = abi.encode(signalIds, pnlBps, statuses, ranked);

        // Submit report as forwarder
        vm.prank(forwarder);
        blackCat.onReport("", report);

        // Verify signals settled
        BlackCat.Signal memory s0 = blackCat.getSignal(0);
        assertEq(s0.status, 1);
        assertEq(s0.pnlBps, 500);

        BlackCat.Signal memory s1 = blackCat.getSignal(1);
        assertEq(s1.status, 2);
        assertEq(s1.pnlBps, -300);

        // Verify leaderboard
        (address[] memory lb, BlackCat.MasterStats[] memory stats) = blackCat.getLeaderboard();
        assertEq(lb.length, 2);
        assertEq(lb[0], master1);
        assertEq(stats[0].wins, 1);
        assertEq(stats[0].cumulativePnlBps, 500);
        assertEq(stats[0].rank, 1);
    }

    function test_OnReportUnauthorizedFails() public {
        bytes memory report = abi.encode(new uint256[](0), new int256[](0), new uint8[](0), new address[](0));
        vm.prank(master1);
        vm.expectRevert("Not authorized");
        blackCat.onReport("", report);
    }

    // --- View Functions ---
    function test_GetActiveSignals() public {
        vm.prank(master1);
        blackCat.registerMaster("Alpha");

        vm.prank(master1);
        blackCat.postSignal(0, "ETH/USD", 2000e18, 2200e18, 1900e18);
        vm.prank(master1);
        blackCat.postSignal(0, "BTC/USD", 60000e18, 66000e18, 57000e18);

        BlackCat.Signal[] memory active = blackCat.getActiveSignals();
        assertEq(active.length, 2);
    }

    function test_GetAccessibleMastersFree() public {
        // Register 3 masters
        vm.prank(master1);
        blackCat.registerMaster("Alpha");
        vm.prank(master2);
        blackCat.registerMaster("Beta");
        vm.prank(master3);
        blackCat.registerMaster("Gamma");

        // Set leaderboard via onReport (owner can call)
        address[] memory ranked = new address[](3);
        ranked[0] = master1;
        ranked[1] = master2;
        ranked[2] = master3;
        bytes memory report = abi.encode(new uint256[](0), new int256[](0), new uint8[](0), ranked);
        blackCat.onReport("", report);

        // Free subscriber gets top 3
        address[] memory accessible = blackCat.getAccessibleMasters(subscriber1);
        assertEq(accessible.length, 3);
    }

    function test_GetAccessibleMastersPro() public {
        vm.prank(master1);
        blackCat.registerMaster("Alpha");
        vm.prank(master2);
        blackCat.registerMaster("Beta");

        usdc.mint(subscriber1, 100e6);
        vm.prank(subscriber1);
        usdc.approve(address(blackCat), 100e6);
        vm.prank(subscriber1);
        blackCat.subscribe(1);

        address[] memory accessible = blackCat.getAccessibleMasters(subscriber1);
        assertEq(accessible.length, 2);
    }
}
