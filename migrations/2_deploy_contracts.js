const AToken = artifacts.require("DummyAToken");
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
const ILendingPool = artifacts.require("ILendingPool");

const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;

const _feb12021 = "1612137600";

const kovanETHUSDAggregatorFacadeAddr = "0x9326BFA02ADD2366b30bacB125260Af641031331";

const kovanUniswapFactoryAddr = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const kovanUniswapRouter02Addr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const kovanAaveLendingPoolAddr = "0x9FE532197ad76c5a68961439604C037EB79681F0";
const kovanAaveAUSDCAddr = "0xe12AFeC5aa12Cf614678f9bFeeB98cA9Bb95b5B0";

const kovanOracleContainerAddr = "0xA43617A5d4Ef97fF9D989e6788ca31304C54Cb1D";
const kovanDeployERC20TokensAddr = "0x4B5f6dBE5f610B286AdA2a59b044b92944Cc00B7";
const kovanDeployStakeHubAddr = "0x311b328542EA500F56993589A7E257c32a15dc90";
const kovanBigMathAddr = "0xA83D65bcc94762Eeee2a1433Da518bc6340ee1B4";
const kovanOrganizerAddr = "0x163Ea98618570Ed4ca50C3427e322300c2706e52";


module.exports = async function(deployer) {
  /*
  tokenInstance = await AToken.at(kovanAaveAUSDCAddr);

  lendingPoolInstance = await ILendingPool.at(kovanAaveLendingPoolAddr);

  factoryInstance = await factory.at(kovanUniswapFactoryAddr);
  routerInstance = await router.at(kovanUniswapRouter02Addr);

  phrase = "ETH / USD";

  aggregatorFacadeInstance = await aggregatorFacade.at(kovanETHUSDAggregatorFacadeAddr);

  fetchedPhrase = await aggregatorFacadeInstance.description();

  if (phrase !== fetchedPhrase) {
    console.log(phrase, fetchedPhrase, "OOF");
    process.exit();
  }

  oracleContainerInstance = await deployer.deploy(oracleContainer);
  //oracleContainerInstance = await oracleContainer.at(kovanOracleContainerAddr);

  await oracleContainerInstance.addAggregators([aggregatorFacadeInstance.address]);

  await oracleContainerInstance.deploy(phrase);

  tokenDeployerInstance = await deployer.deploy(deployERC20Tokens);
  //tokenDeployerInstance = await deployERC20Tokens.at(kovanDeployERC20TokensAddr);
  stakeHubDeployerInstance = await deployer.deploy(deployStakeHub);
  //stakeHubDeployerInstance = await deployStakeHub.at(kovanDeployStakeHubAddr);

  bigMathInstance = await deployer.deploy(bigMath);
  //bigMathInstance = await bigMath.at(kovanBigMathAddr);
  payoutAtVariance1 = (new BN(10)).pow(await tokenInstance.decimals()).toString();
  cap = payoutAtVariance1.substring(0, payoutAtVariance1.length-1);

  organizerInstance = await deployer.deploy(organizer, bigMathInstance.address, oracleContainerInstance.address,
    tokenDeployerInstance.address, stakeHubDeployerInstance.address, lendingPoolInstance.address);
  //organizerInstance = await organizer.at(kovanOrganizerAddr);
  await organizerInstance.deployVarianceInstance(phrase, tokenInstance.address,
    _feb12021, "30", payoutAtVariance1, cap);

  varianceSwapHandlerInstance = await varianceSwapHandler.at(await organizerInstance.varianceSwapInstances(0));


  lvtAddress = await varianceSwapHandlerInstance.longVarianceTokenAddress();
  svtAddress = await varianceSwapHandlerInstance.shortVarianceTokenAddress()

  pair2 = await factoryInstance.getPair(svtAddress, tokenInstance.address);
  stakeHubAddress = await organizerInstance.varianceToStakeHub(varianceSwapHandlerInstance.address);

  pair0 = await factoryInstance.createPair(tokenInstance.address, lvtAddress);
  pair0 = pair0.receipt.logs[0].args.pair;

  pair1 = await factoryInstance.createPair(svtAddress, lvtAddress);
  pair1 = pair1.receipt.logs[0].args.pair;

  pair2 = await factoryInstance.createPair(svtAddress, tokenInstance.address);
  pair2 = pair2.receipt.logs[0].args.pair;

  inflator0 = 4;
  inflator1 = 3;
  inflator2 = 2;
  await organizerInstance.addStakeHub(0, pair0, pair1, pair2, inflator0, inflator1, inflator2);
  //*/
}
