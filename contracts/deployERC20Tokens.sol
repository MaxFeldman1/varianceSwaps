pragma solidity >=0.6.0;
import "./longVarianceToken.sol";
import "./shortVarianceToken.sol";

contract deployERC20Tokens {
	address public longVarAddress;
	address public shortVarAddress;

	function deploy(address _varianceSwapHandlerAddress) public {
		longVarAddress = address(new longVarianceToken(_varianceSwapHandlerAddress));
		shortVarAddress = address(new shortVarianceToken(_varianceSwapHandlerAddress));
	}
}