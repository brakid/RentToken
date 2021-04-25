// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract Owned {
  address public immutable admin = msg.sender;

  modifier onlyAdmin {
    require(msg.sender == admin, 'Only the admin is allowed to call this operation');
    _;
  }
}