// Values have not been properly thought out yet. [!!!]

var initialGiftAmount              	= 10000;
var initialShareBasePrice          	= 750;
var initialPriceIncrease           	= 750;
var initialPropagationDepth        	= 5;
var initialMinDiff                 	= 1000;
var initialPostFee                 	= 1000;
var initialInvitationCooldownTime  	= 86400;
var initialInvitationLoanTime      	= 1209600;
var initialInvitationLoanMaxAmount 	= 100000;
var initialInvitationLoanMinAmount 	= 5000;
var initialInvitationLoanInterest  	= 1050000;
var initialDebtProfitCommision     	= 250000;
var initialMaxInvestedFraction     	= 500000;
var initialSubventionRate          	= 50000;
var initialProfitFractionPowers	 	= 980000;

var Main = artifacts.require("./Main.sol");

module.exports = function(deployer) {
  deployer.deploy(
  	Main,
  	initialGiftAmount,
	initialShareBasePrice,
	initialPriceIncrease,
	initialPropagationDepth,
	initialMinDiff,
	initialPostFee,
	initialInvitationCooldownTime,
	initialInvitationLoanTime,
	initialInvitationLoanMaxAmount,
	initialInvitationLoanMinAmount,
	initialInvitationLoanInterest,
	initialDebtProfitCommision,
	initialMaxInvestedFraction,
	initialSubventionRate
  ).then(function(deployedContract) {
  	deployedContract.setProfitFraction(initialProfitFractionPowers);
  });
};