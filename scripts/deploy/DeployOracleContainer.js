const OracleContainer = artifacts.require("OracleContainer");
const IChainlinkAggregator = artifacts.require("IChainlinkAggregator");
const Testing = artifacts.require("testing");

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../../helper/MainnetAddresses.js') : require('../../helper/KovanAddresses.js');

module.exports = async function(callback) {

	console.log('Deploy Oracle Container');
	let OracleContainerInstance = await OracleContainer.new();
	console.log('Deployed OracleContainer sucessfully');
	console.log('At Address -----', OracleContainerInstance.address);
	console.log('Adding Aggregator ....');
	await OracleContainerInstance.addAggregators(ADDRS.AggregatorAddresses);
	console.log('Sucessfully added aggregator');

	for (let i = 0; i < ADDRS.AggregatorAddresses.length; i++) {
		console.log('Adding Oracle');
		let aggregator = await IChainlinkAggregator.at(ADDRS.AggregatorAddresses[i]);
		let phrase = await aggregator.description();
		console.log('deploy with phrase', phrase);
		await OracleContainerInstance.deploy(phrase);
		console.log('Sucessfully added oracle');
	}
	console.log('Finished adding all oracles');
	callback();
}