pragma solidity >=0.6.0 <0.7.0;
import "./varianceSwapHandler.sol";
import "./deployERC20Tokens.sol";
import "./deployStakeHub.sol";
import "./oracleDeployer.sol";

contract organizer is Ownable {
	address bigMathAddress;

	oracleDeployer oracleDeployerContract;

	address public tokenDeployerAddress;

	address public stakeHubDeployerAddress;

	address[] public varianceSwapInstances;

	event DeployStakeHub(
		uint varSwapIndex,
		address varSwapAddress,
		address stakeHubAddress
	);

	mapping(address => address) public varianceToStakeHub;

	constructor(
		address _bigMathAddress,
		address _oracleDeployerAddress,
		address _tokenDeployerAddress,
		address _stakeHubDeployerAddress
		) public {

		bigMathAddress = _bigMathAddress;
		oracleDeployerContract = oracleDeployer(_oracleDeployerAddress);
		tokenDeployerAddress = _tokenDeployerAddress;
		stakeHubDeployerAddress = _stakeHubDeployerAddress;
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

		address _tokenDeployerAddress = tokenDeployerAddress;

		(bool success, ) = _tokenDeployerAddress.call(abi.encodeWithSignature("deploy(address)", address(vsh)));
		require(success);

		address longVariance = deployERC20Tokens(_tokenDeployerAddress).longVarAddress();
		address shortVariance = deployERC20Tokens(_tokenDeployerAddress).shortVarAddress();

		vsh.setAddresses(longVariance, shortVariance);

		varianceSwapInstances.push(address(vsh));
	}

	function addStakeHub(
		uint _index,
		address _stakeable0,
		address _stakeable1,
		address _stakeable2,
		uint8 _inflator0,
		uint8 _inflator1,
		uint8 _inflator2

		) public onlyOwner {

		require(_index < varianceSwapInstances.length, "index is not in bound");

		address _varianceAddress = varianceSwapInstances[_index];

		require(varianceToStakeHub[_varianceAddress] == address(0), "stake hub address already set");

		address _payoutAssetAddress = varianceSwapHandler(_varianceAddress).payoutAssetAddress();

		address _stakeHubDeployerAddress = stakeHubDeployerAddress; //gas savings

		uint _lastSakingTimestamp = (1 days) * (1 + varianceSwapHandler(_varianceAddress).lengthOfPriceSeries()) + varianceSwapHandler(_varianceAddress).startTimestamp();

		deployStakeHub(_stakeHubDeployerAddress).deploy(
				_payoutAssetAddress,
				_stakeable0,
				_stakeable1,
				_stakeable2,
				_inflator0,
				_inflator1,
				_inflator2,
				_lastSakingTimestamp
		);

		address _stakeHubAddress = deployStakeHub(_stakeHubDeployerAddress).stakeHubAddress();

		varianceToStakeHub[_varianceAddress] = _stakeHubAddress;

		varianceSwapHandler vsh = varianceSwapHandler(_varianceAddress);

		vsh.setSendFeeAddress(_stakeHubAddress);

		vsh.transferOwnership(owner);

		emit DeployStakeHub(_index, _varianceAddress, _stakeHubAddress);
	}
}
