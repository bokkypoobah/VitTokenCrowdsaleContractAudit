# Math

Source file [../../openzeppelin-contracts/math/Math.sol](../../openzeppelin-contracts/math/Math.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity ^0.4.18;

/**
 * @title Math
 * @dev Assorted math operations
 */

// BK Ok
library Math {
  // BK Ok
  function max64(uint64 a, uint64 b) internal pure returns (uint64) {
    // BK Ok
    return a >= b ? a : b;
  }

  // BK Ok
  function min64(uint64 a, uint64 b) internal pure returns (uint64) {
    // BK Ok
    return a < b ? a : b;
  }

  // BK Ok
  function max256(uint256 a, uint256 b) internal pure returns (uint256) {
    // BK Ok
    return a >= b ? a : b;
  }

  // BK Ok
  function min256(uint256 a, uint256 b) internal pure returns (uint256) {
    // BK Ok
    return a < b ? a : b;
  }
}

```
