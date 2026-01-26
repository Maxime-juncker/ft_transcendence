// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

// import "hardhat/console.sol";

contract Tournament {
    struct Match {
        string  player1;
        string  player2;
        uint8   player1_score;
        uint8   player2_score;
    }
    
    uint256           id;
    address         owner;
    string          winner;
    Match[]         matches;
    bool            finished;

    constructor(uint256 tournament_id) {
        // console.log("New tournament contract deployed");
        owner = msg.sender;
        finished = false;
        id = tournament_id;
    }

    function addMatch(string calldata player1, string calldata player2, uint8 score1, uint8 score2) public {
        require (owner == msg.sender && finished == false);
        matches.push(Match(player1, player2, score1, score2));
    }
    function finish(string calldata tournament_winner) public {
        require(owner == msg.sender && finished == false);
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