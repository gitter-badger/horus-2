pragma solidity ^0.4.24;

import "./Welcome.sol";

/**
 * @title Main
 * @notice The Main contract serves as a constructor.
 */
contract Main is Welcome {
	
	constructor (
		uint256 initialGiftAmount,
		uint256 initialShareBasePrice,
		uint256 initialPriceIncrease,
		uint256 initialPropagationDepth,
		uint256 initialMinDiff,
		uint256 initialPostFee,
		uint256 initialInvitationCooldownTime,
		uint256 initialInvitationLoanTime,
		uint256 initialInvitationLoanMaxAmount,
		uint256 initialInvitationLoanMinAmount,
		uint256 initialInvitationLoanInterest,
		uint256 initialDebtProfitCommision,
		uint256 initialMaxInvestedFraction,
		uint256 initialSubventionRate
	)
	public
	{
		giftAmount              = initialGiftAmount;
		shareBasePrice          = initialShareBasePrice;
		priceIncrease           = initialPriceIncrease;
		propagationDepth        = initialPropagationDepth;
		minDiff                 = initialMinDiff;
		postFee                 = initialPostFee;
		invitationCooldownTime  = initialInvitationCooldownTime;
		invitationLoanTime      = initialInvitationLoanTime;
		invitationLoanMaxAmount = initialInvitationLoanMaxAmount;
		invitationLoanMinAmount = initialInvitationLoanMinAmount;
		invitationLoanInterest  = initialInvitationLoanInterest;
		debtProfitCommision     = initialDebtProfitCommision;
		maxInvestedFraction     = initialMaxInvestedFraction;
		subventionRate          = initialSubventionRate;
	}

}
