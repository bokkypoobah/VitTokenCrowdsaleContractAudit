# SafeERC20

Source file [../../openzeppelin-contracts/token/SafeERC20.sol](../../openzeppelin-contracts/token/SafeERC20.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity ^0.4.18;

// BK Next 2 Ok
import './ERC20Basic.sol';
import './ERC20.sol';

/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure.
 * To use this library you can add a `using SafeERC20 for ERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
// BK Ok
library SafeERC20 {
  // BK Ok
  function safeTransfer(ERC20Basic token, address to, uint256 value) internal {
    // BK Ok
    assert(token.transfer(to, value));
  }

  // BK Ok
  function safeTransferFrom(ERC20 token, address from, address to, uint256 value) internal {
    // BK Ok
    assert(token.transferFrom(from, to, value));
  }

  // BK Ok
  function safeApprove(ERC20 token, address spender, uint256 value) internal {
    // BK Ok
    assert(token.approve(spender, value));
  }
}

```
