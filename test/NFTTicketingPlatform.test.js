const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTTicketingPlatform", function () {
  async function deployTicketingFixture() {
    const [organizer, buyer1, buyer2, buyer3] = await ethers.getSigners();

    // Deploy Mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const paymentToken = await MockToken.deploy(
      "MockToken",
      "MTK",
      ethers.parseEther("1000000")
    );
    await paymentToken.waitForDeployment();

    // Deploy Ticketing contract
    const TicketingPlatform = await ethers.getContractFactory(
      "NFTTicketingPlatform"
    );
    const ticketing = await TicketingPlatform.connect(organizer).deploy();
    await ticketing.waitForDeployment();

    const ticketPrice = ethers.parseEther("0.05");

    // Fund buyers with ERC20 tokens
    await paymentToken.transfer(buyer1.address, ethers.parseEther("10"));
    await paymentToken.transfer(buyer2.address, ethers.parseEther("10"));
    await paymentToken.transfer(buyer3.address, ethers.parseEther("10"));

    return {
      ticketing,
      paymentToken,
      organizer,
      buyer1,
      buyer2,
      buyer3,
      ticketPrice,
    };
  }

  it("Should deploy with correct name and symbol", async function () {
    const { ticketing } = await loadFixture(deployTicketingFixture);

    expect(await ticketing.name()).to.equal("EventTicket");
    expect(await ticketing.symbol()).to.equal("ETIX");
  });

  it("Should allow creating a new event", async function () {
    const { ticketing, ticketPrice, paymentToken } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent(
      "DevCon",
      ticketPrice,
      100,
      await paymentToken.getAddress()
    );
    const event = await ticketing.allEvents(0);

    expect(event.eventName).to.equal("DevCon");
    expect(event.ticketPrice).to.equal(ticketPrice);
    expect(event.maxTicketCount).to.equal(100);
    expect(event.isTicketSaleActive).to.be.true;
  });

  it("Should allow purchasing a ticket", async function () {
    const { ticketing, ticketPrice, paymentToken, buyer1 } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent(
      "HackFest",
      ticketPrice,
      2,
      await paymentToken.getAddress()
    );

    await paymentToken
      .connect(buyer1)
      .approve(await ticketing.getAddress(), ticketPrice);
    await ticketing.connect(buyer1).purchaseTicket(0);

    expect(await ticketing.ownerOf(0)).to.equal(buyer1.address);
  });

  it("Should fail if not enough ERC20 allowance", async function () {
    const { ticketing, ticketPrice, buyer1, paymentToken } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent(
      "Underpaid Event",
      ticketPrice,
      1,
      await paymentToken.getAddress()
    );

    await expect(
      ticketing.connect(buyer1).purchaseTicket(0)
    ).to.be.revertedWith("ERC20: insufficient allowance");
  });

  it("Should prevent overselling tickets", async function () {
    const { ticketing, ticketPrice, buyer1, buyer2, buyer3, paymentToken } =
      await loadFixture(deployTicketingFixture);

    await ticketing.createNewEvent(
      "Limited Event",
      ticketPrice,
      2,
      await paymentToken.getAddress()
    );

    await paymentToken
      .connect(buyer1)
      .approve(await ticketing.getAddress(), ticketPrice);
    await ticketing.connect(buyer1).purchaseTicket(0);

    await paymentToken
      .connect(buyer2)
      .approve(await ticketing.getAddress(), ticketPrice);
    await ticketing.connect(buyer2).purchaseTicket(0);

    await paymentToken
      .connect(buyer3)
      .approve(await ticketing.getAddress(), ticketPrice);
    await expect(
      ticketing.connect(buyer3).purchaseTicket(0)
    ).to.be.revertedWith("All tickets sold");
  });

  it("Should allow organizer to close ticket sales", async function () {
    const { ticketing, ticketPrice, organizer, paymentToken } =
      await loadFixture(deployTicketingFixture);

    await ticketing.createNewEvent(
      "Closeable Event",
      ticketPrice,
      1,
      await paymentToken.getAddress()
    );
    await ticketing.connect(organizer).closeTicketSales(0);

    const event = await ticketing.allEvents(0);
    expect(event.isTicketSaleActive).to.be.false;
  });

  it("Should block non-organizer from closing ticket sales", async function () {
    const { ticketing, ticketPrice, buyer1, paymentToken } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent(
      "Only Organizer",
      ticketPrice,
      1,
      await paymentToken.getAddress()
    );

    await expect(
      ticketing.connect(buyer1).closeTicketSales(0)
    ).to.be.revertedWith("Only the event organizer can close sales");
  });

  it("Should allow organizer to withdraw ERC20 funds", async function () {
    const { ticketing, ticketPrice, organizer, buyer1, paymentToken } =
      await loadFixture(deployTicketingFixture);

    await ticketing.createNewEvent(
      "Paid Entry",
      ticketPrice,
      1,
      await paymentToken.getAddress()
    );

    await paymentToken
      .connect(buyer1)
      .approve(await ticketing.getAddress(), ticketPrice);
    await ticketing.connect(buyer1).purchaseTicket(0);

    const balanceBefore = await paymentToken.balanceOf(organizer.address);
    await ticketing.connect(organizer).withdrawEarnings(0);
    const balanceAfter = await paymentToken.balanceOf(organizer.address);

    expect(balanceAfter).to.equal(balanceBefore + ticketPrice);
  });

  it("Should block non-organizers from withdrawing funds", async function () {
    const { ticketing, ticketPrice, buyer1, buyer2, paymentToken } =
      await loadFixture(deployTicketingFixture);

    await ticketing.createNewEvent(
      "Steal Attempt",
      ticketPrice,
      1,
      await paymentToken.getAddress()
    );

    await paymentToken
      .connect(buyer1)
      .approve(await ticketing.getAddress(), ticketPrice);
    await ticketing.connect(buyer1).purchaseTicket(0);

    await expect(
      ticketing.connect(buyer2).withdrawEarnings(0)
    ).to.be.revertedWith("Unauthorized");
  });

  it("Should correctly map ticket to its event", async function () {
    const { ticketing, ticketPrice, buyer1, paymentToken } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent(
      "Mapped Event",
      ticketPrice,
      1,
      await paymentToken.getAddress()
    );

    await paymentToken
      .connect(buyer1)
      .approve(await ticketing.getAddress(), ticketPrice);
    await ticketing.connect(buyer1).purchaseTicket(0);

    const ticketInfo = await ticketing.getTicketEventDetails(0);
    expect(ticketInfo.eventName).to.equal("Mapped Event");
  });

  it("Should return total events and ticket count", async function () {
    const { ticketing, ticketPrice, buyer1, paymentToken } = await loadFixture(
      deployTicketingFixture
    );

    await ticketing.createNewEvent(
      "Event A",
      ticketPrice,
      1,
      await paymentToken.getAddress()
    );
    await ticketing.createNewEvent(
      "Event B",
      ticketPrice,
      1,
      await paymentToken.getAddress()
    );

    await paymentToken
      .connect(buyer1)
      .approve(await ticketing.getAddress(), ticketPrice * 2n);
    await ticketing.connect(buyer1).purchaseTicket(0);
    await ticketing.connect(buyer1).purchaseTicket(1);

    expect(await ticketing.getTotalEventCount()).to.equal(2);
    expect(await ticketing.getTotalTicketCount()).to.equal(2);
  });
});
