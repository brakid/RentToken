// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Owned.sol";

contract HouseNft is ERC721, Owned {
  constructor() ERC721('HouseNft', 'HNFT') {}

  function faucet(address to, uint id) onlyAdmin external {
    _mint(to, id);
  }
}