// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Match {
  address private _owner;
  struct MatchResult {
    string  player1;
    uint8   score1;
    string  player2;
    uint8   score2;
  }

  MatchResult last_result;

  event result_updated();

  constructor() {
    _owner = msg.sender;
  }

  function set_last_result(string calldata player1, uint8 score1, string calldata player2, uint8 score2) external {
    require(msg.sender == _owner, "You are not the owner of the contract");
    last_result.player1 = player1;
    last_result.score1 = score1;
    last_result.player2 = player2;
    last_result.score2 = score2;

    emit result_updated();
  }
}