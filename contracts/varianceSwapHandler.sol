pragma solidity >=0.6.0;
import "./SafeMath.sol";
import "./oracle.sol";
import "./BigMath.sol";
import "./Ownable.sol";
import "./destructable.sol";
import "./IERC20.sol";

contract varianceSwapHandler is Ownable {
	using SafeMath for uint;

	string public phrase;
	address public payoutAssetAddress;
	address public oracleAddress;
	address public bigMathAddress;

	address public longVarianceTokenAddress;
	address public shortVarianceTokenAddress;

	address payable public sendFeeTo;

	uint public startTimestamp;
	uint32 public timeBetweenPriceSnapshots = 86400; //1 day
	/*
		Once we have the average daily variance we must annalize by multiplying by 365.2422 (the exact number of days per year)
		we inflate this annualizer by 10**4 to maintain accuracy
		in traditional finance the annualizer is 252 due to the limited number of trading days in a year
		however we are able to find prices at any time of the year so we must adjust our annualizer accordingly
	*/
	uint public annualizer = 3652422;
	uint16 public lengthOfPriceSeries;

	uint public cap;
	/*
		if the average log return was 1
		and thus the variance was 1**2 or 1
		the corresponding payout (not considering the payout cap)
		would be == payoutAtVarianceOf1

		The payout scales down linearly
		so that if variance was 0.5
		payout == 0.5*payoutAtVarianceOf1
	*/
	uint public payoutAtVarianceOf1;

	uint16 public intervalsCalculated;

	uint public nonCappedPayout;
	uint public payout;
	bool public ready;
	bool public calculate;

	uint public previousPrice;
	uint public cumulativeVariance;

	uint public payoutAssetReserves;

	//percentage of funds sent to mint that are to be burned denominated in basis points
	uint8 public fee;
	uint public feeAdjustedCap;

	uint8 public decimals = 18;
	uint public subUnits = 10**18;

	//uint public subUnitsPayout;

	mapping(address => uint) public balanceLong;
	mapping(address => uint) public balanceShort;

	uint public totalSupplyLong;

	uint public totalSupplyShort;

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


	constructor (string memory _phrase, address _payoutAssetAddress,
		address _oracleAddress, address _bigMathAddress, uint _startTimestamp,
		uint16 _lengthOfPriceSeries, uint _payoutAtVarianceOf1,
		uint _cap) public {
		phrase = _phrase;
		payoutAssetAddress = _payoutAssetAddress;
		oracleAddress = _oracleAddress;
		bigMathAddress = _bigMathAddress;
		startTimestamp = _startTimestamp;
		lengthOfPriceSeries = _lengthOfPriceSeries;
		cap = _cap;
		feeAdjustedCap = _cap;
		payoutAtVarianceOf1 = _payoutAtVarianceOf1;
		//subUnitsPayout = uint(10)**(IERC20(_payoutAssetAddress).decimals());
	}

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
		uint _previousPrice = oracle(oracleAddress).fetchSpotAtTime(_startTimestamp);
		//prevent div by 0;
		if (_previousPrice == 0) _previousPrice++;
		previousPrice = _previousPrice;
	}

	/*
		@Description: gets price from oracle, calculates variance and adjusts state accordingly
	*/
	function fetchFromOracle() public {
		intervalsCalculated++;
		uint getAt = startTimestamp.add(uint(intervalsCalculated).mul(timeBetweenPriceSnapshots));
		require(getAt < block.timestamp && previousPrice != 0 && !ready);
		uint price = oracle(oracleAddress).fetchSpotAtTime(getAt);
		/*
			this will likely never be a problem
			however if it is prevent div by 0
		*/
		if (price == 0) price++;
		(bool success, ) = bigMathAddress.call(abi.encodeWithSignature("Variance(uint256,uint256)", price, previousPrice));
		uint variance = uint(success ? BigMath(bigMathAddress).result() : 0);
		cumulativeVariance += variance;
		previousPrice = price;
		if (intervalsCalculated == lengthOfPriceSeries) {
			calculate = true;
			(success, ) = address(this).call(abi.encodeWithSignature("findPayout()"));
			//we only expect that this was not sucessful if there was an overflow
			if (!success) {
				payout = cap;
				ready = true;
				calculate = false;
			}
		}
	}

	/*
		@Description: this is only called once when the last variance has been found
			calculates the payout of the contract
	*/
	function findPayout() public {
		require(calculate);
		//10**36 is the total amount the values returned by the big math contract are inflated by
		//10**4 is the total amount that the annualizer is inflated by
		//thus divide out 10**(36+4)
		nonCappedPayout = cumulativeVariance.div(intervalsCalculated).mul(payoutAtVarianceOf1).mul(annualizer).div(10**40);
		payout = (nonCappedPayout < cap) ? nonCappedPayout : cap;
		ready = true;
		calculate = false;
	}

	function mintVariance(address _to, uint _amount, bool _transfer) public {
		IERC20 pa = IERC20(payoutAssetAddress);
		uint _cap = cap;
		uint _feeAdjustedCap = feeAdjustedCap;
		uint _subUnits = subUnits;
		uint _payoutAssetReserves = payoutAssetReserves;
		if (_transfer) {
			uint transferAmount = _amount.mul(_feeAdjustedCap);
			transferAmount = transferAmount.div(_subUnits).add(transferAmount%_subUnits==0 ? 0 : 1);
			pa.transferFrom(msg.sender, address(this), transferAmount);
		}		uint newReserves = pa.balanceOf(address(this)).sub(_payoutAssetReserves);
		//requiredNewReserves == amount*_feeAdjCap/subUnitsVarSwaps
		//maxAmount == newReserves*_subUnitsVarSwaps/_feeAdjCap
		uint maxAmt = newReserves.mul(_subUnits);
		maxAmt = maxAmt.div(_feeAdjustedCap).add(maxAmt%_feeAdjustedCap==0 ? 0 : 1);
		require(maxAmt >= _amount, "you attempted to mint too many swaps on too little collateral");
		if (_amount == 0) _amount = maxAmt;
		uint _fee = _amount.mul(_feeAdjustedCap).sub(_amount.mul(_cap)).div(_subUnits);
		pa.transfer(sendFeeTo, _fee);
		payoutAssetReserves = newReserves.sub(_fee).add(_payoutAssetReserves);
		balanceLong[_to] = _amount.add(balanceLong[_to]);
		balanceShort[_to] = _amount.add(balanceShort[_to]);
		totalSupplyLong = _amount.add(totalSupplyLong);
		totalSupplyShort = _amount.add(totalSupplyShort);
		emit Mint(_to, _amount);
	}

	function burnVariance(uint _amount, address _to) public {
		require(balanceLong[msg.sender] >= _amount && balanceShort[msg.sender] >= _amount);
		balanceLong[msg.sender] = balanceLong[msg.sender].sub(_amount);
		balanceShort[msg.sender] = balanceShort[msg.sender].sub(_amount);
		uint transferAmount = cap.mul(_amount).div(subUnits);
		payoutAssetReserves = payoutAssetReserves.sub(transferAmount);
		IERC20(payoutAssetAddress).transfer(_to, transferAmount);
		totalSupplyLong = totalSupplyLong.sub(_amount);
		totalSupplyShort = totalSupplyShort.sub(_amount);
		emit Burn(msg.sender, _amount);
	}

	function claim(address _to) public {
		require(ready);
		uint _cap = cap;
		uint _payout = payout;
		uint amountLong = balanceLong[msg.sender];
		uint amountShort = balanceShort[msg.sender];
		uint transferAmount = amountLong.mul(_payout).add(amountShort.mul(_cap.sub(_payout))).div(subUnits);
		balanceLong[msg.sender] = 0;
		balanceShort[msg.sender] = 0;
		totalSupplyLong = totalSupplyLong.sub(amountLong);
		totalSupplyShort = totalSupplyShort.sub(amountShort);
		payoutAssetReserves = payoutAssetReserves.sub(transferAmount);
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
		fee = _fee;
		//fee is denominated in basis points, 1 basis point is 1/10000
		feeAdjustedCap = cap.mul(uint(_fee).add(10000)).div(10000);
	}

	function destruct(address payable _to) public onlyOwner {
		//can only be called 10 days after variance swaps have matured
		require(block.timestamp > startTimestamp+lengthOfPriceSeries*timeBetweenPriceSnapshots + 864000);
		IERC20 payoutAssetContract = IERC20(payoutAssetAddress);
		//there is a possibility that the amount of tokens owned by the contract is greater than payoutAssetReserves variable may imply
		uint tokenBalance = payoutAssetContract.balanceOf(address(this));
		payoutAssetContract.transfer(_to, tokenBalance);
		destructable(longVarianceTokenAddress).destruct(_to);
		destructable(shortVarianceTokenAddress).destruct(_to);
		selfdestruct(_to);
	}
}
