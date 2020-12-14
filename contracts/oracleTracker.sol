pragma solidity >=0.6.0 <0.7.0;

import "./oracle.sol";
import "./Ownable.sol";

contract oracleTracker is Ownable {

	//phrase => time series oracle
	mapping(string => address) public oracles;

	function setOracle(string memory _phrase, address _oracleAddress) public onlyOwner {
		oracles[_phrase] = _oracleAddress;
	}

}