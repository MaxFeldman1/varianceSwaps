pragma solidity >=0.6.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV2V3Interface.sol";

/*
	The only purpose of this interface is to allow us to get the aggregator directly from the AggregatorFacade

	Please note that this interface is made for use with chainlink aggregators but was not made by chainlink
*/
interface IAggregatorFacade {
	function aggregator() external view returns(AggregatorV2V3Interface);
	function description() external view returns(string memory);
}
