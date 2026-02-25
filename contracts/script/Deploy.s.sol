// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TestUSDC.sol";
import "../src/BlackCat.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy TestUSDC
        TestUSDC usdc = new TestUSDC();
        console.log("TestUSDC deployed at:", address(usdc));

        // 2. Mint 1M USDC to deployer
        usdc.mint(deployer, 1_000_000 * 10 ** 6);
        console.log("Minted 1M USDC to deployer");

        // 3. Deploy BlackCat (deployer acts as forwarder for now)
        BlackCat blackCat = new BlackCat(address(usdc), deployer);
        console.log("BlackCat deployed at:", address(blackCat));

        // 4. Seed: Register 3 master traders
        address master1 = deployer;
        address master2 = address(0xAA01);
        address master3 = address(0xBB02);

        blackCat.registerMaster("ShadowAlpha");
        blackCat.adminRegisterMaster(master2, "CryptoNinja");
        blackCat.adminRegisterMaster(master3, "WhaleHunter");

        // 5. Seed: Post signals for ShadowAlpha (deployer)
        // Signal 0: ETH/USD LONG
        blackCat.postSignal(0, "ETH/USD", 2400e18, 2640e18, 2280e18);
        // Signal 1: BTC/USD LONG
        blackCat.postSignal(0, "BTC/USD", 95000e18, 104500e18, 90250e18);
        // Signal 2: AVAX/USD SHORT
        blackCat.postSignal(1, "AVAX/USD", 22e18, 19e18, 24e18);

        // 6. Seed: Post signals for CryptoNinja
        blackCat.adminPostSignal(master2, 0, "ETH/USD", 2350e18, 2585e18, 2230e18);
        blackCat.adminPostSignal(master2, 1, "BTC/USD", 97000e18, 87300e18, 101850e18);
        blackCat.adminPostSignal(master2, 0, "AVAX/USD", 21e18, 25e18, 19e18);

        // 7. Seed: Post signals for WhaleHunter
        blackCat.adminPostSignal(master3, 1, "ETH/USD", 2500e18, 2250e18, 2625e18);
        blackCat.adminPostSignal(master3, 0, "BTC/USD", 92000e18, 101200e18, 87400e18);
        blackCat.adminPostSignal(master3, 1, "AVAX/USD", 23e18, 20e18, 25e18);
        blackCat.adminPostSignal(master3, 0, "ETH/USD", 2380e18, 2618e18, 2261e18);

        // 8. Settle some signals via onReport to populate leaderboard
        uint256[] memory signalIds = new uint256[](4);
        signalIds[0] = 0; // ShadowAlpha ETH LONG +5%
        signalIds[1] = 3; // CryptoNinja ETH LONG +3%
        signalIds[2] = 4; // CryptoNinja BTC SHORT -2%
        signalIds[3] = 6; // WhaleHunter ETH SHORT +4%

        int256[] memory pnlBps = new int256[](4);
        pnlBps[0] = 500;   // +5%
        pnlBps[1] = 300;   // +3%
        pnlBps[2] = -200;  // -2%
        pnlBps[3] = 400;   // +4%

        uint8[] memory statuses = new uint8[](4);
        statuses[0] = 1; // TARGET_HIT
        statuses[1] = 1; // TARGET_HIT
        statuses[2] = 2; // STOPPED_OUT
        statuses[3] = 1; // TARGET_HIT

        address[] memory rankedMasters = new address[](3);
        rankedMasters[0] = master1;  // ShadowAlpha rank 1 (500 bps)
        rankedMasters[1] = master3;  // WhaleHunter rank 2 (400 bps)
        rankedMasters[2] = master2;  // CryptoNinja rank 3 (100 bps net)

        bytes memory report = abi.encode(signalIds, pnlBps, statuses, rankedMasters);
        blackCat.onReport("", report);

        console.log("Seeded 3 masters, 10 signals, settled 4, leaderboard set");

        vm.stopBroadcast();
    }
}
