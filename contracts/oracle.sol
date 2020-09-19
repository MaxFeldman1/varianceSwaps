pragma solidity >=0.6.0 <0.7.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorInterface.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.6/AggregatorFacade.sol";

contract oracle {

    address aggregatorAddress;
    address public fluxAggregatorAddress;
    
    AggregatorInterface ai2;

    constructor (address _aggregatorAddress) public {
        aggregatorAddress = _aggregatorAddress;
        fluxAggregatorAddress = address(AggregatorFacade(_aggregatorAddress).aggregator());
        ai2 = AggregatorInterface(fluxAggregatorAddress);
    }

    function getRoundData(uint80 _roundId) public view
        returns (
          uint80 roundId,
          int256 answer,
          uint256 startedAt,
          uint256 updatedAt,
          uint80 answeredInRound
        )
    {
        (roundId, answer, startedAt, updatedAt, answeredInRound) = AggregatorV3Interface(fluxAggregatorAddress).getRoundData(_roundId);
        require(updatedAt > 0, "invalid round");
    }

    function getLatest() public view
        returns (
          uint80 roundId,
          int256 answer,
          uint256 startedAt,
          uint256 updatedAt,
          uint80 answeredInRound
        )
    {
        return getRoundData(uint32(AggregatorInterface(fluxAggregatorAddress).latestRound()));
    }

    function fetchRoundBehind(uint80 _roundId) public view returns (uint, uint80) {
        uint timestamp = ai2.getTimestamp(_roundId);
        while (timestamp == 0 && _roundId != 0) {
            _roundId--;
            timestamp = ai2.getTimestamp(_roundId);
        }
        return (timestamp, _roundId);
    }

    function fetchSpotAtTime(uint timestamp) public view returns (uint price) {
        //we can safely assume that the price will never be negative
        price = uint(ai2.getAnswer(fetchRoundAtTimestamp(timestamp)));
    }

    function fremostRoundWithSameTimestamp(uint _roundId) internal view returns (uint) {
        uint timestamp = ai2.getTimestamp(_roundId);
        _roundId++;
        while (timestamp == ai2.getTimestamp(_roundId)) _roundId++;
        return _roundId-1;
    }

    function fetchRoundAtTimestamp(uint timestamp) public view returns (uint) {
        uint80 latest = uint80(ai2.latestRound());
        (uint fetchedTime, uint80 fetchedRound) = fetchRoundBehind(latest);
        if (timestamp >= fetchedTime) return fremostRoundWithSameTimestamp(fetchedRound);
        latest = fetchedRound;
        uint80 back; // = 0
        uint80 next;
        uint80 round = latest >> 1;
        do {
            (fetchedTime, fetchedRound) = fetchRoundBehind(round);
            if (fetchedTime > timestamp) {
                latest = fetchedRound;
                next = (back+fetchedRound)>>1;
            } else if (fetchedTime < timestamp) {
                back = round;
                next = (latest+round)>>1;
            } else return fremostRoundWithSameTimestamp(fetchedRound);
            round = next;
        } while (next != back);
        (,back) = fetchRoundBehind(back);
        return fremostRoundWithSameTimestamp(back);
    }
    
}