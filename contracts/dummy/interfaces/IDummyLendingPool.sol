pragma solidity >=0.6.0;

interface ILendingPool {
	function getReserveNormalizedIncome(address _asset) external view returns(uint);
}

