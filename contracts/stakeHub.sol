pragma solidity >=0.6.0;
import "./ERC20.sol";
import "./IERC20.sol";
import "./Ownable.sol";
import "./destructable.sol";
import "./SafeMath.sol";

contract stakeHub is Ownable, destructable, ERC20 {
	using SafeMath for uint;

	IERC20 public payoutAsset;

	address public stakeable0;
	address public stakeable1;
	address public stakeable2;

	uint8 public inflator0;
	uint8 public inflator1;
	uint8 public inflator2;

	uint public reserves0;
	uint public reserves1;
	uint public reserves2;

	uint public lastStakingTimestamp;
	uint public endStakingTimestamp;
	uint public destructionTimestamp;

	bool public readyForDistribution;
	uint public totalRewardToDistribute;

	struct stake {
		uint timestamp;
		uint amount;
	}

	mapping(address => stake[]) public stakes0;
	mapping(address => stake[]) public stakes1;
	mapping(address => stake[]) public stakes2;

	event Claim(
		address tokenOwner,
		uint rewardSent
	);

	event StartStake(
		address staker,
		uint amount,
		uint8 indexTokenStaked,
		uint indexUserStakeMapping
	);

	event RemoveFromStake(
		address staker,
		uint amount,
		uint8 indexTokenStaked,
		uint indexUserStakeMapping
	);

	event EndAllStakes(
		address staker,
		uint8 indexTokenStaked
	);

constructor(address _payoutAssetAddress, address _stakeable0, address _stakeable1, address _stakeable2,
		uint8 _inflator0, uint8 _inflator1, uint8 _inflator2, uint _lastSakingTimestamp,
		uint _endStakingTimestamp, uint _destructionTimestamp) public {
		payoutAsset = IERC20(_payoutAssetAddress);
		stakeable0 = _stakeable0;
		stakeable1 = _stakeable1;
		stakeable2 = _stakeable2;
		inflator0 = _inflator0;
		inflator1 = _inflator1;
		inflator2 = _inflator2;
		lastStakingTimestamp = _lastSakingTimestamp;
		endStakingTimestamp = _endStakingTimestamp;
		destructionTimestamp = _destructionTimestamp;
	}

	function getStats() public view returns (uint _lenStakes0, uint _lenStakes1, uint _lenStakes2) {
		_lenStakes0 = stakes0[msg.sender].length;
		_lenStakes1 = stakes1[msg.sender].length;
		_lenStakes2 = stakes2[msg.sender].length;
	}

	function startStake(uint8 _index, uint _amount, bool _transfer) public {
		require(block.timestamp < lastStakingTimestamp, "staking period has ended");
		require(!_transfer || _amount > 0, "_amount must be > 0 if transfer is true");
		IERC20 stakeAssetContract;
		if (_index == 0) stakeAssetContract = IERC20(stakeable0);
		else if (_index == 1) stakeAssetContract = IERC20(stakeable1);
		else stakeAssetContract = IERC20(stakeable2);

		if (_transfer) stakeAssetContract.transferFrom(msg.sender, address(this), _amount);

		uint newBalance = stakeAssetContract.balanceOf(address(this));
		uint _reserves;
		uint _mappingIndex;

		if (_index == 0){
			_reserves = reserves0;
			_mappingIndex = stakes0[msg.sender].length;
			_amount = newBalance.sub(_reserves);
			stakes0[msg.sender].push(stake(block.timestamp, _amount));
			reserves0 = newBalance;
		} else if (_index == 1) {
			_reserves = reserves1;
			_mappingIndex = stakes1[msg.sender].length;
			_amount = newBalance.sub(_reserves);
			stakes1[msg.sender].push(stake(block.timestamp, _amount));
			reserves1 = newBalance;
		} else {
			_reserves = reserves2;
			_mappingIndex = stakes2[msg.sender].length;
			_amount = newBalance.sub(_reserves);
			stakes2[msg.sender].push(stake(block.timestamp, _amount));
			reserves2 = newBalance;
		}

		//we got the value for length user stakes before we pushed the new stake thus that length is the index of the new stake
		emit StartStake(msg.sender, _amount, _index, _mappingIndex);
	}


	function removeFromStake(uint8 _mappingIndex, uint _arrayIndex, uint _amount, address _to) public {
		require(block.timestamp < lastStakingTimestamp, "this function cannot be called after lastStakingTimestamp has passed");
		if (_mappingIndex == 0) {
			stakes0[msg.sender][_arrayIndex].amount = stakes0[msg.sender][_arrayIndex].amount.sub(_amount);
			IERC20(stakeable0).transfer(_to, _amount);
			reserves0 = reserves0.sub(_amount);
			uint stakeTime = block.timestamp.sub(stakes0[msg.sender][_arrayIndex].timestamp);
			_amount = uint(inflator0).mul(stakeTime).mul(stakeTime).mul(_amount);
		} else if (_mappingIndex == 1) {
			stakes1[msg.sender][_arrayIndex].amount = stakes1[msg.sender][_arrayIndex].amount.sub(_amount);
			IERC20(stakeable1).transfer(_to, _amount);
			reserves1 = reserves1.sub(_amount);
			uint stakeTime = block.timestamp.sub(stakes1[msg.sender][_arrayIndex].timestamp);
			_amount = uint(inflator1).mul(stakeTime).mul(stakeTime).mul(_amount);
		} else {
			stakes2[msg.sender][_arrayIndex].amount = stakes2[msg.sender][_arrayIndex].amount.sub(_amount);
			IERC20(stakeable2).transfer(_to, _amount);
			reserves2 = reserves2.sub(_amount);
			uint stakeTime = block.timestamp.sub(stakes2[msg.sender][_arrayIndex].timestamp);
			_amount = uint(inflator2).mul(stakeTime).mul(stakeTime).mul(_amount);
		}
		if (block.timestamp < endStakingTimestamp)	{
			//because the time staked is squared to calculate reward, to redenominated the time to days we must multiply by secondsPerDay squared
			_amount = _amount.div((1 days)**2);
			balanceOf[_to] = balanceOf[_to].add(_amount);
			totalSupply = totalSupply.add(_amount);
		}
		emit RemoveFromStake(msg.sender, _amount, _mappingIndex, _arrayIndex);
	}


	function endAllStakes0(address _to) public {
		uint transferAmount;
		uint balanceIncreace;
		uint amount;
		uint inflator = uint(255)&inflator0;
		uint stakeEndsAt = block.timestamp < lastStakingTimestamp ? block.timestamp : lastStakingTimestamp;
		for (uint i = 0; i < stakes0[msg.sender].length; i++) {
			amount = stakes0[msg.sender][i].amount;
			transferAmount = transferAmount.add(amount);
			uint stakeTime = stakeEndsAt.sub(stakes0[msg.sender][i].timestamp);
			balanceIncreace = amount.mul(inflator).mul(stakeTime).mul(stakeTime).add(balanceIncreace);
		}
		IERC20(stakeable0).transfer(_to, transferAmount);
		reserves0 = reserves0.sub(transferAmount);
		if (block.timestamp < endStakingTimestamp)	{
			//because the time staked is squared to calculate reward, to redenominated the time to days we must multiply by secondsPerDay squared
			balanceIncreace = balanceIncreace.div((1 days)**2);
			balanceOf[_to] = balanceIncreace.add(balanceOf[_to]);
			totalSupply = balanceIncreace.add(totalSupply);
		}
		delete stakes0[msg.sender];
		emit EndAllStakes(msg.sender, 0);
	}

	function endAllStakes1(address _to) public {
		uint transferAmount;
		uint balanceIncreace;
		uint amount;
		uint inflator = uint(255)&inflator1;
		uint stakeEndsAt = block.timestamp < lastStakingTimestamp ? block.timestamp : lastStakingTimestamp;
		for (uint i = 0; i < stakes1[msg.sender].length; i++) {
			amount = stakes1[msg.sender][i].amount;
			transferAmount = transferAmount.add(amount);
			uint stakeTime = stakeEndsAt.sub(stakes1[msg.sender][i].timestamp);
			balanceIncreace = amount.mul(inflator).mul(stakeTime).mul(stakeTime).add(balanceIncreace);
		}
		IERC20(stakeable1).transfer(_to, transferAmount);
		reserves1 = reserves1.sub(transferAmount);
		if (block.timestamp < endStakingTimestamp)	{
			//because the time staked is squared to calculate reward, to redenominated the time to days we must multiply by secondsPerDay squared
			balanceIncreace = balanceIncreace.div((1 days)**2);
			balanceOf[_to] = balanceIncreace.add(balanceOf[_to]);
			totalSupply = balanceIncreace.add(totalSupply);
		}
		delete stakes1[msg.sender];
		emit EndAllStakes(msg.sender, 1);
	}

	function endAllStakes2(address _to) public {
		uint transferAmount;
		uint balanceIncreace;
		uint amount;
		uint inflator = uint(255)&inflator2;
		uint stakeEndsAt = block.timestamp < lastStakingTimestamp ? block.timestamp : lastStakingTimestamp;
		for (uint i = 0; i < stakes2[msg.sender].length; i++) {
			amount = stakes2[msg.sender][i].amount;
			transferAmount = transferAmount.add(amount);
			uint stakeTime = stakeEndsAt.sub(stakes2[msg.sender][i].timestamp);
			balanceIncreace = amount.mul(inflator).mul(stakeTime).mul(stakeTime).add(balanceIncreace);
		}
		IERC20(stakeable2).transfer(_to, transferAmount);
		reserves2 = reserves2.sub(transferAmount);
		if (block.timestamp < endStakingTimestamp)	{
			//because the time staked is squared to calculate reward, to redenominated the time to days we must multiply by secondsPerDay squared
			balanceIncreace = balanceIncreace.div((1 days)**2);
			balanceOf[_to] = balanceIncreace.add(balanceOf[_to]);
			totalSupply = balanceIncreace.add(totalSupply);
		}
		delete stakes2[msg.sender];
		emit EndAllStakes(msg.sender, 2);
	}

	function destruct(address _to) public override onlyOwner {
		require(block.timestamp > destructionTimestamp, "destruction timestamp not yet reached");
		address addr = stakeable0;
		uint balance = IERC20(addr).balanceOf(address(this));
		IERC20(addr).transfer(_to, balance);
		addr = stakeable1;
		balance = IERC20(addr).balanceOf(address(this));
		IERC20(addr).transfer(_to, balance);
		addr = stakeable2;
		balance = IERC20(addr).balanceOf(address(this));
		IERC20(addr).transfer(_to, balance);
		balance = payoutAsset.balanceOf(address(this));
		payoutAsset.transfer(_to, balance);
		selfdestruct(payable(_to));
	}


	function openForFundDistribution() public {
		require(!readyForDistribution && block.timestamp > endStakingTimestamp, "wait until endStakingTimestamp has passed");
		uint contractBalance = payoutAsset.balanceOf(address(this));
		//contract owner gets 10% of payout
		uint toOwner = contractBalance/10;
		totalRewardToDistribute = contractBalance.sub(toOwner);
		readyForDistribution = true;
		payoutAsset.transfer(owner, toOwner);
	}

	function claim() public {
		require(readyForDistribution, "distribution phase has not been reached yet");
		uint payout = totalRewardToDistribute.mul(balanceOf[msg.sender])/totalSupply;
		delete balanceOf[msg.sender];
		emit Claim(msg.sender, payout);
		payoutAsset.transfer(msg.sender, payout);
	}

	receive () external payable {}

}
