// SPDX-License-Identifier: GPL-3.0

pragma solidity >= 0.8.2 <0.9.0;

contract coucouPerruche {
    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    function get_data() external view returns(address, uint256) {
        require(msg.sender == _owner, "Error : message sender must be owner");
        return (msg.sender, msg.sender.balance);
    } 
}