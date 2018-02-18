#!/bin/bash
# ----------------------------------------------------------------------------------------------
# Testing the smart contract
#
# Enjoy. (c) BokkyPooBah / Bok Consulting Pty Ltd 2017. The MIT Licence.
# ----------------------------------------------------------------------------------------------

MODE=${1:-test}

GETHATTACHPOINT=`grep ^IPCFILE= settings.txt | sed "s/^.*=//"`
PASSWORD=`grep ^PASSWORD= settings.txt | sed "s/^.*=//"`

SOURCEDIR=`grep ^SOURCEDIR= settings.txt | sed "s/^.*=//"`

TOKENSOL=`grep ^TOKENSOL= settings.txt | sed "s/^.*=//"`
TOKENJS=`grep ^TOKENJS= settings.txt | sed "s/^.*=//"`
CROWDSALESOL=`grep ^CROWDSALESOL= settings.txt | sed "s/^.*=//"`
CROWDSALEJS=`grep ^CROWDSALEJS= settings.txt | sed "s/^.*=//"`

DEPLOYMENTDATA=`grep ^DEPLOYMENTDATA= settings.txt | sed "s/^.*=//"`

INCLUDEJS=`grep ^INCLUDEJS= settings.txt | sed "s/^.*=//"`
TEST1OUTPUT=`grep ^TEST1OUTPUT= settings.txt | sed "s/^.*=//"`
TEST1RESULTS=`grep ^TEST1RESULTS= settings.txt | sed "s/^.*=//"`

CURRENTTIME=`date +%s`
CURRENTTIMES=`date -r $CURRENTTIME -u`

START_DATE=`echo "$CURRENTTIME+30" | bc`
START_DATE_S=`date -r $START_DATE -u`
END_DATE=`echo "$CURRENTTIME+60*1+30" | bc`
END_DATE_S=`date -r $END_DATE -u`
REFUND_END_DATE=`echo "$CURRENTTIME+60*2" | bc`
REFUND_END_DATE_S=`date -r $REFUND_END_DATE -u`

printf "MODE               = '$MODE'\n" | tee $TEST1OUTPUT
printf "GETHATTACHPOINT    = '$GETHATTACHPOINT'\n" | tee -a $TEST1OUTPUT
printf "PASSWORD           = '$PASSWORD'\n" | tee -a $TEST1OUTPUT
printf "SOURCEDIR          = '$SOURCEDIR'\n" | tee -a $TEST1OUTPUT
printf "TOKENSOL           = '$TOKENSOL'\n" | tee -a $TEST1OUTPUT
printf "TOKENJS            = '$TOKENJS'\n" | tee -a $TEST1OUTPUT
printf "CROWDSALESOL       = '$CROWDSALESOL'\n" | tee -a $TEST1OUTPUT
printf "CROWDSALEJS        = '$CROWDSALEJS'\n" | tee -a $TEST1OUTPUT
printf "DEPLOYMENTDATA     = '$DEPLOYMENTDATA'\n" | tee -a $TEST1OUTPUT
printf "INCLUDEJS          = '$INCLUDEJS'\n" | tee -a $TEST1OUTPUT
printf "TEST1OUTPUT        = '$TEST1OUTPUT'\n" | tee -a $TEST1OUTPUT
printf "TEST1RESULTS       = '$TEST1RESULTS'\n" | tee -a $TEST1OUTPUT
printf "CURRENTTIME        = '$CURRENTTIME' '$CURRENTTIMES'\n" | tee -a $TEST1OUTPUT
printf "START_DATE         = '$START_DATE' '$START_DATE_S'\n" | tee -a $TEST1OUTPUT
printf "END_DATE           = '$END_DATE' '$END_DATE_S'\n" | tee -a $TEST1OUTPUT
printf "REFUND_END_DATE    = '$REFUND_END_DATE' '$REFUND_END_DATE_S'\n" | tee -a $TEST1OUTPUT

# Make copy of SOL file and modify start and end times ---
# `cp modifiedContracts/SnipCoin.sol .`
`cp $SOURCEDIR/$TOKENSOL .`
`cp $SOURCEDIR/$CROWDSALESOL .`
`cp -rp ../openzeppelin-contracts/* .`

# --- Modify parameters ---
`perl -pi -e "s/zeppelin-solidity\/contracts\///" *.sol`
`perl -pi -e "s/RESTRICTED_PERIOD_DURATION \= 1 days;/RESTRICTED_PERIOD_DURATION \= 30 seconds;/" $CROWDSALESOL`
# `perl -pi -e "s/endDate \= 1513872000;.*$/endDate \= $END_DATE; \/\/ $END_DATE_S/" $CROWDSALESOL`


for FILE in $TOKENSOL $CROWDSALESOL
do
  DIFFS1=`diff $SOURCEDIR/$FILE $FILE`
  echo "--- Differences $SOURCEDIR/$FILE $FILE ---" | tee -a $TEST1OUTPUT
  echo "$DIFFS1" | tee -a $TEST1OUTPUT
done

solc_0.4.18 --version | tee -a $TEST1OUTPUT

echo "var tokenOutput=`solc_0.4.18 --optimize --pretty-json --combined-json abi,bin,interface $TOKENSOL`;" > $TOKENJS
echo "var crowdsaleOutput=`solc_0.4.18 --optimize --pretty-json --combined-json abi,bin,interface $CROWDSALESOL`;" > $CROWDSALEJS

geth --verbosity 3 attach $GETHATTACHPOINT << EOF | tee -a $TEST1OUTPUT
loadScript("$TOKENJS");
loadScript("$CROWDSALEJS");
loadScript("functions.js");

var tokenAbi = JSON.parse(tokenOutput.contracts["$TOKENSOL:VITToken"].abi);
var tokenBin = "0x" + tokenOutput.contracts["$TOKENSOL:VITToken"].bin;
var crowdsaleAbi = JSON.parse(crowdsaleOutput.contracts["$CROWDSALESOL:VITTokenSale"].abi);
var crowdsaleBin = "0x" + crowdsaleOutput.contracts["$CROWDSALESOL:VITTokenSale"].bin;

// console.log("DATA: tokenAbi=" + JSON.stringify(tokenAbi));
// console.log("DATA: tokenBin=" + JSON.stringify(tokenBin));
// console.log("DATA: crowdsaleAbi=" + JSON.stringify(crowdsaleAbi));
// console.log("DATA: crowdsaleBin=" + JSON.stringify(crowdsaleBin));

unlockAccounts("$PASSWORD");
printBalances();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var crowdsaleMessage = "Deploy Crowdsale Contract";
// 0.05 per VIT
// ETH/USD = 902.61
// 902.61 / 0.05 = 18052.2
var vitPerWei = "18052";
var strategicPartnersPools = [eth.accounts[12], eth.accounts[13], eth.accounts[14], eth.accounts[15], eth.accounts[16], eth.accounts[17], eth.accounts[18], eth.accounts[19], eth.accounts[20], eth.accounts[21], eth.accounts[22],eth.accounts[23], eth.accounts[24], eth.accounts[25], eth.accounts[26], eth.accounts[27], eth.accounts[28], eth.accounts[29], eth.accounts[30], eth.accounts[31]];
// -----------------------------------------------------------------------------
console.log("RESULT: " + crowdsaleMessage);
var crowdsaleContract = web3.eth.contract(crowdsaleAbi);
var crowdsaleTx = null;
var crowdsaleAddress = null;
var tokenAddress = null;
var token = null;
var crowdsale = crowdsaleContract.new(wallet, $START_DATE, $END_DATE, $REFUND_END_DATE, vitPerWei, strategicPartnersPools, {from: contractOwnerAccount, data: crowdsaleBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        crowdsaleTx = contract.transactionHash;
      } else {
        crowdsaleAddress = contract.address;
        addAccount(crowdsaleAddress, "Crowdsale Contract");
        addCrowdsaleContractAddressAndAbi(crowdsaleAddress, crowdsaleAbi);
        console.log("DATA: crowdsaleAddress=" + crowdsaleAddress);
        tokenAddress = crowdsale.vitToken();
        token = eth.contract(tokenAbi).at(tokenAddress);
        addAccount(tokenAddress, "Token '" + token.symbol() + "' '" + token.name() + "'");
        addTokenContractAddressAndAbi(tokenAddress, tokenAbi);
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(crowdsaleTx, crowdsaleMessage);
printTxData("crowdsaleAddress=" + crowdsaleAddress, crowdsaleTx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var setCaps_Message = "Set Caps";
var capAccounts = [account3, account4, account5];
var capAmount = web3.toWei(10, "ether");
// -----------------------------------------------------------------------------
console.log("RESULT: " + setCaps_Message);
var setCaps_1Tx = crowdsale.setRestrictedParticipationCap(capAccounts, capAmount, {from: contractOwnerAccount, gas: 100000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(setCaps_1Tx, setCaps_Message);
printTxData("setCaps_1Tx", setCaps_1Tx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


waitUntil("startTime", crowdsale.startTime(), 0);


// -----------------------------------------------------------------------------
var sendContribution0Message = "Send Contribution #0 - During restricted participation period";
// -----------------------------------------------------------------------------
console.log("RESULT: " + sendContribution0Message);
var sendContribution0_1Tx = eth.sendTransaction({from: account5, to: crowdsaleAddress, gas: 400000, value: web3.toWei("0.5", "ether")});
var sendContribution0_2Tx = eth.sendTransaction({from: account6, to: crowdsaleAddress, gas: 400000, value: web3.toWei("0.5", "ether")});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(sendContribution0_1Tx, sendContribution0Message + " - ac5 0.5 ETH");
passIfTxStatusError(sendContribution0_2Tx, sendContribution0Message + " - ac6 0.5 ETH - Expecting failure - no cap");
printTxData("sendContribution0_1Tx", sendContribution0_1Tx);
printTxData("sendContribution0_2Tx", sendContribution0_2Tx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


waitUntil("startTime + RESTRICTED_PERIOD_DURATION", crowdsale.startTime(), 30);


// -----------------------------------------------------------------------------
var sendContribution1Message = "Send Contribution #1 - After restricted participation period";
// -----------------------------------------------------------------------------
console.log("RESULT: " + sendContribution1Message);
var sendContribution1_1Tx = eth.sendTransaction({from: account5, to: crowdsaleAddress, gas: 400000, value: web3.toWei("40000", "ether")});
while (txpool.status.pending > 0) {
}
var sendContribution1_2Tx = eth.sendTransaction({from: account6, to: crowdsaleAddress, gas: 400000, value: web3.toWei("40000", "ether")});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(sendContribution1_1Tx, sendContribution1Message + " - ac5 40,000 ETH");
failIfTxStatusError(sendContribution1_2Tx, sendContribution1Message + " - ac6 40,000 ETH");
printTxData("sendContribution1_1Tx", sendContribution1_1Tx);
printTxData("sendContribution1_2Tx", sendContribution1_2Tx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


waitUntil("endTime", crowdsale.endTime(), 0);


// -----------------------------------------------------------------------------
var finalise_Message = "Finalise";
// -----------------------------------------------------------------------------
console.log("RESULT: " + finalise_Message);
var finalise_1Tx = crowdsale.finalize({from: contractOwnerAccount, gas: 100000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(finalise_1Tx, finalise_Message);
printTxData("finalise_1Tx", finalise_1Tx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var claimTokens_Message = "Claim Tokens";
// -----------------------------------------------------------------------------
console.log("RESULT: " + claimTokens_Message);
var claimTokens_1Tx = crowdsale.claimTokens("1000000000000000000000", {from: account5, gas: 100000, gasPrice: defaultGasPrice});
var claimTokens_2Tx = crowdsale.claimAllTokens({from: account6, gas: 100000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(claimTokens_1Tx, claimTokens_Message + " - ac5 claim 1,000");
failIfTxStatusError(claimTokens_2Tx, claimTokens_Message + " - ac6 claimAll");
printTxData("claimTokens_1Tx", claimTokens_1Tx);
printTxData("claimTokens_2Tx", claimTokens_2Tx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var refundEthers0_Message = "Refund Ethers #1";
// -----------------------------------------------------------------------------
console.log("RESULT: " + refundEthers0_Message);
var refundEthers0_1Tx = crowdsale.refundEther("1000000000000000000000", {from: account5, gas: 100000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(refundEthers0_1Tx, refundEthers0_Message + " - ac5 refund 1,000 ETH");
printTxData("refundEthers0_1Tx", refundEthers0_1Tx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var refundEthers1_Message = "Refund Ethers #2";
// -----------------------------------------------------------------------------
console.log("RESULT: " + refundEthers1_Message);
var refundEthers1_1Tx = crowdsale.refundAllEther({from: account5, gas: 100000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(refundEthers1_1Tx, refundEthers1_Message + " - ac5 refund remaining");
printTxData("refundEthers1_1Tx", refundEthers1_1Tx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


waitUntil("refundEndTime", crowdsale.refundEndTime(), 0);


// -----------------------------------------------------------------------------
var finaliseRefund_Message = "Finalise Refund";
// -----------------------------------------------------------------------------
console.log("RESULT: " + finaliseRefund_Message);
var finaliseRefund_1Tx = crowdsale.finalizeRefunds({from: contractOwnerAccount, gas: 100000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(finaliseRefund_1Tx, finaliseRefund_Message);
printTxData("finaliseRefund_1Tx", finaliseRefund_1Tx);
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var transfersMessage = "Move Tokens";
// -----------------------------------------------------------------------------
console.log("RESULT: " + transfersMessage);
var transfers1Tx = token.transfer(account7, "1000000000000", {from: account5, gas: 100000, gasPrice: defaultGasPrice});
var transfers2Tx = token.approve(account8,  "30000000000000000", {from: account6, gas: 100000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
var transfers3Tx = token.transferFrom(account6, account9, "30000000000000000", {from: account8, gas: 100000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
printTxData("transfers1Tx", transfers1Tx);
printTxData("transfers2Tx", transfers2Tx);
printTxData("transfers3Tx", transfers3Tx);
failIfTxStatusError(transfers1Tx, transfersMessage + " - transfer 0.000001 tokens ac5 -> ac7. CHECK for movement");
failIfTxStatusError(transfers2Tx, transfersMessage + " - approve 0.03 tokens ac6 -> ac8");
failIfTxStatusError(transfers3Tx, transfersMessage + " - transferFrom 0.03 tokens ac6 -> ac9 by ac8. CHECK for movement");
printCrowdsaleContractDetails();
printTokenContractDetails();
console.log("RESULT: ");

EOF
grep "DATA: " $TEST1OUTPUT | sed "s/DATA: //" > $DEPLOYMENTDATA
cat $DEPLOYMENTDATA
grep "RESULT: " $TEST1OUTPUT | sed "s/RESULT: //" > $TEST1RESULTS
cat $TEST1RESULTS
