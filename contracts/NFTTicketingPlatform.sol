// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// Each event issues unique NFT tickets. Users can purchase NFTs as event access tickets.

contract NFTTicketingPlatform is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    // Counter for total number of events created
    Counters.Counter private eventCounter;

    // Counter for total number of tickets (NFTs) issued
    Counters.Counter private ticketCounter;

    // this struct represents a single event
    struct EventDetails {
        string eventName;
        uint256 ticketPrice;
        uint256 maxTicketCount;
        uint256 ticketsSold;
        address payable eventOrganizer;
        bool isTicketSaleActive;
    }

    // Mapping of event ID to its details
    mapping(uint256 => EventDetails) public allEvents;

    // Mapping of each ticket NFT ID to its associated event ID
    mapping(uint256 => uint256) public ticketToEventMapping;

    constructor() ERC721("EventTicket", "ETIX") {};

    // Function that allows any user to create an event and become its organizer
    function createNewEvent(
        string memory name,
        uint256 ticketCost,
        uint256 ticketLimit
    ) external {
        require(ticketCost > 0, "Ticket price must be greater than zero");
        require(ticketLimit > 0, "Must offer at least one ticket");

        uint256 newEventId = eventCounter.current();

        allEvents[newEventId] = EventDetails({
            eventName: name,
            ticketPrice: ticketCost,
            maxTicketCount: ticketLimit,
            ticketsSold: 0,
            eventOrganizer: payable(msg.sender),
            isTicketSaleActive: true
        });

        eventCounter.increment();
    }

    // Function that allows a user to purchase a ticket (NFT) for a specific event

    function purchaseTicket(
        uint256 eventId,
        string memory metadataURI
    ) external payable {
        EventDetails storage currentEvent = allEvents[eventId];

        require(currentEvent.isTicketSaleActive, "Ticket sales have ended");
        require(currentEvent.ticketsSold < currentEvent.maxTicketCount, "All tickets sold");
        require(msg.value == currentEvent.ticketPrice, "Incorrect ETH amount sent");

        uint256 newTicketId = ticketCounter.current();

        _safeMint(msg.sender, newTicketId);
        _setTokenURI(newTicketId, metadataURI);

        ticketToEventMapping[newTicketId] = eventId;

        currentEvent.ticketsSold += 1;
        ticketCounter.increment();
    }


    // Function that allow Organizer to manually end ticket sales
    function closeTicketSales(uint256 eventId) external {
        EventDetails storage eventInfo = allEvents[eventId];
        require(msg.sender == eventInfo.eventOrganizer, "Only the event organizer can close sales");

        eventInfo.isTicketSaleActive = false;
    }

    // Function that allow Organizer can withdraw all funds earned from ticket sales
    function withdrawEarnings(uint256 eventId) external {
        EventDetails storage eventInfo = allEvents[eventId];
        require(msg.sender == eventInfo.eventOrganizer, "Unauthorized");

        uint256 earnings = eventInfo.ticketPrice * eventInfo.ticketsSold;

        eventInfo.ticketsSold = 0;    // Reset tickets sold to prevent re-withdrawal

        (bool success, ) = eventInfo.eventOrganizer.call{value: earnings}("");
        require(success, "Withdrawal failed");
    }

    // Read-only function that returns the number of events created so far
    function getTotalEventCount() external view returns (uint256) {
        return eventCounter.current();
    }

    // Read-only function that returns the number of tickets (NFTs) issued so far
    function getTotalTicketCount() external view returns (uint256) {
        return ticketCounter.current();
    }

    // Read-only returns metadata about a ticket by its tokenId
    function getTicketEventDetails(uint256 ticketId) external view returns (EventDetails memory) {
        uint256 eventId = ticketToEventMapping[ticketId];
        return allEvents[eventId];
    }
}