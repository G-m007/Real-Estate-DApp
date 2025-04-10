module.exports = {
  type: "commonjs",
  hardhat: {
    solidity: "0.8.28",
    networks: {
      hardhat: {},
      sepolia: {
        url: process.env.SEPOLIA_URL || "",
        accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      },
    },
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
  },
}; 