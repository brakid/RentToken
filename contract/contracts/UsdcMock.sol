// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UsdcMock is ERC20 {
  constructor() ERC20('USDC StableCoin', 'USDC') {}

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function faucet(address to, uint amount) external {
    _mint(to, amount);
  }
}