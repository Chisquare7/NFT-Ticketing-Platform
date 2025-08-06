const { ethers } = require("hardhat");

async function main() {
  const [organizer, buyer1, buyer2] = await ethers.getSigners();

  const TicketContractFactory = await ethers.getContractFactory(
    "NFTTicketingPlatform"
  );
  const ticketContract = await TicketContractFactory.deploy();
  await ticketContract.deployed();

  console.log("NFT Ticketing Contract deployed at:", ticketContract.address);

  // Setting up event parameters
  const eventName = "Web3 Live Summit";
  const ticketPrice = ethers.utils.parseEther("0.002"); // 0.002 ETH per ticket
  const maxTickets = 2;

  // Creating a new event
  const createTx = await ticketContract
    .connect(organizer)
    .createNewEvent(eventName, ticketPrice, maxTickets);
  await createTx.wait();
  console.log("Event created successfully:", eventName);

  // Buyer 1 purchases a ticket
  const tx1 = await ticketContract.connect(buyer1).purchaseTicket(0, "", {
    value: ticketPrice,
  });
  await tx1.wait();
  console.log("Buyer 1 purchased a ticket");

  // Buyer 2 purchases a ticket
  const tx2 = await ticketContract.connect(buyer2).purchaseTicket(0, "", {
    value: ticketPrice,
  });
  await tx2.wait();
  console.log("Buyer 2 purchased a ticket");

  // End ticket sales
  const closeSalesTx = await ticketContract
    .connect(organizer)
    .closeTicketSales(0);
  await closeSalesTx.wait();
  console.log("Ticket sales closed");

  // Withdraw earnings
  const beforeBalance = await ethers.provider.getBalance(organizer.address);
  const withdrawTx = await ticketContract
    .connect(organizer)
    .withdrawEarnings(0);
  await withdrawTx.wait();
  const afterBalance = await ethers.provider.getBalance(organizer.address);

  console.log("Organizer withdrew earnings");
  console.log(`Balance before: ${ethers.utils.formatEther(beforeBalance)} ETH`);
  console.log(`Balance after:  ${ethers.utils.formatEther(afterBalance)} ETH`);

  // Display ticket’s associated event
  const ticketEvent = await ticketContract.getTicketEventDetails(0);
  console.log(`Ticket 0 is for event: ${ticketEvent.eventName}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
