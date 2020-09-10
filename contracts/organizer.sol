pragma solidity >=0.6.0 <0.7.0;
import "./varianceSwapHandler.sol";
import "./longVarianceToken.sol";
import "./shortVarianceToken.sol";

contract organizer is Ownable {
	address bigMathAddress;

	address[] public varianceSwapInstances;

	mapping(address => address) public varianceToStakeHub;

	constructor(address _bigMathAddress) public {
		bigMathAddress = _bigMathAddress;
	}

	function varianceSwapInstancesLength() public view returns(uint) {
		return varianceSwapInstances.length;
	}


	function deployVarianceInstance(string memory phrase, address _payoutAssetAddress, address _oracleAddress, uint _startTimestamp,
		uint16 _lengthOfPriceSeries, uint _payoutAtVarianceOf1, uint _cap) public onlyOwner {

		varianceSwapHandler vsh = new varianceSwapHandler(phrase, _payoutAssetAddress, _oracleAddress, bigMathAddress,
			_startTimestamp, _lengthOfPriceSeries, _payoutAtVarianceOf1, _cap);

		address longVariance = address(new longVarianceToken(address(vsh)));
		address shortVariance = address(new shortVarianceToken(address(vsh)));

		vsh.setAddresses(longVariance, shortVariance);

		varianceSwapInstances.push(address(vsh));
	}

	function addStakeHub(uint _index, address _stakeHubAddress) public onlyOwner {
		require(_index < varianceSwapInstances.length, "index is not in bound");
		address _varianceAddress = varianceSwapInstances[_index];
		require(varianceToStakeHub[_varianceAddress] == address(0), "stake hub address already set");
		varianceToStakeHub[_varianceAddress] = _stakeHubAddress;

		varianceSwapHandler vsh = varianceSwapHandler(_varianceAddress);		

		vsh.setSendFeeAddress(_stakeHubAddress);

		vsh.transferOwnership(owner);
	}
}
