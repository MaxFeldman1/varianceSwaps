const readline = require('readline');

const OracleContainer = artifacts.require("OracleContainer");
const IChainlinkAggregator = artifacts.require("IChainlinkAggregator");
const IFeldmexOracle = artifacts.require("IFeldmexOracle");

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../helper/MainnetAddresses.js') : require('../helper/KovanAddresses.js');

/*

	@argv0 phrase

*/
const possibleNetworkArgs = ['--network', 'rinkeby', 'kovan', 'mainnet'];

const timestamp = "1600099775";

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
	    return await new Promise(resolve => rl.question(query, ans => {
	        rl.close();
	        resolve(ans);
	    }))
	}
	let OracleContainerInstance = await OracleContainer.at(ADDRS.OracleContainerAddr);
	let phrase = await askQuestion("Phrase for oracle to deploy");
	try {
		let oracleAddress = await OracleContainerInstance.OracleAddress(phrase);
		console.log(oracleAddress);
		let oracle = await IFeldmexOracle.at(oracleAddress);
		console.log(oracle.address);
		console.log((await oracle.decimals()).toString());
		console.log((await oracle.fetchSpotAtTime(timestamp)).toString());
		//console.log(await OracleContainerInstance.phraseToLatestPrice(phrase));

	} catch (err) {
		console.log('Transaction Reverted');
		console.error(err);
	}
	callback();
}