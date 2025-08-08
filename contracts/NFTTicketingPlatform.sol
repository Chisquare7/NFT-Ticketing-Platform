// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Each event issues unique NFT tickets. Users can purchase NFTs as event access tickets using a specified ER20 token.

contract NFTTicketingPlatform is ERC721, Ownable {
    // Custom counter variables
    uint256 private eventIdCounter = 0;
    uint256 private ticketIdCounter = 0;
   

    // this struct represents a single event
    struct EventDetails {
        string eventName;
        uint256 ticketPrice;
        uint256 maxTicketCount;
        uint256 ticketsSold;
        address payable eventOrganizer;
        bool isTicketSaleActive;
        IERC20 paymentToken;
    }

    // Mapping of event ID to its details
    mapping(uint256 => EventDetails) public allEvents;

    // Mapping of each ticket NFT ID to its associated event ID
    mapping(uint256 => uint256) public ticketToEventMapping;

    event EventCreated(
        uint256 indexed eventId,
        string eventName,
        uint256 ticketPrice,
        uint256 maxTicketCount,
        address indexed eventOrganizer,
        address paymentToken
    );

    event TicketPurchased(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed buyer
    );

    event TicketSalesClosed(uint256 indexed eventId);

    constructor() ERC721("EventTicket", "ETIX") {}

    // Function that allows any user to create an event and become its organizer
    function createNewEvent(
        string memory name,
        uint256 ticketCost,
        uint256 ticketLimit,
        address paymentTokenAddress
    ) external {
        require(ticketCost > 0, "Ticket price must be greater than zero");
        require(ticketLimit > 0, "Must offer at least one ticket");
        require(paymentTokenAddress != address(0), "Invalid token address");

        uint256 newEventId = eventIdCounter;

        allEvents[newEventId] = EventDetails({
            eventName: name,
            ticketPrice: ticketCost,
            maxTicketCount: ticketLimit,
            ticketsSold: 0,
            eventOrganizer: payable(msg.sender),
            isTicketSaleActive: true,
            paymentToken: IERC20(paymentTokenAddress)
        });

        emit EventCreated(
            newEventId,
            name,
            ticketCost,
            ticketLimit,
            msg.sender,
            paymentTokenAddress
        );

        eventIdCounter += 1;
    }

    // Function that allows a user to purchase a ticket (NFT) for a specific event

    function purchaseTicket(uint256 eventId) external payable {
        EventDetails storage currentEvent = allEvents[eventId];

        require(currentEvent.isTicketSaleActive, "Ticket sales have ended");
        require(currentEvent.ticketsSold < currentEvent.maxTicketCount, "All tickets sold");
        require(currentEvent.paymentToken.transferFrom(msg.sender, address(this), currentEvent.ticketPrice), "Token transfer failed");

        uint256 newTicketId = ticketIdCounter;

        _safeMint(msg.sender, newTicketId);

        ticketToEventMapping[newTicketId] = eventId;

        currentEvent.ticketsSold += 1;
        ticketIdCounter += 1;

        emit TicketPurchased(newTicketId, eventId, msg.sender);
    }


    // Function that allow Organizer to manually end ticket sales
    function closeTicketSales(uint256 eventId) external {
        EventDetails storage eventInfo = allEvents[eventId];
        require(msg.sender == eventInfo.eventOrganizer, "Only the event organizer can close sales");

        eventInfo.isTicketSaleActive = false;
        emit TicketSalesClosed(eventId);
    }

    // Function that allow Organizer can withdraw all funds earned from ticket sales
    function withdrawEarnings(uint256 eventId) external {
        EventDetails storage eventInfo = allEvents[eventId];
        require(msg.sender == eventInfo.eventOrganizer, "Unauthorized");

        uint256 earnings = eventInfo.ticketPrice * eventInfo.ticketsSold;

        eventInfo.ticketsSold = 0;    // Reset tickets sold to prevent re-withdrawal

        bool success = eventInfo.paymentToken.transfer(
            eventInfo.eventOrganizer,
            earnings
        );
        require(success, "Withdrawal failed");
    }

    // Read-only function that returns the number of events created so far
    function getTotalEventCount() external view returns (uint256) {
        return eventIdCounter;
    }

    // Read-only function that returns the number of tickets (NFTs) issued so far
    function getTotalTicketCount() external view returns (uint256) {
        return ticketIdCounter;
    }

    // Read-only returns metadata about a ticket by its tokenId
    function getTicketEventDetails(uint256 ticketId) external view returns (EventDetails memory) {
        uint256 eventId = ticketToEventMapping[ticketId];
        return allEvents[eventId];
    }
}