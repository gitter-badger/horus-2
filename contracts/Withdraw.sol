pragma solidity ^0.4.24;

import "./Vote.sol";

/**
 * @title Withdraw
 * @notice The Withdraw contract manages votes profit/returns withdrawal.
 */
contract Withdraw is Vote {

	/*_____EXTERNAL FUNCTIONS_____*/

	function withdrawPost(uint256 postID) external {
		_withdraw(posts[postID].post, msg.sender);
	}

	function withdrawValidation(uint256 postID) external {
		_withdraw(posts[postID].validation, msg.sender);
	}

	/*_____INTERNAL FUNCTIONS_____*/
	
	/**
	 * @notice Transfers the profits/returns a user has made on a given post/validation to the user
	 *			and pays the apropiate commisions.
	 */
	function _withdraw(PostContent storage _post, address _user) internal {

		uint256 difference;
		uint256 amount;

		// Profits are distributed proportionately to the number shares each user owns.

		difference = _post.inFavorProfit - _post.votes[_user].userAgainstProfitBalance;

		if (difference > 0) {
			amount = difference * _post.votes[_user].userInFavorShares / _post.inFavorShares;
			_post.votes[_user].userAgainstProfitBalance = _post.inFavorProfit;
			_payCommision(_user, amount);
		}

		difference = _post.againstProfit - _post.votes[_user].userAgainstProfitBalance;

		if (difference > 0) {
			amount = difference * _post.votes[_user].userAgainstShares / _post.againstShares;
			_post.votes[_user].userAgainstProfitBalance = _post.againstProfit;
			_payCommision(_user, amount);
		}

		// Profits are distributed proportionately to each user's deposit.

		difference = _post.inFavorReturns - _post.votes[_user].userInFavorReturnsBalance;

		if (difference > 0) {
			amount = difference * _post.votes[_user].userInFavorDeposit / (_post.inFavorReturns + _post.inFavorDeposit + _post.againstProfit - _post.initialPostDeposit);
			_post.votes[_user].userInFavorReturnsBalance = _post.inFavorReturns;
			_payCommision(_user, amount);
		}

		difference = _post.againstReturns - _post.votes[_user].userAgainstReturnsBalance;

		if (difference > 0) {
			amount = difference * _post.votes[_user].userAgainstDeposit /
					 (_post.againstReturns + _post.againstDeposit + _post.inFavorProfit - _post.initialPostDeposit);
			_post.votes[_user].userAgainstReturnsBalance = _post.againstReturns;
			_payCommision(_user, amount);
		}

	}

}
