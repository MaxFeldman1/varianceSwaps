const token = artifacts.require("Token");
const stakeHub = artifacts.require("stakeHub");
const uniswapFactory = artifacts.require("UniswapV2Factory");
const uniswapPair = artifacts.require("UniswapV2Pair");
const iERC20 = artifacts.require("IERC20");
const bigMath = artifacts.require("BigMath");
const varianceSwapHandler = artifacts.require("varianceSwapHandler");
const longVarianceToken = artifacts.require("longVarianceToken");
const shortVarianceToken = artifacts.require("shortVarianceToken");
const oracleContainer = artifacts.require("OracleContainer");
const baseAggregator = artifacts.require("dummyAggregator");
const aggregatorFacade = artifacts.require("dummyAggregatorFacade");
const lendingPool = artifacts.require("DummyLendingPool");


const defaultAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;
const secondsPerDay = 86400;
const secondsPerDaySquared = secondsPerDay*secondsPerDay;

const helper = require("../helper/helper.js");

contract('stakeHub', function(accounts){

	it('before each', async () => {
		phrase = "FDMX/WBTC";

		baseAggregatorInstance = await baseAggregator.new(3);
		aggregatorFacadeInstance = await aggregatorFacade.new(baseAggregatorInstance.address, phrase);
		oracleContainerInstance = await oracleContainer.new();

		await oracleContainerInstance.addAggregators([aggregatorFacadeInstance.address]);
		await oracleContainerInstance.deploy(phrase);

		lendingPoolInstance = await lendingPool.new();
		tokenInstance = await token.new();
		bigMathInstance = await bigMath.new();

		startTimestamp = (await web3.eth.getBlock('latest')).timestamp + secondsPerDay;
		lengthOfPriceSeries = "10";
		payoutAtVarianceOf1 = (new BN(10)).pow(await tokenInstance.decimals()).toString();
		cap = payoutAtVarianceOf1+"0";
		varianceSwapHandlerInstance = await varianceSwapHandler.new(phrase, tokenInstance.address, oracleContainerInstance.address,
			bigMathInstance.address, lendingPoolInstance.address, startTimestamp, lengthOfPriceSeries, payoutAtVarianceOf1, cap);
		longVarianceTokenInstance = await longVarianceToken.new(varianceSwapHandlerInstance.address);
		shortVarianceTokenInstance = await shortVarianceToken.new(varianceSwapHandlerInstance.address);
		await varianceSwapHandlerInstance.setAddresses(longVarianceTokenInstance.address, shortVarianceTokenInstance.address);
		/*
			This program was designed with the intention of users staking liquidity pool tokens
			but for our purposes this can work
		*/
		inflator0 = 5;
		inflator1 = 3;
		inflator2 = 2;
		lastStakingTimestamp = (await web3.eth.getBlock('latest')).timestamp + 20000;
		endStakingTimestamp = lastStakingTimestamp+20000;
		destructionTimestamp = endStakingTimestamp+20000;

		uniswapFactoryInstance = await uniswapFactory.new(defaultAddress);
		pair0 = await uniswapFactoryInstance.createPair(tokenInstance.address, longVarianceTokenInstance.address);
		pair0 = pair0.receipt.logs[0].args.pair;
		pair1 = await uniswapFactoryInstance.createPair(shortVarianceTokenInstance.address, longVarianceTokenInstance.address);
		pair1 = pair1.receipt.logs[0].args.pair;
		pair2 = await uniswapFactoryInstance.createPair(shortVarianceTokenInstance.address, tokenInstance.address);
		pair2 = pair2.receipt.logs[0].args.pair;

		asset0 = await iERC20.at(pair0);
		asset1 = await iERC20.at(pair1);
		asset2 = await iERC20.at(pair2);

		pair0 = await uniswapPair.at(pair0);
		pair1 = await uniswapPair.at(pair1);
		pair2 = await uniswapPair.at(pair2);

		await lendingPoolInstance.setReserveNormalizedIncome(tokenInstance.address, (new BN(10)).pow(new BN(27)).toString());

		//variance tokens
		//we use cap+"0" to mint 10 variance tokens
		await tokenInstance.approve(varianceSwapHandlerInstance.address, cap+"0000");
		varianceTokenSubUnits = (new BN(10)).pow(await varianceSwapHandlerInstance.decimals());
		await varianceSwapHandlerInstance.mintVariance(accounts[0], (new BN(10000)).mul(varianceTokenSubUnits).toString());

		//mint liquidity tokens
		await tokenInstance.transfer(pair0.address, cap);
		await longVarianceTokenInstance.transfer(pair0.address, varianceTokenSubUnits.toString());
		await pair0.mint(accounts[0]);

		await longVarianceTokenInstance.transfer(pair1.address, varianceTokenSubUnits.toString());
		await shortVarianceTokenInstance.transfer(pair1.address, varianceTokenSubUnits.toString());
		await pair1.mint(accounts[0]);

		await tokenInstance.transfer(pair2.address, cap);
		await shortVarianceTokenInstance.transfer(pair2.address, varianceTokenSubUnits.toString());
		await pair2.mint(accounts[0]);

		stakeHubInstance = await stakeHub.new(tokenInstance.address, asset0.address, asset1.address, asset2.address,
			inflator0, inflator1, inflator2, lastStakingTimestamp, endStakingTimestamp, destructionTimestamp);

		assert.equal(await stakeHubInstance.stakeable0(), asset0.address, "correct stakeable0 value");
		assert.equal(await stakeHubInstance.stakeable1(), asset1.address, "correct stakeable1 value");
		assert.equal(await stakeHubInstance.stakeable2(), asset2.address, "correct stakeable2 value");

		assert.equal((await stakeHubInstance.inflator0()).toNumber(), inflator0);
		assert.equal((await stakeHubInstance.inflator1()).toNumber(), inflator1);
		assert.equal((await stakeHubInstance.inflator2()).toNumber(), inflator2);

		assert.equal((await stakeHubInstance.lastStakingTimestamp()).toNumber(), lastStakingTimestamp);
		assert.equal((await stakeHubInstance.endStakingTimestamp()).toNumber(), endStakingTimestamp);
		assert.equal((await stakeHubInstance.destructionTimestamp()).toNumber(), destructionTimestamp);
	});

	it('Starts stakes asset 0', async () => {
		stakeAmt = 100000000;
		//start stake with transfer:true
		await asset0.approve(stakeHubInstance.address, stakeAmt, {from: accounts[0]});
		var rec = await stakeHubInstance.startStake(0, stakeAmt, true, {from: accounts[0]});
		var stake = await stakeHubInstance.stakes0(accounts[0], 0);
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal(stake.timestamp.toNumber(), timestamp, "correct timestamp");
		assert.equal(stake.amount.toNumber(), stakeAmt, "correct amount in stake");
		assert.equal((await stakeHubInstance.getStats())[0].toNumber(), 1, "correct number of stakes");

		//start stake with transfer:false
		await asset0.transfer(stakeHubInstance.address, stakeAmt, {from: accounts[0]});
		rec = await stakeHubInstance.startStake(0, stakeAmt, false, {from: accounts[0]});
		stake = await stakeHubInstance.stakes0(accounts[0], 1);
		timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal(stake.timestamp.toNumber(), timestamp, "correct timestamp");
		assert.equal(stake.amount.toNumber(), stakeAmt, "correct amount in stake");
		assert.equal((await stakeHubInstance.getStats())[0].toNumber(), 2, "correct number of stakes");
	});


	it('Starts stakes asset 1', async () => {
		stakeAmt = 100000000;
		//start stake with transfer:true
		await asset1.approve(stakeHubInstance.address, stakeAmt, {from: accounts[0]});
		var rec = await stakeHubInstance.startStake(1, stakeAmt, true, {from: accounts[0]});
		var stake = await stakeHubInstance.stakes1(accounts[0], 0);
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal(stake.timestamp.toNumber(), timestamp, "correct timestamp");
		assert.equal(stake.amount.toNumber(), stakeAmt, "correct amount in stake");
		assert.equal((await stakeHubInstance.getStats())[1].toNumber(), 1, "correct number of stakes");

		//start stake with transfer:false
		await asset1.transfer(stakeHubInstance.address, stakeAmt, {from: accounts[0]});
		rec = await stakeHubInstance.startStake(1, stakeAmt, false, {from: accounts[0]});
		stake = await stakeHubInstance.stakes1(accounts[0], 1);
		timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal(stake.timestamp.toNumber(), timestamp, "correct timestamp");
		assert.equal(stake.amount.toNumber(), stakeAmt, "correct amount in stake");
		assert.equal((await stakeHubInstance.getStats())[1].toNumber(), 2, "correct number of stakes");
	});


	it('Starts stakes asset 2', async () => {
		stakeAmt = 100000000;
		//start stake with transfer:true
		await asset2.approve(stakeHubInstance.address, stakeAmt, {from: accounts[0]});
		var rec = await stakeHubInstance.startStake(2, stakeAmt, true, {from: accounts[0]});
		var stake = await stakeHubInstance.stakes2(accounts[0], 0);
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal(stake.timestamp.toNumber(), timestamp, "correct timestamp");
		assert.equal(stake.amount.toNumber(), stakeAmt, "correct amount in stake");
		assert.equal((await stakeHubInstance.getStats())[2].toNumber(), 1, "correct number of stakes");

		//start stake with transfer:false
		await asset2.transfer(stakeHubInstance.address, stakeAmt, {from: accounts[0]});
		rec = await stakeHubInstance.startStake(2, stakeAmt, false, {from: accounts[0]});
		stake = await stakeHubInstance.stakes2(accounts[0], 1);
		timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal(stake.timestamp.toNumber(), timestamp, "correct timestamp");
		assert.equal(stake.amount.toNumber(), stakeAmt, "correct amount in stake");
		assert.equal((await stakeHubInstance.getStats())[2].toNumber(), 2, "correct number of stakes");
	});


	it('correct payout removing from stake of asset 0', async () => {
		removeAmount = 50000000;
		await helper.advanceTime(100);
		var stake = await stakeHubInstance.stakes0(accounts[0], 0);
		var prevBalance0 = await asset0.balanceOf(accounts[0]);
		var prevBalanceNative = await stakeHubInstance.balanceOf(accounts[0]);
		var rec = await stakeHubInstance.removeFromStake(0, 0, removeAmount, accounts[0]);
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal((await asset0.balanceOf(accounts[0])).sub(prevBalance0).toNumber(), removeAmount, "correct amount removed");
		var stakeReward = inflator0*(timestamp-stake.timestamp)*(timestamp-stake.timestamp)*removeAmount;
		stakeReward = parseInt(stakeReward/secondsPerDaySquared);
		assert.equal((await stakeHubInstance.balanceOf(accounts[0])).sub(prevBalanceNative).toNumber(), stakeReward, "correct stake reward");
	});


	it('correct payout removing from stake of asset 1', async () => {
		removeAmount = 50000000;
		await helper.advanceTime(100);
		var stake = await stakeHubInstance.stakes1(accounts[0], 0);
		var prevBalance1 = await asset1.balanceOf(accounts[0]);
		var prevBalanceNative = await stakeHubInstance.balanceOf(accounts[0]);
		var rec = await stakeHubInstance.removeFromStake(1, 0, removeAmount, accounts[0]);
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal((await asset1.balanceOf(accounts[0])).sub(prevBalance1).toNumber(), removeAmount, "correct amount removed");
		var stakeReward = inflator1*(timestamp-stake.timestamp)*(timestamp-stake.timestamp)*removeAmount;
		stakeReward = parseInt(stakeReward/secondsPerDaySquared);
		assert.equal((await stakeHubInstance.balanceOf(accounts[0])).sub(prevBalanceNative).toNumber(), stakeReward, "correct stake reward");
	});


	it('correct payout removing from stake of asset 2', async () => {
		removeAmount = 50000000;
		await helper.advanceTime(100);
		var stake = await stakeHubInstance.stakes2(accounts[0], 0);
		var prevBalance2 = await asset2.balanceOf(accounts[0]);
		var prevBalanceNative = await stakeHubInstance.balanceOf(accounts[0]);
		var rec = await stakeHubInstance.removeFromStake(2, 0, removeAmount, accounts[0]);
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		assert.equal((await asset2.balanceOf(accounts[0])).sub(prevBalance2).toNumber(), removeAmount, "correct amount removed");
		var stakeReward = inflator2*(timestamp-stake.timestamp)*(timestamp-stake.timestamp)*removeAmount;
		stakeReward = parseInt(stakeReward/secondsPerDaySquared);
		assert.equal((await stakeHubInstance.balanceOf(accounts[0])).sub(prevBalanceNative).toNumber(), stakeReward, "correct stake reward");
	});


	it('correct payout claiming all asset 0', async () => {
		await helper.advanceTime(100);
		var stakesLength = (await stakeHubInstance.getStats())[0].toNumber();
		var stakes = [];
		for (let i = 0; i < stakesLength; i++) stakes.push(await stakeHubInstance.stakes0(accounts[0], i));
		var prevBalance0 = await asset0.balanceOf(accounts[0]);
		var prevBalanceNative = await stakeHubInstance.balanceOf(accounts[0]);
		var expectedBalance0Change = 0;
		var expectedBalanceNativeChange = 0;
		var rec = await stakeHubInstance.endAllStakes0(accounts[0], {from: accounts[0]});
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		for (let i = 0; i < stakesLength; i++){
			expectedBalance0Change += stakes[i].amount.toNumber();
			expectedBalanceNativeChange += stakes[i].amount.toNumber() * Math.pow(stakes[i].timestamp-timestamp, 2) * inflator0;
		}
		expectedBalanceNativeChange = parseInt(expectedBalanceNativeChange/secondsPerDaySquared);
		assert.equal((await asset0.balanceOf(accounts[0])).sub(prevBalance0).toNumber(), expectedBalance0Change, "correct amount removed");
		assert.equal((await stakeHubInstance.balanceOf(accounts[0])).sub(prevBalanceNative).toNumber(), expectedBalanceNativeChange, "correct stake reward");
	});


	it('correct payout claiming all asset 1', async () => {
		await helper.advanceTime(100);
		var stakesLength = (await stakeHubInstance.getStats())[1].toNumber();
		var stakes = [];
		for (let i = 0; i < stakesLength; i++) stakes.push(await stakeHubInstance.stakes1(accounts[0], i));
		var prevBalance1 = await asset1.balanceOf(accounts[0]);
		var prevBalanceNative = await stakeHubInstance.balanceOf(accounts[0]);
		var expectedBalance1Change = 0;
		var expectedBalanceNativeChange = 0;
		var rec = await stakeHubInstance.endAllStakes1(accounts[0], {from: accounts[0]});
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		for (let i = 0; i < stakesLength; i++){
			expectedBalance1Change += stakes[i].amount.toNumber();
			expectedBalanceNativeChange += stakes[i].amount.toNumber() * Math.pow(stakes[i].timestamp-timestamp, 2) * inflator1;
		}
		expectedBalanceNativeChange = parseInt(expectedBalanceNativeChange/secondsPerDaySquared);
		assert.equal((await asset1.balanceOf(accounts[0])).sub(prevBalance1).toNumber(), expectedBalance1Change, "correct amount removed");
		assert.equal((await stakeHubInstance.balanceOf(accounts[0])).sub(prevBalanceNative).toNumber(), expectedBalanceNativeChange, "correct stake reward");
	});


	it('correct payout claiming all asset 2', async () => {
		await helper.advanceTime(100);
		var stakesLength = (await stakeHubInstance.getStats())[2].toNumber();
		var stakes = [];
		for (let i = 0; i < stakesLength; i++) stakes.push(await stakeHubInstance.stakes2(accounts[0], i));
		var prevBalance2 = await asset2.balanceOf(accounts[0]);
		var prevBalanceNative = await stakeHubInstance.balanceOf(accounts[0]);
		var expectedBalance2Change = 0;
		var expectedBalanceNativeChange = 0;
		var rec = await stakeHubInstance.endAllStakes2(accounts[0], {from: accounts[0]});
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		for (let i = 0; i < stakesLength; i++){
			expectedBalance2Change += stakes[i].amount.toNumber();
			expectedBalanceNativeChange += stakes[i].amount.toNumber() * Math.pow(stakes[i].timestamp-timestamp, 2) * inflator2;
		}
		expectedBalanceNativeChange = parseInt(expectedBalanceNativeChange/secondsPerDaySquared);
		assert.equal((await asset2.balanceOf(accounts[0])).sub(prevBalance2).toNumber(), expectedBalance2Change, "correct amount removed");
		assert.equal((await stakeHubInstance.balanceOf(accounts[0])).sub(prevBalanceNative).toNumber(), expectedBalanceNativeChange, "correct stake reward");
	});

	it('correct contract behaviour after lastStakingTimestamp', async () => {
		stakeAmt = 100;
		//start stake in asset 1 for use in following tests
		await asset1.approve(stakeHubInstance.address, stakeAmt);
		await stakeHubInstance.startStake(1, stakeAmt, true);
		//start stake for use in this test
		await asset0.approve(stakeHubInstance.address, stakeAmt);
		var rec = await stakeHubInstance.startStake(0, stakeAmt, true);
		var timestamp = (await web3.eth.getBlock(rec.receipt.blockNumber)).timestamp;
		//advance beyound lastStakeTimestamp
		await helper.advanceTime(lastStakingTimestamp-timestamp+10);
		removeAmt = 50;

		await stakeHubInstance.removeFromStake(0, 0, removeAmount, accounts[0]).then(() => {
			return "OK"
		}).catch((err) => {
			assert.equal(err.reason, 'this function cannot be called after lastStakingTimestamp has passed', "correct error message");
			return "OOF";
		}).then((res) => {
			assert.equal(res, "OOF", "cannot call remove from strike after lastStakingTimestamp");
		});


		await stakeHubInstance.startStake(0, 1, false, {from: accounts[0]}).then(() => {
			return "OK"
		}).catch((err) => {
			assert.equal(err.reason, 'staking period has ended', "correct error message");
			return "OOF";
		}).then((res) => {
			assert.equal(res, "OOF", "cannot call remove from strike after lastStakingTimestamp");
		});

		var prevBalance0 = await asset0.balanceOf(accounts[0]);
		var prevBalanceNative = await stakeHubInstance.balanceOf(accounts[0]);

		await stakeHubInstance.endAllStakes0(accounts[0]);

		assert.equal((await asset0.balanceOf(accounts[0])).sub(prevBalance0).toNumber(), stakeAmt, "correct amount removed");
		var stakeReward = inflator0*Math.pow(lastStakingTimestamp-timestamp, 2)*stakeAmt;
		stakeReward = parseInt(stakeReward/secondsPerDaySquared);
		assert.equal((await stakeHubInstance.balanceOf(accounts[0])).sub(prevBalanceNative).toNumber(), stakeReward, "correct stake reward");
	});

	it('correct contract behaviour after endStakingTimestamp', async () => {
		var timestamp = (await web3.eth.getBlock('latest')).timestamp;
		await helper.advanceTime(endStakingTimestamp-timestamp+10);
		var prevBalance1 = await asset1.balanceOf(accounts[0]);
		var prevBalanceNative = await stakeHubInstance.balanceOf(accounts[0]);

		await stakeHubInstance.endAllStakes1(accounts[0]);

		assert.equal((await asset1.balanceOf(accounts[0])).sub(prevBalance1).toNumber(), stakeAmt, "correct amount removed");
		assert.equal((await stakeHubInstance.balanceOf(accounts[0])).sub(prevBalanceNative).toNumber(), 0, "no stake reward");
	});

	it('sets up contract for fund distribution', async () => {
		//send eth to the contract
		await tokenInstance.transfer(stakeHubInstance.address, (await tokenInstance.balanceOf(accounts[0])).toString());
		await stakeHubInstance.openForFundDistribution();
		contractBalance = await tokenInstance.balanceOf(stakeHubInstance.address);
		assert.equal(await stakeHubInstance.readyForDistribution(), true, "ready for distribution");
		assert.equal((await stakeHubInstance.totalRewardToDistribute()).toString(), contractBalance, "correct amount of eth to distribute");
	});

	it('distributes funds correctly', async () => {
		totalSupply = await stakeHubInstance.totalSupply();
		/*
			currently the deployer owns all of the tokens
			we send some to another account to make sure distribution is correct when token ownership is not concentrated in 1 account
		*/
		var transferAmount = totalSupply.div(new BN(3));
		await stakeHubInstance.transfer(accounts[1], transferAmount.toString(), {from: accounts[0]});
		var rec = await stakeHubInstance.claim({from: accounts[1]});
		assert.equal(rec.logs[0].args.rewardSent.toString(), (new BN(contractBalance)).mul(transferAmount).div(totalSupply).toString(), "correct amount of eth sent");

		var act0Balance = await stakeHubInstance.balanceOf(accounts[0]);
		rec = await stakeHubInstance.claim({from: accounts[0]});
		assert.equal(rec.logs[0].args.rewardSent.toString(), (new BN(contractBalance)).mul(act0Balance).div(totalSupply).toString(), "correct amount of eth sent");
	});


	it('self destructs', async () => {
		await helper.advanceTime(destructionTimestamp-(await web3.eth.getBlock('latest')).timestamp+10);
		//send an amount of each asset and an amount of eth to stakeHub
		var amount0 = 10;
		var amount1 = 11;
		var amount2 = 12;
		var amountEth = web3.utils.toWei('0.000003', 'ether');
		await asset0.transfer(stakeHubInstance.address, amount0);
		await asset1.transfer(stakeHubInstance.address, amount1);
		await asset2.transfer(stakeHubInstance.address, amount2);
		await web3.eth.sendTransaction({from: accounts[0], to: stakeHubInstance.address, value: amountEth});
		var prevBalance0 = await asset0.balanceOf(accounts[1]);
		var prevBalance1 = await asset1.balanceOf(accounts[1]);
		var prevBalance2 = await asset2.balanceOf(accounts[1]);
		amountEth = (await web3.eth.getBalance(stakeHubInstance.address)).toString();
		var caught = false;
		try {
			await stakeHubInstance.destruct(accounts[1], {from: accounts[1]});
		} catch (err) {
			assert.equal(err.reason, 'only owner', "only owner can call destruct");
			caught = true;
		}
		assert.equal(caught, true, "only owner can call destruct");

		var prevBalanceEth = await web3.eth.getBalance(accounts[1]);

		await stakeHubInstance.destruct(accounts[1], {from: accounts[0]});
		assert.equal((new BN(await web3.eth.getBalance(accounts[1]))).sub(new BN(prevBalanceEth)).toString(), amountEth, "correct amount of eth sent upon destruction");
		assert.equal((await asset0.balanceOf(accounts[1])).sub(prevBalance0).toNumber(), amount0, "correct amount of asset 0 send upon destruction");
		assert.equal((await asset1.balanceOf(accounts[1])).sub(prevBalance1).toNumber(), amount1, "correct amount of asset 1 send upon destruction");
		assert.equal((await asset2.balanceOf(accounts[1])).sub(prevBalance2).toNumber(), amount2, "correct amount of asset 2 send upon destruction");
	});
	/*
		'''''''''Warning for developers!!!!!!!
		do not attempt to write more tests after the previous test as the previous test destructs the contracts
		Instead put tests before 'self destructs' test
	*/
});