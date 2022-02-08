// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH is ERC20 {
    constructor(uint256 totalSupply) public ERC20("Wrapped ETH", "WETH") {
        _mint(msg.sender, totalSupply * 10**uint(decimals()));
    }
}