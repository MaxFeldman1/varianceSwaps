const deployERC20Tokens = artifacts.require("deployERC20Tokens");
const deployStakeHub = artifacts.require("deployStakeHub");
const BigMath = artifacts.require("BigMath");
const OracleContainer = artifacts.require("OracleContainer");
const organizer = artifacts.require("organizer");

let isOnMainnet = false;

const ADDRS = isOnMainnet ? require('../helper/MainnetAddresses.js') : require('../helper/KovanAddresses.js');

module.exports = async function(callback) {

	let BigMathInstance;
	let OracleContainerInstance;
	let tokenDeployerInstance;
	let stakeHubDeployerInstance;
	try {
		console.log("getting prerequisite contracts");
		//ensure that none of the addresses we use when we deploy the organizer are null
		BigMathInstance = await BigMath.at(ADDRS.BigMathAddr);
		OracleContainerInstance = await OracleContainer.at(ADDRS.OracleContainerAddr);
		tokenDeployerInstance = await deployERC20Tokens.at(ADDRS.DeployERC20TokensAddr);
		stakeHubDeployerInstance = await deployStakeHub.at(ADDRS.DeployStakeHubAddr);
		console.log('Fetched all prerequisite contracts');
	} catch (err) {
		console.log("Error: you must deploy the prerequisite contracts before you deploy the organizer contract");
		callback();
		return;
	}
	try {
		console.log('Deploy organizer contract');
	  	let organizerInstance = await organizer.new(
	  		bigMathInstance.address,
	  		oracleContainerInstance.address,
	  		tokenDeployerInstance.address,
	  		stakeHubDeployerInstance.address
	  	);
	  	console.log('Sucessfully deployed organizer contract');
	  	console.log('Deployed at address', organizerInstance.address);
	} catch (err) {
		console.log("Error Deployment transaction failed");
	}

	callback();
}