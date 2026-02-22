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
        uint8 direction;
        string tokenPair;
        uint256 entryPrice;
        uint256 targetPrice;
        uint256 stopLoss;
        uint256 createdAt;
        uint8 status;
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
        uint8 tier;
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
    event SignalPosted(uint256 indexed id, address indexed master, uint8 direction, string tokenPair, uint256 entryPrice);

    constructor(address _paymentToken, address _keystoneForwarder) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        keystoneForwarder = _keystoneForwarder;
    }

    modifier onlyMaster() {
        require(masters[msg.sender].active, "Not a registered master");
        _;
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

    function postSignal(
        uint8 direction,
        string calldata tokenPair,
        uint256 entryPrice,
        uint256 targetPrice,
        uint256 stopLoss
    ) external onlyMaster {
        require(direction <= 1, "Invalid direction");
        require(entryPrice > 0, "Invalid entry price");
        require(targetPrice > 0, "Invalid target price");
        require(stopLoss > 0, "Invalid stop loss");

        uint256 id = signalCount;
        signals[id] = Signal({
            id: id,
            master: msg.sender,

    function postSignal(
        uint8 direction,
        string calldata tokenPair,
        uint256 entryPrice,
        uint256 targetPrice,
        uint256 stopLoss
    ) external onlyMaster {
        require(direction <= 1, "Invalid direction");
        require(entryPrice > 0, "Invalid entry price");
        require(targetPrice > 0, "Invalid target price");
        require(stopLoss > 0, "Invalid stop loss");

        uint256 id = signalCount;
        signals[id] = Signal({
            id: id,
            master: msg.sender,
            direction: direction,
            tokenPair: tokenPair,
            entryPrice: entryPrice,
            targetPrice: targetPrice,
            stopLoss: stopLoss,
            createdAt: block.timestamp,
            status: 0,
            pnlBps: 0
        });

        masterSignalIds[msg.sender].push(id);
        masterStats[msg.sender].totalSignals++;
        signalCount++;
        emit SignalPosted(id, msg.sender, direction, tokenPair, entryPrice);
    }

    function subscribe(uint8 tier) external {
        if (tier == 1) {
            require(paymentToken.transferFrom(msg.sender, address(this), PRO_FEE), "Payment failed");
            subscriptions[msg.sender] = Subscription({
                subscriber: msg.sender,
                tier: 1,
                expiresAt: block.timestamp + SUB_DURATION
            });
        } else {
            subscriptions[msg.sender] = Subscription({
                subscriber: msg.sender,
                tier: 0,
                expiresAt: type(uint256).max
            });
        }
    }

    function getActiveSignals() external view returns (Signal[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < signalCount; i++) {
            if (signals[i].status == 0) activeCount++;
        }
        Signal[] memory active = new Signal[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < signalCount; i++) {
            if (signals[i].status == 0) {
                active[idx] = signals[i];
                idx++;
            }
        }
        return active;
    }

    function getMasterStats(address master) external view returns (MasterStats memory) {
        return masterStats[master];
    }

    function getMasterSignals(address master) external view returns (Signal[] memory) {
        uint256[] memory ids = masterSignalIds[master];
        Signal[] memory result = new Signal[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = signals[ids[i]];
        }
        return result;
    }

    function getAllMasters() external view returns (address[] memory) {
        return masterAddresses;
    }
}
