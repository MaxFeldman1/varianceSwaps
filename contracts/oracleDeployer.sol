pragma solidity >=0.6.0 <0.7.0;

import "./oracle.sol";

contract oracleDeployer {
	address uniswapFactory;

	//asset1 => asset2 => time series oracle
	mapping(address => mapping(address => address)) public oracles;

	constructor(address _uniswapFactory) public {
		uniswapFactory = _uniswapFactory;
	}

	function deploy(address _underlyingAssetAddress, address _strikeAssetAddress) public {
		require(oracles[_underlyingAssetAddress][_strikeAssetAddress] == address(0));
		address addr = address(new oracle(_underlyingAssetAddress, _strikeAssetAddress));
		oracles[_underlyingAssetAddress][_strikeAssetAddress] = addr;
		oracles[_strikeAssetAddress][_underlyingAssetAddress] = addr;
	}

}