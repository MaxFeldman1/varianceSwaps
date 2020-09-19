const oracle = artifacts.require("oracle");
const aggregator = artifacts.require("@chainlink/contracts/src/v0.6/interfaces/AggregatorV2V3Interface.sol");

const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;

const kovanEthUsdOracleAddress = "0xEb15231CB6437dA9558A1a2f8CE3C552dE36FB87";

contract('oracle', async function(accounts){
	it('before each', async () => {
		oracleInstance = await oracle.at(kovanEthUsdOracleAddress);
		aggregatorInstance = await aggregator.at(await oracleInstance.fluxAggregatorAddress());
		totalRounds = (await aggregatorInstance.latestRound()).toNumber();
		firstTimestamp = (await aggregatorInstance.getTimestamp(1)).toNumber();
		latestTime = (await aggregatorInstance.latestTimestamp()).toNumber();
	});

	it('fetches correct round', async () => {
		var jump = parseInt((latestTime-firstTimestamp)/20);
		for (var time = firstTimestamp;time < latestTime;time+=jump){
			var round = (await oracleInstance.fetchRoundAtTimestamp(time)).toNumber();
			var fetchedTime = (await aggregatorInstance.getTimestamp(round)).toNumber();
			assert.equal(0 < fetchedTime && fetchedTime <= time, true, "timestamp of round is in correct interval");
			fetchedTime = (await aggregatorInstance.getTimestamp(round+1)).toNumber();
			assert.equal(0 == fetchedTime || fetchedTime > time, true, "timestamp of the next round is after the timestamp at which we are looking for the most recent round");
		}
	});

});
