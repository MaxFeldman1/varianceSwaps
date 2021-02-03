pragma solidity >=0.6.0;
import "./SignedSafeMath.sol";
import "./SafeMath.sol";
import "./bigMathStorage.sol";

contract BigMath is bigMathStorage {
	using SafeMath for uint;
	using SignedSafeMath for int;
	/*
		We avoid using safe math here where we can for efficiency
	*/

	int internal constant inflator = 1e18;

	//(e**0.4 == 1.491824697641270317) * 10**18
	int internal constant eToPoint4 = 1.491824697641270317e18;
	int internal constant shifter = 4e17;

	uint public constant seriesTermInflator = 1e36;

	/*
		@Description: this function is meant to be called via delegatecall
			This allows access to daily returns from which we can find the variance here
	*/
	function seriesVariance() public {
		uint seriesLength = dailyReturns.length;	//gas savings
		int meanDailyReturn = summationDailyReturns.div(seriesLength.toInt());
		uint summationVariance;
		int inner;
		for (uint i = 0; i < seriesLength; i++) {
			inner = dailyReturns[i]-meanDailyReturn;
			summationVariance += inner.mul(inner).toUint().div(seriesTermInflator);
		}
		result = summationVariance.div(seriesLength.sub(1)).mul(payoutAtVarianceOf1).mul(annualizer).div(seriesTermInflator).div(annualizerInflator);
	}


}