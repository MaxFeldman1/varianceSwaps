pragma solidity >=0.6.0;

interface IDummyAToken {
	function UNDERLYING_ASSET_ADDRESS() external view returns(address);
}