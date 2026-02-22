// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlackCat is Ownable {
    // --- Structs ---
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
        string tokenPair; // "ETH/USD", "BTC/USD", "AVAX/USD"
        uint256 entryPrice; // 18 decimals
        uint256 targetPrice;
        uint256 stopLoss;
        uint256 createdAt;
        uint8 status; // 0=ACTIVE, 1=TARGET_HIT, 2=STOPPED_OUT, 3=EXPIRED
        int256 pnlBps; // basis points
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

    // --- State ---
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
    uint256 public constant PRO_FEE = 100 * 10 ** 6; // 100 USDC
    uint256 public constant SUB_DURATION = 30 days;

    // --- Events ---
    event MasterRegistered(address indexed master, string name);
    event SignalPosted(uint256 indexed id, address indexed master, uint8 direction, string tokenPair, uint256 entryPrice);
    event SignalSettled(uint256 indexed id, int256 pnlBps, uint8 status);
    event LeaderboardUpdated(address[] rankedMasters);
    event Subscribed(address indexed subscriber, uint8 tier, uint256 expiresAt);

    // --- Constructor ---
    constructor(address _paymentToken, address _keystoneForwarder) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        keystoneForwarder = _keystoneForwarder;
    }

    // --- Modifiers ---
    modifier onlyMaster() {
        require(masters[msg.sender].active, "Not a registered master");
        _;
    }

    modifier onlyForwarder() {
        require(msg.sender == keystoneForwarder || msg.sender == owner(), "Not authorized");
        _;
    }

    // --- Master Functions ---
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

    // --- Subscriber Functions ---
    function subscribe(uint8 tier) external {
        if (tier == 1) {
            require(paymentToken.transferFrom(msg.sender, address(this), PRO_FEE), "Payment failed");
            subscriptions[msg.sender] = Subscription({
                subscriber: msg.sender,
                tier: 1,
                expiresAt: block.timestamp + SUB_DURATION
            });
            emit Subscribed(msg.sender, 1, block.timestamp + SUB_DURATION);
        } else {
            subscriptions[msg.sender] = Subscription({
                subscriber: msg.sender,
                tier: 0,
                expiresAt: type(uint256).max
            });
            emit Subscribed(msg.sender, 0, type(uint256).max);
        }
    }

    function getAccessibleMasters(address subscriber) external view returns (address[] memory) {
        Subscription memory sub = subscriptions[subscriber];

        // PRO tier or no subscription defaults to checking
        if (sub.tier == 1 && block.timestamp <= sub.expiresAt) {
            return masterAddresses;
        }

        // FREE tier: top 3 masters from leaderboard
        uint256 count = leaderboard.length < 3 ? leaderboard.length : 3;
        address[] memory accessible = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            accessible[i] = leaderboard[i];
        }
        return accessible;
    }

    // --- CRE Receiver ---
    function onReport(bytes calldata, bytes calldata report) external onlyForwarder {
        (
            uint256[] memory signalIds,
            int256[] memory pnlBpsArr,
            uint8[] memory statuses,
            address[] memory rankedMasters
        ) = abi.decode(report, (uint256[], int256[], uint8[], address[]));

        // Settle signals
        for (uint256 i = 0; i < signalIds.length; i++) {
            Signal storage sig = signals[signalIds[i]];
            require(sig.status == 0, "Signal already settled");

            sig.status = statuses[i];
            sig.pnlBps = pnlBpsArr[i];

            // Update master stats
            MasterStats storage stats = masterStats[sig.master];
            stats.cumulativePnlBps += pnlBpsArr[i];
            if (pnlBpsArr[i] > 0) {
                stats.wins++;
            } else {
                stats.losses++;
            }

            emit SignalSettled(signalIds[i], pnlBpsArr[i], statuses[i]);
        }

        // Update leaderboard
        leaderboard = rankedMasters;
        for (uint256 i = 0; i < rankedMasters.length; i++) {
            masterStats[rankedMasters[i]].rank = i + 1;
        }

        emit LeaderboardUpdated(rankedMasters);
    }

    // --- View Functions ---
    function getLeaderboard() external view returns (address[] memory, MasterStats[] memory) {
        MasterStats[] memory stats = new MasterStats[](leaderboard.length);
        for (uint256 i = 0; i < leaderboard.length; i++) {
            stats[i] = masterStats[leaderboard[i]];
        }
        return (leaderboard, stats);
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

    function getSignal(uint256 id) external view returns (Signal memory) {
        return signals[id];
    }

    function getMasterSignals(address master) external view returns (Signal[] memory) {
        uint256[] memory ids = masterSignalIds[master];
        Signal[] memory result = new Signal[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = signals[ids[i]];
        }
        return result;
    }

    function getMasterCount() external view returns (uint256) {
        return masterAddresses.length;
    }

    function getMaster(address addr) external view returns (Master memory) {
        return masters[addr];
    }

    function getAllMasters() external view returns (address[] memory) {
        return masterAddresses;
    }

    // --- Admin ---
    function setKeystoneForwarder(address _forwarder) external onlyOwner {
        keystoneForwarder = _forwarder;
    }

    /// @dev Owner can register a master on behalf of any address (for seeding)
    function adminRegisterMaster(address addr, string calldata name) external onlyOwner {
        require(!masters[addr].active, "Already registered");
        require(bytes(name).length > 0, "Name required");

        masters[addr] = Master({
            addr: addr,
            name: name,
            registeredAt: block.timestamp,
            active: true
        });
        masterAddresses.push(addr);
        emit MasterRegistered(addr, name);
    }

    /// @dev Owner can post a signal on behalf of a master (for seeding)
    function adminPostSignal(
        address master,
        uint8 direction,
        string calldata tokenPair,
        uint256 entryPrice,
        uint256 targetPrice,
        uint256 stopLoss
    ) external onlyOwner {
        require(masters[master].active, "Not a registered master");

        uint256 id = signalCount;
        signals[id] = Signal({
            id: id,
            master: master,
            direction: direction,
            tokenPair: tokenPair,
            entryPrice: entryPrice,
            targetPrice: targetPrice,
            stopLoss: stopLoss,
            createdAt: block.timestamp,
            status: 0,
            pnlBps: 0
        });

        masterSignalIds[master].push(id);
        masterStats[master].totalSignals++;
        signalCount++;

        emit SignalPosted(id, master, direction, tokenPair, entryPrice);
    }
}
