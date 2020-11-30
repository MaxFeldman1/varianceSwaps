pragma solidity >=0.6.0 <0.7.0;
import "./varianceSwapHandler.sol";
import "./longVarianceToken.sol";
import "./shortVarianceToken.sol";
import "./deployERC20Tokens.sol";

contract organizer is Ownable {
	address bigMathAddress;

	address[] public varianceSwapInstances;

	address public deployerAddress;

	mapping(address => address) public varianceToStakeHub;

	constructor(address _bigMathAddress, address _deployerAddress) public {
		bigMathAddress = _bigMathAddress;
		deployerAddress = _deployerAddress;
	}

	function varianceSwapInstancesLength() public view returns(uint) {
		return varianceSwapInstances.length;
	}


	function deployVarianceInstance(string memory phrase, address _payoutAssetAddress, address _oracleAddress, uint _startTimestamp,
		uint16 _lengthOfPriceSeries, uint _payoutAtVarianceOf1, uint _cap) public onlyOwner {

		varianceSwapHandler vsh = new varianceSwapHandler(phrase, _payoutAssetAddress, _oracleAddress, bigMathAddress,
			_startTimestamp, _lengthOfPriceSeries, _payoutAtVarianceOf1, _cap);

		address _deployerAddress = deployerAddress;

		(bool success, ) = _deployerAddress.call(abi.encodeWithSignature("deploy(address)", address(vsh)));
		require(success);

		address longVariance = deployERC20Tokens(_deployerAddress).longVarAddress();
		address shortVariance = deployERC20Tokens(_deployerAddress).shortVarAddress();
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
