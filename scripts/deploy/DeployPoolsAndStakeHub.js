const readline = require('readline');

const organizer = artifacts.require("organizer");
const IERC20 = artifacts.require("IERC20");
const factory = artifacts.require("BFactory");
const pool = artifacts.require("BPool");
const varianceSwapHandler = artifacts.require("varianceSwapHandler");
const longVarianceToken = artifacts.require("longVarianceToken");
const shortVarianceToken = artifacts.require("shortVarianceToken");
const stakeHub = artifacts.require("stakeHub");

const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;

const _50pctWeight = "5"+"0".repeat(18);

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../../helper/MainnetAddresses.js') : require('../../helper/KovanAddresses.js');

/*

	@argv0: inflator0
	@argv1: inflator1
	@argv2: inflator2

*/
const possibleNetworkArgs = ['--network', 'rinkeby', 'kovan', 'mainnet'];

module.exports = async function(callback) {
	var processedArgs = 4;
	let args = process.argv.filter(x => !possibleNetworkArgs.includes(x.toLowerCase()));
	async function askQuestion(query) {
		if (processedArgs < args.length){
			processedArgs++;
			return args[processedArgs-1];
		}
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		return await new Promise(resolve => rl.question((query+'\n'), ans => {
			rl.close();
			resolve(ans);
		}))
	}

	let accounts = await web3.eth.getAccounts();
	let balance = await web3.eth.getBalance(accounts[0]);

	let factoryInstance;
	let tokenInstance;
	let organizerInstance;
	let varianceSwapIndex;
	let lvtAddress;
	let svtAddress;
	let lvtContract;
	let sctContract;
	let inflator0;
	let inflator1;
	let inflator2;
	try {
		factoryInstance = await factory.at(ADDRS.BalancerFactoryAddr);
		tokenInstance = await IERC20.at(ADDRS.AaveAUSDCAddr);
		organizerInstance = await organizer.at(ADDRS.OrganizerAddr);
		varianceSwapIndex = await askQuestion("What is the index of the Variance Swap handler");
		inflator0 = await askQuestion("What shall inflator0 be");
		inflator1 = await askQuestion("What shall inflator1 be");
		inflator2 = await askQuestion("What shall inflator2 be");
		console.log("Fetching prerequisite contracts");
		varianceSwapHandlerInstance = await varianceSwapHandler.at(await organizerInstance.varianceSwapInstances(varianceSwapIndex));
		if (await varianceSwapHandlerInstance.sendFeeTo() != defaultAddress) {
			console.log("Error: this variance swap instance already has a stake hub contract attached");
			callback();
			return;
		}
		lvtAddress = await varianceSwapHandlerInstance.longVarianceTokenAddress();
		svtAddress = await varianceSwapHandlerInstance.shortVarianceTokenAddress();
		lvtContract = await longVarianceToken.at(lvtAddress);
		svtContract = await shortVarianceToken.at(svtAddress);
		console.log('Fetched prerequisite contracts');
	} catch (err) {
		console.log("Error: you must deploy the prerequisite organizer contract before you deploy a variance swap instance");
		console.error(err);
		callback();
		return;
	}

	try {

		console.log('--------Deploying 3 new Balancer Pools------------');
		console.log("Deploying Balancer Pool 0");
		pair0 = await factoryInstance.newBPool();
		pair0 = pair0.receipt.logs[0].args.pool;
		console.log(`Deployed Balancer Pool 0 at address ${pair0}`);

		console.log("Deploying Balancer Pool 1");
		pair1 = await factoryInstance.newBPool();
		pair1 = pair1.receipt.logs[0].args.pool;
		console.log(`Deployed Balancer Pool 1 at address ${pair1}`);

		console.log("Deploying Balancer Pool 2");
		pair2 = await factoryInstance.newBPool();
		pair2 = pair2.receipt.logs[0].args.pool;
		console.log(`Deployed Balancer Pool 2 at address ${pair2}`);
		console.log("------Finished Deployment of Balancer Pools--------");
	
		console.log('Deploying StakeHub');
		await organizerInstance.addStakeHub(varianceSwapIndex, pair0, pair1, pair2, inflator0, inflator1, inflator2);
	  	console.log('Sucessfully Deployed StakeHub');

	  	console.log('------Starting Process to Init Balancer Pools-------------');

		let toMint = "1000000000";
		let toApprove = "1"+"0".repeat(30);

		console.log('sending payout asset approvals ...');
		await tokenInstance.approve(varianceSwapHandlerInstance.address, toApprove);
		await tokenInstance.approve(pair0, toApprove);
		await tokenInstance.approve(pair2, toApprove);

		console.log('sending LVT approvals ...');
		await lvtContract.approve(pair0, toApprove);
		await lvtContract.approve(pair1, toApprove);

		console.log('sending SVT approvals ...');
		await svtContract.approve(pair1, toApprove);
		await svtContract.approve(pair2, toApprove);

		console.log('Finished with all approvals');
		console.log('Minting Swaps ...');
		await varianceSwapHandlerInstance.mintVariance(accounts[0], toMint);
		console.log('Finished Minting Swaps');
		console.log('Find Amount of Swaps to init pools with');
		amtSwaps = (await varianceSwapHandlerInstance.balanceLong(accounts[0])).div(new BN(10)).toString();

		console.log('Fetch Pool Contract Instances ...');
		pool0 = await pool.at(pair0);
		pool1 = await pool.at(pair1);
		pool2 = await pool.at(pair2);

		console.log('got pool contracts');

		await pool0.bind(tokenInstance.address, toMint, _50pctWeight);
		await pool0.bind(lvtAddress, amtSwaps, _50pctWeight);

		console.log('pool0 binds done');

		await pool1.bind(lvtAddress, amtSwaps, _50pctWeight);
		await pool1.bind(svtAddress, amtSwaps, _50pctWeight);

		console.log('pool1 binds done');

		await pool2.bind(tokenInstance.address, toMint, _50pctWeight);
		await pool2.bind(svtAddress, amtSwaps, _50pctWeight);

		console.log('pool2 binds done');

		console.log('finalize pool 0 ...');
		await pool0.finalize();
		console.log('finalized pool 0');

		console.log('finalize pool 1 ...');
		await pool1.finalize();
		console.log('finalized pool 1');

		console.log('finalize pool 2 ...');
		await pool2.finalize();
		console.log('finalized pool 2');

		console.log('all pools finalized');

		newBalance = await web3.eth.getBalance(accounts[0]);

		console.log('original balance in wei', balance);
		console.log('balance in wei after deployment', newBalance);


	} catch (err) {
		console.log("Error: Deployment failed check console to see what failed, reference etherscan for more help");
		console.error(err);
	}

	callback();
}