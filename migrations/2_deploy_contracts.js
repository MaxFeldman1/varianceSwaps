const token = artifacts.require("Token");
const bigMath = artifacts.require("BigMath");
const oracle = artifacts.require("oracle");
const varianceSwapHandler = artifacts.require("varianceSwapHandler");
const longVarianceToken = artifacts.require("longVarianceToken");
const shortVarianceToken = artifacts.require("shortVarianceToken");
const stakeHub = artifacts.require("stakeHub");
const factory = artifacts.require("UniswapV2Factory");
const router = artifacts.require("UniswapV2Router02");
const organizer = artifacts.require("organizer");

const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;

const phrase = "BTC/USD";

const kovanBtcUsdAggregatorAddress = "0x6135b13325bfC4B00278B4abC5e20bbce2D6580e";
const kovanEthUsdAggregatorAddress = "0x9326BFA02ADD2366b30bacB125260Af641031331";

const kovanBtcUsdOracleAddress = "0xB12d9b73597B4dB3C2e6FBCf20071fd846Cdc54f";
const kovanEthUsdOracleAddress = "0xEb15231CB6437dA9558A1a2f8CE3C552dE36FB87";

const kovanTokenAddress = "0xecF1bccb924E9BeFC24Ef7607618D41Ac8ec4e57";

const kovanUniswapFactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const kovanUniswapRouterV2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const kovanBigMathAddress = "0x54Ee4Eb03a7697600F1100814A949304887558B7";
const kovanOrganizerAddress = "0xac99f768eb53Bd32Bc4d830a64DaFEDc876A5f4d";


inflator0 = 4;
inflator1 = 3;
inflator2 = 2;

startTimestamp = "1593561600";
lengthOfPriceSeries = "184";


lastStakeTimestamp = "1609459200";
endStakingTimestamp = "1609977600";
destructionTimestamp = "1610582400";

module.exports = async function(deployer) {

  tokenInstance = await token.at(kovanTokenAddress);
  oracleInstance = await oracle.at(kovanEthUsdOracleAddress);
  factoryInstance = await factory.at(kovanUniswapFactoryAddress);
  routerInstance = await router.at(kovanUniswapRouterV2Address);
  organizerInstance = await organizer.at(kovanOrganizerAddress);
/*
  organizerInstance = await deployer.deploy(organizer, kovanBigMathAddress);

  subUnits = (new BN(10)).pow(new BN(18));
  payoutAtVarianceOf1 = subUnits.div(new BN(5)).toString();
  cap = subUnits.toString();
  await organizerInstance.deployVarianceInstance("ETH/USD", tokenInstance.address, kovanEthUsdOracleAddress,
  	startTimestamp, lengthOfPriceSeries, payoutAtVarianceOf1, cap);
  console.log('deployed variance contract');
  varianceSwapHandlerInstance = await varianceSwapHandler.at(await organizerInstance.varianceSwapInstances(0));
  longVarianceTokenInstance = await longVarianceToken.at(await varianceSwapHandlerInstance.longVarianceTokenAddress());
  shortVarianceTokenInstance = await shortVarianceToken.at(await varianceSwapHandlerInstance.shortVarianceTokenAddress());
  console.log('got instances');
  pair0 = await factoryInstance.createPair(tokenInstance.address, longVarianceTokenInstance.address);
  pair0 = pair0.receipt.logs[0].args.pair;
  pair1 = await factoryInstance.createPair(shortVarianceTokenInstance.address, longVarianceTokenInstance.address);
  pair1 = pair1.receipt.logs[0].args.pair;
  pair2 = await factoryInstance.createPair(shortVarianceTokenInstance.address, tokenInstance.address);
  pair2 = pair2.receipt.logs[0].args.pair;
  console.log('deployed uni pairs');

  stakeHubInstance = await deployer.deploy(stakeHub, tokenInstance.address, pair0, pair1, pair2,
  	inflator0, inflator1, inflator2, lastStakeTimestamp, endStakingTimestamp, destructionTimestamp);
  await organizerInstance.addStakeHub(0, stakeHubInstance.address)
  console.log('added stake hub');
  await varianceSwapHandlerInstance.setFee('50');
  console.log('fee has been set');
*/
}