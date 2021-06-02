// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Owned.sol";

contract RentToken is ERC20, ERC721Holder, Owned {
  bool private isInitialized = false;
  uint256 private immutable houseNftId;
  IERC721 private houseNft;

  address private immutable renter;
  uint256 private immutable rentAmount;
  IERC20 private immutable usdc;

  uint256 private dueTimestamp;
  address[] private holders;
  mapping(address => uint256) private unclaimedBalances;

  uint256 constant FEE_PER_DUE_DAY = 5 * 10**6; // 5 USDC per day
  uint256 constant SECONDS_PER_DAY = 86400;

  event RentPaid(
    uint256 timestamp,
    address indexed renter,
    uint256 rentAmountPaid,
    uint256 nextDueTimestamp
  );

  event RentClaimed(
    uint256 timestamp,
    address indexed claimer,
    uint256 amount
  );

  constructor(uint256 _houseNftId, address _houseNftAddress, address _renter, uint256 _rentAmount, address _usdcAddress) ERC20("RentToken", "RNT") {
    houseNftId = _houseNftId;
    renter = _renter;
    rentAmount = _rentAmount;
    houseNft = IERC721(_houseNftAddress);
    usdc = IERC20(_usdcAddress);
  }

  function initialize() external onlyAdmin {
    require(!isInitialized, "Already initialized");
    houseNft.safeTransferFrom(msg.sender, address(this), houseNftId);
    dueTimestamp = block.timestamp + 30 days;
    _mint(msg.sender, 100);
    isInitialized = true;
  }

  function decimals() public pure override returns (uint8) {
    return 0;
  }

  function getHouseNftId() external view returns (uint256) {
    return houseNftId;
  }

  function getHouseNftAddress() external view returns (address) {
    return address(houseNft);
  }

  function getRenter() external view returns (address) {
    return renter;
  }

  function getRentDueTimestamp() external view returns (uint256) {
    require(isInitialized, "Not initialized");
    return dueTimestamp;
  }

  function getRentAmountDue() public view returns (uint256) {
    require(isInitialized, "Not initialized");
    uint256 rentDue = rentAmount;
    if (block.timestamp > dueTimestamp) {
      uint256 daysDue =
        SafeMath.div((block.timestamp - dueTimestamp), SECONDS_PER_DAY);
      rentDue += SafeMath.mul(daysDue, FEE_PER_DUE_DAY);
    }
    return rentDue;
  }

  function getUsdcAddress() external view returns (address) {
    return address(usdc);
  }

  function pay() external {
    require(isInitialized, "Not initialized");
    require(msg.sender == renter, "Renter only is allowed to call");
    uint256 rentDue = getRentAmountDue();
    require(usdc.balanceOf(msg.sender) >= rentDue, "Balance not large enough");
    require(usdc.allowance(msg.sender, address(this)) >= rentDue, "Allowance not large enough");

    uint256 baseDate = block.timestamp > dueTimestamp ? block.timestamp : dueTimestamp;
    dueTimestamp = baseDate + 30 days;

    usdc.transferFrom(msg.sender, address(this), rentDue); //lock in contract

    for (uint256 index = 0; index < holders.length; index++) {
      address holder = holders[index];
      require(balanceOf(holder) > 0, "Holder array is not up to date");
      uint256 balance = balanceOf(holder);
      uint256 rentClaim =
        SafeMath.div(SafeMath.mul(rentDue, balance), totalSupply());
      unclaimedBalances[holder] += rentClaim;
    }

    emit RentPaid(block.timestamp, renter, rentDue, dueTimestamp);
  }

  function claim() external {
    require(isInitialized, "Not initialized");
    require(unclaimedBalances[msg.sender] > 0, "No unclaimed rent");
    uint256 claimAmount = unclaimedBalances[msg.sender];
    unclaimedBalances[msg.sender] = 0;
    usdc.transfer(msg.sender, claimAmount);

    emit RentClaimed(block.timestamp, msg.sender, claimAmount);
  }

  function showUnclaimed() external view returns (uint256) {
    require(isInitialized, "Not initialized");
    return unclaimedBalances[msg.sender];
  }

  function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
    if (balanceOf(from) == amount && from != address(0)) {
      // not minting and sender has no balance left afterwards
      (bool foundFrom, uint256 index) = findIndex(from);
      require(foundFrom, "Expecting holder to be present");
      deleteIndex(index);
    }

    if (to != address(0)) {
      // not burning
      (bool foundTo, ) = findIndex(to);
      if (!foundTo) {
        holders.push(to);
      }
    }
  }

  function findIndex(address holder) internal view returns (bool, uint256) {
    for (uint256 index = 0; index < holders.length; index++) {
      if (holder == holders[index]) {
        return (true, index);
      }
    }
    return (false, 0);
  }

  function deleteIndex(uint256 index) internal {
    if (index != holders.length - 1) {
      address lastHolder = holders[holders.length - 1];
      holders[index] = lastHolder;
    }
    holders.pop();
  }
}
