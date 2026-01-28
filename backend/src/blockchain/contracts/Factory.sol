// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "./Tournament.sol";

contract Factory {
    address         owner;
    Tournament[]    tournaments;
    uint32         count;


    constructor() {
        owner = msg.sender;
        count = 0;
    }
    function createTournament() public returns (uint32) {
        require (owner == msg.sender);
        Tournament tournament = new Tournament(count);
        tournaments.push(tournament);
        return (count++);
    }
    function getTournament(uint8 id) public view returns (Tournament) {
        return (tournaments[id]);
    }
    function getAllTournaments() public view returns (Tournament[] memory) {
        return (tournaments);
    }
}