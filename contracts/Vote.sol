pragma solidity ^0.4.24;

import "./Propagation.sol";

/**
 * @title Vote
 * @notice The Vote contract manages votes.
 */
contract Vote is Propagation {

	/*
	The price of x shares in k postion (in favor/against) of post p is:
		x * (shareBasePrice + priceIncrease * (x / 2 + p.kDeposit) / 1000000))
	*/
	uint256 public shareBasePrice;
	uint256 public priceIncrease;

	/*_____EXTERNAL FUNCTIONS_____*/

	/**
	 * @notice Initializes vote on CompetePost.post and charges the user the deposit reputation.
	 */
	function votePost(uint48 postID, uint40 sharesAmount, bool inFavour) external {
		
		require (sharesAmount > 0);
		require (postID < postsLength);

		CompletePost storage _post = posts[postID];
		
		_vote(_post.post, msg.sender, sharesAmount, inFavour);		
		_propagatePost(_post, postID);
	
	}

	/**
	 * @notice Initializes vote on CompetePost.validation and charges the user the deposit reputation.
	 */
	function validatePost(uint48 postID, uint40 sharesAmount, bool inFavour) external {

		require (sharesAmount > 0);
		require (postID < postsLength);

		CompletePost storage _post = posts[postID];
		
		_vote(_post.validation, msg.sender, sharesAmount, inFavour);
		_payProfit(_post.validation, _post.validation.inFavorDeposit > _post.validation.againstDeposit); // > or >= [???]

		if (_post.validation.inFavorDeposit >= uint64(minDiff) + _post.validation.againstDeposit) {
			_propagatePost(_post, postID);
		} else {
			_unvalidate(_post.data);
		}
	
	}

	/**
	 * @notice Pays profits on a given post.
	 */
	function requestProfits(uint48 postID) external {
		// This lines are similar to some in Vote.sol. There may be a more elegant way of doing things.
		CompletePost storage post = posts[postID];
		int256 diff = int256(post.validation.inFavorDeposit) - int256(post.validation.againstDeposit);
		
		_payProfit(post.validation, diff > 0);
		
		if (uint64(diff) > minDiff) {
			if (post.data.rootPosts.length == 0) {
				_payProfit(post.post, post.post.inFavorDeposit > post.post.againstDeposit);
			} else {
				_payProfit(post.post, post.data.reputation > 0);
			}
		}

	}
	
	/*_____SETTER FUNCTIONS_____*/

	function setShareBasePrice(uint256 newShareBasePrice) external onlyOwner {
		shareBasePrice = newShareBasePrice;
	}

	/*_____INTERNAL FUNCTIONS_____*/
	
	/**
	 * @notice Initializes vote on CompetePost.<post/validation> and charges the user the deposit reputation
	 * if certain requirements are met.
	 */
	function _vote(PostContent storage _post, address _voter, uint40 _sharesAmount, bool _for) internal {
		
		uint64 price;
		uint64 reputation = users[_voter].reputation;
		
		if (_for) {
			
			price = uint64(_sharesAmount * (shareBasePrice + priceIncrease * (_sharesAmount / 2 + _post.inFavorDeposit) / 1000000));

			require (reputation > price);
			require (uint256(price) * 1000000 / uint256(reputation) < maxInvestedFraction);
			
			_post.inFavorDeposit += price;
			_post.inFavorShares += _sharesAmount;
			_post.votes[_voter].userInFavorDeposit += price;
			_post.votes[_voter].userInFavorShares  += _sharesAmount;
			
			if (_post.votes[_voter].userInFavorProfitBalance == 0) {
				_post.votes[_voter].userInFavorProfitBalance = _post.inFavorProfit;
				_post.votes[_voter].userInFavorReturnsBalance = _post.inFavorReturns;
			}

		} else {
			
			price = uint64(_sharesAmount * (shareBasePrice + priceIncrease * (_sharesAmount / 2 + _post.againstDeposit) / 1000000));

			require (reputation > price);
			require (uint256(price) * 1000000 / uint256(reputation) < maxInvestedFraction);

			_post.againstDeposit += price;
			_post.againstShares += _sharesAmount;
			_post.votes[_voter].userAgainstDeposit += price;
			_post.votes[_voter].userAgainstShares  += _sharesAmount;

			if (_post.votes[_voter].userAgainstProfitBalance == 0) {
				_post.votes[_voter].userAgainstProfitBalance = _post.againstProfit;
				_post.votes[_voter].userAgainstReturnsBalance = _post.againstReturns;
			}
		
		}

		users[_voter].reputation -= price;

	}

}
