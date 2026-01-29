// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "hardhat/console.sol";

contract Tournament {
    struct Match {
        uint32  player1;
        uint32  player2;
        uint8   player1_score;
        uint8   player2_score;
    }
    
    uint32           id;
    address         owner;
    string          winner;
    Match[]         matches;
    bool            finished;

    constructor(uint32 tournament_id, address factory_owner) {
        owner = factory_owner;
        finished = false;
        id = tournament_id;
    }

    function addMatch(uint32 player1, uint32 player2, uint8 score1, uint8 score2) public {
        console.log("owner:" , owner);
        console.log("sender:", msg.sender);
        require (owner == msg.sender, "wrong owner");
        // require (finished == false, "require error in addmatch");
        matches.push(Match(player1, player2, score1, score2));
    }
    function finish(string calldata tournament_winner) public {
        require(owner == msg.sender && finished == false, "require error in finish");
        winner = tournament_winner;
        finished = true;
    }
    function get_winner() public view returns (string memory) {
        return winner;
    }
    function get_matches() public view returns (Match[] memory) {
        return matches;
    }
}