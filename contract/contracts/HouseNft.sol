// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Owned.sol";

contract HouseNft is ERC721, Owned {
  mapping(uint => string) private descriptions;

  constructor() ERC721('HouseNft', 'HNFT') {}

  function faucet(address to, uint id, string memory description) onlyAdmin external {
    require(bytes(description).length > 0, "Expecting non-empty description");
    require(bytes(description).length <= 512, "Maximal 512 characters long");
    //require(to != address(0), "Expecting non-empty address");
    _safeMint(to, id);
    descriptions[id] = description;
  }

  function getDescription(uint id) external view returns (string memory) {
    return descriptions[id];
  }
}