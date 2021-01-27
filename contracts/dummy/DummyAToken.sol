pragma solidity >=0.6.0 <0.8.0;
import "../ERC20.sol";
import "./interfaces/IDummyAToken.sol";
import "./interfaces/IDummyLendingPool.sol";

contract DummyAToken is ERC20, IDummyAToken {

	address public override UNDERLYING_ASSET_ADDRESS;
	ILendingPool public override POOL;

	constructor (address _underlyingAssetAddress, address _lendingPoolAddress) public {
		UNDERLYING_ASSET_ADDRESS = _underlyingAssetAddress;
		POOL = ILendingPool(_lendingPoolAddress);
	}

	function mintTo(address _addr, uint _amount) public {
		balanceOf[_addr] += _amount;
	}
}
