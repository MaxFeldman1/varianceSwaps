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
const oracleTracker = artifacts.require("oracleTracker");
const deployERC20Tokens = artifacts.require("deployERC20Tokens");
const deployStakeHub = artifacts.require("deployStakeHub");

const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;

contract('organizer', async function(accounts){
	it('before each', async () => {
		tokenInstance = await token.new();
		asset1 = await token.new();
		asset2 = await token.new();

		phrase = "FDMX/WBTC";

		factoryInstance = await factory.new(defaultAddress);
		routerInstance = await router.new(factoryInstance.address, defaultAddress);

		bigMathInstance = await bigMath.new();

		//oracleInstance = await oracle.new(asset1.address, asset2.address);
		payoutAtVariance1 = (new BN(10)).pow(await tokenInstance.decimals()).toString();
		cap = payoutAtVariance1.substring(0, payoutAtVariance1.length-1);

		oracleTrackerInstance = await oracleTracker.new(factoryInstance.address);
		longShotDeployerInstance = await deployERC20Tokens.new();
		stakeHubDeployerInstance = await deployStakeHub.new();

		organizerInstance = await organizer.new(bigMathInstance.address, oracleTrackerInstance.address, longShotDeployerInstance.address, stakeHubDeployerInstance.address);

		//add oracle to oracle deployer
		oracleInstance = await oracle.new(asset1.address, asset2.address);
		await oracleTrackerInstance.setOracle(phrase, oracleInstance.address);
	});

	it('deploys variance swap handlers', async () => {
		await organizerInstance.deployVarianceInstance(phrase, tokenInstance.address,
    		"3000000000", "90", payoutAtVariance1, cap);
		varianceSwapHandlerInstance = await varianceSwapHandler.at(await organizerInstance.varianceSwapInstances(0));
		longVarianceTokenInstance = await longVarianceToken.at(await varianceSwapHandlerInstance.longVarianceTokenAddress());
		shortVarianceTokenInstance = await shortVarianceToken.at(await varianceSwapHandlerInstance.shortVarianceTokenAddress());
		oracleInstance = await oracle.at(await varianceSwapHandlerInstance.oracleAddress());
	});

	it('adds stakeHub', async () => {
		stakeable0 = defaultAddress;
		stakeable1 = defaultAddress.substring(0, defaultAddress.length-1)+"1";
		stakeable2 = defaultAddress.substring(0, defaultAddress.length-1)+"2";
		inflator0 = "1";
		inflator1 = "2";
		inflator2 = "3";
		await organizerInstance.addStakeHub(0, stakeable0, stakeable1, stakeable2, inflator0, inflator1, inflator2);
		stakeHubInstance = await stakeHub.at(await organizerInstance.varianceToStakeHub(varianceSwapHandlerInstance.address));
		assert.equal(await stakeHubInstance.stakeable0(), stakeable0, "correct value of stakeable0");
		assert.equal(await stakeHubInstance.stakeable1(), stakeable1, "correct value of stakeable1");
		assert.equal(await stakeHubInstance.stakeable2(), stakeable2, "correct value of stakeable2");
		assert.equal((await stakeHubInstance.inflator0()).toString(), inflator0, "correct value of inflator0");
		assert.equal((await stakeHubInstance.inflator1()).toString(), inflator1, "correct value of inflator1");
		assert.equal((await stakeHubInstance.inflator2()).toString(), inflator2, "correct value of inflator2");
	});


});
