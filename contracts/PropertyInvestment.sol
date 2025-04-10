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
    uint256 public investmentCount;

    event InvestmentMade(
        uint256 indexed investmentId,
        address indexed investor,
        uint256 indexed propertyId,
        uint256 amount,
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
}
