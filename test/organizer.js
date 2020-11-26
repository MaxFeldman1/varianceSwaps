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
const oracleDeployer = artifacts.require("oracleDeployer");
const deployERC20Tokens = artifacts.require("deployERC20Tokens");

const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;

contract('organizer', async function(accounts){
	it('before each', async () => {
		tokenInstance = await token.new();
		asset1 = await token.new();
		asset2 = await token.new();

		factoryInstance = await factory.new(defaultAddress);
		routerInstance = await router.new(factoryInstance.address, defaultAddress);

		bigMathInstance = await bigMath.new();

		//oracleInstance = await oracle.new(asset1.address, asset2.address);
		payoutAtVariance1 = (new BN(10)).pow(await tokenInstance.decimals()).toString();
		cap = payoutAtVariance1.substring(0, payoutAtVariance1.length-1);

		oracleDeployerInstance = await oracleDeployer.new(factoryInstance.address);
		longShotDeployerInstance = await deployERC20Tokens.new();
		organizerInstance = await organizer.new(bigMathInstance.address, oracleDeployerInstance.address, longShotDeployerInstance.address);
	});

	it('deploys variance swap handlers', async () => {
		await organizerInstance.deployVarianceInstance(asset1.address, asset2.address, tokenInstance.address,
    		"3000000000", "90", payoutAtVariance1, cap);
		varianceSwapHandlerInstance = await varianceSwapHandler.at(await organizerInstance.varianceSwapInstances(0));
		longVarianceTokenInstance = await longVarianceToken.at(await varianceSwapHandlerInstance.longVarianceTokenAddress());
		shortVarianceTokenInstance = await shortVarianceToken.at(await varianceSwapHandlerInstance.shortVarianceTokenAddress());
		oracleInstance = await oracle.at(await varianceSwapHandlerInstance.oracleAddress());
	});


});
