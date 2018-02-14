pragma solidity 0.4.18;

import "zeppelin-solidity/contracts/math/Math.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Claimable.sol";

import "./VITToken.sol";


/// @title VITToken sale contract.
contract VITTokenSale is Claimable {
    using Math for uint256;
    using SafeMath for uint256;

    // VIT token contract.
    VITToken public vitToken;

    // Received funds are forwarded to this address.
    address public fundingRecipient;

    // VIT token unit.
    uint256 public constant TOKEN_UNIT = 10 ** 18;

    // Maximum tokens offered in the sale: 2B.
    uint256 public constant MAX_TOKENS_SOLD = 2 * 10 ** 9 * TOKEN_UNIT;

    // VIT to 1 wei ratio.
    uint256 public vitPerWei;

    // Sale start and end timestamps.
    uint256 public constant RESTRICTED_PERIOD_DURATION = 1 days;
    uint256 public startTime;
    uint256 public endTime;

    // Refund data and state.
    uint256 public refundEndTime;
    mapping (address => uint256) public refundableEther;
    mapping (address => uint256) public claimableTokens;
    uint256 public totalClaimableTokens = 0;
    bool public finalizedRefund = false;

    // Amount of tokens sold until now in the sale.
    uint256 public tokensSold = 0;

    // Accumulated amount each participant has contributed so far.
    mapping (address => uint256) public participationHistory;

    // Maximum amount that each participant is allowed to contribute (in WEI), during the restricted period.
    mapping (address => uint256) public participationCaps;

    // Initial allocations.
    address[20] public strategicPartnersPools;
    uint256 public constant STRATEGIC_PARTNERS_POOL_ALLOCATION = 100 * 10 ** 6 * TOKEN_UNIT; // 100M

    event TokensIssued(address indexed to, uint256 tokens);
    event EtherRefunded(address indexed from, uint256 weiAmount);
    event TokensClaimed(address indexed from, uint256 tokens);
    event Finalized();
    event FinalizedRefunds();

    /// @dev Reverts if called when not during sale.
    modifier onlyDuringSale() {
        require(!saleEnded() && now >= startTime);

        _;
    }

    /// @dev Reverts if called before the sale ends.
    modifier onlyAfterSale() {
        require(saleEnded());

        _;
    }

    /// @dev Reverts if called not doing the refund period.
    modifier onlyDuringRefund() {
        require(saleDuringRefundPeriod());

        _;
    }

    modifier onlyAfterRefund() {
        require(saleAfterRefundPeriod());

        _;
    }

    /// @dev Constructor that initializes the sale conditions.
    /// @param _fundingRecipient address The address of the funding recipient.
    /// @param _startTime uint256 The start time of the token sale.
    /// @param _endTime uint256 The end time of the token sale.
    /// @param _refundEndTime uint256 The end time of the refunding period.
    /// @param _vitPerWei uint256 The exchange rate of VIT for one ETH.
    /// @param _strategicPartnersPools address[20] The addresses of the 20 strategic partners pools.
    function VITTokenSale(address _fundingRecipient, uint256 _startTime, uint256 _endTime, uint256 _refundEndTime,
        uint256 _vitPerWei, address[20] _strategicPartnersPools) public {
        require(_fundingRecipient != address(0));
        require(_startTime > now && _startTime < _endTime && _endTime < _refundEndTime);
        require(_startTime.add(RESTRICTED_PERIOD_DURATION) < _endTime);
        require(_vitPerWei > 0);

        for (uint i = 0; i < _strategicPartnersPools.length; ++i) {
            require(_strategicPartnersPools[i] != address(0));
        }

        fundingRecipient = _fundingRecipient;
        startTime = _startTime;
        endTime = _endTime;
        refundEndTime = _refundEndTime;
        vitPerWei = _vitPerWei;
        strategicPartnersPools = _strategicPartnersPools;

        // Deploy new VITToken contract.
        vitToken = new VITToken();

        // Grant initial token allocations.
        grantInitialAllocations();
    }

    /// @dev Fallback function that will delegate the request to create().
    function () external payable onlyDuringSale {
        address recipient = msg.sender;

        uint256 cappedWeiReceived = msg.value;
        uint256 weiAlreadyParticipated = participationHistory[recipient];

        // If we're during the restricted period, then only the white-listed participants are allowed to participate,
        if (saleDuringRestrictedPeriod()) {
            uint256 participationCap = participationCaps[recipient];
            cappedWeiReceived = Math.min256(cappedWeiReceived, participationCap.sub(weiAlreadyParticipated));
        }

        require(cappedWeiReceived > 0);

        // Calculate how much tokens can be sold to this participant.
        uint256 tokensLeftInSale = MAX_TOKENS_SOLD.sub(tokensSold);
        uint256 weiLeftInSale = tokensLeftInSale.div(vitPerWei);
        uint256 weiToParticipate = Math.min256(cappedWeiReceived, weiLeftInSale);
        participationHistory[recipient] = weiAlreadyParticipated.add(weiToParticipate);

        // Issue tokens and transfer to recipient.
        uint256 tokensToIssue = weiToParticipate.mul(vitPerWei);
        if (tokensLeftInSale.sub(tokensToIssue) < vitPerWei) {
            // If purchase would cause less than vitPerWei tokens left then nobody could ever buy them, so we'll gift
            // them to the last buyer.
            tokensToIssue = tokensLeftInSale;
        }

        // Record the both the participate ETH and tokens for future refunds.
        refundableEther[recipient] = refundableEther[recipient].add(weiToParticipate);
        claimableTokens[recipient] = claimableTokens[recipient].add(tokensToIssue);

        // Update token counters.
        totalClaimableTokens = totalClaimableTokens.add(tokensToIssue);
        tokensSold = tokensSold.add(tokensToIssue);

        // Issue the tokens to the token sale smart contract itself, which will hold them for future refunds.
        issueTokens(address(this), tokensToIssue);

        // Partial refund if full participation not possible, e.g. due to cap being reached.
        uint256 refund = msg.value.sub(weiToParticipate);
        if (refund > 0) {
            msg.sender.transfer(refund);
        }
    }

    /// @dev Set restricted period participation caps for a list of addresses.
    /// @param _participants address[] The list of participant addresses.
    /// @param _cap uint256 The cap amount (in ETH).
    function setRestrictedParticipationCap(address[] _participants, uint256 _cap) external onlyOwner {
        for (uint i = 0; i < _participants.length; ++i) {
            participationCaps[_participants[i]] = _cap;
        }
    }

    /// @dev Finalizes the token sale event, by stopping token minting.
    function finalize() external onlyAfterSale {
        // Issue any unsold tokens back to the company.
        if (tokensSold < MAX_TOKENS_SOLD) {
            issueTokens(fundingRecipient, MAX_TOKENS_SOLD.sub(tokensSold));
        }

        // Finish minting. Please note, that if minting was already finished - this call will revert().
        vitToken.finishMinting();

        Finalized();
    }

    function finalizeRefunds() external onlyAfterRefund {
        require(!finalizedRefund);

        finalizedRefund = true;

        // Transfer all the Ether to the beneficiary of the funding.
        fundingRecipient.transfer(this.balance);

        FinalizedRefunds();
    }

    /// @dev Reclaim all ERC20 compatible tokens, but not more than the VIT tokens which were reserved for refunds.
    /// @param token ERC20Basic The address of the token contract.
    function reclaimToken(ERC20Basic token) external onlyOwner {
        uint256 balance = token.balanceOf(this);
        if (token == vitToken) {
            balance = balance.sub(totalClaimableTokens);
        }

        assert(token.transfer(owner, balance));
    }

    /// @dev Allows participants to claim their tokens, which also transfers the Ether to the funding recipient.
    /// @param _tokensToClaim uint256 The amount of tokens to claim.
    function claimTokens(uint256 _tokensToClaim) public onlyAfterSale {
        require(_tokensToClaim != 0);

        address participant = msg.sender;
        require(claimableTokens[participant] > 0);

        uint256 claimableTokensAmount = claimableTokens[participant];
        require(_tokensToClaim <= claimableTokensAmount);

        uint256 refundableEtherAmount = refundableEther[participant];
        uint256 etherToClaim = _tokensToClaim.mul(refundableEtherAmount).div(claimableTokensAmount);
        assert(etherToClaim > 0);

        refundableEther[participant] = refundableEtherAmount.sub(etherToClaim);
        claimableTokens[participant] = claimableTokensAmount.sub(_tokensToClaim);
        totalClaimableTokens = totalClaimableTokens.sub(_tokensToClaim);

        // Transfer the tokens from the token sale smart contract to the participant.
        assert(vitToken.transfer(participant, _tokensToClaim));

        // Transfer the Ether to the beneficiary of the funding (as long as the refund hasn't finalized yet).
        if (!finalizedRefund) {
            fundingRecipient.transfer(etherToClaim);
        }

        TokensClaimed(participant, _tokensToClaim);
    }

    /// @dev Allows participants to claim all their tokens.
    function claimAllTokens() public onlyAfterSale {
        uint256 claimableTokensAmount = claimableTokens[msg.sender];
        claimTokens(claimableTokensAmount);
    }

    /// @dev Allows participants to claim refund for their purchased tokens.
    /// @param _etherToClaim uint256 The amount of Ether to claim.
    function refundEther(uint256 _etherToClaim) public onlyDuringRefund {
        require(_etherToClaim != 0);

        address participant = msg.sender;

        uint256 refundableEtherAmount = refundableEther[participant];
        require(_etherToClaim <= refundableEtherAmount);

        uint256 claimableTokensAmount = claimableTokens[participant];
        uint256 tokensToClaim = _etherToClaim.mul(claimableTokensAmount).div(refundableEtherAmount);
        assert(tokensToClaim > 0);

        refundableEther[participant] = refundableEtherAmount.sub(_etherToClaim);
        claimableTokens[participant] = claimableTokensAmount.sub(tokensToClaim);
        totalClaimableTokens = totalClaimableTokens.sub(tokensToClaim);

        // Transfer the tokens to the beneficiary of the funding.
        assert(vitToken.transfer(fundingRecipient, tokensToClaim));

        // Transfer the Ether to the participant.
        participant.transfer(_etherToClaim);

        EtherRefunded(participant, _etherToClaim);
    }

    /// @dev Allows participants to claim refund for all their purchased tokens.
    function refundAllEther() public onlyDuringRefund {
        uint256 refundableEtherAmount = refundableEther[msg.sender];
        refundEther(refundableEtherAmount);
    }

    /// @dev Initialize token grants.
    function grantInitialAllocations() private onlyOwner {
        for (uint i = 0; i < strategicPartnersPools.length; ++i) {
            issueTokens(strategicPartnersPools[i], STRATEGIC_PARTNERS_POOL_ALLOCATION);
        }
    }

    /// @dev Issues tokens for the recipient.
    /// @param _recipient address The address of the recipient.
    /// @param _tokens uint256 The amount of tokens to issue.
    function issueTokens(address _recipient, uint256 _tokens) private {
        // Request VIT token contract to mint the requested tokens for the buyer.
        assert(vitToken.mint(_recipient, _tokens));

        TokensIssued(_recipient, _tokens);
    }

    /// @dev Returns whether the sale has ended.
    /// @return bool Whether the sale has ended or not.
    function saleEnded() private view returns (bool) {
        return tokensSold >= MAX_TOKENS_SOLD || now >= endTime;
    }

    /// @dev Returns whether the sale is during its restricted period, where only white-listed participants are allowed
    /// to participate.
    /// @return bool Whether the sale is during its restricted period, where only white-listed participants are allowed
    /// to participate.
    function saleDuringRestrictedPeriod() private view returns (bool) {
        return now <= startTime.add(RESTRICTED_PERIOD_DURATION);
    }

    /// @dev Returns whether the sale is during its refund period.
    /// @return bool whether the sale is during its refund period.
    function saleDuringRefundPeriod() private view returns (bool) {
        return saleEnded() && now <= refundEndTime;
    }

    /// @dev Returns whether the sale is during its refund period.
    /// @return bool whether the sale is during its refund period.
    function saleAfterRefundPeriod() private view returns (bool) {
        return saleEnded() && now > refundEndTime;
    }
}
