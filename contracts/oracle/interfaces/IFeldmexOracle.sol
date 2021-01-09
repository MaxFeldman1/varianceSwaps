pragma solidity >=0.6.0 <0.7.0;

interface IFeldmexOracle {
	function decimals() external view returns (uint8);
	function fetchRoundAtTimestamp(uint timestamp) external view returns (uint);
	function fetchSpotAtTime(uint timestamp) external view returns (uint);
}