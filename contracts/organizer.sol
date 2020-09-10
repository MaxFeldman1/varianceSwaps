pragma solidity >=0.6.0 <0.7.0;
import "./varianceSwapHandler.sol";
import "./longVarianceToken.sol";
import "./shortVarianceToken.sol";
import "./oracleDeployer.sol";

contract organizer is Ownable {
	address bigMathAddress;

	oracleDeployer oracleDeployerContract;

	address[] public varianceSwapInstances;

	mapping(address => address) public varianceToStakeHub;

	constructor(address _bigMathAddress, address _oracleDeployerAddress) public {
		bigMathAddress = _bigMathAddress;
		oracleDeployerContract = oracleDeployer(_oracleDeployerAddress);
	}

	function varianceSwapInstancesLength() public view returns(uint) {
		return varianceSwapInstances.length;
	}


	function deployVarianceInstance(address _underlyingAssetAddress, address _strikeAssetAddress, address _payoutAssetAddress,
		uint _startTimestamp, uint16 _lengthOfPriceSeries, uint _payoutAtVarianceOf1, uint _cap) public onlyOwner {

		address _oracleAddress = oracleDeployerContract.oracles(_underlyingAssetAddress, _strikeAssetAddress);
		if (_oracleAddress == address(0)) {
			(bool success, ) = address(oracleDeployerContract).call(abi.encodeWithSignature("deploy(address,address)", _underlyingAssetAddress, _strikeAssetAddress));
			require(success, "failed to deploy oracle");
			_oracleAddress = oracleDeployerContract.oracles(_underlyingAssetAddress, _strikeAssetAddress);
		}

		varianceSwapHandler vsh = new varianceSwapHandler(_underlyingAssetAddress, _strikeAssetAddress, _payoutAssetAddress, 
			_oracleAddress, bigMathAddress, _startTimestamp, _lengthOfPriceSeries, _payoutAtVarianceOf1, _cap);

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
