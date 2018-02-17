# HasNoTokens

Source file [../../openzeppelin-contracts/ownership/HasNoTokens.sol](../../openzeppelin-contracts/ownership/HasNoTokens.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity ^0.4.18;

// BK Ok
import "./CanReclaimToken.sol";

/**
 * @title Contracts that should not own Tokens
 * @author Remco Bloemen <remco@2π.com>
 * @dev This blocks incoming ERC23 tokens to prevent accidental loss of tokens.
 * Should tokens (any ERC20Basic compatible) end up in the contract, it allows the
 * owner to reclaim the tokens.
 */
// BK Ok
contract HasNoTokens is CanReclaimToken {

 /**
  * @dev Reject all ERC23 compatible tokens
  * @param from_ address The address that is transferring the tokens
  * @param value_ uint256 the amount of the specified token
  * @param data_ Bytes The data passed from the caller.
  */
  // BK Ok - Any ERC223 transfers will be rejected
  function tokenFallback(address from_, uint256 value_, bytes data_) external {
    // BK Next 3 Ok
    from_;
    value_;
    data_;
    // BK Ok
    revert();
  }

}

```
