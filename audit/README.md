# VitToken Crowdsale Contract Audit

## Summary

[Vice Industry](https://vicetoken.com/) intends to run a crowdsale in February 2018.

Bok Consulting Pty Ltd was commissioned to perform an private audit on the Ethereum smart contracts for Vice Industry's crowdsale.

This audit has been conducted on Vice Industry's source code in commits
[74281cb](https://github.com/ViceIndustryToken/vit-token/tree/74281cbf6e16b5752faeac20c22a0ad755f00bc2),
[fcf624a](https://github.com/ViceIndustryToken/vit-token/tree/fcf624a0b8a7115aa17d3a3c15ff453ae05d72a8) and
[80a21e8](https://github.com/ViceIndustryToken/vit-token/commit/80a21e8933868125960a6278dc473a3ef61ddce3).

No potential vulnerabilities have been identified in the crowdsale and token contracts.

<br />

<hr />

## Table Of Contents

* [Summary](#summary)
* [Recommendations](#recommendations)
* [Potential Vulnerabilities](#potential-vulnerabilities)
* [Scope](#scope)
* [Limitations](#limitations)
* [Due Diligence](#due-diligence)
* [Risks](#risks)
* [Testing](#testing)
* [Code Review](#code-review)

<br />

<hr />

## Recommendations

* **LOW IMPORTANCE** The [ERC20 token standard](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md) does not recommend
  that the smart contract enforces the requirement to set the allowance to 0 before setting it to a non-0 value. From
  [here](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md#approve):

  > NOTE: To prevent attack vectors like the one described here and discussed here, clients SHOULD make sure to create user interfaces
  > in such a way that they set the allowance first to 0 before setting it to another value for the same spender. THOUGH The contract
  > itself shouldn't enforce it, to allow backwards compatibility with contracts deployed before

  Here is the commit to update the `approve(...)` functionality in OpenZeppelin -
  [change approve() to conform to ERC20. Fix #438](https://github.com/OpenZeppelin/zeppelin-solidity/commit/83918cad4b9f5bea6dcb3c0c18f3295b2484c825)

  * [x] The requirement to set allowance to 0 to update a non-0 allowance was removed in [80a21e8](https://github.com/ViceIndustryToken/vit-token/commit/80a21e8933868125960a6278dc473a3ef61ddce3)

<br />

<hr />

## Potential Vulnerabilities

No potential vulnerabilities have been identified in the crowdsale and token contracts.

<br />

<hr />

## Scope

This audit is into the technical aspects of the crowdsale contracts. The primary aim of this audit is to ensure that funds
contributed to these contracts are not easily attacked or stolen by third parties. The secondary aim of this audit is that
ensure the coded algorithms work as expected. This audit does not guarantee that that the code is bugfree, but intends to
highlight any areas of weaknesses.

<br />

<hr />

## Limitations

This audit makes no statements or warranties about the viability of the Vice Industry's business proposition, the individuals
involved in this business or the regulatory regime for the business model.

<br />

<hr />

## Due Diligence

As always, potential participants in any crowdsale are encouraged to perform their due diligence on the business proposition
before funding any crowdsales.

Potential participants are also encouraged to only send their funds to the official crowdsale Ethereum address, published on
the crowdsale beneficiary's official communication channel.

Scammers have been publishing phishing address in the forums, twitter and other communication channels, and some go as far as
duplicating crowdsale websites. Potential participants should NOT just click on any links received through these messages.
Scammers have also hacked the crowdsale website to replace the crowdsale contract address with their scam address.
 
Potential participants should also confirm that the verified source code on EtherScan.io for the published crowdsale address
matches the audited source code, and that the deployment parameters are correctly set, including the constant parameters.

<br />

<hr />

## Risks

Participants contribute ethers (ETH) to the crowdsale contract and the tokens are generated for the contributor's account.

The ETH remains locked in the crowdsale contract until the refund period. The tokens are not transferred to the
participant's accounts until the end of the crowdsale.

After the crowdsale contribution period, contributing participants have to claim all or part of their tokens, or
claim a refund of all or part of their ETH contributions.

If the participant claims all or part of their tokens, the equivalent ETH is transferred to the crowdsale wallet. If the
participant claims a refund on all or part of their ETH contribution, the equivalent amount of tokens is transferred to
the crowdsale wallet.

Participants can only claim their ETH refunds during the refund period, but can claim their tokens any time after the
sale ends.

The ETH exit points from the crowdsale contract follow:

* ETH exit point during the contribution period - **low risk**

  During the contribution period, the only exit point for ETH is the refund of the participant's sent ETH in excess of
  any contribution limits. This is in the `function ()` fallback function, and the amount is limited to the ETH amount
  sent by the participant.

* ETH exit point during the refund period

  * ETH sent to the participant's wallet - **medium risk** but mitigated through repeated checks

    During the refund period, contributing participants can claim a refund of their contributed ETH by calling the
    `refundEther(...)` or `refundAllEther()` functions. This is the critical exit point for ETH to wallets other than
    to the crowdsale wallet and the logic here has been repeatedly checked.

    An attacker cannot use a reentrancy attack like The DAO due to 1) `refundableEther[participant]` recording the 
    maximum amount the participant can withdraw and this record is updated before calling the
    `participant.transfer(_etherToClaim)` function that potentially transfers program execution to another smart
    contract; and 2) the limited gas available to the `participant.transfer(_etherToClaim)` function.

  * ETH sent to the crowdsale wallet - **low risk**

    If the participant claims their tokens by calling `claimTokens(...)` or `claimAllTokens()`, the ETH backing these
    tokens will be transferred to the crowdsale wallet.

* ETH exit point after the refund period - **low risk**

  After the refund period, the crowdsale contract owner calls the `finalizeRefunds()` to transfer the remaining
  ETH to the crowdsale wallet.

In all the ETH exit points, the safer `transfer(...)` function is used to transfer the ETH out of this crowdsale
contract. This transfer method is gas restricted to avoid reentrancy attacks and the return status of this function
call is checked and the transaction will be rolled back if an error is thrown.

<br />

<hr />

## Testing

Details of the testing environment can be found in [test](test).

The following functions were tested using the script [test/01_test1.sh](test/01_test1.sh) with the summary results saved
in [test/test1results.txt](test/test1results.txt) and the detailed output saved in [test/test1output.txt](test/test1output.txt):

* [x] Deploy crowdsale contract
  * [x] Deploy token contract
  * [x] Tokens distributed to `strategicPartnersPools` accounts
* [x] Contribute during the `RESTRICTED_PERIOD_DURATION`
* [x] Contribute after the `RESTRICTED_PERIOD_DURATION`
* [x] Finalise crowdsale
* [x] Claim tokens, claim all tokens
* [x] Refund ethers, refund all ethers
* [x] Finalise refund
* [x] `transfer(...)`, `approve(...)` and `transferFrom(...)`

<br />

<hr />

## Code Review

* [x] [code-review/VITToken.md](code-review/VITToken.md)
  * [x] contract VITToken is Claimable, HasNoTokens, MintableToken
* [x] [code-review/VITTokenSale.md](code-review/VITTokenSale.md)
  * [x] contract VITTokenSale is Claimable

<br />

### OpenZeppelin Include Files

From https://github.com/OpenZeppelin/zeppelin-solidity/tree/v1.5.0

#### Maths
* [x] [openzeppelin-code-review/math/Math.md](openzeppelin-code-review/math/Math.md)
  * [x] library Math
* [x] [openzeppelin-code-review/math/SafeMath.md](openzeppelin-code-review/math/SafeMath.md)
  * [x] library SafeMath

#### Owner
* [x] [openzeppelin-code-review/ownership/Ownable.md](openzeppelin-code-review/ownership/Ownable.md)
  * [x] contract Ownable
* [x] [openzeppelin-code-review/ownership/Claimable.md](openzeppelin-code-review/ownership/Claimable.md)
  * [x] contract Claimable is Ownable
* [x] [openzeppelin-code-review/ownership/CanReclaimToken.md](openzeppelin-code-review/ownership/CanReclaimToken.md)
  * [x] contract CanReclaimToken is Ownable
* [x] [openzeppelin-code-review/ownership/HasNoTokens.md](openzeppelin-code-review/ownership/HasNoTokens.md)
  * [x] contract HasNoTokens is CanReclaimToken

#### Token
* [x] [openzeppelin-code-review/token/ERC20Basic.md](openzeppelin-code-review/token/ERC20Basic.md)
  * [x] contract ERC20Basic
* [x] [openzeppelin-code-review/token/ERC20.md](openzeppelin-code-review/token/ERC20.md)
  * [x] contract ERC20 is ERC20Basic
* [x] [openzeppelin-code-review/token/SafeERC20.md](openzeppelin-code-review/token/SafeERC20.md)
  * [x] library SafeERC20
* [x] [openzeppelin-code-review/token/BasicToken.md](openzeppelin-code-review/token/BasicToken.md)
  * [x] contract BasicToken is ERC20Basic
* [x] [openzeppelin-code-review/token/StandardToken.md](openzeppelin-code-review/token/StandardToken.md)
  * [x] contract StandardToken is ERC20, BasicToken
* [x] [openzeppelin-code-review/token/MintableToken.md](openzeppelin-code-review/token/MintableToken.md)
  * [x] contract MintableToken is StandardToken, Ownable

<br />

### MultiSigWallet

The [../contracts/MultiSigWallet.sol](../contracts/MultiSigWallet.sol) multisig wallet has been compared to the Gnosis
multisig wallet
at https://github.com/gnosis/MultiSigWallet/blob/4b9a417b63e433e353527ba73ef687e0eedc0d11/contracts/MultiSigWallet.sol
and has the following insignificant differences:

```diff
$ diff MultiSigWallet.sol GnosisMultisigWallet.sol
1c1
< pragma solidity 0.4.18;
---
> pragma solidity 0.4.15;
95c95,96
<     function() public payable
---
>     function()
>         payable
369a371
> 
```

The [../contracts/MultiSigWallet.sol](../contracts/MultiSigWallet.sol) multisig wallet has also been compared to the
relevant portions of the Gnosis multisig wallet factory contract accessible from https://wallet.gnosis.pm/ and deployed
to [0x6e95c8e8557abc08b46f3c347ba06f8dc012763f](https://etherscan.io/address/0x6e95c8e8557abc08b46f3c347ba06f8dc012763f#code),
and there are insignificant differences.

This multisig wallet is out of the scope of this audit.

<br />

### Excluded Files

Excluded from this review as the following contracts are used for testing:

* [../contracts/Migrations.sol](../contracts/Migrations.sol)

<br />

#### Compiler Warning

There was an unimportant warning message generated by the Solidity compiler:

```javascript
ownership/HasNoTokens.sol:20:3: Warning: Function state mutability can be restricted to pure
  function tokenFallback(address from_, uint256 value_, bytes data_) external {
  ^
```

<br />

<br />

(c) BokkyPooBah / Bok Consulting Pty Ltd for Vice Industry - Feb 18 2017. The MIT Licence.