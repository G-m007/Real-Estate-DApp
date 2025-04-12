import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomicfoundation/hardhat-ethers";
import * as hre from "hardhat";

async function main() {
  const ethers = (hre as HardhatRuntimeEnvironment).ethers;
  const PropertyInvestment = await ethers.getContractFactory("PropertyInvestment");
  const propertyInvestment = await PropertyInvestment.deploy();
  await propertyInvestment.waitForDeployment();
  console.log("PropertyInvestment deployed to:", await propertyInvestment.getAddress());

  const PropertySellOrder = await ethers.getContractFactory("PropertySellOrder");
  const propertySellOrder = await PropertySellOrder.deploy(await propertyInvestment.getAddress());
  await propertySellOrder.waitForDeployment();
  console.log("PropertySellOrder deployed to:", await propertySellOrder.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});