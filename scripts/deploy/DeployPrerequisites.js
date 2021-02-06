const deployERC20Tokens = artifacts.require("deployERC20Tokens");
const deployStakeHub = artifacts.require("deployStakeHub");
const BigMath = artifacts.require("BigMath");

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../helper/MainnetAddresses.js') : require('../helper/KovanAddresses.js');

module.exports = async function(callback) {

	try {
		console.log('Deploying deployERC20Tokens contract');
		let instance = await deployERC20Tokens.new();
		console.log(`Sucessfully Deployed deployERC20Tokens contract at address ${instance.address}`);

		console.log("Deploying deployStakeHub contract");
		let instance1 = await deployStakeHub.new();
		console.log(`Sucessfully Deployed deplyStakeHub contract at address ${instance1.address}`);

		console.log("Deploying BigMath contract");
		let instance2 = await BigMath.new();
		console.log(`Sucessfully Deployed BigMath contract at address ${instance2.address}`);

	} catch (err) {
		console.log('Transaction Reverted');
	}
	callback();
}