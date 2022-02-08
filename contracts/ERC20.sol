// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WERC20 is ERC20 {
    constructor(uint256 totalSupply, string memory name, string memory symbol) public ERC20(name, symbol) {
        _mint(msg.sender, totalSupply * 10**uint(decimals()));
    }
}