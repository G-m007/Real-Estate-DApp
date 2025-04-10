import { expect } from "chai";
import { ethers } from "hardhat";

describe("PropertyInvestment", function () {
  let propertyInvestment: any;
  let owner: any;
  let investor: any;

  beforeEach(async function () {
    [owner, investor] = await ethers.getSigners();

    const PropertyInvestment = await ethers.getContractFactory("PropertyInvestment");
    propertyInvestment = await PropertyInvestment.deploy();
    await propertyInvestment.deployed();
  });

  it("Should allow investment in a property", async function () {
    const propertyId = 1;
    const tokens = 100;
    const investmentAmount = ethers.utils.parseEther("1.0");

    // Investor makes an investment
    await propertyInvestment.connect(investor).invest(propertyId, tokens, {
      value: investmentAmount,
    });

    // Get the investment details
    const investment = await propertyInvestment.getInvestment(1);
    
    expect(investment.investor).to.equal(investor.address);
    expect(investment.propertyId).to.equal(propertyId);
    expect(investment.amount).to.equal(investmentAmount);
    expect(investment.tokens).to.equal(tokens);
    expect(investment.isActive).to.equal(true);
  });

  it("Should return investor's properties", async function () {
    const propertyId1 = 1;
    const propertyId2 = 2;
    const tokens = 100;
    const investmentAmount = ethers.utils.parseEther("1.0");

    // Make two investments
    await propertyInvestment.connect(investor).invest(propertyId1, tokens, {
      value: investmentAmount,
    });
    await propertyInvestment.connect(investor).invest(propertyId2, tokens, {
      value: investmentAmount,
    });

    // Get investor's properties
    const properties = await propertyInvestment.getInvestorProperties(investor.address);
    
    expect(properties.length).to.equal(2);
    expect(properties[0]).to.equal(propertyId1);
    expect(properties[1]).to.equal(propertyId2);
  });
}); 