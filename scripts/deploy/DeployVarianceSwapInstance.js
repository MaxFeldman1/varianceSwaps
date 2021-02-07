const readline = require('readline');

const organizer = artifacts.require("organizer");
const IERC20 = artifacts.require("IERC20");

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../../helper/MainnetAddresses.js') : require('../../helper/KovanAddresses.js');

/*
	@argv0: phrase
	@argv1: start timestamp
	@argv2: length of price series
	@argv3: payout at variance of 1
	@argv4: payout cap
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

	let organizerInstance;
	let payoutAssetInstance;
	let phrase;
	let startTimestamp;
	let lengthOfPriceSeries;
	let payoutAtVarianceOf1;
	let cap;
	try {
		console.log("getting organizer contract and payout asset contract");
		//ensure that none of the addresses we use when we deploy the organizer are null
		organizerInstance = await organizer.at(ADDRS.OrganizerAddr);
		payoutAssetInstance = await IERC20.at(ADDRS.AaveAUSDCAddr);
		console.log('Fetched prerequisite contracts');
	} catch (err) {
		console.log("Error: you must deploy the prerequisite organizer contract before you deploy a variance swap instance");
		callback();
		return;
	}
	try {

		phrase = await askQuestion("What Phrase shall this variance swap be for");
		startTimestamp = await askQuestion("What Shall The Start timestamp be");
		lengthOfPriceSeries = await askQuestion("What shall the length of the price series be");
		payoutAtVarianceOf1 = await askQuestion("What shall the payout at a variance of 1 be");
		cap = await askQuestion("What shall the payout cap per swap be");

		console.log('Deploying Varaince Swap instance');
		await organizerInstance.deployVarianceInstance(phrase, payoutAssetInstance.address, startTimestamp, lengthOfPriceSeries, payoutAtVarianceOf1, cap);
	  	console.log('Sucessfully deployed variance Swap Instance');
	} catch (err) {
		console.log("Error: Deployment failed");
	}

	callback();
}