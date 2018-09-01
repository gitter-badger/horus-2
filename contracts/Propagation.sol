pragma solidity ^0.4.24;

import "./Profit.sol";

/**
 * @title Profit
 * @notice The Propagation contract manages the propagation of reputation throught post-branches.
 */
contract Propagation is Profit {
	
	// Maximum number of posts throught which reputation will be propagated at a given time.
	uint256 public propagationDepth;
	// Minimum difference on validation (inFavor > against + minDiff) deposits for a post to
	// pay profits and propagate reputation.
	uint256 public minDiff;

	/*_____SETTER FUNCTIONS_____*/

	function setPropagationDepth(uint256 newDepth) external onlyOwner {
		require (newDepth > 0);
		propagationDepth = newDepth;
	}

	function setMinDiff(uint256 newMinDiff) external onlyOwner {
		minDiff = newMinDiff;
	}

	/*_____INTERNAL FUNCTIONS_____*/

	/**
	 * @notice Undoes the reputation propagation of a given post.
	 * @dev Only called when a valid post becomes unvalid (inFavor <= against + minDiff).
	 */
	function _unvalidate(PostData storage _post) internal {
		int72 lastPropagationAmount = _post.lastPropagationAmount;
		_post.lastPropagationAmount = 0;
		_post = posts[_post.pointsToID].data;
		_post.reputation -= lastPropagationAmount;
	}

	/**
	 * @notice Starts the propagation of the reputation of a post that may or may not have roots.
	 */
	function _propagatePost(CompletePost storage _post, uint48 _postID) internal {
		if (_post.data.rootPosts.length == 0) {
			_propagate(_post, _postID, _post.post.inFavorDeposit > _post.post.againstDeposit);
		} else {
			_propagate(_post, _postID, _post.data.reputation > 0);
		}
	}
	
	/**
	 * @notice Propagates the reputation of a post through according to the inFavor/against relations.
	 * @dev Propagates +reputation if in favor and -reputation if against.
	 */
	function _propagate(CompletePost storage _post, uint48 _lastId, bool _prevWinner) internal {

		int72 reputation;
		int72 lastPropagationAmount;
		int72 prevReputation;

		uint48 pointsToID;

		for (uint256 i; i < propagationDepth; i++) {

			if (_post.validation.inFavorDeposit >= _post.validation.againstDeposit + uint64(minDiff)) {

				_payProfit(_post.post, _prevWinner);
				pointsToID = _post.data.pointsToID;

				if (pointsToID == 0) {
					break;
				// Is this more efficient than reputation = X; reputation *= inFavorOrAgainst? [???]
				// What about all the int64() thing?
				} else if (i == 0 && _post.data.rootPosts.length == 0) {
					reputation = int64(_post.post.inFavorDeposit - _post.post.againstDeposit) * int64(_post.data.inFavorOrAgainst);
				} else {
					reputation = int64(_post.data.reputation) * int64(_post.data.inFavorOrAgainst);
				}

				lastPropagationAmount = _post.data.lastPropagationAmount;
				_post.data.lastPropagationAmount = int72(reputation);

				_post = posts[pointsToID];
				
				if (!_post.data.isRoot[_lastId]) {
					_post.data.isRoot[_lastId] = true;
					_post.data.rootPosts.push(_lastId);
				}
				
				_lastId = pointsToID;
				prevReputation = _post.data.reputation;
				
				_prevWinner = prevReputation > 0;
				_post.data.reputation = prevReputation + reputation - lastPropagationAmount;

			} else {	
				break;
			}

		}

	}

}
