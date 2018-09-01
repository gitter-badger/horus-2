pragma solidity ^0.4.24;

import "./Post.sol";

/**
 * @title Profit
 * @notice The Profit contract manages the payment of profits and returns.
 */
contract Profit is Post {

	/*
	Array[n] = f**(k**n), where:
		f is the daily fraction of the deposit that should NOT go to profits/returns.
		k = 10.
	Maybe there is a better value for k than 10 gas-efficiency. [???]
	*/
	uint32[3] public profitFractionPowers; // [f, f**10, f**100]

	/*_____SETTER FUNCTIONS_____*/

	/**
	 * @notice f(x) returns [x, x**10, x**100]
	 * @dev By precomputing some powers of x, x**n (where n < 1000, 2.74 years in days) can always be calculated in
	 *		3 MUL and 3 EXP (where exponent < 10) operations or less while also mantaining reasonable decimal precision
	 *		(six first decimals) without causing an overflow (which would happen with a very low n as x ≈ 10**6, so
	 *		x**72 ≈ 10**78 > 2**256-1).
	 */
	function setProfitFraction(uint256 fraction) external onlyOwner {
		// Expression has to be an lvalue.
		uint256 _fraction = uint32(fraction);
		profitFractionPowers[0] = uint32(_fraction);
		// For-loop would also work (only two loops if lenght = 3).
		// Does the gas saved make up for the ungliness of the next lines? [???]
		// Big Number = 10**54 = (10**6)**9 = (10**6)**(10-1)
		_fraction = _fraction ** 10 / 1000000000000000000000000000000000000000000000000000000;
		profitFractionPowers[1] = uint32(_fraction);
		profitFractionPowers[2] = uint32(_fraction ** 10 / 1000000000000000000000000000000000000000000000000000000);
	
	}

	/*_____INTERNAL FUNCTIONS_____*/

	/**
	 * @notice Returns the amount of reputation that will go to profits or returns.
	 * @dev profit = d - f ** n, where:
	 *		d is the deposit.
	 *		f is the daily fraction of the deposit that should NOT go to profits/returns.
	 *		n is the number of days since the last payment.
	 */
	function _profits(uint256 _deposit, uint256 _days) internal view returns(uint256) {

		if (_days > 1000) { return _deposit; }
		else if (_days == 0) { return 0; }

		uint256 r = 1000000;
		uint256 n;

		// e.g. f**42 = (f**10)**4 * (f**1)**2 = array[1]**4 * array[0]**2.
		// Is this the best way to do this? For-loop would also work. [???]
		// Do the if-statements really save gas?

		if (_days >= 100) {
			n = _days / 100;
			_days = _days % 100;
			r = r * profitFractionPowers[2] ** n / 1000000 ** n;
		}

		if (_days >= 10) {
			n = _days / 10;
			_days = _days % 10;
			r = r * profitFractionPowers[1] ** n / 1000000 ** n;
		}

		if (_days >= 1) {
			n = _days;
			r = r * profitFractionPowers[0] ** n / 1000000 ** n;
		}

		return _deposit * (1000000 - r) / 1000000;

	}

	/**
	 * @notice Returns the amount of reputation that will go to profits or returns.
	 */
	function _payProfit(PostContent storage _post, bool _inFavour) internal {

		uint256 profits;
		uint256 back;
		uint256 timeDifference;

		if (_post.lastProfitPaymentDay == 0) {
			_post.lastProfitPaymentDay = uint24(now / 1 days);
			return;
		} else {
			timeDifference = now / 1 days - uint256(_post.lastProfitPaymentDay);
			if (timeDifference == 0) {
				return;
			}
		}

		/* CLARIFICATION
		returns: get part of your deposit back.
		profits: get part of the "loosing" deposit if you are on the "winning" one.
		
		Not the best naming. Should be modified. [!!!] */

		if (_inFavour) {

			profits = _profits(_post.againstDeposit, timeDifference);
			back    = _profits(_post.inFavorDeposit, timeDifference);
			
			_post.againstDeposit -= uint64(profits);
			_post.inFavorProfit  += uint64(profits);
			_post.inFavorDeposit -= uint64(back);
			_post.inFavorReturns += uint64(back);
	
		} else {

			profits = _profits(_post.inFavorDeposit, timeDifference);
			back 	= _profits(_post.againstDeposit, timeDifference);
			
			_post.inFavorDeposit -= uint64(profits);
			_post.againstProfit  += uint64(profits);
			_post.againstDeposit -= uint64(back);
			_post.againstReturns += uint64(back);
		
		}

		_post.lastProfitPaymentDay = uint24(now / 1 days);

	}

}
