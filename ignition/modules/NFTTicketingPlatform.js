const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("NFTTicketingPlatformModule", (m) => {
  const nftTicketingPlatform = m.contract("NFTTicketingPlatform");

  return { nftTicketingPlatform };
});
