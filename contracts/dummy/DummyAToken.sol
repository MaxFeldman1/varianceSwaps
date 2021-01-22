pragma solidity >=0.6.0;
import "../ERC20.sol";

contract DummyAToken is ERC20 {
	function mintTo(address _addr, uint _amount) public {
		balanceOf[_addr] += _amount;
	}
}
