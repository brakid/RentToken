const { accounts, contract } = require('@openzeppelin/test-environment');
const [ payerAddress, _ ] = accounts;
const { BN, expectEvent, constants } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const UsdcMock = contract.fromArtifact('UsdcMock');

describe('UsdcMock', async () => {
  let usdcMock;
  beforeEach(async () => {
    usdcMock = await UsdcMock.new();
  });

  it('should list the correct decimals', async () => {
    expect(await usdcMock.decimals()).to.be.bignumber.equal(new BN(6));
  });
  
  it('faucet should give tokens', async () => {
    const receipt = await usdcMock.faucet(payerAddress, 1);
    
    expectEvent(receipt, 'Transfer', {
      from: constants.ZERO_ADDRESS,
      to: payerAddress,
      value: new BN(1),
    });
    
    expect(await usdcMock.balanceOf(payerAddress)).to.be.bignumber.equal(new BN(1));
  });
});