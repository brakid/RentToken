const { accounts, contract } = require('@openzeppelin/test-environment');
const [ houseOwnerAddress, renterAddress, otherAddress, _ ] = accounts;
const { BN, expectEvent, constants, expectRevert, time } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const HouseNft = contract.fromArtifact('HouseNft');
const UsdcMock = contract.fromArtifact('UsdcMock');
const RentToken = contract.fromArtifact('RentToken');

describe('RentToken', async () => {
  let usdcMock;
  let houseNft;
  let rentToken;
  beforeEach(async () => {
    usdcMock = await UsdcMock.new();

    await usdcMock.faucet(renterAddress, 100 * 100**6);

    houseNft = await HouseNft.new();

    await houseNft.faucet(houseOwnerAddress, 1);

    rentToken = await RentToken.new(1, houseNft.address, renterAddress, 100 * 10**6, usdcMock.address, { from: houseOwnerAddress });

    await houseNft.approve(rentToken.address, 1, { from: houseOwnerAddress });
  });

  it('should return the correct decimals', async () => {
    expect(await rentToken.decimals()).to.be.bignumber.equal(new BN(0));
  });

  it('should return the correct id', async () => {
    expect(await rentToken.getId()).to.be.bignumber.equal(new BN(1));
  });

  it('should return the HouseNft address', async () => {
    expect(await rentToken.getHouseNftAddress()).to.be.equal(houseNft.address);
  });

  it('should return the UsdcMock address', async () => {
    expect(await rentToken.getUsdcAddress()).to.be.equal(usdcMock.address);
  });

  it('should return the renter address', async () => {
    expect(await rentToken.getRenter()).to.be.equal(renterAddress);
  });

  it('should initialize the RentToken', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });

    expect(await houseNft.ownerOf(1)).to.be.equal(rentToken.address);
    expect(await rentToken.balanceOf(houseOwnerAddress)).to.be.bignumber.equal(new BN(100));
  });

  it('should return the rent amount due', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    expect(await rentToken.getRentAmountDue()).to.be.bignumber.equal(new BN(100 * 10**6));
  });

  it('should return the rent amount due without fee (29 days)', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    
    await time.increaseTo((await time.latest()).add(time.duration.days(29)));
    await time.advanceBlock();

    expect(await rentToken.getRentAmountDue()).to.be.bignumber.equal(new BN(100 * 10**6));
  });

  it('should return the rent amount due with fee (1 days)', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    
    await time.increaseTo((await time.latest()).add(time.duration.days(31)));
    await time.advanceBlock();

    expect(await rentToken.getRentAmountDue()).to.be.bignumber.equal(new BN(105 * 10**6));
  });

  it('should return the rent amount due with fee (2 days)', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    
    await time.increaseTo((await time.latest()).add(time.duration.days(32)));
    await time.advanceBlock();

    expect(await rentToken.getRentAmountDue()).to.be.bignumber.equal(new BN(110 * 10**6));
  });

  it('should return the rent due timestamp', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    expect(await rentToken.getRentDueTimestamp()).to.be.bignumber.greaterThan(new BN(0));
  });

  it('should pay the rent (single owner)', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    const oldRentDueTimestamp = await rentToken.getRentDueTimestamp();

    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(0));

    await usdcMock.increaseAllowance(rentToken.address, 100 * 10**6, { from: renterAddress });

    const receipt = await rentToken.pay({ from: renterAddress });
    
    expectEvent(
      receipt, 
      'RentPaid', 
      {
        renter: renterAddress,
        rentAmountPaid: new BN(100 * 10**6),
      }
    );
    expect(await rentToken.getRentDueTimestamp()).to.be.bignumber.greaterThan(oldRentDueTimestamp);
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    await rentToken.claim({ from: houseOwnerAddress });
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(0));
    expect(await usdcMock.balanceOf(houseOwnerAddress)).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));
  });

  it('should pay the rent (two owners)', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    await rentToken.transfer(otherAddress, 1, { from: houseOwnerAddress });

    const oldRentDueTimestamp = await rentToken.getRentDueTimestamp();

    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(0));

    await usdcMock.increaseAllowance(rentToken.address, 100 * 10**6, { from: renterAddress });

    const receipt = await rentToken.pay({ from: renterAddress });
    
    expectEvent(
      receipt, 
      'RentPaid', 
      {
        renter: renterAddress,
        rentAmountPaid: new BN(100 * 10**6),
      }
    );
    
    expect(await rentToken.getRentDueTimestamp()).to.be.bignumber.greaterThan(oldRentDueTimestamp);
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(99 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(1 * 10**6));

    await rentToken.claim({ from: houseOwnerAddress });
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(1 * 10**6));
    expect(await usdcMock.balanceOf(houseOwnerAddress)).to.be.bignumber.equal(new BN(99 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(1 * 10**6));
  });

  it('should pay the rent (change owner after)', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    const oldRentDueTimestamp = await rentToken.getRentDueTimestamp();

    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(0));

    await usdcMock.increaseAllowance(rentToken.address, 100 * 10**6, { from: renterAddress });

    const receipt = await rentToken.pay({ from: renterAddress });
    
    expectEvent(
      receipt, 
      'RentPaid', 
      {
        renter: renterAddress,
        rentAmountPaid: new BN(100 * 10**6),
      }
    );
    expect(await rentToken.getRentDueTimestamp()).to.be.bignumber.greaterThan(oldRentDueTimestamp);
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    await rentToken.transfer(otherAddress, 100, { from: houseOwnerAddress });

    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    await rentToken.claim({ from: houseOwnerAddress });
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(0));
    expect(await usdcMock.balanceOf(houseOwnerAddress)).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));
  });

  it('should pay the rent (change owner before)', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    await rentToken.transfer(otherAddress, 100, { from: houseOwnerAddress });
    
    const oldRentDueTimestamp = await rentToken.getRentDueTimestamp();

    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(0));

    await usdcMock.increaseAllowance(rentToken.address, 100 * 10**6, { from: renterAddress });

    const receipt = await rentToken.pay({ from: renterAddress });
    
    expectEvent(
      receipt, 
      'RentPaid', 
      {
        renter: renterAddress,
        rentAmountPaid: new BN(100 * 10**6),
      }
    );
    
    expect(await rentToken.getRentDueTimestamp()).to.be.bignumber.greaterThan(oldRentDueTimestamp);
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(100 * 10**6));
  });

  it('should pay the rent (change owner in between)', async () => {
    await rentToken.initialize({ from: houseOwnerAddress });
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(0 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    const oldRentDueTimestamp = await rentToken.getRentDueTimestamp();

    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(0));

    await usdcMock.faucet(renterAddress, 100 * 100**6);
    await usdcMock.increaseAllowance(rentToken.address, 200 * 10**6, { from: renterAddress });

    const receipt = await rentToken.pay({ from: renterAddress });
    
    expectEvent(
      receipt, 
      'RentPaid', 
      {
        renter: renterAddress,
        rentAmountPaid: new BN(100 * 10**6),
      }
    );
    
    expect(await rentToken.getRentDueTimestamp()).to.be.bignumber.greaterThan(oldRentDueTimestamp);
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(0));

    await rentToken.transfer(otherAddress, 100, { from: houseOwnerAddress });

    const receipt2 = await rentToken.pay({ from: renterAddress });
    
    expectEvent(
      receipt2, 
      'RentPaid', 
      {
        renter: renterAddress,
        rentAmountPaid: new BN(100 * 10**6),
      }
    );
    
    expect(await rentToken.getRentDueTimestamp()).to.be.bignumber.greaterThan(oldRentDueTimestamp);
    expect(await usdcMock.balanceOf(rentToken.address)).to.be.bignumber.equal(new BN(200 * 10**6));
    expect(await rentToken.showUnclaimed({ from: houseOwnerAddress })).to.be.bignumber.equal(new BN(100 * 10**6));
    expect(await rentToken.showUnclaimed({ from: otherAddress })).to.be.bignumber.equal(new BN(100 * 10**6));
  });
});