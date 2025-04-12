// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyInvestment.sol";

contract PropertySellOrder is ReentrancyGuard, Ownable(msg.sender) {
    struct SellOrder {
        address seller;
        uint256 propertyId;
        uint256 tokens;
        uint256 pricePerToken;
        bool isActive;
        uint256 createdAt;
    }

    // Mapping of sell order ID to SellOrder
    mapping(uint256 => SellOrder) public sellOrders;

    // Mapping of property ID to array of active sell order IDs
    mapping(uint256 => uint256[]) public propertySellOrders;

    // Mapping of user address to array of their sell order IDs
    mapping(address => uint256[]) public userSellOrders;

    // Total number of sell orders
    uint256 public sellOrderCount;

    // Events
    event SellOrderCreated(
        uint256 indexed sellOrderId,
        address indexed seller,
        uint256 indexed propertyId,
        uint256 tokens,
        uint256 pricePerToken,
        uint256 createdAt
    );

    event SellOrderCompleted(
        uint256 indexed sellOrderId,
        address indexed buyer,
        uint256 tokens,
        uint256 totalPrice
    );

    event SellOrderCancelled(uint256 indexed sellOrderId);

    // Reference to the PropertyInvestment contract
    PropertyInvestment public propertyInvestment;

    constructor(address _propertyInvestmentAddress) {
        propertyInvestment = PropertyInvestment(_propertyInvestmentAddress);
    }

    // Modifier to check if the caller is the PropertyInvestment contract
    modifier onlyPropertyInvestment() {
        require(
            msg.sender == address(propertyInvestment),
            "Caller is not PropertyInvestment contract"
        );
        _;
    }

    // Function to create a new sell order
    function createSellOrder(
        uint256 propertyId,
        uint256 tokens,
        uint256 pricePerToken
    ) external nonReentrant {
        require(propertyId > 0, "Invalid property ID");
        require(tokens > 0, "Token amount must be greater than 0");
        require(pricePerToken > 0, "Price per token must be greater than 0");
        require(msg.sender != address(0), "Invalid seller address");

        // Check if seller has enough tokens
        uint256 userTokens = propertyInvestment.getUserPropertyTokens(
            msg.sender,
            propertyId
        );
        require(userTokens >= tokens, "Insufficient tokens");

        sellOrderCount++;
        uint256 currentSellOrderId = sellOrderCount;

        sellOrders[currentSellOrderId] = SellOrder({
            seller: msg.sender,
            propertyId: propertyId,
            tokens: tokens,
            pricePerToken: pricePerToken,
            isActive: true,
            createdAt: block.timestamp
        });

        // Add to property's sell orders
        propertySellOrders[propertyId].push(currentSellOrderId);

        // Add to user's sell orders
        userSellOrders[msg.sender].push(currentSellOrderId);

        emit SellOrderCreated(
            currentSellOrderId,
            msg.sender,
            propertyId,
            tokens,
            pricePerToken,
            block.timestamp
        );
    }

    // Function to buy tokens from a sell order
    function buyTokens(uint256 sellOrderId) external payable nonReentrant {
        require(
            sellOrderId > 0 && sellOrderId <= sellOrderCount,
            "Invalid sell order ID"
        );
        SellOrder storage order = sellOrders[sellOrderId];
        require(order.isActive, "Sell order is not active");
        require(msg.sender != order.seller, "Cannot buy from yourself");

        uint256 totalPrice = order.tokens * order.pricePerToken;
        require(msg.value >= totalPrice, "Insufficient payment");

        // Transfer tokens from seller to buyer
        propertyInvestment.transferPropertyTokens(
            order.seller,
            msg.sender,
            order.propertyId,
            order.tokens
        );

        // Transfer payment to seller
        payable(order.seller).transfer(totalPrice);

        // Refund excess payment if any
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        order.isActive = false;

        emit SellOrderCompleted(
            sellOrderId,
            msg.sender,
            order.tokens,
            totalPrice
        );
    }

    // Function to cancel a sell order
    function cancelSellOrder(uint256 sellOrderId) external nonReentrant {
        require(
            sellOrderId > 0 && sellOrderId <= sellOrderCount,
            "Invalid sell order ID"
        );
        SellOrder storage order = sellOrders[sellOrderId];
        require(order.isActive, "Sell order is not active");
        require(msg.sender == order.seller, "Only seller can cancel order");

        order.isActive = false;

        emit SellOrderCancelled(sellOrderId);
    }

    // Function to get active sell orders for a property
    function getPropertySellOrders(
        uint256 propertyId
    ) external view returns (uint256[] memory) {
        require(propertyId > 0, "Invalid property ID");
        return propertySellOrders[propertyId];
    }

    // Function to get user's sell orders
    function getUserSellOrders(
        address user
    ) external view returns (uint256[] memory) {
        require(user != address(0), "Invalid user address");
        return userSellOrders[user];
    }

    // Function to get sell order details
    function getSellOrder(
        uint256 sellOrderId
    )
        external
        view
        returns (
            address seller,
            uint256 propertyId,
            uint256 tokens,
            uint256 pricePerToken,
            bool isActive,
            uint256 createdAt
        )
    {
        require(
            sellOrderId > 0 && sellOrderId <= sellOrderCount,
            "Invalid sell order ID"
        );
        SellOrder memory order = sellOrders[sellOrderId];
        return (
            order.seller,
            order.propertyId,
            order.tokens,
            order.pricePerToken,
            order.isActive,
            order.createdAt
        );
    }

    // Function to update PropertyInvestment contract address (only owner)
    function setPropertyInvestmentContract(
        address _propertyInvestmentAddress
    ) external onlyOwner {
        require(
            _propertyInvestmentAddress != address(0),
            "Invalid contract address"
        );
        propertyInvestment = PropertyInvestment(_propertyInvestmentAddress);
    }

    // Function to receive ETH
    receive() external payable {}
}
