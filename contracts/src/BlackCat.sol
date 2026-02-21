// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlackCat is Ownable {
    struct Master {
        address addr;
        string name;
        uint256 registeredAt;
        bool active;
    }

    struct Signal {
        uint256 id;
        address master;
        uint8 direction; // 0=LONG, 1=SHORT
        string tokenPair;
        uint256 entryPrice;
        uint256 targetPrice;
        uint256 stopLoss;
        uint256 createdAt;
        uint8 status; // 0=ACTIVE, 1=TARGET_HIT, 2=STOPPED_OUT, 3=EXPIRED
        int256 pnlBps;
    }

    struct MasterStats {
        uint256 totalSignals;
        uint256 wins;
        uint256 losses;
        int256 cumulativePnlBps;
        uint256 rank;
    }

    struct Subscription {
        address subscriber;
        uint8 tier; // 0=FREE, 1=PRO
        uint256 expiresAt;
    }

    mapping(address => Master) public masters;
    address[] public masterAddresses;
    mapping(uint256 => Signal) public signals;
    uint256 public signalCount;
    mapping(address => uint256[]) public masterSignalIds;
    mapping(address => MasterStats) public masterStats;
    mapping(address => Subscription) public subscriptions;
    address[] public leaderboard;
    address public keystoneForwarder;

    IERC20 public paymentToken;
    uint256 public constant PRO_FEE = 100 * 10 ** 6;
    uint256 public constant SUB_DURATION = 30 days;

    event MasterRegistered(address indexed master, string name);

    constructor(address _paymentToken, address _keystoneForwarder) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        keystoneForwarder = _keystoneForwarder;
    }

    function registerMaster(string calldata name) external {
        require(!masters[msg.sender].active, "Already registered");
        require(bytes(name).length > 0, "Name required");

        masters[msg.sender] = Master({
            addr: msg.sender,
            name: name,
            registeredAt: block.timestamp,
            active: true
        });
        masterAddresses.push(msg.sender);
        emit MasterRegistered(msg.sender, name);
    }
}
