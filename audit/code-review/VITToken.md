# VITToken

Source file [../../contracts/VITToken.sol](../../contracts/VITToken.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.18;

// BK Next 3 Ok
import "zeppelin-solidity/contracts/ownership/Claimable.sol";
import "zeppelin-solidity/contracts/ownership/HasNoTokens.sol";
import "zeppelin-solidity/contracts/token/MintableToken.sol";


// BK Ok
contract VITToken is Claimable, HasNoTokens, MintableToken {
    // solhint-disable const-name-snakecase
    // BK Next 3 Ok
    string public constant name = "Vice";
    string public constant symbol = "VIT";
    uint8 public constant decimals = 18;
    // solhint-enable const-name-snakecase

    // BK Ok - Modifier
    modifier cannotMint() {
        // BK Ok
        require(mintingFinished);
        // BK Ok
        _;
    }

    // BK Ok - Constructor
    function VITToken() public {

    }

    /// @dev Same ERC20 behavior, but reverts if still minting.
    /// @param _to address The address to transfer to.
    /// @param _value uint256 The amount to be transferred.
    // BK Ok
    function transfer(address _to, uint256 _value) public cannotMint returns (bool) {
        // BK Ok
        return super.transfer(_to, _value);
    }

    /// @dev Same ERC20 behavior, but reverts if still minting.
    /// @param _from address The address which you want to send tokens from.
    /// @param _to address The address which you want to transfer to.
    /// @param _value uint256 the amount of tokens to be transferred.
    // BK Ok
    function transferFrom(address _from, address _to, uint256 _value) public cannotMint returns (bool) {
        // BK Ok
        return super.transferFrom(_from, _to, _value);
    }
}

```
