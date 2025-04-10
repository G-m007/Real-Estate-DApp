import { expect } from "chai";
import { ethers } from "hardhat";
import { FractionalProperty } from "../typechain-types";

describe("FractionalProperty", function () {
  let fractionalProperty: FractionalProperty;
  let owner: any;
  let investor: any;

  beforeEach(async function () {
    [owner, investor] = await ethers.getSigners();
    
    const FractionalProperty = await ethers.getContractFactory("FractionalProperty");
    fractionalProperty = await FractionalProperty.deploy();
    await fractionalProperty.waitForDeployment();
  });

  it("Should allow owner to list a property", async function () {
    await fractionalProperty.connect(owner).listProperty(
      "Test Property",
      "Test Location",
      "https://test.com/image.jpg",
      ethers.parseEther("100"), // 100 ETH total value
      1000 // 1000 total shares
    );

    const property = await fractionalProperty.properties(0);
    expect(property.name).to.equal("Test Property");
    expect(property.totalValue).to.equal(ethers.parseEther("100"));
    expect(property.totalShares).to.equal(1000);
  });

  it("Should allow investment in a property", async function () {
    // First list a property
    await fractionalProperty.connect(owner).listProperty(
      "Test Property",
      "Test Location",
      "https://test.com/image.jpg",
      ethers.parseEther("100"),
      1000
    );

    // Invest 10 ETH
    await fractionalProperty.connect(investor).invest(0, {
      value: ethers.parseEther("10")
    });

    // Check shares issued
    const shares = await fractionalProperty.shares(0, investor.address);
    expect(shares).to.equal(100); // 10% of total shares (1000 * 10/100)
  });

  it("Should calculate correct ownership percentage", async function () {
    // List property
    await fractionalProperty.connect(owner).listProperty(
      "Test Property",
      "Test Location",
      "https://test.com/image.jpg",
      ethers.parseEther("100"),
      1000
    );

    // Invest 10 ETH
    await fractionalProperty.connect(investor).invest(0, {
      value: ethers.parseEther("10")
    });

    // Check ownership percentage (should be 10% = 1000)
    const percentage = await fractionalProperty.getUserOwnershipPercentage(0, investor.address);
    expect(percentage).to.equal(1000); // 10% * 10000 for precision
  });
}); 