pragma solidity ^0.4.24;

import "./User.sol";

/**
 * @title Posts
 * @notice The Post contract defines posts and votes.
 */
contract Post is User {

	/**
	 * @notice There's probably a better name for these variables. Feel free to make suggestions.
	 */

	struct Vote {
		// Shares the user owns for a given position (in favor/against)
		uint40 userInFavorShares;
		uint40 userAgainstShares;
		// Deposit the user has made in exchange for those shares.
		uint64 userInFavorDeposit;
		uint64 userAgainstDeposit;
		// The post's returns balance the last time the user made a withdrawal.
		uint64 userInFavorReturnsBalance;
		uint64 userAgainstReturnsBalance;
		// The post's profits balance the last time the user made a withdrawal
		uint64 userInFavorProfitBalance;
		uint64 userAgainstProfitBalance;
	}

	struct PostContent {
		// Total shares issued in a for a given position.
		uint40 inFavorShares;
		uint40 againstShares;
		// Total deposit made for a given postition.
		uint64 inFavorDeposit;
		uint64 againstDeposit;
		// Part of the "loosing" position's deposit that has been given to the "rival" voters.
		uint64 inFavorProfit;
		uint64 againstProfit;
		// Part of a position's deposit that has been returned to users.
		uint64 inFavorReturns;
		uint64 againstReturns;
		
		uint24 lastProfitPaymentDay;		// Time of the last profit payment in days since Jan 01 1970 (UTC).
		uint24 initialPostDeposit; 			// postFee value at the time of posting. Only useful set for validation.
		mapping (address => Vote) votes; 	// Mapping of all the votes.
	}

	// Should the author's address be included in PostData? [???]

	struct PostData {
		int72 reputation;					// Reputation value
		int72 lastPropagationAmount;		// Reputation value the last time it was propagated.
		int8 inFavorOrAgainst;				// Wether the post is in favor or against the post it points to.
		uint48 pointsToID;					// ID of the post it points to.
		uint48 timestamp;					// Time at which the post was posted in seconds since Jan 01 1970 (UTC).
		uint8 hashFunctionIPFS;				// Code of the hash funtion used for the IPFS file.
		bytes32 standardHashIPFS;			// Decoded IPFS hash.
		bytes otherHashIPFS;				// Full decoded multihash if a non-standard multihash is used. Future-proof
											// but consumes more gas.
		uint48[] rootPosts;					// Array of the root posts' IDs.
		mapping (uint48 => bool) isRoot;	// Wether a given post ID is root.
	}

	// CompletePost and CompletePost.post can be confused. Not the best naming... [!!!]

	struct CompletePost {
		PostContent post;
		PostContent validation;
		PostData data;
	}
	
	uint256 public postFee;			// Fee to be deposited in each position for validation and price to be paid for
									// a share in favor when posting.
	uint256 public postsLength = 1;	// Number of posts posted plus one.

	mapping (uint256 => CompletePost) internal posts; // Mapping of IDs to posts.

	/*_____EXTERNAL FUNCTIONS_____*/

	/**
	 * @notice Posts post using standard IPFS multihash.
	 * @dev previousPostsLength post length is returned as it is the ID of the new post.
	 */

	function post32(bytes32 _digestIPFS, uint8 _hashFunctionIPFS, uint48 _pointsToID, bool _inFavor) external returns(uint256) {
		
		require (_digestIPFS.length == 32);
		
		PostData storage _post = _postPost(msg.sender, _pointsToID, _hashFunctionIPFS, _inFavor);
		_post.standardHashIPFS = _digestIPFS;

		uint256 previousPostsLength = postsLength;
		postsLength = previousPostsLength + 1;

		return previousPostsLength;
	
	}

	/**
	 * @notice Posts post using a non-standard IPFS multihash.
	 * @dev Less gas-efficient than post32() but more future-proof.
	 */

	function post(bytes _digestIPFS, uint48 _pointsToID, bool _inFavor) external returns(uint256) {
		
		PostData storage _post = _postPost(msg.sender, _pointsToID, 0, _inFavor);
		_post.otherHashIPFS = _digestIPFS;

		uint256 previousPostsLength = postsLength;
		postsLength = previousPostsLength + 1;

		return previousPostsLength;

	}

	/*_____SETTER FUNCTIONS_____*/

	function setPostFee(uint256 newPostFee) external onlyOwner {
		postFee = newPostFee;
	}

	function getPostData(uint256 postID)
		external
		view
		returns(int72, int72, uint48, uint48, uint8, int8, bytes32, bytes, uint48[])
	{
		PostData memory dataPost = posts[postID].data;
		return(
			dataPost.reputation,
			dataPost.lastPropagationAmount,
			dataPost.pointsToID,
			dataPost.timestamp,
			dataPost.hashFunctionIPFS,
			dataPost.inFavorOrAgainst,
			dataPost.standardHashIPFS,
			dataPost.otherHashIPFS,
			dataPost.rootPosts
		);
	}

	/*_____GETTER FUNCTIONS_____*/

	function getPost(uint256 postID)
		external
		view
		returns(uint40, uint40, uint64, uint64, uint64, uint64, uint64, uint64)
	{
		PostContent memory contentPost = posts[postID].post;
		return (_returnPost(contentPost));
	}

	function getValidationPost(uint256 postID)
		external
		view
		returns(uint40, uint40, uint64, uint64, uint64, uint64, uint64, uint64)
	{
		PostContent memory validationPost = posts[postID].validation;
		return (_returnPost(validationPost));
	}

	function getVote(uint256 postID)
		external
		view
		returns(uint40, uint40, uint64, uint64, uint64, uint64, uint64, uint64)
	{
		Vote memory vote = posts[postID].post.votes[msg.sender];
		return (_returnVote(vote));
	}

	function getValidation(uint256 postID)
		external
		view
		returns(uint40, uint40, uint64, uint64, uint64, uint64, uint64, uint64)
	{
		Vote memory vote = posts[postID].validation.votes[msg.sender];
		return (_returnVote(vote));
	}

	/*_____INTERNAL FUNCTIONS_____*/

	/**
   	 * @notice Posts post and makes the requiered deposits.
   	 */

	function _postPost(address _authorAddress, uint48 _pointsToID, uint8 _hashFunctionIPFS, bool _inFavor)
		internal
		returns(PostData storage)
	{
		// Post fee is deposited three times, maxInvestedFraction = fraction * 1000000.
		require (postFee * 3000000 / users[_authorAddress].reputation <= maxInvestedFraction);
		// A post can only point to an already existing post.
		require (_pointsToID < postsLength);

		CompletePost storage _post = posts[postsLength];
		
		users[_authorAddress].reputation -= uint64(3 * postFee);

		// Make validation deposit.
		_post.validation.inFavorDeposit = uint64(postFee);
		_post.validation.againstDeposit = uint64(postFee);
		_post.validation.initialPostDeposit = uint24(postFee);
		// Buy an inFavor-share.
		_post.post.inFavorDeposit = uint24(postFee);
		_post.post.inFavorShares = 1;
		_post.post.votes[_authorAddress].userInFavorDeposit = uint24(postFee);
		_post.post.votes[_authorAddress].userInFavorShares = 1;
		// Set data
		_post.data.pointsToID = _pointsToID;
		_post.data.hashFunctionIPFS = _hashFunctionIPFS;
		_post.data.timestamp = uint48(now);

		// Reputation will be propagated negatively if the post is against the post it is pointing to.
		if (_pointsToID != 0) {
			if (_inFavor) { _post.data.inFavorOrAgainst = 1; }
			else { _post.data.inFavorOrAgainst = -1; }
		}

		return _post.data;
	
	}

	/**
   	 * @notice Returns post (either CompletePost.post or CompletePost.validation)
   	 */

	function _returnPost(PostContent memory _post)
		internal
		pure
		returns(uint40, uint40, uint64, uint64, uint64, uint64, uint64, uint64)
	{
		return (
			_post.inFavorShares,
			_post.againstShares,
			_post.inFavorDeposit,
			_post.againstDeposit,
			_post.inFavorProfit,
			_post.againstProfit,
			_post.inFavorReturns,
			_post.againstReturns
		);
	}

	/**
   	 * @notice Returns vote (either CompletePost.post.votes[user] or CompletePost.validation.votes[user])
   	 */

	function _returnVote(Vote memory _vote)
		internal
		pure
		returns(uint40, uint40, uint64, uint64, uint64, uint64, uint64, uint64)
	{
		return(
			_vote.userInFavorShares,
			_vote.userAgainstShares,
			_vote.userInFavorDeposit,
			_vote.userAgainstDeposit,
			_vote.userInFavorProfitBalance,
			_vote.userAgainstProfitBalance,
			_vote.userInFavorReturnsBalance,
			_vote.userAgainstReturnsBalance
		);
	}
	
}
