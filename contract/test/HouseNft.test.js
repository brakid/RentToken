const { accounts, contract } = require('@openzeppelin/test-environment');
const [ houseOwnerAddress ] = accounts;
const { expectRevert, constants } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const HouseNft = contract.fromArtifact('HouseNft');

describe('HouseNft', async () => {
  let houseNft;
  beforeEach(async () => {
    houseNft = await HouseNft.new();
  });

  it('should show the correct description', async () => {
    await houseNft.faucet(houseOwnerAddress, 1, "Some House");

    expect(await houseNft.getDescription(1)).to.be.equal("Some House");

    expect(await houseNft.ownerOf(1)).to.be.bignumber.equal(houseOwnerAddress);
  });

  it('should reject the faucet', async () => {
    await expectRevert(houseNft.faucet(houseOwnerAddress, 2, ""), "Expecting non-empty description");

    await expectRevert(houseNft.faucet(constants.ZERO_ADDRESS, 2, "Hello"), "ERC721: mint to the zero address");

    await houseNft.faucet(houseOwnerAddress, 1, "Some House");
    await expectRevert(houseNft.faucet(houseOwnerAddress, 1, "Some house"), "ERC721: token already minted");
  });
});