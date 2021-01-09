pragma solidity >=0.6.0 <0.7.0;

interface IOracleContainer {
	function phraseToLatestPrice(string calldata _phrase) external view returns (uint spot, uint8 decimals);
	function phraseToHistoricalPrice(string calldata _phrase, uint _timestamp) external view returns (uint spot, uint8 decimals);

	function BaseAggregatorAddress(string calldata _phrase) external view returns (address);
	function OracleAddress(string calldata _phrase) external view returns (address);
}