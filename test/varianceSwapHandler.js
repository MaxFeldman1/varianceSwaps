const token = artifacts.require("Token");
const bigMath = artifacts.require("BigMath");
const oracle = artifacts.require("oracle");
const varianceSwapHandler = artifacts.require("varianceSwapHandler");
const longVarianceToken = artifacts.require("longVarianceToken");
const shortVarianceToken = artifacts.require("shortVarianceToken");

const BN = web3.utils.BN;

const helper = require("../helper/helper.js");

function stringMul(str, amount) {
        var ret = "";
        str += ""; //convert str to string if necessary
	for (var i = 1; i <= amount; i<<=1) {
                if ((amount&i)+"" != '0'){
                        ret+=str;
                }
                str += str;
        }
        return ret;
}

function getBalanceString(bn, decimals) {
	if (typeof bn === 'object' || typeof bn === "number") bn = bn.toString();
	var ret;
	if (bn.length <= decimals) ret = "0."+stringMul('0', decimals-bn.length)+bn;
	else ret = bn.substring(0, bn.length-decimals)+'.'+bn.substring(bn.length-decimals);
	//remove trailing 0s
	for (var i = ret.length-1; ret[i] == '0'; ret = ret.substring(0,i), i=ret.length-1){}
	if (ret[ret.length-1]=='.')ret = ret.substring(0,ret.length-1);
	return ret;
}

function getForwardAdjustedString(str, decimals) {
	str = str+"";
	var halves = str.split('.');
	if (halves.length > 2) throw new Error('invalid string');
	var ret;
	if (halves.length == 1) ret = halves[0]+stringMul('0', decimals);
	else if (halves[1].length <= decimals) ret = halves[0]+halves[1]+stringMul('0', decimals-halves[1].length);
	else ret = halves[0]+halves[1].substring(0, decimals);
	var counter = 0;
	for(;counter<ret.length&&ret[counter]=='0';counter++){}
	ret = ret.substring(counter);
	return ret;
}


contract('varance swap handler', function(accounts){

	it('before each', async () => {

		tokenInstance = await token.new();
		asset1 = await token.new();
		asset2 = await token.new();
		bigMathInstance = await bigMath.new();
		oracleInstance = await oracle.new(asset1.address, asset2.address);

		asset1SubUnits = await oracleInstance.underlyingAssetSubUnits();
		asset2SubUnits = await oracleInstance.strikeAssetSubUnits();

		secondsPerDay = 86400;
		startTimestamp = (await web3.eth.getBlock('latest')).timestamp + secondsPerDay;
		lengthOfPriceSeries = "10";
		payoutAtVarianceOf1 = (new BN(10)).pow(await tokenInstance.decimals()).toString() + "000";
		cap = payoutAtVarianceOf1.substring(0, payoutAtVarianceOf1.length-4);
		varianceSwapHandlerInstance = await varianceSwapHandler.new(asset1.address, asset2.address, tokenInstance.address,
			oracleInstance.address, bigMathInstance.address, startTimestamp, lengthOfPriceSeries, payoutAtVarianceOf1, cap);
		longVarianceTokenInstance = await longVarianceToken.new(varianceSwapHandlerInstance.address);
		shortVarianceTokenInstance = await shortVarianceToken.new(varianceSwapHandlerInstance.address);
		await varianceSwapHandlerInstance.setAddresses(longVarianceTokenInstance.address, shortVarianceTokenInstance.address);
		assert.equal(await varianceSwapHandlerInstance.underlyingAssetAddress(), asset1.address, "correct underlying asset address");
		assert.equal(await varianceSwapHandlerInstance.strikeAssetAddress(), asset2.address, "correct strike asset address");
		assert.equal(await varianceSwapHandlerInstance.payoutAssetAddress(), tokenInstance.address, "correct payout asset address");
		assert.equal(await varianceSwapHandlerInstance.oracleAddress(), oracleInstance.address, "correct oracle address");
		assert.equal(await varianceSwapHandlerInstance.bigMathAddress(), bigMathInstance.address, "correct big math address");
		assert.equal((await varianceSwapHandlerInstance.startTimestamp()).toString(), startTimestamp, "correct start timestamp");
		assert.equal((await varianceSwapHandlerInstance.timeBetweenPriceSnapshots()).toString(), secondsPerDay, "correct interval");
		assert.equal((await varianceSwapHandlerInstance.lengthOfPriceSeries()).toString(), lengthOfPriceSeries, "correct amount of price snapshots");
		assert.equal((await varianceSwapHandlerInstance.payoutAtVarianceOf1()).toString(), payoutAtVarianceOf1, "correct payout at variance of 1");
		assert.equal((await varianceSwapHandlerInstance.cap()).toString(), cap, "correct maximum payout");
		assert.equal(await varianceSwapHandlerInstance.longVarianceTokenAddress(), longVarianceTokenInstance.address, "correct long variance token address" );
		assert.equal(await varianceSwapHandlerInstance.shortVarianceTokenAddress(), shortVarianceTokenInstance.address, "correct short variance token address" );
		varianceTokenDecimals = await varianceSwapHandlerInstance.decimals();
		varianceTokenSubUnits = (new BN(10)).pow(varianceTokenDecimals);
		assert.equal((await longVarianceTokenInstance.decimals()).toString(), varianceTokenDecimals.toString(), "same amount of decimals in variance token handler and in long variance token contract");
		assert.equal((await shortVarianceTokenInstance.decimals()).toString(), varianceTokenDecimals.toString(), "same amount of decimals in variance token handler and in short variance token contract");
	});

	async function setPrice(spot) {
		//oracle gets median of last 3 spots set, so to change median we must set spot twice
		await oracleInstance.set(spot);
		return oracleInstance.set(spot);
	}

	function getRealizedVariance(priceSeries) {
		dailyMulplicativeReturns = [];
		var cumulativeVariance = 0;
		var cumulativeMulplicativeReturns = 0;
		for (var i = 1; i < priceSeries.length; i++) {
			dailyMulplicativeReturns.push((priceSeries[i]/priceSeries[i-1])-1);
			cumulativeMulplicativeReturns += dailyMulplicativeReturns[i-1];
		}
		var meanMulplicativeReturn = cumulativeMulplicativeReturns/dailyMulplicativeReturns.length;
		for (var i = 0; i < dailyMulplicativeReturns.length; i++) {
			cumulativeVariance += Math.pow(dailyMulplicativeReturns[i]-meanMulplicativeReturn,2);
		}
		return 365.2422*cumulativeVariance/(dailyMulplicativeReturns.length-1);
	}

	function getStandardDeviation (array) {
		const n = array.length;
		const mean = array.reduce((a, b) => a + b) / n;
		return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / (n-1));
	}

	it('gives correct payout', async () => {
		priceSeries = [100,90,120,350,50,120,130,131,131,134,132];
		var timestamp = (await web3.eth.getBlock('latest')).timestamp;
		await setPrice(priceSeries[0]);
		//go beyound the start timestamp and before the end of the first interval
		await helper.advanceTime(parseInt(startTimestamp) - timestamp + 5);
		//assert.equal((await oracleInstance.fetchSpotAtTime(startTimestamp, asset1.address)).toNumber(), priceSeries[0], "first price set successfully");
		await varianceSwapHandlerInstance.getFirstPrice();
		for (let i = 1; i < priceSeries.length; i++) {
			await setPrice(priceSeries[i]);
			await helper.advanceTime(secondsPerDay);
			assert.equal(await varianceSwapHandlerInstance.ready(), false, "not ready yet");
			rec = await varianceSwapHandlerInstance.fetchFromOracle();
		}
		assert.equal(await varianceSwapHandlerInstance.ready(), true, "ready for claiming");
		realizedVariance = await varianceSwapHandlerInstance.nonCappedPayout();
		inflatedAverageVariance = getRealizedVariance(priceSeries);
		var decimals = payoutAtVarianceOf1.length-1; //where(string == "1"_+stingMul("0", n)) log10(string) = string.length-1
		inflatedAverageVariance = new BN(getForwardAdjustedString(inflatedAverageVariance.toFixed(decimals), decimals));
		assert.equal(realizedVariance.toString().length, inflatedAverageVariance.toString().length, "correct amount of varance digits");
		//we only check the first 15 digits because js floats are only accurate to 15 bits and we used floats to calculate expected variance
		assert.equal(realizedVariance.toString().substring(0, 15), inflatedAverageVariance.toString().substring(0, 15), "correct variance founda");
		cappedPayout = await varianceSwapHandlerInstance.payout();
		expectedPayout = realizedVariance.cmp(new BN(cap)) == 1 ? new BN(cap) : realizedVariance;
		assert.equal(cappedPayout.toString(), expectedPayout.toString(), "correct actual payout");
	});

	it('mints variance swaps', async () => {
		//we want to test what will happen if we don't use an amount that is exactly divisible by subUnits
		amount = (new BN(100)).mul(varianceTokenSubUnits).add(new BN(11111));
		transferAmount = amount.mul(new BN(cap)).div(varianceTokenSubUnits).add(new BN(amount.mod(varianceTokenSubUnits).cmp(new BN(0)) == 0? 0 : 1));
		await tokenInstance.approve(varianceSwapHandlerInstance.address, transferAmount.toString());
		prevTotalSupplyLong = await varianceSwapHandlerInstance.totalSupplyLong();
		prevTotalSupplyShort = await varianceSwapHandlerInstance.totalSupplyShort();
		rec = await varianceSwapHandlerInstance.mintVariance(accounts[0], amount.toString(), true);
		assert.equal((await varianceSwapHandlerInstance.balanceLong(accounts[0])).toString(), amount.toString(), "correct balance long variance");
		assert.equal((await varianceSwapHandlerInstance.balanceShort(accounts[0])).toString(), amount.toString(), "correct balance short variance");
		assert.equal((await varianceSwapHandlerInstance.totalSupplyLong()).toString(), prevTotalSupplyLong.add(amount).toString(), "correct total supply long");
		assert.equal((await varianceSwapHandlerInstance.totalSupplyShort()).toString(), prevTotalSupplyShort.add(amount).toString(), "correct total supply short");
	});

	it('burns variance swaps', async () => {
		amount = (new BN(3)).mul(varianceTokenSubUnits).add(new BN(11111));
		transferAmount = amount.mul(new BN(cap)).div(varianceTokenSubUnits);
		prevBalanceLong = await varianceSwapHandlerInstance.balanceLong(accounts[0]);
		prevBalanceShort = await varianceSwapHandlerInstance.balanceShort(accounts[0]);
		prevTokenBalanceAccount1 = await tokenInstance.balanceOf(accounts[1]);
		prevTotalSupplyLong = await varianceSwapHandlerInstance.totalSupplyLong();
		prevTotalSupplyShort = await varianceSwapHandlerInstance.totalSupplyShort();
		await varianceSwapHandlerInstance.burnVariance(amount.toString(), accounts[1]);
		assert.equal((await varianceSwapHandlerInstance.balanceLong(accounts[0])).toString(), prevBalanceLong.sub(amount).toString(), "correct balance long variance");
		assert.equal((await varianceSwapHandlerInstance.balanceShort(accounts[0])).toString(), prevBalanceShort.sub(amount).toString(), "correct balance short variance");
		assert.equal((await tokenInstance.balanceOf(accounts[1])).sub(prevTokenBalanceAccount1).toString(), transferAmount.toString(), "correct amount of funds distributed");
		assert.equal((await varianceSwapHandlerInstance.totalSupplyLong()).toString(), prevTotalSupplyLong.sub(amount).toString(), "correct total supply long");
		assert.equal((await varianceSwapHandlerInstance.totalSupplyShort()).toString(), prevTotalSupplyShort.sub(amount).toString(), "correct total supply short");
	});

	it('transfers long varaince', async () => {
		balance0 = await longVarianceTokenInstance.balanceOf(accounts[0]);
		balance1 = await longVarianceTokenInstance.balanceOf(accounts[1]);
		amount = new BN(6);
		await longVarianceTokenInstance.transfer(accounts[1], amount.toString());
		assert.equal((await longVarianceTokenInstance.balanceOf(accounts[0])).toString(), balance0.sub(amount).toString(), "correct balance account 0");
		assert.equal((await longVarianceTokenInstance.balanceOf(accounts[1])).toString(), balance1.add(amount).toString(), "correct balance account 1");
	});

	it('transfers short varaince', async () => {
		balance0 = await shortVarianceTokenInstance.balanceOf(accounts[0]);
		balance1 = await shortVarianceTokenInstance.balanceOf(accounts[1]);
		amount = new BN(6);
		await shortVarianceTokenInstance.transfer(accounts[1], amount.toString());
		assert.equal((await shortVarianceTokenInstance.balanceOf(accounts[0])).toString(), balance0.sub(amount).toString(), "correct balance account 0");
		assert.equal((await shortVarianceTokenInstance.balanceOf(accounts[1])).toString(), balance1.add(amount).toString(), "correct balance account 1");
	});

	it('transfers long varaince from', async () => {
		balance1 = await longVarianceTokenInstance.balanceOf(accounts[1]);
		balance2 = await longVarianceTokenInstance.balanceOf(accounts[2]);
		amount = new BN(3);
		await longVarianceTokenInstance.approve(accounts[0], amount.toString(), {from: accounts[1]});
		assert.equal((await longVarianceTokenInstance.allowance(accounts[1], accounts[0])).toString(), amount.toString(), "allowance decreaced");
		await longVarianceTokenInstance.transferFrom(accounts[1], accounts[2], amount);
		assert.equal((await longVarianceTokenInstance.balanceOf(accounts[1])).toString(), balance1.sub(amount).toString(), "correct balance account 1");
		assert.equal((await longVarianceTokenInstance.balanceOf(accounts[2])).toString(), balance2.add(amount).toString(), "correct balance account 2");
		assert.equal((await longVarianceTokenInstance.allowance(accounts[1], accounts[0])).toString(), "0", "allowance decreaced");
	});

	it('transfers short varaince from', async () => {
		balance1 = await shortVarianceTokenInstance.balanceOf(accounts[1]);
		balance2 = await shortVarianceTokenInstance.balanceOf(accounts[2]);
		amount = new BN(5);
		await shortVarianceTokenInstance.approve(accounts[0], amount.toString(), {from: accounts[1]});
		assert.equal((await shortVarianceTokenInstance.allowance(accounts[1], accounts[0])).toString(), amount.toString(), "allowance decreaced");
		await shortVarianceTokenInstance.transferFrom(accounts[1], accounts[2], amount.toString());
		assert.equal((await shortVarianceTokenInstance.balanceOf(accounts[1])).toString(), balance1.sub(amount).toString(), "correct balance account 1");
		assert.equal((await shortVarianceTokenInstance.balanceOf(accounts[2])).toString(), balance2.add(amount).toString(), "correct balance account 2");
		assert.equal((await shortVarianceTokenInstance.allowance(accounts[1], accounts[0])).toString(), "0", "allowance decreaced");
	});

	it('distributes funds correctly', async () => {
		balanceLong0 = await longVarianceTokenInstance.balanceOf(accounts[0]);
		balanceLong1 = await longVarianceTokenInstance.balanceOf(accounts[1]);
		balanceLong2 = await longVarianceTokenInstance.balanceOf(accounts[2]);
		balanceShort0 = await shortVarianceTokenInstance.balanceOf(accounts[0]);
		balanceShort1 = await shortVarianceTokenInstance.balanceOf(accounts[1]);
		balanceShort2 = await shortVarianceTokenInstance.balanceOf(accounts[2]);
		balanceToken0 = await tokenInstance.balanceOf(accounts[0]);
		balanceToken1 = await tokenInstance.balanceOf(accounts[1]);
		balanceToken2 = await tokenInstance.balanceOf(accounts[2]);
		prevTotalSupplyLong = await varianceSwapHandlerInstance.totalSupplyLong();
		prevTotalSupplyShort = await varianceSwapHandlerInstance.totalSupplyShort();
		await varianceSwapHandlerInstance.claim(accounts[0], {from: accounts[0]});
		assert.equal((await varianceSwapHandlerInstance.totalSupplyLong()).toString(), prevTotalSupplyLong.sub(balanceLong0).toString(), "correct total supply long");
		assert.equal((await varianceSwapHandlerInstance.totalSupplyShort()).toString(), prevTotalSupplyShort.sub(balanceShort0).toString(), "correct total supply short");		
		await varianceSwapHandlerInstance.claim(accounts[1], {from: accounts[1]});
		await varianceSwapHandlerInstance.claim(accounts[2], {from: accounts[2]});
		assert.equal((await longVarianceTokenInstance.balanceOf(accounts[0])).toString(), "0", "correct balance long account 0");
		assert.equal((await longVarianceTokenInstance.balanceOf(accounts[1])).toString(), "0", "correct balance long account 1");
		assert.equal((await longVarianceTokenInstance.balanceOf(accounts[2])).toString(), "0", "correct balance long account 2");
		assert.equal((await shortVarianceTokenInstance.balanceOf(accounts[0])).toString(), "0", "correct balance short account 0");
		assert.equal((await shortVarianceTokenInstance.balanceOf(accounts[1])).toString(), "0", "correct balance short account 1");
		assert.equal((await shortVarianceTokenInstance.balanceOf(accounts[2])).toString(), "0", "correct balance short account 2");
		newBalanceToken0 = await tokenInstance.balanceOf(accounts[0]);
		newBalanceToken1 = await tokenInstance.balanceOf(accounts[1]);
		newBalanceToken2 = await tokenInstance.balanceOf(accounts[2]);
		cap = new BN(cap);
		assert.equal(newBalanceToken0.sub(balanceToken0).toString(), balanceLong0.mul(cappedPayout).add(balanceShort0.mul(cap.sub(cappedPayout))).div(varianceTokenSubUnits).toString(), "correct balance after claim account 0");
		assert.equal(newBalanceToken1.sub(balanceToken1).toString(), balanceLong1.mul(cappedPayout).add(balanceShort1.mul(cap.sub(cappedPayout))).div(varianceTokenSubUnits).toString(), "correct balance after claim account 1");
		assert.equal(newBalanceToken2.sub(balanceToken2).toString(), balanceLong2.mul(cappedPayout).add(balanceShort2.mul(cap.sub(cappedPayout))).div(varianceTokenSubUnits).toString(), "correct balance after claim account 2");
	});


	it('sets fee', async () => {
		fee = "100"; //100 basis points corresponds to a fee of 1%
		await varianceSwapHandlerInstance.setFee(fee.toString());
		fetchedFee = await varianceSwapHandlerInstance.fee();
		assert.equal(fetchedFee.toString(), fee, "fee set correctly");
		fee = fetchedFee;
		feeAdjustedCap = await varianceSwapHandlerInstance.feeAdjustedCap();
		_10000BasisPoints = new BN("10000");
		assert.equal(feeAdjustedCap.toString(), cap.mul(_10000BasisPoints.add(fee)).div(_10000BasisPoints).toString(), "correct fee adjusted cap");
	});

	it('sets sendFeeTo', async () => {
		await varianceSwapHandlerInstance.setSendFeeAddress(accounts[3]);
		sendFeeTo = await varianceSwapHandlerInstance.sendFeeTo();
		assert.equal(sendFeeTo, accounts[3], "sets sendEthAddress");
	});

	it('charges fee transfer:false', async () => {
		amount = (new BN(200));
		var transferAmount = amount.mul(feeAdjustedCap);
		amount = amount.mul(varianceTokenSubUnits);
		//newReserves == maxAmount*feeAdjustedCap/_subUnitsVarSwaps
		//maxAmount == newReserves*_subUnitsVarSwaps/_feeAdjCap

		await tokenInstance.transfer(varianceSwapHandlerInstance.address, transferAmount.toString());
		var balanceVarSwaps = await longVarianceTokenInstance.balanceOf(accounts[0]);
		var balancePayout = await tokenInstance.balanceOf(sendFeeTo);
		await varianceSwapHandlerInstance.mintVariance(accounts[0], amount.toString(), false);
		var newBalanceVarSwaps = await longVarianceTokenInstance.balanceOf(accounts[0]);
		var newBalancePayout = await tokenInstance.balanceOf(sendFeeTo);
		assert.equal(newBalanceVarSwaps.sub(balanceVarSwaps).toString(), amount.toString(), "correct payout of variance tokens");
		assert.equal(newBalancePayout.sub(balancePayout).toString(), amount.mul(cap).div(varianceTokenSubUnits).mul(fee).div(_10000BasisPoints).toString(), "correct payout of fee");
	});

	it('charges fee transfer:true', async () => {
		amount = (new BN(300));
		var transferAmount = amount.mul(feeAdjustedCap);
		amount = amount.mul(varianceTokenSubUnits);
		await tokenInstance.approve(varianceSwapHandlerInstance.address, transferAmount.toString());
		var balanceVarSwaps = await longVarianceTokenInstance.balanceOf(accounts[0]);
		var balancePayout = await tokenInstance.balanceOf(sendFeeTo);
		await varianceSwapHandlerInstance.mintVariance(accounts[0], amount.toString(), true);
		var newBalanceVarSwaps = await longVarianceTokenInstance.balanceOf(accounts[0]);
		var newBalancePayout = await tokenInstance.balanceOf(sendFeeTo);
		assert.equal(newBalanceVarSwaps.sub(balanceVarSwaps).toString(), amount.toString(), "correct payout of variance tokens");
		assert.equal(newBalancePayout.sub(balancePayout).toString(), amount.mul(cap).div(varianceTokenSubUnits).mul(fee).div(_10000BasisPoints).toString(), "correct payout of fee");
	});

	it('self destructs', async () => {
		tokenAmt = 10000;
		await tokenInstance.transfer(varianceSwapHandlerInstance.address, tokenAmt);
		balanceToken0 = await tokenInstance.balanceOf(accounts[0]);
		tokenAmt = new BN(tokenAmt);
		contractBalance = await tokenInstance.balanceOf(varianceSwapHandlerInstance.address);
		//advance 10 days after variance swaps mature
		assert.equal(await varianceSwapHandlerInstance.ready(), true, "variance swaps have already matured");
		await helper.advanceTime(864000); //advance time 10 days
		rec = await varianceSwapHandlerInstance.destruct(accounts[0]);
		assert.equal((await tokenInstance.balanceOf(accounts[0])).sub(balanceToken0).toString(), contractBalance.toString(), "all funds drained and sent to owner");
	});

	/*
		'''''''''Warning for developers!!!!!!!
		do not attempt to write more tests after the previous test as the previous test destructs the contracts
		Instead put tests before 'self destructs' test
	*/
});