pragma solidity >=0.6.0;
import "./IDummyLendingPool.sol";

interface IDummyAToken {
	function UNDERLYING_ASSET_ADDRESS() external view returns(address);
	function POOL() external view returns(ILendingPool);
}