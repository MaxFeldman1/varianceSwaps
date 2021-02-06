

/*
module.exports = {
	ETHUSDAggregatorFacadeAddr: "0x9326BFA02ADD2366b30bacB125260Af641031331",
	BalancerFactoryAddr: "0x8f7F78080219d4066A8036ccD30D588B416a40DB",
	AaveAUSDCAddr: "0xe12AFeC5aa12Cf614678f9bFeeB98cA9Bb95b5B0",
	OracleContainerAddr: "0xA43617A5d4Ef97fF9D989e6788ca31304C54Cb1D",
	DeployERC20TokensAddr: "0x4B5f6dBE5f610B286AdA2a59b044b92944Cc00B7",
	DeployStakeHubAddr: "0x8877be10df2938676617A033C6C2B8299616D6bC",
	BigMathAddr: "0xA83D65bcc94762Eeee2a1433Da518bc6340ee1B4",
	OrganizerAddr: "0x5896429982b8D2b14126e9436E01a6A712B7Cc82"
};
*/

const defaultAddress = "0x0000000000000000000000000000000000000000";
const ETHUSDAggregatorFacadeAddr = "0x9326BFA02ADD2366b30bacB125260Af641031331";
const AggregatorFacadeAddresses = [ETHUSDAggregatorFacadeAddr];
const OracleContainerAddr = "0x8f7569b85B7AE0eAcd9d563c36Afa015739Cd697";

module.exports = {
	AggregatorFacadeAddresses,
	BalancerFactoryAddr: defaultAddress,
	AaveAUSDCAddr: defaultAddress,
	OracleContainerAddr,
	DeployERC20TokensAddr: defaultAddress,
	DeployStakeHubAddr: defaultAddress,
	BigMathAddr: defaultAddress,
	OrganizerAddr: defaultAddress
};

