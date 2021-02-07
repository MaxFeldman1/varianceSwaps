pragma solidity >=0.6.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV2V3Interface.sol";
import "./interfaces/IChainlinkAggregator.sol";
import "./interfaces/IFeldmexOracle.sol";

contract Oracle is IFeldmexOracle {

    AggregatorV2V3Interface ai;

    uint80 constant roundIdMask = 0xFFFFFFFF;

    uint80 constant uint80LeadingBit = (1 << 79);

    uint80 internal immutable roundIdLeadingBits;

    constructor (address _aggregatorAddress) public {
        ai = AggregatorV2V3Interface(_aggregatorAddress);
        uint80 temp = uint80(AggregatorV2V3Interface(_aggregatorAddress).latestRound());
        roundIdLeadingBits = temp - (temp & roundIdMask);
    }

    function getTimestamp(uint80 _roundId) internal view returns (uint timestamp) {
        timestamp = ai.getTimestamp(roundIdLeadingBits ^ _roundId);
    }

    function fetchRoundBehind(uint80 _roundId) internal view returns (uint, uint80) {
        uint timestamp = getTimestamp(_roundId);
        while (timestamp == 0 && _roundId > 0) {
            _roundId--;
            timestamp = getTimestamp(_roundId);
        }
        return (timestamp, _roundId);
    }

    function fetchSpotAtTime(uint timestamp) public view override returns (uint price) {
        uint _roundId = fetchRoundAtTimestamp(timestamp);
        //we can safely assume that the price will never be negative
        price = uint(ai.getAnswer(roundIdLeadingBits ^ _roundId));
    }

    function fremostRoundWithSameTimestamp(uint80 _roundId) internal view returns (uint) {
        uint timestamp = getTimestamp(_roundId);
        _roundId++;
        while (timestamp == getTimestamp(_roundId)) _roundId++;
        return _roundId-1;
    }

    function decimals() external view override returns (uint8) {
        return ai.decimals();
    }

    function latestRound() internal view returns(uint80) {
        return roundIdMask & uint80(ai.latestRound());
    }

    function fetchRoundAtTimestamp(uint timestamp) public view override returns (uint) {
        uint80 latest = latestRound();
        (uint fetchedTime, uint80 fetchedRound) = fetchRoundBehind(latest);
        if (timestamp >= fetchedTime) return fetchedRound;
        latest = fetchedRound;
        uint80 back;
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