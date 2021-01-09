pragma solidity >=0.6.0;

import "../interfaces/IAggregatorFacade.sol";

contract dummyAggregatorFacade is IAggregatorFacade {
	AggregatorV2V3Interface public override aggregator;

	string public override description;

	constructor (address _aggregatorAddress, string memory _description) public {
		aggregator = AggregatorV2V3Interface(_aggregatorAddress);
		description = _description;
	}
}