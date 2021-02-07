const readline = require('readline');

const OracleContainer = artifacts.require("OracleContainer");
const IChainlinkAggregator = artifacts.require("IChainlinkAggregator");
const IFeldmexOracle = artifacts.require("IFeldmexOracle");

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../../helper/MainnetAddresses.js') : require('../../helper/KovanAddresses.js');

/*

	@argv0 phrase

*/
const possibleNetworkArgs = ['--network', 'rinkeby', 'kovan', 'mainnet'];

const timestamp = "1600099775";

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
	try {
		//let oracleAddress = await OracleContainerInstance.OracleAddress(phrase);
		let baseAggregatorAddress = await OracleContainerInstance.BaseAggregatorAddress(phrase);
		//console.log(oracleAddress);
		//let oracle = await IFeldmexOracle.at(oracleAddress);
		let baseAggregator = await IChainlinkAggregator.at(baseAggregatorAddress);
		let original = (await baseAggregator.latestRound());
		let str = original.toString(2);
		str = str.substring(str.length-32);
		let res = parseInt(str, 2);
		console.log(str, res);
		console.log((await baseAggregator.getTimestamp(original.toString())).toString());
		console.log((await baseAggregator.getTimestamp(original.sub(new BN(res)).toString())).toString());
		console.log((await baseAggregator.getTimestamp(original.sub(new BN(res+1)).toString())).toString());
		console.log((await baseAggregator.getTimestamp(res)).toString());
		//console.log((await baseAggregator.latestRound()).toString(2));

		//console.log((await oracle.decimals()).toString());
		//console.log((await oracle.fetchRoundAtTimestamp(timestamp)).toString());
	} catch (err) {
		console.log('Transaction Reverted');
		console.error(err);
	}
	callback();
}