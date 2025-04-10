import { ethers } from "hardhat";

async function main() {
  const PropertyInvestment = await ethers.getContractFactory("PropertyInvestment");
  const propertyInvestment = await PropertyInvestment.deploy();

  await propertyInvestment.waitForDeployment();

  console.log(
    `PropertyInvestment deployed to ${await propertyInvestment.getAddress()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 