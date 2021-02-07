const readline = require('readline');

const OracleContainer = artifacts.require("OracleContainer");
const IChainlinkAggregator = artifacts.require("IChainlinkAggregator");
const IFeldmexOracle = artifacts.require("IFeldmexOracle");

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../../helper/MainnetAddresses.js') : require('../../helper/KovanAddresses.js');

/*

	@argv0 phrase
	@argv1 timestamp

*/
const possibleNetworkArgs = ['--network', 'rinkeby', 'kovan', 'mainnet'];

const BN = web3.utils.BN;

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
	let OracleContainerInstance = await OracleContainer.at(ADDRS.OracleContainerAddr);
	let phrase = await askQuestion("Phrase for oracle to deploy");
	let timestamp = await askQuestion("What is the unix timestamp at which you would like to find the price");
	try {
		let result = await OracleContainerInstance.phraseToHistoricalPrice(phrase, timestamp);
		console.log("price:", result.spot.toString());
		console.log("decimals:", result.decimals.toString());
	} catch (err) {
		console.log('Transaction Reverted');
		console.error(err);
	}
	callback();
}