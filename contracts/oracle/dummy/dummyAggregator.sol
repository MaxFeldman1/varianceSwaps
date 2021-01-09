pragma solidity >=0.6.0;

import "../interfaces/IAggregatorFacade.sol";

contract dummyAggregator {

	struct round {
		int answer;
		uint timestamp;
	}

	uint8 public decimals;
	round[] rounds;

	constructor(uint8 _decimals) public {
		decimals = _decimals;
		rounds.push(round(0, block.timestamp));
	}

	function addRound(int _answer) external {
		rounds.push(round(_answer, block.timestamp));
	}

	function getTimestamp(uint _roundId) external view returns(uint) {
		return rounds[_roundId].timestamp;
	}

	function getAnswer(uint _roundId) external view returns(int) {
		return rounds[_roundId].answer;
	}

	function latestRound() external view returns(uint) {
		return rounds.length-1;
	}

	function latestAnswer() external view returns(int) {
		return rounds[rounds.length-1].answer;
	}


}
