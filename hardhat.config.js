require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  //   defaultNetwork: "lisk-sepolia",
  networks: {
    "lisk-sepolia": {
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 4202,
    },
  },
  etherscan: {
    apiKey: {
      "lisk-sepolia": "123",
    },
    customChains: [
      {
        // network: "lisk-sepolia",
        chainId: 4202,
        urls: {
          apiURL: "https://sepolia-blockscout.lisk.com/api",
          browserURL: "https://sepolia-blockscout.lisk.com",
        },
      },
    ],
  },

  sourcify: {
    enabled: false,
  },
};
