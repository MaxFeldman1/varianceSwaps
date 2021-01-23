const token = artifacts.require("Token");
const bigMath = artifacts.require("BigMath");
const factory = artifacts.require("UniswapV2Factory");
const router = artifacts.require("UniswapV2Router02");
const varianceSwapHandler = artifacts.require("varianceSwapHandler");
const longVarianceToken = artifacts.require("longVarianceToken");
const shortVarianceToken = artifacts.require("shortVarianceToken");
const stakeHub = artifacts.require("stakeHub");
const organizer = artifacts.require("organizer");
const deployERC20Tokens = artifacts.require("deployERC20Tokens");
const deployStakeHub = artifacts.require("deployStakeHub");
const oracleContainer = artifacts.require("OracleContainer");
const baseAggregator = artifacts.require("dummyAggregator");
const aggregatorFacade = artifacts.require("dummyAggregatorFacade");
const lendingPool = artifacts.require("DummyLendingPool");

const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;

const _feb12021 = "1612137600";

const kovanETHUSDAggregatorFacadeAddr = "0x9326BFA02ADD2366b30bacB125260Af641031331";

module.exports = async function(deployer) {

  tokenInstance = await deployer.deploy(token);
  tokenInstance = await deployer.deploy(token);

  lendingPoolInstance = await deployer.deploy(lendingPool);

  factoryInstance = await deployer.deploy(factory, defaultAddress);
  routerInstance = await deployer.deploy(router, factoryInstance.address,
    /*This param does not impact functionality of this project*/defaultAddress);

  phrase = "ETH/USD";

  baseAggregatorInstance = await baseAggregator.new(3);
  aggregatorFacadeInstance = await aggregatorFacade.new(baseAggregatorInstance.address, phrase);
  oracleContainerInstance = await oracleContainer.new();

  await oracleContainerInstance.addAggregators([aggregatorFacadeInstance.address]);
  await oracleContainerInstance.deploy(phrase);

  tokenDeployerInstance = await deployer.deploy(deployERC20Tokens);
  stakeHubDeployerInstance = await deployer.deploy(deployStakeHub);

  asset1 = await deployer.deploy(token);
  asset2 = await deployer.deploy(token);

  bigMathInstance = await deployer.deploy(bigMath);
  payoutAtVariance1 = (new BN(10)).pow(await tokenInstance.decimals()).toString();
  cap = payoutAtVariance1.substring(0, payoutAtVariance1.length-1);

  organizerInstance = await deployer.deploy(organizer, bigMathInstance.address, oracleContainerInstance.address,
    tokenDeployerInstance.address, stakeHubDeployerInstance.address, lendingPoolInstance.address);
  await organizerInstance.deployVarianceInstance(phrase, tokenInstance.address,
    _feb12021, "30", payoutAtVariance1, cap);
  varianceSwapHandlerInstance = await varianceSwapHandler.at(await organizerInstance.varianceSwapInstances(0));
  longVarianceTokenInstance = await longVarianceToken.at(await varianceSwapHandlerInstance.longVarianceTokenAddress());
  shortVarianceTokenInstance = await shortVarianceToken.at(await varianceSwapHandlerInstance.shortVarianceTokenAddress());
  pair0 = await factoryInstance.createPair(tokenInstance.address, longVarianceTokenInstance.address);
  pair0 = pair0.receipt.logs[0].args.pair;
  pair1 = await factoryInstance.createPair(shortVarianceTokenInstance.address, longVarianceTokenInstance.address);
  pair1 = pair1.receipt.logs[0].args.pair;
  pair2 = await factoryInstance.createPair(shortVarianceTokenInstance.address, tokenInstance.address);
  pair2 = pair2.receipt.logs[0].args.pair;
  inflator0 = 4;
  inflator1 = 3;
  inflator2 = 2;
  lastStakeTimestamp = 3000000000;
  endStakingTimestamp = 3000010000;
  destructionTimestamp = 3000020000;
  await organizerInstance.addStakeHub(0, pair0, pair1, pair2, inflator0, inflator1, inflator2);
}
