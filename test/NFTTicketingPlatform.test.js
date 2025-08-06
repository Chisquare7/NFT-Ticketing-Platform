const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTTicketingPlatform", function () {
  async function deployTicketingFixture() {
    const [organizer, buyer1, buyer2, buyer3] = await ethers.getSigners();

    const TicketingPlatform = await ethers.getContractFactory(
      "NFTTicketingPlatform"
    );
    const ticketing = await TicketingPlatform.connect(organizer).deploy();
    await ticketing.waitForDeployment();

    const ticketPrice = ethers.utils.parseEther("0.05");

    return { ticketing, organizer, buyer1, buyer2, buyer3, ticketPrice };
  }

  it("Should deploy with correct name and symbol", async function () {
    const { ticketing } = await loadFixture(deployTicketingFixture);

    expect(await ticketing.name()).to.equal("EventTicket");
    expect(await ticketing.symbol()).to.equal("ETIX");
  });

  it("Should allow creating a new event", async function () {
    const { ticketing, ticketPrice } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent("DevCon", ticketPrice, 100);
    const event = await ticketing.allEvents(0);

    expect(event.eventName).to.equal("DevCon");
    expect(event.ticketPrice).to.equal(ticketPrice);
    expect(event.maxTicketCount).to.equal(100);
    expect(event.isTicketSaleActive).to.be.true;
  });

  it("Should allow purchasing a ticket", async function () {
    const { ticketing, ticketPrice, buyer1 } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent("HackFest", ticketPrice, 2);

    await ticketing
      .connect(buyer1)
      .purchaseTicket(0, "", { value: ticketPrice });

    expect(await ticketing.ownerOf(0)).to.equal(buyer1.address);
  });

  it("Should fail if incorrect ETH is sent", async function () {
    const { ticketing, buyer1 } = await loadFixture(deployTicketingFixture);

    await ticketing.createNewEvent(
      "Underpaid Event",
      ethers.utils.parseEther("1"),
      1
    );

    await expect(
      ticketing
        .connect(buyer1)
        .purchaseTicket(0, "", { value: ethers.utils.parseEther("0.5") })
    ).to.be.revertedWith("Incorrect ETH amount sent");
  });

  it("Should prevent overselling tickets", async function () {
    const { ticketing, ticketPrice, buyer1, buyer2, buyer3 } =
      await loadFixture(deployTicketingFixture);

    await ticketing.createNewEvent("Limited Event", ticketPrice, 2);

    await ticketing
      .connect(buyer1)
      .purchaseTicket(0, "", { value: ticketPrice });
    await ticketing
      .connect(buyer2)
      .purchaseTicket(0, "", { value: ticketPrice });

    await expect(
      ticketing.connect(buyer3).purchaseTicket(0, "", { value: ticketPrice })
    ).to.be.revertedWith("All tickets sold");
  });

  it("Should allow organizer to close ticket sales", async function () {
    const { ticketing, ticketPrice, organizer } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent("Closeable Event", ticketPrice, 1);
    await ticketing.connect(organizer).closeTicketSales(0);

    const event = await ticketing.allEvents(0);
    expect(event.isTicketSaleActive).to.be.false;
  });

  it("Should block non-organizer from closing ticket sales", async function () {
    const { ticketing, ticketPrice, buyer1 } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent("Only Organizer", ticketPrice, 1);

    await expect(
      ticketing.connect(buyer1).closeTicketSales(0)
    ).to.be.revertedWith("Only the event organizer can close sales");
  });

  it("Should allow organizer to withdraw funds", async function () {
    const { ticketing, ticketPrice, organizer, buyer1 } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent("Paid Entry", ticketPrice, 1);
    await ticketing
      .connect(buyer1)
      .purchaseTicket(0, "", { value: ticketPrice });

    const balanceBefore = await ethers.provider.getBalance(organizer.address);
    const withdrawTx = await ticketing.connect(organizer).withdrawEarnings(0);
    const receipt = await withdrawTx.wait();
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const balanceAfter = await ethers.provider.getBalance(organizer.address);

    expect(balanceAfter).to.be.above(balanceBefore.sub(gasUsed));
  });

  it("Should block non-organizers from withdrawing funds", async function () {
    const { ticketing, ticketPrice, buyer1, buyer2 } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent("Steal Attempt", ticketPrice, 1);
    await ticketing
      .connect(buyer1)
      .purchaseTicket(0, "", { value: ticketPrice });

    await expect(
      ticketing.connect(buyer2).withdrawEarnings(0)
    ).to.be.revertedWith("Unauthorized");
  });

  it("Should correctly map ticket to its event", async function () {
    const { ticketing, ticketPrice, buyer1 } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent("Mapped Event", ticketPrice, 1);
    await ticketing
      .connect(buyer1)
      .purchaseTicket(0, "", { value: ticketPrice });

    const ticketInfo = await ticketing.getTicketEventDetails(0);
    expect(ticketInfo.eventName).to.equal("Mapped Event");
  });

  it("Should return total events and ticket count", async function () {
    const { ticketing, ticketPrice, buyer1 } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent("Event A", ticketPrice, 1);
    await ticketing.createNewEvent("Event B", ticketPrice, 1);

    await ticketing
      .connect(buyer1)
      .purchaseTicket(0, "", { value: ticketPrice });
    await ticketing
      .connect(buyer1)
      .purchaseTicket(1, "", { value: ticketPrice });

    expect(await ticketing.getTotalEventCount()).to.equal(2);
    expect(await ticketing.getTotalTicketCount()).to.equal(2);
  });
});
