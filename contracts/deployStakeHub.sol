pragma solidity >=0.6.0;
import "./stakeHub.sol";

contract deployStakeHub {
	address public stakeHubAddress;

	function deploy(
		address _payoutAssetAddress,
		address _stakeable0,
		address _stakeable1,
		address _stakeable2,
		uint8 _inflator0,
		uint8 _inflator1,
		uint8 _inflator2,
		uint _lastSakingTimestamp
		) public {
		stakeHubAddress = address(new stakeHub(
			_payoutAssetAddress,
			_stakeable0,
			_stakeable1,
			_stakeable2,
			_inflator0,
			_inflator1,
			_inflator2,
			_lastSakingTimestamp,
			_lastSakingTimestamp+(1 weeks),
			_lastSakingTimestamp+(2 weeks)
		));

	}


}