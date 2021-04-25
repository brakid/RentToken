const UsdcMock = artifacts.require('UsdcMock.sol');
const CasinoToken = artifacts.require('CasinoToken.sol');
const RandomNumberOracle = artifacts.require('RandomNumberOracle.sol');
const Casino = artifacts.require('Casino.sol');

module.exports = async (deployer, network, addresses) => {
  const [casinoAdmin, randomAdmin, player1, player2, _] = addresses;

  const randomSeed = Math.round(Math.random() * 1000000);

  if (network === 'development' || network == 'develop') {
    await deployer.deploy(UsdcMock);
    const usdcMock = await UsdcMock.deployed();
    await usdcMock.faucet(casinoAdmin, 1000 * 10**6);
    await usdcMock.faucet(player1, 1000 * 10**6);
    await usdcMock.faucet(player2, 1000 * 10**6);

    await deployer.deploy(CasinoToken, usdcMock.address, 2, 1);
    const casinoToken = await CasinoToken.deployed();
    
    await deployer.deploy(RandomNumberOracle, randomSeed, { from: randomAdmin });
    const randomNumberGenerator = await RandomNumberOracle.deployed();

    await deployer.deploy(Casino, casinoToken.address, randomNumberGenerator.address, 2, 50, 100, { from: casinoAdmin });
    const casino = await Casino.deployed();
    
    await usdcMock.approve(casinoToken.address, 250 * 10**6, { from: casinoAdmin }); // Casino buy in
    await casinoToken.mint(500, { from: casinoAdmin });
    await casinoToken.transfer(casino.address, 500, { from: casinoAdmin });

    console.log('Casino balance: ' + await casino.getCasinoBalance()); // should be 450 CAS
  } else {
    const CASINO_ADMIN_ADDRESS = '';
    const RANDOM_ADMIN_ADDRESS = '';
    const USDC_ADDRESS = '';
    
    await deployer.deploy(CasinoToken, USDC_ADDRESS, 2, 1);
    const casinoToken = await CasinoToken.deployed();
    
    await deployer.deploy(RandomNumberOracle, randomSeed, { from: RANDOM_ADMIN_ADDRESS });
    const randomNumberGenerator = await RandomNumberOracle.deployed();
    
    await deployer.deploy(Casino, casinoToken.address, randomNumberGenerator.address, 2, 50, 100, { from: CASINO_ADMIN_ADDRESS });
    const casino = await Casino.deployed();
  }
};