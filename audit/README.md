# VitToken Crowdsale Contract Audit


## Code Review

* [ ] [code-review/Migrations.md](code-review/Migrations.md)
  * [ ] contract Migrations
* [ ] [code-review/MultiSigWallet.md](code-review/MultiSigWallet.md)
  * [ ] contract MultiSigWallet
* [ ] [code-review/VITToken.md](code-review/VITToken.md)
  * [ ] contract VITToken is Claimable, HasNoTokens, MintableToken
* [ ] [code-review/VITTokenSale.md](code-review/VITTokenSale.md)
  * [ ] contract VITTokenSale is Claimable

### Compiler Warning

```javascript
ownership/HasNoTokens.sol:20:3: Warning: Function state mutability can be restricted to pure
  function tokenFallback(address from_, uint256 value_, bytes data_) external {
  ^
```

<br />

<hr />
