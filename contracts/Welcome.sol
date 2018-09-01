pragma solidity ^0.4.24;

import "./Withdraw.sol";

/**
 * @title Welcome
 * @notice The Welcome contract gifts first-time users.
 * @notice This feature is useful for testing but may be removed.
 * 			The mechanism for the initial distribution of reputation is still under consideration.
 *			This feature could be disabled by the contract owner at a given time (when the contract
 *			is deployed) by setting giftAmount to zero. [???]
 */
contract Welcome is Withdraw {
	
	uint256 public giftAmount; // Amount of reputation gifted.

	/*_____EXTERNAL FUNCTIONS_____*/

	function claimGift() external {
		_gift(msg.sender);
	}
	
	/*_____SETTER FUNCTIONS_____*/

	function setGiftAmount(uint256 newAmount) external onlyOwner {
		giftAmount = newAmount;
	}
	
	/*_____INTERNAL FUNCTIONS_____*/

	function _gift(address _user) internal {

		UserData storage user = users[_user];

		require (user.reputation == 0);
		require (!user.inDebt);

		user.reputation = uint64(giftAmount);

	}

}
