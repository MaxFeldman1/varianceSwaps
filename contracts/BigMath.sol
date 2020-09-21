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

	int inflator = 10**18;

	//(e**0.4 == 1.491824697641270317) * 10**18
	int eToPoint4 = 1491824697641270317;
	int shifter = 4 * 10**17;


	/*
		@Description: this function is meant to be called via delegatecall
			This allows access to daily returns from which we can find the variance here
	*/
	function seriesVariance() public {
		uint _seriesTermInflator = seriesTermInflator;
		uint seriesLength = dailyReturns.length;	//gas savings
		int meanDailyReturn = summationDailyReturns.div(seriesLength.toInt());
		uint summationVariance;
		int inner;
		for (uint i = 0; i < seriesLength; i++) {
			inner = dailyReturns[i]-meanDailyReturn;
			summationVariance += inner.mul(inner).toUint().div(_seriesTermInflator);
		}
		result = summationVariance.div(seriesLength.sub(1)).mul(payoutAtVarianceOf1).mul(annualizer).div(_seriesTermInflator).div(annualizerInflator);
	}

	/*
		@Description: finds naturalLog(inflator * a/b)
	*/
	function dailyLogReturn(uint a, uint b) public view returns (int dailyReturn){
		dailyReturn = naturalLog((uint(inflator).mul(a)/b).toInt());
	}


	/*
		@Description: finds ln(x/inflator)
	*/
	function naturalLog(int x) public view returns (int res) {
		require(x > -1);
		int _inflator = inflator;
		/*
			taylor series is only valid for where 1 <= x <= 1.5
			thus we adjust x by multiplying or dividing by e**0.4
			and subtracting or adding 0.4 to res
		*/
		if (x < _inflator){
			/*
				though unlikely it is possibly that the price could drastically decline
				and if the value of x < 3, this function would be caught in an endless loop
				thus in this case we return a rough precomputed value ln(3)
			*/
			if (x < 3) return -40*inflator;
			int _eToPoint4 = eToPoint4;
			int _shifter = shifter;
			while (x < _inflator) {
				x = x*_eToPoint4/_inflator;
				res -= _shifter;
			}
		} else if (x > 3*_inflator/2) {
			/*
				though unlikely it is possibly that the price could drastically increace
				and if the value of x * inflator > 2**255 this function would revert due to overflow
				thus in this case we return a rough value of ln((2**255-1) * 10**-18)
			*/
			if (x > int(2**255 - 1) / inflator) return 135*inflator;
			int _eToPoint4 = eToPoint4;
			int _shifter = shifter;
			int max = _inflator + _inflator/2;
			while (x > max) {
				x = x*_inflator/_eToPoint4;
				res += _shifter;
			}
		}
		res += taylorSeries(x);
	}


	/*
		@Description: where 1 <= x/inflator <= 1.5
			finds ln(x*inflator)
	*/
	function taylorSeries(int x) public view returns (int res) {
		/*
			We expect 10**18 <= x <= 1.5*10**18
		*/

		/*
			we only refer to x when we are looking for x - _inflator
			thus we can do this one and make future code simpler
			though we must remember this when thinking about the code mathematically
		*/
		int _inflator = inflator;
		x -= _inflator;
		/*
			using Taylor series centered at 1 we find:

			ln(x) = lim as (k => inf) of (sigma(n = 1) => (n = k) of (((-1^(n+1))/n)*((x-1)^n)))

			To get accuracy within 10**-18 which is the smallest amount possible to represent here we must get to the 54th term
		*/
		// term 0 is always == 0 thus start with term 1
		/*
			(X-1)
			x =  x-1
			thus 
			1st term = x
		*/
		res = x;
		//find the rest of the terms in a loop
		int current = x;
		for (int i = 2; i < 54; i++){
			current = current*x/_inflator;
			res -= current/i;
			i++;
			current = current*x/_inflator;
			res += current/i;
		}

	}

}