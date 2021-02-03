pragma solidity >=0.6.0;
import "./oracle/interfaces/IOracleContainer.sol";
import "./SafeMath.sol";
import "./SignedSafeMath.sol";
import "./BigMath.sol";
import "./Ownable.sol";
import "./destructable.sol";
import "./IERC20.sol";
import "./dummy/interfaces/IDummyLendingPool.sol";
import "./dummy/interfaces/IDummyAToken.sol";

contract varianceSwapHandler is bigMathStorage, Ownable {

	using SafeMath for uint;
	using SignedSafeMath for int;

	string public phrase;

	address public payoutAssetAddress;
	address underlyingAssetAddress;
	address public oracleContainerAddress;
	address public bigMathAddress;

	address public longVarianceTokenAddress;
	address public shortVarianceTokenAddress;

	ILendingPool pool;

	address payable public sendFeeTo;

	uint public startTimestamp;
	uint16 public lengthOfPriceSeries;

	uint public cap;

	uint16 public intervalsCalculated;

	uint public nonCappedPayout;
	uint public payout;
	bool public ready;
	bool public calculate;

	int public previousPrice;
	int public cumulativeDailyReturns;

	//percentage of funds sent to mint that are to be burned denominated in basis points
	uint8 public fee;

	uint8 public decimals = 18;
	uint public subUnits = 10**18;

	mapping(address => uint) public balanceLong;
	mapping(address => uint) public balanceShort;

	uint public totalSupplyLong;

	uint public totalSupplyShort;

	int private constant intSeriesTermInflator = 1e36;

	event Mint(
		address to,
		uint amount
	);

	event Burn(
		address sender,
		uint amount
	);

	event Claim(
		address sender,
		uint amountLong,
		uint amountShort
	);


	constructor (
		string memory _phrase,
		address _payoutAssetAddress,
		address _oracleContainerAddress,
		address _bigMathAddress,
		uint _startTimestamp,
		uint16 _lengthOfPriceSeries,
		uint _payoutAtVarianceOf1,
		uint _cap
		) public {

		phrase = _phrase;
		payoutAssetAddress = _payoutAssetAddress;
		underlyingAssetAddress = IDummyAToken(payoutAssetAddress).UNDERLYING_ASSET_ADDRESS();
		oracleContainerAddress = _oracleContainerAddress;
		bigMathAddress = _bigMathAddress;
		pool = IDummyAToken(payoutAssetAddress).POOL();
		startTimestamp = _startTimestamp;
		lengthOfPriceSeries = _lengthOfPriceSeries;
		cap = _cap;
		payoutAtVarianceOf1 = _payoutAtVarianceOf1;
	}

	function getDailyReturns() public view returns(int[] memory _dailyReturns) {_dailyReturns = dailyReturns;}

	/*
		@Description: sets the addresses of the trusted contracts that are allowed to transfer positions
	*/
	function setAddresses(address _longVarianceTokenAddress, address _shortVarianceTokenAddress) public onlyOwner {
		require(longVarianceTokenAddress == address(0) && shortVarianceTokenAddress == address(0));
		longVarianceTokenAddress = _longVarianceTokenAddress;
		shortVarianceTokenAddress = _shortVarianceTokenAddress;
	}

	/*
		@Description: set the address to which to send eth
	*/
	function setSendFeeAddress(address _sendFeeTo) public onlyOwner {
		require(sendFeeTo == address(0));
		sendFeeTo = payable(_sendFeeTo);
	}

	/*
		@Description: initialises the value of previousPrice to the price at start timestamp
	*/
	function getFirstPrice() public {
		uint _startTimestamp = startTimestamp;
		require(_startTimestamp < block.timestamp && previousPrice == 0);
		(uint _previousPrice, ) = IOracleContainer(oracleContainerAddress).phraseToHistoricalPrice(phrase, _startTimestamp);
		//prevent div by 0;
		if (_previousPrice == 0) _previousPrice++;
		previousPrice = int(_previousPrice);
	}

	/*
		@Description: gets price from oracle, calculates variance and adjusts state accordingly
	*/
	function fetchFromOracle() public {
		intervalsCalculated++;
		uint getAt = startTimestamp.add(uint(intervalsCalculated).mul(1 days));
		require(getAt < block.timestamp && previousPrice != 0 && !ready);
		int price;
		{
			(uint _price, ) = IOracleContainer(oracleContainerAddress).phraseToHistoricalPrice(phrase, getAt);
			price = int(_price);
		}
		/*
			this will likely never be a problem
			however if it is prevent div by 0
		*/
		if (price == 0) price++;
		int mulplicativeReturn = (price.mul(intSeriesTermInflator)/previousPrice).sub(intSeriesTermInflator);
		summationDailyReturns += mulplicativeReturn;
		previousPrice = price;
		dailyReturns.push(mulplicativeReturn);
		if (intervalsCalculated == lengthOfPriceSeries) {
			(bool success, ) = bigMathAddress.delegatecall(abi.encodeWithSignature("seriesVariance()"));
			uint _nonCappedPayout;
			uint _cap = cap;
			if (success) {
				nonCappedPayout = result;
				_nonCappedPayout = result;
			} 
			else {
				nonCappedPayout = _cap;
				_nonCappedPayout = _cap;
			}
			payout = (_nonCappedPayout < _cap) ? _nonCappedPayout : _cap;
			ready = true;
		}
	}

	function fetchNFromOracle(uint16 _N) external {
		uint _intervalsCalculated = intervalsCalculated;
		require(_intervalsCalculated + _N <= lengthOfPriceSeries);
		require(previousPrice != 0 && !ready);
		uint getAt = startTimestamp.add(uint(intervalsCalculated+1).mul(1 days));
		uint16 i;
		int _previousPrice = previousPrice;
		int price;
		int cumulativeMulplicativeReturns;
		for ( ; i < _N && getAt < block.timestamp ; i++) {
			{
				(uint _price, ) = IOracleContainer(oracleContainerAddress).phraseToHistoricalPrice(phrase, getAt);
				price = int(_price);
			}
			/*
				this will likely never be a problem
				however if it is prevent div by 0
			*/
			if (price == 0) price++;
			int mulplicativeReturn = (price.mul(intSeriesTermInflator)/_previousPrice).sub(intSeriesTermInflator);
			cumulativeMulplicativeReturns += mulplicativeReturn;
			_previousPrice = price;
			dailyReturns.push(mulplicativeReturn);
			getAt += 1 days;
		}
		summationDailyReturns += cumulativeMulplicativeReturns;
		previousPrice = price;
		intervalsCalculated += i;
		if (_intervalsCalculated+i == lengthOfPriceSeries) {
			(bool success, ) = bigMathAddress.delegatecall(abi.encodeWithSignature("seriesVariance()"));
			uint _nonCappedPayout;
			uint _cap = cap;
			if (success) {
				nonCappedPayout = result;
				_nonCappedPayout = result;
			} 
			else {
				nonCappedPayout = _cap;
				_nonCappedPayout = _cap;
			}
			payout = (_nonCappedPayout < _cap) ? _nonCappedPayout : _cap;
			ready = true;
		}
	}

	function mintVariance(address _to, uint _amount) public {
		IERC20 pa = IERC20(payoutAssetAddress);
		uint _fee = _amount.mul(fee).div(10000);
		_amount = _amount.sub(_fee);

		uint normalizedIncome = pool.getReserveNormalizedIncome(underlyingAssetAddress);
		uint toMint = _amount.mul(1e27*subUnits).div(cap).div(normalizedIncome);

		require(toMint > 0);
		pa.transferFrom(msg.sender, address(this), _amount+_fee);
		pa.transfer(sendFeeTo, _fee);
		balanceLong[_to] = toMint.add(balanceLong[_to]);
		balanceShort[_to] = toMint.add(balanceShort[_to]);
		totalSupplyLong = toMint.add(totalSupplyLong);
		totalSupplyShort = toMint.add(totalSupplyShort);
		emit Mint(_to, toMint);
	}

	function burnVariance(uint _amount, address _to) public {
		require(balanceLong[msg.sender] >= _amount && balanceShort[msg.sender] >= _amount);
		uint normalizedIncome = pool.getReserveNormalizedIncome(underlyingAssetAddress);
		uint transferAmount = cap.mul(_amount).mul(normalizedIncome).div(subUnits*1e27);
		IERC20(payoutAssetAddress).transfer(_to, transferAmount);
		totalSupplyLong = totalSupplyLong.sub(_amount);
		totalSupplyShort = totalSupplyShort.sub(_amount);
		balanceLong[msg.sender] = balanceLong[msg.sender].sub(_amount);
		balanceShort[msg.sender] = balanceShort[msg.sender].sub(_amount);
		emit Burn(msg.sender, _amount);
	}

	function claim(address _to) public {
		require(ready);
		uint _cap = cap;
		uint _payout = payout;
		uint amountLong = balanceLong[msg.sender];
		uint amountShort = balanceShort[msg.sender];
		uint normalizedIncome = pool.getReserveNormalizedIncome(underlyingAssetAddress);
		uint transferAmount = amountLong.mul(_payout).add(amountShort.mul(_cap.sub(_payout))).mul(normalizedIncome).div(subUnits*1e27);
		balanceLong[msg.sender] = 0;
		balanceShort[msg.sender] = 0;
		totalSupplyLong = totalSupplyLong.sub(amountLong);
		totalSupplyShort = totalSupplyShort.sub(amountShort);
		IERC20(payoutAssetAddress).transfer(_to, transferAmount);
		emit Claim(msg.sender, amountLong, amountShort);
	}

	function transferLongVariance(address _from, address _to, uint _value) public {
		balanceLong[_from] = balanceLong[_from].sub(_value);
		balanceLong[_to] = _value.add(balanceLong[_to]);
	}

	function transferShortVariance(address _from, address _to, uint _value) public {
		balanceShort[_from] = balanceShort[_from].sub(_value);
		balanceShort[_to] = balanceShort[_to].add(_value);
	}

	function setFee(uint8 _fee) public onlyOwner {
		//fee is denominated in basis points, 1 basis point is 1/10000
		fee = _fee;
	}

	function destruct(address payable _to) public onlyOwner {
		//can only be called 10 days after variance swaps have matured
		require(block.timestamp > startTimestamp+(lengthOfPriceSeries+1)*(1 days));
		IERC20 payoutAssetContract = IERC20(payoutAssetAddress);
		uint tokenBalance = payoutAssetContract.balanceOf(address(this));
		payoutAssetContract.transfer(_to, tokenBalance);
		destructable(longVarianceTokenAddress).destruct(_to);
		destructable(shortVarianceTokenAddress).destruct(_to);
		selfdestruct(_to);
	}
}
