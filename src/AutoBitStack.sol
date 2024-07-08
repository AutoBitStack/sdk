// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AutoBitStack is ReentrancyGuard, Ownable {
    enum TypeFeature { DCA, LIMIT }
    enum Frequency { DAY, WEEK, MONTH }

    struct DCA {
        address swapper;
        string btcAddress;
        address tokenAddress;
        uint256 totalAmount;
        uint256 amountPerSwap;
        Frequency frequency;
        uint256 totalFrequency;
        uint256 remainingAmount;
        bool isActive;
    }

    struct LIMIT {
        address swapper;
        string btcAddress;
        address tokenAddress;
        uint256 amount;
        uint256 priceTarget; // 4 decimals
        bool isActive;
    }

    IERC20 public usdcToken;
    IERC20 public flipToken;

    uint256 constant USDC_MIN_AMOUNT = 50 * 10**6; // 50 USDC (6 decimals)
    uint256 constant ETH_MIN_AMOUNT = 20 * 10**15; // 0.02 ETH (18 decimals)
    uint256 constant FLIP_MIN_AMOUNT = 50 * 10**18; // 50 FLIP (18 decimals)

    mapping(bytes32 => DCA) public dcaOrders;
    mapping(bytes32 => LIMIT) public limitOrders;

    uint256 private orderIdCounter;

    event Deposit(address indexed user, address token, uint256 amount, TypeFeature feature);
    event DCAOrderCreated(address indexed user, bytes32 orderId);
    event LimitOrderCreated(address indexed user, bytes32 orderId);
    event DCAOrderCancelled(address indexed user, bytes32 orderId, uint256 refundedAmount);
    event LimitOrderCancelled(address indexed user, bytes32 orderId, uint256 refundedAmount);
    event DCAOrderUpdated(address indexed user, bytes32 orderId, uint256 remainingAmount, uint256 remainingFrequency);
    event DCAOrderCompleted(address indexed user, bytes32 orderId);
    event LimitOrderFulfilled(address indexed user, bytes32 orderId, uint256 fulfilledAmount);

    constructor(address initialOwner) Ownable(initialOwner) {
        usdcToken = IERC20(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238);
        flipToken = IERC20(0xdC27c60956cB065D19F08bb69a707E37b36d8086);
    }

    function generateOrderId() private returns (bytes32) {
        orderIdCounter++;
        return keccak256(abi.encodePacked(block.timestamp, msg.sender, orderIdCounter));
    }

    function getMinimumAmount(address _tokenAddress) public view returns (uint256) {
        if (_tokenAddress == address(0)) {
            return ETH_MIN_AMOUNT;
        } else if (_tokenAddress == address(usdcToken)) {
            return USDC_MIN_AMOUNT;
        } else if (_tokenAddress == address(flipToken)) {
            return FLIP_MIN_AMOUNT;
        }
        revert("Invalid token address");
    }

    function transferTokens(address _token, uint256 _amount) internal returns (bool) {
        if (_token == address(0)) {
            require(msg.value == _amount, "Incorrect ETH amount");
            return true;
        } else {
            return IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        }
    }

    function transferTokensFrom(address _token, address _to, uint256 _amount) internal returns (bool) {
        if (_token == address(0)) {
            (bool success, ) = _to.call{value: _amount}("");
            return success;
        } else {
            return IERC20(_token).transfer(_to, _amount);
        }
    }

    function createDCAOrder(
        address _tokenAddress,
        uint256 _totalAmount,
        string memory _btcAddress,
        Frequency _frequency,
        uint256 _totalFrequency
    ) external payable nonReentrant returns (bytes32) {
        require(_tokenAddress == address(0) || _tokenAddress == address(usdcToken) || _tokenAddress == address(flipToken), "Invalid token");
        require(_totalFrequency > 0, "Total frequency must be greater than 0");

        uint256 minAmount = getMinimumAmount(_tokenAddress) * _totalFrequency;
        require(_totalAmount >= minAmount, "Total amount below minimum for DCA");
        
        require(transferTokens(_tokenAddress, _totalAmount), "Token transfer failed");

        uint256 amountPerSwap = _totalAmount / _totalFrequency;
        bytes32 orderId = generateOrderId();

        dcaOrders[orderId] = DCA({
            swapper: msg.sender,
            btcAddress: _btcAddress,
            tokenAddress: _tokenAddress,
            totalAmount: _totalAmount,
            amountPerSwap: amountPerSwap,
            frequency: _frequency,
            totalFrequency: _totalFrequency,
            remainingAmount: _totalAmount % _totalFrequency,
            isActive: true
        });

        emit Deposit(msg.sender, _tokenAddress, _totalAmount, TypeFeature.DCA);
        emit DCAOrderCreated(msg.sender, orderId);
        return orderId;
    }

    function createLimitOrder(
        address _tokenAddress,
        uint256 _amount,
        string memory _btcAddress,
        uint256 _priceTarget
    ) external payable nonReentrant returns (bytes32) {
        require(_tokenAddress == address(0) || _tokenAddress == address(usdcToken) || _tokenAddress == address(flipToken), "Invalid token");
        
        uint256 minAmount = getMinimumAmount(_tokenAddress);
        require(_amount >= minAmount, "Amount below minimum for LIMIT order");

        require(transferTokens(_tokenAddress, _amount), "Token transfer failed");

        bytes32 orderId = generateOrderId();
        limitOrders[orderId] = LIMIT({
            swapper: msg.sender,
            btcAddress: _btcAddress,
            tokenAddress: _tokenAddress,
            amount: _amount,
            priceTarget: _priceTarget,
            isActive: true
        });

        emit Deposit(msg.sender, _tokenAddress, _amount, TypeFeature.LIMIT);
        emit LimitOrderCreated(msg.sender, orderId);
        return orderId;
    }

    function cancelDCAOrder(bytes32 _orderId) external nonReentrant {
        require(dcaOrders[_orderId].swapper == msg.sender, "Not the order owner");
        require(dcaOrders[_orderId].isActive, "Order not active");

        DCA storage order = dcaOrders[_orderId];
        uint256 remainingAmount = order.remainingAmount + (order.amountPerSwap * order.totalFrequency);
        
        require(transferTokensFrom(order.tokenAddress, msg.sender, remainingAmount), "Token transfer failed");
        
        order.isActive = false;
        emit DCAOrderCancelled(msg.sender, _orderId, remainingAmount);
    }

    function cancelLimitOrder(bytes32 _orderId) external nonReentrant {
        require(limitOrders[_orderId].swapper == msg.sender, "Not the order owner");
        require(limitOrders[_orderId].isActive, "Order not active");

        LIMIT storage order = limitOrders[_orderId];
        uint256 remainingAmount = order.amount;
        
        require(transferTokensFrom(order.tokenAddress, msg.sender, remainingAmount), "Token transfer failed");
        
        order.isActive = false;
        emit LimitOrderCancelled(msg.sender, _orderId, remainingAmount);
    }

    function updateDCAOrder(bytes32 _orderId, address _destinationAddress) external onlyOwner() {
        require(dcaOrders[_orderId].isActive, "Order not active");
        require(_destinationAddress != address(0), "Invalid destination address");
        DCA storage order = dcaOrders[_orderId];
        
        // Transfer the swapped amount to the destination address
        require(transferTokensFrom(order.tokenAddress, _destinationAddress, order.amountPerSwap), "Token transfer failed");
        
        order.totalAmount -= order.amountPerSwap;
        order.totalFrequency--;
        
        if (order.totalFrequency == 0) {
            order.isActive = false;
            emit DCAOrderCompleted(order.swapper, _orderId);
        } else {
            emit DCAOrderUpdated(order.swapper, _orderId, order.totalAmount, order.totalFrequency);
        }
    }

    function fulfillLimitOrder(bytes32 _orderId, address _destinationAddress) external onlyOwner() {
        require(limitOrders[_orderId].isActive, "Order not active");
        require(_destinationAddress != address(0), "Invalid destination address");
        LIMIT storage order = limitOrders[_orderId];

        // Transfer the swapped amount to the destination address
        require(transferTokensFrom(order.tokenAddress, _destinationAddress, order.amount), "Token transfer failed");

        order.amount = 0;
        order.isActive = false;
        emit LimitOrderFulfilled(order.swapper, _orderId, order.amount);
    }
}