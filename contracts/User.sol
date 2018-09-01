pragma solidity ^0.4.24;

/**
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */

import "./Ownable.sol";

/**
 * @title User
 * @notice The User contract contains user data and provides reputation loans and commission
 * payment functionalities.
 * @dev All loan functionality has not been tested yet.
 */

contract User is Ownable {
	
	struct Loan {
		address lenderAddress;
		uint64 amount;
	}

	struct UserData {
		uint64 reputation;
		uint64 loanReturnDeadline;
		uint64 invitationCooldownTime;
		uint8 chosenLoanIndex;
		bool inDebt;
		Loan[3] loanOffers;
	}
	
	uint256 public invitationCooldownTime;	// Minimum time in seconds between loan offers.
	uint256 public invitationLoanTime;		// Time after the a loan is accepted in which commissions are not charged.
	uint256 public invitationLoanMaxAmount;	// Max amount of reputation that can be lent.
	uint256 public invitationLoanMinAmount;	// Minimum amount of reputation that can be lent.
	uint256 public invitationLoanInterest;	// Interest pay for a loan.
	
	uint256 public maxInvestedFraction;		// Maximum fraction of a user reptation that can be invested in at a given time.
	uint256 public debtProfitCommision;		// Commission charged on the profit of an indebted user.
	uint256 public subventionRate;			// Increase in the amount paid to a lender through the generation of reputation.
  
	mapping (address => UserData) public users;

	/*_____EXTERNAL FUNCTIONS_____*/

	function offerLoan(address to, uint256 loanAmount) external {
		_offerLoan(msg.sender, to, loanAmount);
	}

	function acceptLoan(uint256 loanOfferIndex) external {
		_acceptLoan(msg.sender, loanOfferIndex);
	}

	function payDebt(uint256 amount) external {
		_paySomeDebt(msg.sender, amount);
	}

	/*_____SETTER FUNCTIONS_____*/
	
	function setInvitationCooldownTime(uint256 newInvitationCooldownTime) external onlyOwner {
		require (newInvitationCooldownTime < 7 days);
		invitationCooldownTime = newInvitationCooldownTime;
	}

	function setInvitationLoanTime(uint256 newInvitationLoanTime) external onlyOwner {
		require (newInvitationLoanTime >= 7 days);
		require (newInvitationLoanTime <= 12 weeks);
		invitationLoanTime = newInvitationLoanTime;
	}

	function setInvitationLoanMaxAmount(uint256 newInvitationLoanMaxAmoun) external onlyOwner {
		invitationLoanMaxAmount = newInvitationLoanMaxAmoun;
	}

	function setInvitationLoanMinAmount(uint256 newInvitationLoanMinAmount) external onlyOwner {
		require (newInvitationLoanMinAmount > 0);
		invitationLoanMinAmount = newInvitationLoanMinAmount;
	}

	function setInvitationLoanInterest(uint256 newInvitationLoanInterest) external onlyOwner {
		require (newInvitationLoanInterest <= 3000000);
		invitationLoanInterest = newInvitationLoanInterest;
	}

	function setMaxInvestedFraction(uint256 newMaxInvestedFraction) external onlyOwner {
		require (newMaxInvestedFraction > 0);
		require (newMaxInvestedFraction < 1000000);
		maxInvestedFraction = newMaxInvestedFraction;
	}

	function setPayDebtFraction(uint256 newDebtProfitCommision) external onlyOwner {
		require (newDebtProfitCommision > 0);
		require (newDebtProfitCommision < 1000000);
		debtProfitCommision = newDebtProfitCommision;
	}

	function setSubventionRate(uint256 newSubventionRate) external onlyOwner {
		require (newSubventionRate < 1000000);
		subventionRate = newSubventionRate;
	}

	/*_____GETTER FUNCTIONS_____*/

	function getUser(address userAddress)
	external
	view
	returns(uint64, uint64, uint64, uint8, bool, address[3], uint64[3]) {
		UserData memory userData = users[userAddress];
		Loan[3] memory userLoanOffers = userData.loanOffers;
		return(
			userData.reputation,
			userData.loanReturnDeadline,
			userData.invitationCooldownTime,
			userData.chosenLoanIndex,
			userData.inDebt,
			[userLoanOffers[0].lenderAddress, userLoanOffers[1].lenderAddress, userLoanOffers[2].lenderAddress],
			[userLoanOffers[0].amount, userLoanOffers[1].amount, userLoanOffers[2].amount]
		);
	}

	/*_____INTERNAL FUNCTIONS_____*/
	
	/**
   	* @notice Adds a loan offer to a given user's loanOffers array if certain requirements are met.
   	*/
	function _offerLoan(address _byAddress, address _toAddress, uint256 _loanAmount) internal {
		
		UserData storage byData = users[_byAddress];
		UserData storage to = users[_toAddress];

		require (_byAddress != _toAddress);
		require (now >= byData.invitationCooldownTime);
		require (!byData.inDebt);
		require (!to.inDebt);
		require (_loanAmount * 1000000 / uint256(byData.reputation) <= maxInvestedFraction);
		require (_loanAmount <= invitationLoanMaxAmount);
		require (_loanAmount >= invitationLoanMinAmount);

		uint256 loanIndex = 0;

		while (loanIndex < 3) {
			if (to.loanOffers[loanIndex].lenderAddress != address(0) || to.loanOffers[loanIndex].lenderAddress != _byAddress) {
				break;
			}
			loanIndex++;
		}

		Loan storage newLoan = to.loanOffers[loanIndex];
		newLoan.lenderAddress = _byAddress;
		newLoan.amount = uint64(_loanAmount * invitationLoanInterest / 1000000);
		
		byData.invitationCooldownTime = uint64(now + invitationCooldownTime);

	}

	/**
   	* @notice Initializes a loan in the loanOffers array.
   	*/
	function _acceptLoan(address _userAddress, uint256 _loanOfferIndex) internal {

		UserData storage user = users[_userAddress];

		require (!user.inDebt);
		require (_loanOfferIndex < 3);

		Loan memory acceptedLoan = user.loanOffers[_loanOfferIndex];
		UserData storage lenderData = users[acceptedLoan.lenderAddress];
		
		require (!lenderData.inDebt);

		uint64 amount = uint64(uint256(acceptedLoan.amount) * 1000000 / invitationLoanInterest);

		require (uint256(amount) < maxInvestedFraction);

		lenderData.reputation -= amount;
		user.reputation += amount;
		user.chosenLoanIndex = uint8(_loanOfferIndex);
		user.inDebt = true;
		user.loanReturnDeadline = uint64(now + invitationLoanTime);

	}

	/**
   	 * @notice Pays a fraction of a user's profit to the lender if there is one and the return the
   	 * deadline has passed.
   	 */
	function _payCommision(address _userAddress, uint256 _amount) internal {
		
		UserData storage userData = users[_userAddress];

		if (userData.inDebt && now >= userData.loanReturnDeadline) {
			_payDebt(_userAddress, uint64(_amount * debtProfitCommision * subventionRate / 1000000000000));
			_amount = uint64(_amount * (1000000 - debtProfitCommision) / 1000000);
		}

		userData.reputation += uint64(_amount);

	}

	/**
   	 * @notice Transfers reputation to the user's lender.
   	 */
	function _payDebt(address _userAddress, uint64 _amount) internal {

		UserData storage userData = users[_userAddress];
		Loan storage loan = userData.loanOffers[userData.chosenLoanIndex];

		if (_amount >= loan.amount) {
			userData.reputation += _amount - loan.amount;
			_amount = loan.amount;
			loan.amount = 0;
			userData.inDebt = false;
		} else {
			loan.amount -= _amount;
		}

		_payCommision(userData.loanOffers[userData.chosenLoanIndex].lenderAddress, _amount);

	}

	/**
   	 * @notice Transfers part Of the user's reputation to the lender.
   	 * @dev Note that this function is only called when the user voluntarily returns part of the debt.
   	 */
	function _paySomeDebt(address _userAddress, uint256 _amount) internal {
		
		UserData storage userData = users[_userAddress];

		require (_amount < userData.reputation);
		require (_amount * 1000000 / uint256(userData.reputation) < maxInvestedFraction);
		
		userData.reputation -= uint64(_amount);
		_payDebt(_userAddress, uint64(_amount));
	
	}
	
}