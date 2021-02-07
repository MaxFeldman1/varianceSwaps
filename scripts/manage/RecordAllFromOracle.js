const readline = require('readline');

const varianceSwapHandler = artifacts.require("varianceSwapHandler");
const organizer = artifacts.require("organizer");

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../../helper/MainnetAddresses.js') : require('../../helper/KovanAddresses.js');

/*

	@argv0 index of variance swap instance

*/
const possibleNetworkArgs = ['--network', 'rinkeby', 'kovan', 'mainnet'];

const BN = web3.utils.BN;
const secondsPerDay = 86400;

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
	let index = await askQuestion("What is the index of the variance swap instance you wish to call the oracle for");
	try {
		let organizerContract = await organizer.at(ADDRS.OrganizerAddr);
		let varianceAddr = await organizerContract.varianceSwapInstances(index);
		let varianceContract = await varianceSwapHandler.at(varianceAddr);
		let currentTimestamp = Math.floor((new Date()).getTime()/1000);
		let startTimestamp = (await varianceContract.startTimestamp()).toNumber();
		let seriesLength = (await varianceContract.lengthOfPriceSeries()).toNumber();
		let previousPrice = (await varianceContract.previousPrice()).toNumber();

		if (previousPrice.toString() == "0" && currentTimestamp > startTimestamp) {
			console.log('calling getFirstPrice()');
			await varianceContract.getFirstPrice();
			console.log('sucessfully called getFirstPrice()');
		}

		let intervalsCalculated = (await varianceContract.intervalsCalculated()).toNumber();
		if (currentTimestamp > secondsPerDay*(intervalsCalculated+1) + startTimestamp) {
			let N = Math.floor((currentTimestamp - startTimestamp - secondsPerDay*intervalsCalculated)/secondsPerDay).toString();
			if (N == 1) {
				console.log('calling fetchFromOracle()');
				await varianceContract.fetchFromOracle();
				console.log('sucessfully called fetchFromOracle()');
			}
			else if (N > 1) {
				console.log('calling fetchNFromOracle()');
				await varianceContract.fetchNFromOracle(N);
				console.log('sucessfully called fetchNFromOracle()');
			}
		}
		else {
			console.log('you cannot get any new prices from the oracle at this time');
		}
	} catch (err) {
		console.log('Transaction Reverted');
		console.error(err);
	}
	callback();
}