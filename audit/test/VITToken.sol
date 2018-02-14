pragma solidity 0.4.18;

import "ownership/Claimable.sol";
import "ownership/HasNoTokens.sol";
import "token/MintableToken.sol";


contract VITToken is Claimable, HasNoTokens, MintableToken {
    // solhint-disable const-name-snakecase
    string public constant name = "Vice";
    string public constant symbol = "VIT";
    uint8 public constant decimals = 18;
    // solhint-enable const-name-snakecase

    modifier cannotMint() {
        require(mintingFinished);
        _;
    }

    function VITToken() public {

    }

    /// @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
    /// @param _spender address The address which will spend the funds.
    /// @param _value uint256 The amount of tokens to be spent.
    function approve(address _spender, uint256 _value) public returns (bool) {
        // https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
        if ((_value != 0) && (allowed[msg.sender][_spender] != 0)) {
            revert();
        }

        return super.approve(_spender, _value);
    }

    /// @dev Same ERC20 behavior, but reverts if still minting.
    /// @param _to address The address to transfer to.
    /// @param _value uint256 The amount to be transferred.
    function transfer(address _to, uint256 _value) public cannotMint returns (bool) {
        return super.transfer(_to, _value);
    }

    /// @dev Same ERC20 behavior, but reverts if still minting.
    /// @param _from address The address which you want to send tokens from.
    /// @param _to address The address which you want to transfer to.
    /// @param _value uint256 the amount of tokens to be transferred.
    function transferFrom(address _from, address _to, uint256 _value) public cannotMint returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }
}
