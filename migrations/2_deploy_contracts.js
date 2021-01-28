const AToken = artifacts.require("DummyAToken");
const bigMath = artifacts.require("BigMath");
const factory = artifacts.require("BFactory");
const pool = artifacts.require("BPool");
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

const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;

const _feb12021 = "1612137600";

const kovanETHUSDAggregatorFacadeAddr = "0x9326BFA02ADD2366b30bacB125260Af641031331";

const kovanBalancerFactoryAddr = "0x8f7F78080219d4066A8036ccD30D588B416a40DB";

const kovanAaveAUSDCAddr = "0xe12AFeC5aa12Cf614678f9bFeeB98cA9Bb95b5B0";

const kovanOracleContainerAddr = "0xA43617A5d4Ef97fF9D989e6788ca31304C54Cb1D";
const kovanDeployERC20TokensAddr = "0x4B5f6dBE5f610B286AdA2a59b044b92944Cc00B7";
const kovanDeployStakeHubAddr = "0x311b328542EA500F56993589A7E257c32a15dc90";
const kovanBigMathAddr = "0xA83D65bcc94762Eeee2a1433Da518bc6340ee1B4";
const kovanOrganizerAddr = "0x6815a9e8c0C50d22a24d42D1D8e0f7F545007F52";

const kovanPool0 = "0xa7eaba3595513177a111d03fddb6b608618cce4e";
const kovanPool1 = "0x5c2af3e5bc7b1e4441058167577c02f8c843af71";
const kovanPool2 = "0xee47226a65a01724a87ed59142d57077d3336b7c";

module.exports = async function(deployer) {
  /*
  accounts = await web3.eth.getAccounts();

  balance = await web3.eth.getBalance(accounts[0]);
  //*
  tokenInstance = await AToken.at(kovanAaveAUSDCAddr);

  factoryInstance = await factory.at(kovanBalancerFactoryAddr);

  phrase = "ETH / USD";

  aggregatorFacadeInstance = await aggregatorFacade.at(kovanETHUSDAggregatorFacadeAddr);

  fetchedPhrase = await aggregatorFacadeInstance.description();

  if (phrase !== fetchedPhrase) {
    console.log(phrase, fetchedPhrase, "OOF");
    process.exit();
  }

  //oracleContainerInstance = await deployer.deploy(oracleContainer);
  oracleContainerInstance = await oracleContainer.at(kovanOracleContainerAddr);

  //await oracleContainerInstance.addAggregators([aggregatorFacadeInstance.address]);

  //await oracleContainerInstance.deploy(phrase);

  //tokenDeployerInstance = await deployer.deploy(deployERC20Tokens);
  tokenDeployerInstance = await deployERC20Tokens.at(kovanDeployERC20TokensAddr);
  //stakeHubDeployerInstance = await deployer.deploy(deployStakeHub);
  stakeHubDeployerInstance = await deployStakeHub.at(kovanDeployStakeHubAddr);

  //bigMathInstance = await deployer.deploy(bigMath);
  bigMathInstance = await bigMath.at(kovanBigMathAddr);
  payoutAtVariance1 = (new BN(10)).pow(await tokenInstance.decimals()).toString();
  cap = payoutAtVariance1.substring(0, payoutAtVariance1.length-1);

  
  //organizerInstance = await deployer.deploy(organizer, bigMathInstance.address, oracleContainerInstance.address,
  //  tokenDeployerInstance.address, stakeHubDeployerInstance.address);
  organizerInstance = await organizer.at(kovanOrganizerAddr);
  //await organizerInstance.deployVarianceInstance(phrase, tokenInstance.address,
  //  _feb12021, "30", payoutAtVariance1, cap);

  //console.log('deployed variance');

  varianceSwapHandlerInstance = await varianceSwapHandler.at(await organizerInstance.varianceSwapInstances(0));

  stakeHubInstance = await stakeHub.at(await organizerInstance.varianceToStakeHub(varianceSwapHandlerInstance.address));

  lvtAddress = await varianceSwapHandlerInstance.longVarianceTokenAddress();
  svtAddress = await varianceSwapHandlerInstance.shortVarianceTokenAddress()
  lvtContract = await longVarianceToken.at(lvtAddress);
  svtContract = await shortVarianceToken.at(svtAddress);

/*
  console.log(lvtAddress, svtAddress);

  pair0 = await factoryInstance.newBPool();
  pair0 = pair0.receipt.logs[0].args.pool;

  console.log('deployed pair 0');

  pair1 = await factoryInstance.newBPool();
  pair1 = pair1.receipt.logs[0].args.pool;

  console.log('deployed pair 1');

  pair2 = await factoryInstance.newBPool();
  pair2 = pair2.receipt.logs[0].args.pool;

  console.log('deployed pair 2');
*/
  pair0 = kovanPool0;
  pair1 = kovanPool1;
  pair2 = kovanPool2;


  /*
    deploy stake hub
  */
  inflator0 = 4;
  inflator1 = 3;
  inflator2 = 2;
  //await organizerInstance.addStakeHub(0, pair0, pair1, pair2, inflator0, inflator1, inflator2);

  //console.log('stake hub deployed');


  /*
    approvals
  */
  toMint = "1000000000";
  //await tokenInstance.approve(varianceSwapHandlerInstance.address, toMint);
  //await tokenInstance.approve(pair0, toMint);
  //await tokenInstance.approve(pair2, toMint);

  //console.log('token approvals done');

  //await lvtContract.approve(pair0, toMint);
  //await lvtContract.approve(pair1, toMint);

  //console.log('lvt approvals done');

  //await svtContract.approve(pair1, toMint);
  //await svtContract.approve(pair2, toMint);

  //console.log('svt approvals done');
  /*
    mint swaps
  */
  //await varianceSwapHandlerInstance.mintVariance(accounts[0], toMint);

  //console.log('minted variance tokens');
  /*
    setup pools
  */
  /*
  _50pctWeight = "5"+"0".repeat(18);
  pool0 = await pool.at(pair0);
  pool1 = await pool.at(pair1);
  pool2 = await pool.at(pair2);

  console.log('got pool contracts');

  //await pool0.bind(tokenInstance.address, toMint, _50pctWeight);
  //await pool0.bind(lvtAddress, toMint, _50pctWeight);

  console.log('pool0 binds done');

  await pool1.bind(lvtAddress, toMint, _50pctWeight);
  await pool1.bind(svtAddress, toMint, _50pctWeight);

  console.log('pool1 binds done');

  await pool2.bind(tokenInstance.address, toMint, _50pctWeight);
  await pool2.bind(svtAddress, toMint, _50pctWeight);

  console.log('pool2 binds done');

  await pool0.finalize();
  await pool1.finalize();
  await pool2.finalize();

  console.log('pools finalized');

  newBalance = await web3.eth.getBalance(accounts[0]);

  console.log(balance);
  console.log(newBalance);
  console.log((new BN(balance)).sub(new BN(newBalance)).toString());
  //*/
}
