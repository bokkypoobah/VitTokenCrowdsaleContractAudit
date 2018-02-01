pragma solidity 0.4.18;

import "../../contracts/VITTokenSale.sol";


contract VITTokenSaleMock is VITTokenSale {
    function VITTokenSaleMock(address _fundingRecipient, uint256 _startTime, uint256 _vitPerWei,
        address[20] _strategicPartnersPools) public
        VITTokenSale(_fundingRecipient, _startTime, _vitPerWei, _strategicPartnersPools) {
    }

    function setTokensSold(uint256 _tokensSold) public {
        tokensSold = _tokensSold;
    }

    function setTotalClaimableTokens(uint256 _totalClaimableTokens) public {
        totalClaimableTokens = _totalClaimableTokens;
    }

    function issue(address _to, uint256 _tokens) public {
        vitToken.mint(_to, _tokens);
    }

    function finishMinting() public {
        vitToken.finishMinting();
    }
}
