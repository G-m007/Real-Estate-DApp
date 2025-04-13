import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomicfoundation/hardhat-ethers";
import * as hre from "hardhat";

async function main() {
  const ethers = (hre as HardhatRuntimeEnvironment).ethers;

  console.log("Deploying PropertyInvestment contract...");
  const PropertyInvestment = await ethers.getContractFactory("PropertyInvestment");
  const propertyInvestment = await PropertyInvestment.deploy();
  await propertyInvestment.waitForDeployment();
  const propertyInvestmentAddress = await propertyInvestment.getAddress();
  console.log("PropertyInvestment deployed to:", propertyInvestmentAddress);

  console.log("\nDeploying PropertySellOrder contract...");
  const PropertySellOrder = await ethers.getContractFactory("PropertySellOrder");
  const propertySellOrder = await PropertySellOrder.deploy(propertyInvestmentAddress);
  await propertySellOrder.waitForDeployment();
  const propertySellOrderAddress = await propertySellOrder.getAddress();
  console.log("PropertySellOrder deployed to:", propertySellOrderAddress);

  console.log("\nDeployment completed!");
  console.log("PropertyInvestment:", propertyInvestmentAddress);
  console.log("PropertySellOrder:", propertySellOrderAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 