// ETH/USD 14 Feb 2018 18:12 AEDT 863.49 from CMC and https://ethgasstation.info/
var ethPriceUSD = 863.49;
var defaultGasPrice = web3.toWei(1, "gwei");

// -----------------------------------------------------------------------------
// Accounts
// -----------------------------------------------------------------------------
var accounts = [];
var accountNames = {};

addAccount(eth.accounts[0], "Account #0 - Miner");
addAccount(eth.accounts[1], "Account #1 - Contract Owner");
addAccount(eth.accounts[2], "Account #2 - Wallet");
addAccount(eth.accounts[3], "Account #3");
addAccount(eth.accounts[4], "Account #4");
addAccount(eth.accounts[5], "Account #5");
addAccount(eth.accounts[6], "Account #6");
addAccount(eth.accounts[7], "Account #7");
addAccount(eth.accounts[8], "Account #8");
addAccount(eth.accounts[9], "Account #9");
addAccount(eth.accounts[10], "Account #10");
addAccount(eth.accounts[11], "Account #11");
addAccount(eth.accounts[12], "Account #12");
addAccount(eth.accounts[13], "Account #13");
addAccount(eth.accounts[14], "Account #14");
addAccount(eth.accounts[15], "Account #15");
addAccount(eth.accounts[16], "Account #16");
addAccount(eth.accounts[17], "Account #17");
addAccount(eth.accounts[18], "Account #18");
addAccount(eth.accounts[19], "Account #19");
addAccount(eth.accounts[20], "Account #20");
addAccount(eth.accounts[21], "Account #21");
addAccount(eth.accounts[22], "Account #22");
addAccount(eth.accounts[23], "Account #23");
addAccount(eth.accounts[24], "Account #24");
addAccount(eth.accounts[25], "Account #25");
addAccount(eth.accounts[26], "Account #26");
addAccount(eth.accounts[27], "Account #27");
addAccount(eth.accounts[28], "Account #28");
addAccount(eth.accounts[29], "Account #29");
addAccount(eth.accounts[30], "Account #30");
addAccount(eth.accounts[31], "Account #31");

var minerAccount = eth.accounts[0];
var contractOwnerAccount = eth.accounts[1];
var wallet = eth.accounts[2];
var account3 = eth.accounts[3];
var account4 = eth.accounts[4];
var account5 = eth.accounts[5];
var account6 = eth.accounts[6];
var account7 = eth.accounts[7];
var account8 = eth.accounts[8];
var account9 = eth.accounts[9];
var account10 = eth.accounts[10];
var account11 = eth.accounts[11];

var baseBlock = eth.blockNumber;

function unlockAccounts(password) {
  for (var i = 0; i < eth.accounts.length && i < accounts.length && i < 13; i++) {
    personal.unlockAccount(eth.accounts[i], password, 100000);
    if (i > 0 && eth.getBalance(eth.accounts[i]) == 0) {
      personal.sendTransaction({from: eth.accounts[0], to: eth.accounts[i], value: web3.toWei(1000000, "ether")});
    }
  }
  while (txpool.status.pending > 0) {
  }
  baseBlock = eth.blockNumber;
}

function addAccount(account, accountName) {
  accounts.push(account);
  accountNames[account] = accountName;
}


// -----------------------------------------------------------------------------
// Token Contract
// -----------------------------------------------------------------------------
var tokenContractAddress = null;
var tokenContractAbi = null;

function addTokenContractAddressAndAbi(address, tokenAbi) {
  tokenContractAddress = address;
  tokenContractAbi = tokenAbi;
}


// -----------------------------------------------------------------------------
// Account ETH and token balances
// -----------------------------------------------------------------------------
function printBalances() {
  var token = tokenContractAddress == null || tokenContractAbi == null ? null : web3.eth.contract(tokenContractAbi).at(tokenContractAddress);
  var decimals = token == null ? 18 : token.decimals();
  var i = 0;
  var totalTokenBalance = new BigNumber(0);
  console.log("RESULT:  # Account                                             EtherBalanceChange                          Token Name");
  console.log("RESULT: -- ------------------------------------------ --------------------------- ------------------------------ ---------------------------");
  accounts.forEach(function(e) {
    var etherBalanceBaseBlock = eth.getBalance(e, baseBlock);
    var etherBalance = web3.fromWei(eth.getBalance(e).minus(etherBalanceBaseBlock), "ether");
    var tokenBalance = token == null ? new BigNumber(0) : token.balanceOf(e).shift(-decimals);
    totalTokenBalance = totalTokenBalance.add(tokenBalance);
    console.log("RESULT: " + pad2(i) + " " + e  + " " + pad(etherBalance) + " " + padToken(tokenBalance, decimals) + " " + accountNames[e]);
    i++;
  });
  console.log("RESULT: -- ------------------------------------------ --------------------------- ------------------------------ ---------------------------");
  console.log("RESULT:                                                                           " + padToken(totalTokenBalance, decimals) + " Total Token Balances");
  console.log("RESULT: -- ------------------------------------------ --------------------------- ------------------------------ ---------------------------");
  console.log("RESULT: ");
}

function pad2(s) {
  var o = s.toFixed(0);
  while (o.length < 2) {
    o = " " + o;
  }
  return o;
}

function pad(s) {
  var o = s.toFixed(18);
  while (o.length < 27) {
    o = " " + o;
  }
  return o;
}

function padToken(s, decimals) {
  var o = s.toFixed(decimals);
  var l = parseInt(decimals)+12;
  while (o.length < l) {
    o = " " + o;
  }
  return o;
}


// -----------------------------------------------------------------------------
// Transaction status
// -----------------------------------------------------------------------------
function printTxData(name, txId) {
  var tx = eth.getTransaction(txId);
  var txReceipt = eth.getTransactionReceipt(txId);
  var gasPrice = tx.gasPrice;
  var gasCostETH = tx.gasPrice.mul(txReceipt.gasUsed).div(1e18);
  var gasCostUSD = gasCostETH.mul(ethPriceUSD);
  var block = eth.getBlock(txReceipt.blockNumber);
  console.log("RESULT: " + name + " status=" + txReceipt.status + (txReceipt.status == 0 ? " Failure" : " Success") + " gas=" + tx.gas +
    " gasUsed=" + txReceipt.gasUsed + " costETH=" + gasCostETH + " costUSD=" + gasCostUSD +
    " @ ETH/USD=" + ethPriceUSD + " gasPrice=" + web3.fromWei(gasPrice, "gwei") + " gwei block=" + 
    txReceipt.blockNumber + " txIx=" + tx.transactionIndex + " txId=" + txId +
    " @ " + block.timestamp + " " + new Date(block.timestamp * 1000).toUTCString());
}

function assertEtherBalance(account, expectedBalance) {
  var etherBalance = web3.fromWei(eth.getBalance(account), "ether");
  if (etherBalance == expectedBalance) {
    console.log("RESULT: OK " + account + " has expected balance " + expectedBalance);
  } else {
    console.log("RESULT: FAILURE " + account + " has balance " + etherBalance + " <> expected " + expectedBalance);
  }
}

function failIfTxStatusError(tx, msg) {
  var status = eth.getTransactionReceipt(tx).status;
  if (status == 0) {
    console.log("RESULT: FAIL " + msg);
    return 0;
  } else {
    console.log("RESULT: PASS " + msg);
    return 1;
  }
}

function passIfTxStatusError(tx, msg) {
  var status = eth.getTransactionReceipt(tx).status;
  if (status == 1) {
    console.log("RESULT: FAIL " + msg);
    return 0;
  } else {
    console.log("RESULT: PASS " + msg);
    return 1;
  }
}

function gasEqualsGasUsed(tx) {
  var gas = eth.getTransaction(tx).gas;
  var gasUsed = eth.getTransactionReceipt(tx).gasUsed;
  return (gas == gasUsed);
}

function failIfGasEqualsGasUsed(tx, msg) {
  var gas = eth.getTransaction(tx).gas;
  var gasUsed = eth.getTransactionReceipt(tx).gasUsed;
  if (gas == gasUsed) {
    console.log("RESULT: FAIL " + msg);
    return 0;
  } else {
    console.log("RESULT: PASS " + msg);
    return 1;
  }
}

function passIfGasEqualsGasUsed(tx, msg) {
  var gas = eth.getTransaction(tx).gas;
  var gasUsed = eth.getTransactionReceipt(tx).gasUsed;
  if (gas == gasUsed) {
    console.log("RESULT: PASS " + msg);
    return 1;
  } else {
    console.log("RESULT: FAIL " + msg);
    return 0;
  }
}

function failIfGasEqualsGasUsedOrContractAddressNull(contractAddress, tx, msg) {
  if (contractAddress == null) {
    console.log("RESULT: FAIL " + msg);
    return 0;
  } else {
    var gas = eth.getTransaction(tx).gas;
    var gasUsed = eth.getTransactionReceipt(tx).gasUsed;
    if (gas == gasUsed) {
      console.log("RESULT: FAIL " + msg);
      return 0;
    } else {
      console.log("RESULT: PASS " + msg);
      return 1;
    }
  }
}


//-----------------------------------------------------------------------------
// Wait one block
//-----------------------------------------------------------------------------
function waitOneBlock(oldCurrentBlock) {
  while (eth.blockNumber <= oldCurrentBlock) {
  }
  console.log("RESULT: Waited one block");
  console.log("RESULT: ");
  return eth.blockNumber;
}


//-----------------------------------------------------------------------------
// Pause for {x} seconds
//-----------------------------------------------------------------------------
function pause(message, addSeconds) {
  var time = new Date((parseInt(new Date().getTime()/1000) + addSeconds) * 1000);
  console.log("RESULT: Pausing '" + message + "' for " + addSeconds + "s=" + time + " now=" + new Date());
  while ((new Date()).getTime() <= time.getTime()) {
  }
  console.log("RESULT: Paused '" + message + "' for " + addSeconds + "s=" + time + " now=" + new Date());
  console.log("RESULT: ");
}


//-----------------------------------------------------------------------------
//Wait until some unixTime + additional seconds
//-----------------------------------------------------------------------------
function waitUntil(message, unixTime, addSeconds) {
  var t = parseInt(unixTime) + parseInt(addSeconds) + parseInt(1);
  var time = new Date(t * 1000);
  console.log("RESULT: Waiting until '" + message + "' at " + unixTime + "+" + addSeconds + "s=" + time + " now=" + new Date());
  while ((new Date()).getTime() <= time.getTime()) {
  }
  console.log("RESULT: Waited until '" + message + "' at at " + unixTime + "+" + addSeconds + "s=" + time + " now=" + new Date());
  console.log("RESULT: ");
}


//-----------------------------------------------------------------------------
//Wait until some block
//-----------------------------------------------------------------------------
function waitUntilBlock(message, block, addBlocks) {
  var b = parseInt(block) + parseInt(addBlocks);
  console.log("RESULT: Waiting until '" + message + "' #" + block + "+" + addBlocks + "=#" + b + " currentBlock=" + eth.blockNumber);
  while (eth.blockNumber <= b) {
  }
  console.log("RESULT: Waited until '" + message + "' #" + block + "+" + addBlocks + "=#" + b + " currentBlock=" + eth.blockNumber);
  console.log("RESULT: ");
}


//-----------------------------------------------------------------------------
// Token Contract
//-----------------------------------------------------------------------------
var tokenFromBlock = 0;
function printTokenContractDetails() {
  console.log("RESULT: tokenContractAddress=" + tokenContractAddress);
  if (tokenContractAddress != null && tokenContractAbi != null) {
    var contract = eth.contract(tokenContractAbi).at(tokenContractAddress);
    var decimals = contract.decimals();
    console.log("RESULT: token.owner=" + contract.owner());
    console.log("RESULT: token.pendingOwner=" + contract.pendingOwner());
    console.log("RESULT: token.symbol=" + contract.symbol());
    console.log("RESULT: token.name=" + contract.name());
    console.log("RESULT: token.decimals=" + decimals);
    console.log("RESULT: token.totalSupply=" + contract.totalSupply().shift(-decimals));
    console.log("RESULT: token.mintingFinished=" + contract.mintingFinished());

    var latestBlock = eth.blockNumber;
    var i;

    var ownershipTransferredEvents = contract.OwnershipTransferred({}, { fromBlock: tokenFromBlock, toBlock: latestBlock });
    i = 0;
    ownershipTransferredEvents.watch(function (error, result) {
      console.log("RESULT: OwnershipTransferred " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    ownershipTransferredEvents.stopWatching();

    var mintEvents = contract.Mint({}, { fromBlock: tokenFromBlock, toBlock: latestBlock });
    i = 0;
    mintEvents.watch(function (error, result) {
      console.log("RESULT: Mint " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    mintEvents.stopWatching();

    var mintFinishedEvents = contract.MintFinished({}, { fromBlock: tokenFromBlock, toBlock: latestBlock });
    i = 0;
    mintFinishedEvents.watch(function (error, result) {
      console.log("RESULT: MintFinished " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    mintFinishedEvents.stopWatching();

    var approvalEvents = contract.Approval({}, { fromBlock: tokenFromBlock, toBlock: latestBlock });
    i = 0;
    approvalEvents.watch(function (error, result) {
      console.log("RESULT: Approval " + i++ + " #" + result.blockNumber + " owner=" + result.args.owner +
        " spender=" + result.args.spender + " value=" + result.args.value.shift(-decimals));
    });
    approvalEvents.stopWatching();

    var transferEvents = contract.Transfer({}, { fromBlock: tokenFromBlock, toBlock: latestBlock });
    i = 0;
    transferEvents.watch(function (error, result) {
      console.log("RESULT: Transfer " + i++ + " #" + result.blockNumber + ": from=" + result.args.from + " to=" + result.args.to +
        " value=" + result.args.value.shift(-decimals));
    });
    transferEvents.stopWatching();

    tokenFromBlock = latestBlock + 1;
  }
}


// -----------------------------------------------------------------------------
// Crowdsale Contract
// -----------------------------------------------------------------------------
var crowdsaleContractAddress = null;
var crowdsaleContractAbi = null;

function addCrowdsaleContractAddressAndAbi(address, crowdsaleAbi) {
  crowdsaleContractAddress = address;
  crowdsaleContractAbi = crowdsaleAbi;
}

var crowdsaleFromBlock = 0;
function printCrowdsaleContractDetails() {
  console.log("RESULT: crowdsaleContractAddress=" + crowdsaleContractAddress);
  if (crowdsaleContractAddress != null && crowdsaleContractAbi != null) {
    var contract = eth.contract(crowdsaleContractAbi).at(crowdsaleContractAddress);
    console.log("RESULT: crowdsale.owner=" + contract.owner());
    console.log("RESULT: crowdsale.pendingOwner=" + contract.pendingOwner());
    console.log("RESULT: crowdsale.vitToken=" + contract.vitToken());
    console.log("RESULT: crowdsale.fundingRecipient=" + contract.fundingRecipient());
    console.log("RESULT: crowdsale.TOKEN_UNIT=" + contract.TOKEN_UNIT());
    console.log("RESULT: crowdsale.MAX_TOKENS_SOLD=" + contract.MAX_TOKENS_SOLD() + " " + contract.MAX_TOKENS_SOLD().shift(-18));
    console.log("RESULT: crowdsale.vitPerWei=" + contract.vitPerWei() + " " + contract.vitPerWei().shift(-18));
    console.log("RESULT: crowdsale.RESTRICTED_PERIOD_DURATION=" + contract.RESTRICTED_PERIOD_DURATION());
    console.log("RESULT: crowdsale.startTime=" + contract.startTime() + " " + new Date(contract.startTime() * 1000).toUTCString());
    console.log("RESULT: crowdsale.endTime=" + contract.endTime() + " " + new Date(contract.endTime() * 1000).toUTCString());
    console.log("RESULT: crowdsale.refundEndTime=" + contract.refundEndTime() + " " + new Date(contract.refundEndTime() * 1000).toUTCString());
    console.log("RESULT: crowdsale.totalClaimableTokens=" + contract.totalClaimableTokens() + " " + contract.totalClaimableTokens().shift(-18));
    console.log("RESULT: crowdsale.finalizedRefund=" + contract.finalizedRefund());
    console.log("RESULT: crowdsale.tokensSold=" + contract.tokensSold() + " " + contract.tokensSold().shift(-18));
    console.log("RESULT: crowdsale.strategicPartnersPools[0,19]=" + contract.strategicPartnersPools(0) + ", " + contract.strategicPartnersPools(19));
    console.log("RESULT: crowdsale.STRATEGIC_PARTNERS_POOL_ALLOCATION=" + contract.STRATEGIC_PARTNERS_POOL_ALLOCATION() + " " + contract.STRATEGIC_PARTNERS_POOL_ALLOCATION().shift(-18));

    console.log("RESULT: crowdsale.refundableEther('" + account3 + "')=" + contract.refundableEther(account3) + " "  + contract.refundableEther(account3).shift(-18));
    console.log("RESULT: crowdsale.refundableEther('" + account4 + "')=" + contract.refundableEther(account4) + " "  + contract.refundableEther(account4).shift(-18));
    console.log("RESULT: crowdsale.refundableEther('" + account5 + "')=" + contract.refundableEther(account5) + " "  + contract.refundableEther(account5).shift(-18));
    console.log("RESULT: crowdsale.refundableEther('" + account6 + "')=" + contract.refundableEther(account6) + " "  + contract.refundableEther(account6).shift(-18));
    console.log("RESULT: crowdsale.refundableEther('" + account7 + "')=" + contract.refundableEther(account7) + " "  + contract.refundableEther(account7).shift(-18));

    console.log("RESULT: crowdsale.claimableTokens('" + account3 + "')=" + contract.claimableTokens(account3) + " "  + contract.claimableTokens(account3).shift(-18));
    console.log("RESULT: crowdsale.claimableTokens('" + account4 + "')=" + contract.claimableTokens(account4) + " "  + contract.claimableTokens(account4).shift(-18));
    console.log("RESULT: crowdsale.claimableTokens('" + account5 + "')=" + contract.claimableTokens(account5) + " "  + contract.claimableTokens(account5).shift(-18));
    console.log("RESULT: crowdsale.claimableTokens('" + account6 + "')=" + contract.claimableTokens(account6) + " "  + contract.claimableTokens(account6).shift(-18));
    console.log("RESULT: crowdsale.claimableTokens('" + account7 + "')=" + contract.claimableTokens(account7) + " "  + contract.claimableTokens(account7).shift(-18));

    console.log("RESULT: crowdsale.participationHistory('" + account3 + "')=" + contract.participationHistory(account3) + " "  + contract.participationHistory(account3).shift(-18));
    console.log("RESULT: crowdsale.participationHistory('" + account4 + "')=" + contract.participationHistory(account4) + " "  + contract.participationHistory(account4).shift(-18));
    console.log("RESULT: crowdsale.participationHistory('" + account5 + "')=" + contract.participationHistory(account5) + " "  + contract.participationHistory(account5).shift(-18));
    console.log("RESULT: crowdsale.participationHistory('" + account6 + "')=" + contract.participationHistory(account6) + " "  + contract.participationHistory(account6).shift(-18));
    console.log("RESULT: crowdsale.participationHistory('" + account7 + "')=" + contract.participationHistory(account7) + " "  + contract.participationHistory(account7).shift(-18));

    console.log("RESULT: crowdsale.participationCaps('" + account3 + "')=" + contract.participationCaps(account3) + " " + contract.participationCaps(account3).shift(-18));
    console.log("RESULT: crowdsale.participationCaps('" + account4 + "')=" + contract.participationCaps(account4) + " " + contract.participationCaps(account4).shift(-18));
    console.log("RESULT: crowdsale.participationCaps('" + account5 + "')=" + contract.participationCaps(account5) + " " + contract.participationCaps(account5).shift(-18));
    console.log("RESULT: crowdsale.participationCaps('" + account6 + "')=" + contract.participationCaps(account6) + " " + contract.participationCaps(account6).shift(-18));
    console.log("RESULT: crowdsale.participationCaps('" + account7 + "')=" + contract.participationCaps(account7) + " " + contract.participationCaps(account7).shift(-18));

    var latestBlock = eth.blockNumber;
    var i;

    var ownershipTransferredEvents = contract.OwnershipTransferred({}, { fromBlock: crowdsaleFromBlock, toBlock: latestBlock });
    i = 0;
    ownershipTransferredEvents.watch(function (error, result) {
      console.log("RESULT: OwnershipTransferred " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    ownershipTransferredEvents.stopWatching();

    var tokensIssuedEvents = contract.TokensIssued({}, { fromBlock: crowdsaleFromBlock, toBlock: latestBlock });
    i = 0;
    tokensIssuedEvents.watch(function (error, result) {
      console.log("RESULT: TokensIssued " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    tokensIssuedEvents.stopWatching();

    var etherRefundedEvents = contract.EtherRefunded({}, { fromBlock: crowdsaleFromBlock, toBlock: latestBlock });
    i = 0;
    etherRefundedEvents.watch(function (error, result) {
      console.log("RESULT: EtherRefunded " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    etherRefundedEvents.stopWatching();

    var tokensClaimedEvents = contract.TokensClaimed({}, { fromBlock: crowdsaleFromBlock, toBlock: latestBlock });
    i = 0;
    tokensClaimedEvents.watch(function (error, result) {
      console.log("RESULT: TokensClaimed " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    tokensClaimedEvents.stopWatching();

    var finalizedEvents = contract.Finalized({}, { fromBlock: crowdsaleFromBlock, toBlock: latestBlock });
    i = 0;
    finalizedEvents.watch(function (error, result) {
      console.log("RESULT: Finalized " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    finalizedEvents.stopWatching();

    var finalizedRefundsEvents = contract.FinalizedRefunds({}, { fromBlock: crowdsaleFromBlock, toBlock: latestBlock });
    i = 0;
    finalizedRefundsEvents.watch(function (error, result) {
      console.log("RESULT: FinalizedRefunds " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    finalizedRefundsEvents.stopWatching();

    crowdsaleFromBlock = latestBlock + 1;
  }
}


// -----------------------------------------------------------------------------
// TokenFactory Contract
// -----------------------------------------------------------------------------
var tokenFactoryContractAddress = null;
var tokenFactoryContractAbi = null;

function addTokenFactoryContractAddressAndAbi(address, tokenFactoryAbi) {
  tokenFactoryContractAddress = address;
  tokenFactoryContractAbi = tokenFactoryAbi;
}

var tokenFactoryFromBlock = 0;

function getBTTSFactoryTokenListing() {
  var addresses = [];
  console.log("RESULT: tokenFactoryContractAddress=" + tokenFactoryContractAddress);
  if (tokenFactoryContractAddress != null && tokenFactoryContractAbi != null) {
    var contract = eth.contract(tokenFactoryContractAbi).at(tokenFactoryContractAddress);

    var latestBlock = eth.blockNumber;
    var i;

    var bttsTokenListingEvents = contract.BTTSTokenListing({}, { fromBlock: tokenFactoryFromBlock, toBlock: latestBlock });
    i = 0;
    bttsTokenListingEvents.watch(function (error, result) {
      console.log("RESULT: get BTTSTokenListing " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
      addresses.push(result.args.bttsTokenAddress);
    });
    bttsTokenListingEvents.stopWatching();
  }
  return addresses;
}

function printTokenFactoryContractDetails() {
  console.log("RESULT: tokenFactoryContractAddress=" + tokenFactoryContractAddress);
  if (tokenFactoryContractAddress != null && tokenFactoryContractAbi != null) {
    var contract = eth.contract(tokenFactoryContractAbi).at(tokenFactoryContractAddress);
    console.log("RESULT: tokenFactory.owner=" + contract.owner());
    console.log("RESULT: tokenFactory.newOwner=" + contract.newOwner());

    var latestBlock = eth.blockNumber;
    var i;

    var ownershipTransferredEvents = contract.OwnershipTransferred({}, { fromBlock: tokenFactoryFromBlock, toBlock: latestBlock });
    i = 0;
    ownershipTransferredEvents.watch(function (error, result) {
      console.log("RESULT: OwnershipTransferred " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    ownershipTransferredEvents.stopWatching();

    var bttsTokenListingEvents = contract.BTTSTokenListing({}, { fromBlock: tokenFactoryFromBlock, toBlock: latestBlock });
    i = 0;
    bttsTokenListingEvents.watch(function (error, result) {
      console.log("RESULT: BTTSTokenListing " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    bttsTokenListingEvents.stopWatching();

    tokenFactoryFromBlock = latestBlock + 1;
  }
}


// -----------------------------------------------------------------------------
// BonusList Contract
// -----------------------------------------------------------------------------
var bonusListContractAddress = null;
var bonusListContractAbi = null;

function addBonusListContractAddressAndAbi(address, bonusListAbi) {
  bonusListContractAddress = address;
  bonusListContractAbi = bonusListAbi;
}

var bonusListFromBlock = 0;
function printBonusListContractDetails() {
  console.log("RESULT: bonusListContractAddress=" + bonusListContractAddress);
  if (bonusListContractAddress != null && bonusListContractAbi != null) {
    var contract = eth.contract(bonusListContractAbi).at(bonusListContractAddress);
    console.log("RESULT: bonusList.owner=" + contract.owner());
    console.log("RESULT: bonusList.newOwner=" + contract.newOwner());
    console.log("RESULT: bonusList.sealed=" + contract.sealed());

    var latestBlock = eth.blockNumber;
    var i;

    var ownershipTransferredEvents = contract.OwnershipTransferred({}, { fromBlock: bonusListFromBlock, toBlock: latestBlock });
    i = 0;
    ownershipTransferredEvents.watch(function (error, result) {
      console.log("RESULT: OwnershipTransferred " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    ownershipTransferredEvents.stopWatching();

    var adminAddedEvents = contract.AdminAdded({}, { fromBlock: bonusListFromBlock, toBlock: latestBlock });
    i = 0;
    adminAddedEvents.watch(function (error, result) {
      console.log("RESULT: AdminAdded " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    adminAddedEvents.stopWatching();

    var adminRemovedEvents = contract.AdminRemoved({}, { fromBlock: bonusListFromBlock, toBlock: latestBlock });
    i = 0;
    adminRemovedEvents.watch(function (error, result) {
      console.log("RESULT: AdminRemoved " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    adminRemovedEvents.stopWatching();

    var addressListedEvents = contract.AddressListed({}, { fromBlock: bonusListFromBlock, toBlock: latestBlock });
    i = 0;
    addressListedEvents.watch(function (error, result) {
      console.log("RESULT: AddressListed " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    addressListedEvents.stopWatching();

    bonusListFromBlock = latestBlock + 1;
  }
}


// -----------------------------------------------------------------------------
// Generate Summary JSON
// -----------------------------------------------------------------------------
function generateSummaryJSON() {
  console.log("JSONSUMMARY: {");
  if (crowdsaleContractAddress != null && crowdsaleContractAbi != null) {
    var contract = eth.contract(crowdsaleContractAbi).at(crowdsaleContractAddress);
    var blockNumber = eth.blockNumber;
    var timestamp = eth.getBlock(blockNumber).timestamp;
    console.log("JSONSUMMARY:   \"blockNumber\": " + blockNumber + ",");
    console.log("JSONSUMMARY:   \"blockTimestamp\": " + timestamp + ",");
    console.log("JSONSUMMARY:   \"blockTimestampString\": \"" + new Date(timestamp * 1000).toUTCString() + "\",");
    console.log("JSONSUMMARY:   \"crowdsaleContractAddress\": \"" + crowdsaleContractAddress + "\",");
    console.log("JSONSUMMARY:   \"crowdsaleContractOwnerAddress\": \"" + contract.owner() + "\",");
    console.log("JSONSUMMARY:   \"tokenContractAddress\": \"" + contract.bttsToken() + "\",");
    console.log("JSONSUMMARY:   \"tokenContractDecimals\": " + contract.TOKEN_DECIMALS() + ",");
    console.log("JSONSUMMARY:   \"crowdsaleWalletAddress\": \"" + contract.wallet() + "\",");
    console.log("JSONSUMMARY:   \"crowdsaleTeamWalletAddress\": \"" + contract.teamWallet() + "\",");
    console.log("JSONSUMMARY:   \"crowdsaleTeamPercent\": " + contract.TEAM_PERCENT_GZE() + ",");
    console.log("JSONSUMMARY:   \"bonusListContractAddress\": \"" + contract.bonusList() + "\",");
    console.log("JSONSUMMARY:   \"tier1Bonus\": " + contract.TIER1_BONUS() + ",");
    console.log("JSONSUMMARY:   \"tier2Bonus\": " + contract.TIER2_BONUS() + ",");
    console.log("JSONSUMMARY:   \"tier3Bonus\": " + contract.TIER3_BONUS() + ",");
    var startDate = contract.START_DATE();
    // BK TODO - Remove for production
    startDate = 1512921600;
    var endDate = contract.endDate();
    // BK TODO - Remove for production
    endDate = 1513872000;
    console.log("JSONSUMMARY:   \"crowdsaleStart\": " + startDate + ",");
    console.log("JSONSUMMARY:   \"crowdsaleStartString\": \"" + new Date(startDate * 1000).toUTCString() + "\",");
    console.log("JSONSUMMARY:   \"crowdsaleEnd\": " + endDate + ",");
    console.log("JSONSUMMARY:   \"crowdsaleEndString\": \"" + new Date(endDate * 1000).toUTCString() + "\",");
    console.log("JSONSUMMARY:   \"usdPerEther\": " + contract.usdPerKEther().shift(-3) + ",");
    console.log("JSONSUMMARY:   \"usdPerGze\": " + contract.USD_CENT_PER_GZE().shift(-2) + ",");
    console.log("JSONSUMMARY:   \"gzePerEth\": " + contract.gzePerEth().shift(-18) + ",");
    console.log("JSONSUMMARY:   \"capInUsd\": " + contract.CAP_USD() + ",");
    console.log("JSONSUMMARY:   \"capInEth\": " + contract.capEth().shift(-18) + ",");
    console.log("JSONSUMMARY:   \"minimumContributionEth\": " + contract.MIN_CONTRIBUTION_ETH().shift(-18) + ",");
    console.log("JSONSUMMARY:   \"contributedEth\": " + contract.contributedEth().shift(-18) + ",");
    console.log("JSONSUMMARY:   \"contributedUsd\": " + contract.contributedUsd() + ",");
    console.log("JSONSUMMARY:   \"generatedGze\": " + contract.generatedGze().shift(-18) + ",");
    console.log("JSONSUMMARY:   \"lockedAccountThresholdUsd\": " + contract.lockedAccountThresholdUsd() + ",");
    console.log("JSONSUMMARY:   \"lockedAccountThresholdEth\": " + contract.lockedAccountThresholdEth().shift(-18) + ",");
    console.log("JSONSUMMARY:   \"precommitmentAdjusted\": " + contract.precommitmentAdjusted() + ",");
    console.log("JSONSUMMARY:   \"finalised\": " + contract.finalised());
  }
  console.log("JSONSUMMARY: }");
}