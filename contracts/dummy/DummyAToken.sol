pragma solidity >=0.6.0 <0.8.0;
import "../ERC20.sol";
import "./interfaces/IDummyAToken.sol";

contract DummyAToken is ERC20, IDummyAToken {

	address public override UNDERLYING_ASSET_ADDRESS;

	constructor (address _underlyingAssetAddress) public {
		UNDERLYING_ASSET_ADDRESS = _underlyingAssetAddress;
	}

	function mintTo(address _addr, uint _amount) public {
		balanceOf[_addr] += _amount;
	}
}
