pragma solidity >=0.6.0;
import "./interfaces/DummyILendingPool.sol";

contract DummyLendingPool is ILendingPool {

	mapping(address => uint) public override getReserveNormalizedIncome;

	function setReserveNormalizedIncome(address asset, uint income) public {
		getReserveNormalizedIncome[asset] = income;
	}
}
