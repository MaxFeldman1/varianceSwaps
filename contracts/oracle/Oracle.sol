pragma solidity >=0.6.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV2V3Interface.sol";
import "./interfaces/IAggregatorFacade.sol";
import "./interfaces/IFeldmexOracle.sol";

contract Oracle is IFeldmexOracle {

    AggregatorV2V3Interface ai;

    constructor (address _aggregatorAddress) public {
        ai = AggregatorV2V3Interface(_aggregatorAddress);
    }

    function fetchRoundBehind(uint80 _roundId) internal view returns (uint, uint80) {
        uint timestamp = ai.getTimestamp(_roundId);
        while (timestamp == 0 && _roundId > 0) {
            _roundId--;
            timestamp = ai.getTimestamp(_roundId);
        }
        return (timestamp, _roundId);
    }

    function fetchSpotAtTime(uint timestamp) public view override returns (uint price) {
        //we can safely assume that the price will never be negative
        price = uint(ai.getAnswer(fetchRoundAtTimestamp(timestamp)));
    }

    function fremostRoundWithSameTimestamp(uint _roundId) internal view returns (uint) {
        uint timestamp = ai.getTimestamp(_roundId);
        _roundId++;
        while (timestamp == ai.getTimestamp(_roundId)) _roundId++;
        return _roundId-1;
    }

    function decimals() external view override returns (uint8) {
        return ai.decimals();
    }

    function fetchRoundAtTimestamp(uint timestamp) public view override returns (uint) {
        uint80 latest = uint80(ai.latestRound());
        (uint fetchedTime, uint80 fetchedRound) = fetchRoundBehind(latest);
        if (timestamp >= fetchedTime) return fetchedRound;
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