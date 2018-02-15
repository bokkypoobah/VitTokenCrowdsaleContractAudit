# VitToken Crowdsale Contract Audit

Status: Work in progress

## Summary

[Vice Industry](https://vicetoken.com/) intends to run a crowdsale in February 2018.

Bok Consulting Pty Ltd was commissioned to perform an private audit on the Ethereum smart contracts for Vice Industry's crowdsale.

This audit has been conducted on Vice Industry's source code in commits
[74281cb](https://github.com/ViceIndustryToken/vit-token/tree/74281cbf6e16b5752faeac20c22a0ad755f00bc2) and
[fcf624a](https://github.com/ViceIndustryToken/vit-token/tree/fcf624a0b8a7115aa17d3a3c15ff453ae05d72a8).

TODO: Check that no potential vulnerabilities have been identified in the crowdsale and token contracts.

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

<br />

<hr />

## Potential Vulnerabilities

TODO: Check that no potential vulnerabilities have been identified in the crowdsale and token contracts.

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

* ETH contributed by the crowdsale participants is held by the crowdsale contract. Participants can later withdraw their
  refunds or tokens. The crowdsale contract will have to be carefully checked.

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

<br />

<hr />

## Code Review

* [ ] [code-review/VITToken.md](code-review/VITToken.md)
  * [ ] contract VITToken is Claimable, HasNoTokens, MintableToken
* [ ] [code-review/VITTokenSale.md](code-review/VITTokenSale.md)
  * [ ] contract VITTokenSale is Claimable

<br />

### OpenZeppelin Include Files

From https://github.com/OpenZeppelin/zeppelin-solidity/tree/v1.5.0

#### Maths
* [ ] [openzeppelin-code-review/math/Math.md](openzeppelin-code-review/math/Math.md)
  * [ ] library Math
* [ ] [openzeppelin-code-review/math/SafeMath.md](openzeppelin-code-review/math/SafeMath.md)
  * [ ] library SafeMath

#### Owner
* [ ] [openzeppelin-code-review/ownership/CanReclaimToken.md](openzeppelin-code-review/ownership/CanReclaimToken.md)
  * [ ] contract CanReclaimToken is Ownable
* [ ] [openzeppelin-code-review/ownership/Claimable.md](openzeppelin-code-review/ownership/Claimable.md)
  * [ ] contract Claimable is Ownable
* [ ] [openzeppelin-code-review/ownership/HasNoTokens.md](openzeppelin-code-review/ownership/HasNoTokens.md)
  * [ ] contract HasNoTokens is CanReclaimToken
* [ ] [openzeppelin-code-review/ownership/Ownable.md](openzeppelin-code-review/ownership/Ownable.md)
  * [ ] contract Ownable

#### Token
* [ ] [openzeppelin-code-review/token/BasicToken.md](openzeppelin-code-review/token/BasicToken.md)
  * [ ] contract BasicToken is ERC20Basic
* [ ] [openzeppelin-code-review/token/ERC20.md](openzeppelin-code-review/token/ERC20.md)
  * [ ] contract ERC20 is ERC20Basic
* [ ] [openzeppelin-code-review/token/ERC20Basic.md](openzeppelin-code-review/token/ERC20Basic.md)
  * [ ] contract ERC20Basic
* [ ] [openzeppelin-code-review/token/MintableToken.md](openzeppelin-code-review/token/MintableToken.md)
  * [ ] contract MintableToken is StandardToken, Ownable
* [ ] [openzeppelin-code-review/token/SafeERC20.md](openzeppelin-code-review/token/SafeERC20.md)
  * [ ] library SafeERC20
* [ ] [openzeppelin-code-review/token/StandardToken.md](openzeppelin-code-review/token/StandardToken.md)
  * [ ] contract StandardToken is ERC20, BasicToken

<br />

### MultiSigWallet

The  [../contracts/MultiSigWallet.sol](../contracts/MultiSigWallet.sol) multisig wallet has been compared to the Gnosis multisig wallet at
https://github.com/gnosis/MultiSigWallet/blob/4b9a417b63e433e353527ba73ef687e0eedc0d11/contracts/MultiSigWallet.sol
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

This multisig wallet is out of the scope of this audit.

<br />

### Excluded Files

Excluded as review as the following are used for testing:

* [../contracts/Migrations.sol](../contracts/Migrations.sol)

<br />

#### Compiler Warning

```javascript
ownership/HasNoTokens.sol:20:3: Warning: Function state mutability can be restricted to pure
  function tokenFallback(address from_, uint256 value_, bytes data_) external {
  ^
```

<br />

<br />

(c) BokkyPooBah / Bok Consulting Pty Ltd for Vice Industry - Feb 15 2017. The MIT Licence.