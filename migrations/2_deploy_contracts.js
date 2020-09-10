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

//const kovanBtcUsdAggregatorAddress = "0x6135b13325bfC4B00278B4abC5e20bbce2D6580e";

const kovanBtcUsdOracleAddress = "0xB12d9b73597B4dB3C2e6FBCf20071fd846Cdc54f";
const kovanTokenAddress = "0xecF1bccb924E9BeFC24Ef7607618D41Ac8ec4e57";
const kovanBigMathAddress = "0xb6a2AB86bB89c6D7552EBf070A35B9662A6de5e9";
const kovanOrganizerAddress = "0xfd747A74EE96bb4C89E4CD3Ba3C2716c55b1f641";

const kovanUniswapFactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const kovanUniswapRouterV2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const stakeHubSept8_2020Address = "0x5205a69e68d30210587ee223480361020D4b5CF0";

inflator0 = 4;
inflator1 = 3;
inflator2 = 2;

lastStakeTimestamp = "1600560000";
endStakingTimestamp = "1600646400";
destructionTimestamp = "1600732800";

module.exports = async function(deployer) {

  tokenInstance = await token.at(kovanTokenAddress);
  bigMathInstance = await bigMath.at(kovanBigMathAddress);
  oracleInstance = await oracle.at(kovanBtcUsdOracleAddress);
  organizerInstance = await organizer.at(kovanOrganizerAddress);
  stakeHubInstance = await stakeHub.at(stakeHubSept8_2020Address);
  factoryInstance = await factory.at(kovanUniswapFactoryAddress);
  routerInstance = await router.at(kovanUniswapRouterV2Address);

  varianceSwapHandlerInstance = await varianceSwapHandler.at(await organizerInstance.varianceSwapInstances(0));
  longVarianceTokenInstance = await longVarianceToken.at(await varianceSwapHandlerInstance.longVarianceTokenAddress());
  shortVarianceTokenInstance = await shortVarianceToken.at(await varianceSwapHandlerInstance.shortVarianceTokenAddress());

}