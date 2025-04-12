// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PropertyInvestment {
    struct Investment {
        address investor;
        uint256 propertyId;
        uint256 amount;
        uint256 tokens;
        bool isActive;
    }

    mapping(uint256 => Investment) public investments;
    mapping(address => uint256[]) public investorProperties;
    mapping(address => mapping(uint256 => uint256)) public userPropertyTokens;
    uint256 public investmentCount;

    event InvestmentMade(
        uint256 indexed investmentId,
        address indexed investor,
        uint256 indexed propertyId,
        uint256 amount,
        uint256 tokens
    );

    event TokensTransferred(
        address indexed from,
        address indexed to,
        uint256 indexed propertyId,
        uint256 tokens
    );

    function invest(uint256 propertyId, uint256 tokens) external payable {
        require(msg.value > 0, "Investment amount must be greater than 0");
        require(tokens > 0, "Token amount must be greater than 0");
        require(propertyId > 0, "Invalid property ID");
        require(msg.sender != address(0), "Invalid investor address");

        investmentCount++;
        uint256 currentInvestmentId = investmentCount;

        investments[currentInvestmentId] = Investment({
            investor: msg.sender,
            propertyId: propertyId,
            amount: msg.value,
            tokens: tokens,
            isActive: true
        });

        investorProperties[msg.sender].push(propertyId);
        userPropertyTokens[msg.sender][propertyId] += tokens;

        // Emit event with all parameters
        emit InvestmentMade(
            currentInvestmentId,
            msg.sender,
            propertyId,
            msg.value,
            tokens
        );
    }

    function getInvestment(
        uint256 investmentId
    )
        external
        view
        returns (
            address investor,
            uint256 propertyId,
            uint256 amount,
            uint256 tokens,
            bool isActive
        )
    {
        require(
            investmentId > 0 && investmentId <= investmentCount,
            "Invalid investment ID"
        );
        Investment memory investment = investments[investmentId];
        return (
            investment.investor,
            investment.propertyId,
            investment.amount,
            investment.tokens,
            investment.isActive
        );
    }

    function getInvestorProperties(
        address investor
    ) external view returns (uint256[] memory) {
        require(investor != address(0), "Invalid investor address");
        return investorProperties[investor];
    }

    // Get user's token balance for a specific property
    function getUserPropertyTokens(
        address user,
        uint256 propertyId
    ) external view returns (uint256) {
        require(user != address(0), "Invalid user address");
        require(propertyId > 0, "Invalid property ID");
        return userPropertyTokens[user][propertyId];
    }

    // Transfer tokens between users
    function transferPropertyTokens(
        address from,
        address to,
        uint256 propertyId,
        uint256 tokens
    ) external {
        require(from != address(0), "Invalid sender address");
        require(to != address(0), "Invalid recipient address");
        require(propertyId > 0, "Invalid property ID");
        require(tokens > 0, "Token amount must be greater than 0");
        require(
            userPropertyTokens[from][propertyId] >= tokens,
            "Insufficient tokens"
        );

        userPropertyTokens[from][propertyId] -= tokens;
        userPropertyTokens[to][propertyId] += tokens;

        // Add property to recipient's list if they don't already have it
        bool hasProperty = false;
        for (uint256 i = 0; i < investorProperties[to].length; i++) {
            if (investorProperties[to][i] == propertyId) {
                hasProperty = true;
                break;
            }
        }
        if (!hasProperty) {
            investorProperties[to].push(propertyId);
        }

        emit TokensTransferred(from, to, propertyId, tokens);
    }
}
