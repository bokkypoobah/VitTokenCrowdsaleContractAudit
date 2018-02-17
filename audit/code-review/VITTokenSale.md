# VITTokenSale

Source file [../../contracts/VITTokenSale.sol](../../contracts/VITTokenSale.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.18;

// BK Next 3 Ok
import "zeppelin-solidity/contracts/math/Math.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Claimable.sol";

// BK Ok
import "./VITToken.sol";


/// @title VITToken sale contract.
// BK Ok
contract VITTokenSale is Claimable {
    // BK Ok
    using Math for uint256;
    // BK Ok
    using SafeMath for uint256;

    // VIT token contract.
    // BK Ok
    VITToken public vitToken;

    // Received funds are forwarded to this address.
    // BK Ok
    address public fundingRecipient;

    // VIT token unit.
    // BK Ok
    uint256 public constant TOKEN_UNIT = 10 ** 18;

    // Maximum tokens offered in the sale: 2B.
    // BK Ok
    uint256 public constant MAX_TOKENS_SOLD = 2 * 10 ** 9 * TOKEN_UNIT;

    // VIT to 1 wei ratio.
    // BK Ok
    uint256 public vitPerWei;

    // Sale start and end timestamps.
    // BK Ok
    uint256 public constant RESTRICTED_PERIOD_DURATION = 1 days;
    // BK Ok
    uint256 public startTime;
    // BK Ok
    uint256 public endTime;

    // Refund data and state.
    // BK Ok
    uint256 public refundEndTime;
    // BK Ok
    mapping (address => uint256) public refundableEther;
    // BK Ok
    mapping (address => uint256) public claimableTokens;
    // BK Ok
    uint256 public totalClaimableTokens = 0;
    // BK Ok
    bool public finalizedRefund = false;

    // Amount of tokens sold until now in the sale.
    // BK Ok
    uint256 public tokensSold = 0;

    // Accumulated amount each participant has contributed so far.
    // BK Ok
    mapping (address => uint256) public participationHistory;

    // Maximum amount that each participant is allowed to contribute (in WEI), during the restricted period.
    // BK Ok
    mapping (address => uint256) public participationCaps;

    // Initial allocations.
    // BK Ok
    address[20] public strategicPartnersPools;
    // BK Ok
    uint256 public constant STRATEGIC_PARTNERS_POOL_ALLOCATION = 100 * 10 ** 6 * TOKEN_UNIT; // 100M

    // BK Next 5 Ok - Events
    event TokensIssued(address indexed to, uint256 tokens);
    event EtherRefunded(address indexed from, uint256 weiAmount);
    event TokensClaimed(address indexed from, uint256 tokens);
    event Finalized();
    event FinalizedRefunds();

    /// @dev Reverts if called when not during sale.
    // BK Ok - Modifier
    modifier onlyDuringSale() {
        // BK Ok
        require(!saleEnded() && now >= startTime);

        // BK Ok
        _;
    }

    /// @dev Reverts if called before the sale ends.
    // BK Ok - Modifier
    modifier onlyAfterSale() {
        // BK Ok
        require(saleEnded());

        // BK Ok
        _;
    }

    /// @dev Reverts if called not doing the refund period.
    // BK Ok - Modifier
    modifier onlyDuringRefund() {
        // BK Ok
        require(saleDuringRefundPeriod());

        // BK Ok
        _;
    }

    // BK Ok - Modifier
    modifier onlyAfterRefund() {
        // BK Ok
        require(saleAfterRefundPeriod());

        // BK Ok
        _;
    }

    /// @dev Constructor that initializes the sale conditions.
    /// @param _fundingRecipient address The address of the funding recipient.
    /// @param _startTime uint256 The start time of the token sale.
    /// @param _endTime uint256 The end time of the token sale.
    /// @param _refundEndTime uint256 The end time of the refunding period.
    /// @param _vitPerWei uint256 The exchange rate of VIT for one ETH.
    /// @param _strategicPartnersPools address[20] The addresses of the 20 strategic partners pools.
    // BK Ok - Constructor
    function VITTokenSale(address _fundingRecipient, uint256 _startTime, uint256 _endTime, uint256 _refundEndTime,
        uint256 _vitPerWei, address[20] _strategicPartnersPools) public {
        // BK Ok
        require(_fundingRecipient != address(0));
        // BK Ok
        require(_startTime > now && _startTime < _endTime && _endTime < _refundEndTime);
        // BK Ok
        require(_startTime.add(RESTRICTED_PERIOD_DURATION) < _endTime);
        // BK Ok
        require(_vitPerWei > 0);

        // BK Ok
        for (uint i = 0; i < _strategicPartnersPools.length; ++i) {
            // BK Ok
            require(_strategicPartnersPools[i] != address(0));
        }

        // BK Ok
        fundingRecipient = _fundingRecipient;
        // BK Next 4 Ok
        startTime = _startTime;
        endTime = _endTime;
        refundEndTime = _refundEndTime;
        vitPerWei = _vitPerWei;
        // BK Ok
        strategicPartnersPools = _strategicPartnersPools;

        // Deploy new VITToken contract.
        // BK Ok
        vitToken = new VITToken();

        // Grant initial token allocations.
        // BK Ok
        grantInitialAllocations();
    }

    /// @dev Fallback function that will delegate the request to create().
    // BK Ok - Anyone can call this fallback function during the sale period
    // BK TODO
    function () external payable onlyDuringSale {
        // BK Ok
        address recipient = msg.sender;

        // BK Ok
        uint256 cappedWeiReceived = msg.value;
        // BK Ok
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
    // BK Ok - Only owner can set the caps
    function setRestrictedParticipationCap(address[] _participants, uint256 _cap) external onlyOwner {
        // BK Ok
        for (uint i = 0; i < _participants.length; ++i) {
            // BK Ok
            participationCaps[_participants[i]] = _cap;
        }
    }

    /// @dev Finalizes the token sale event, by stopping token minting.
    // BK Ok - Anyone can call this function only after the sale period or the max funding is reached
    function finalize() external onlyAfterSale {
        // Issue any unsold tokens back to the company.
        // BK Ok
        if (tokensSold < MAX_TOKENS_SOLD) {
            // BK Ok
            issueTokens(fundingRecipient, MAX_TOKENS_SOLD.sub(tokensSold));
        }

        // Finish minting. Please note, that if minting was already finished - this call will revert().
        // BK Ok
        vitToken.finishMinting();

        // BK Ok - Log event
        Finalized();
    }

    // BK Ok - Only owner can execute after the refund period
    function finalizeRefunds() external onlyAfterRefund {
        // BK Ok
        require(!finalizedRefund);

        // BK Ok
        finalizedRefund = true;

        // Transfer all the Ether to the beneficiary of the funding.
        // BK Ok
        fundingRecipient.transfer(this.balance);

        // BK Ok - Log event
        FinalizedRefunds();
    }

    /// @dev Reclaim all ERC20 compatible tokens, but not more than the VIT tokens which were reserved for refunds.
    /// @param token ERC20Basic The address of the token contract.
    // BK Ok - Only owner can execute
    function reclaimToken(ERC20Basic token) external onlyOwner {
        // BK Ok
        uint256 balance = token.balanceOf(this);
        // BK Ok
        if (token == vitToken) {
            // BK Ok
            balance = balance.sub(totalClaimableTokens);
        }

        // BK Ok
        assert(token.transfer(owner, balance));
    }

    /// @dev Allows participants to claim their tokens, which also transfers the Ether to the funding recipient.
    /// @param _tokensToClaim uint256 The amount of tokens to claim.
    // BK TODO
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
    // BK Ok - Participants who contributed can execute, after the sale period
    function claimAllTokens() public onlyAfterSale {
        // BK Ok
        uint256 claimableTokensAmount = claimableTokens[msg.sender];
        // BK Ok
        claimTokens(claimableTokensAmount);
    }

    /// @dev Allows participants to claim refund for their purchased tokens.
    /// @param _etherToClaim uint256 The amount of Ether to claim.
    // BK TODO - Exit point for ETH. Need to check carefully
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
    // BK Ok - Participants who contributed can execute, during the refund period
    function refundAllEther() public onlyDuringRefund {
        // BK Ok
        uint256 refundableEtherAmount = refundableEther[msg.sender];
        // BK Ok
        refundEther(refundableEtherAmount);
    }

    /// @dev Initialize token grants.
    // BK Ok - Only owner can execute. Called only by the constructor
    function grantInitialAllocations() private onlyOwner {
        // BK Ok
        for (uint i = 0; i < strategicPartnersPools.length; ++i) {
            // BK Ok
            issueTokens(strategicPartnersPools[i], STRATEGIC_PARTNERS_POOL_ALLOCATION);
        }
    }

    /// @dev Issues tokens for the recipient.
    /// @param _recipient address The address of the recipient.
    /// @param _tokens uint256 The amount of tokens to issue.
    // BK Ok
    function issueTokens(address _recipient, uint256 _tokens) private {
        // Request VIT token contract to mint the requested tokens for the buyer.
        // BK NOTE - mint function logs `Transfer(address(0), _to, _amount)` events
        // BK Ok
        assert(vitToken.mint(_recipient, _tokens));

        // BK Ok - Log event
        TokensIssued(_recipient, _tokens);
    }

    /// @dev Returns whether the sale has ended.
    /// @return bool Whether the sale has ended or not.
    // BK Ok - View function
    function saleEnded() private view returns (bool) {
        // BK Ok
        return tokensSold >= MAX_TOKENS_SOLD || now >= endTime;
    }

    /// @dev Returns whether the sale is during its restricted period, where only white-listed participants are allowed
    /// to participate.
    /// @return bool Whether the sale is during its restricted period, where only white-listed participants are allowed
    /// to participate.
    // BK NOTE - Used with another check that the period is after startTime
    // BK Ok - View function
    function saleDuringRestrictedPeriod() private view returns (bool) {
        // BK Ok
        return now <= startTime.add(RESTRICTED_PERIOD_DURATION);
    }

    /// @dev Returns whether the sale is during its refund period.
    /// @return bool whether the sale is during its refund period.
    // BK Ok - View function
    function saleDuringRefundPeriod() private view returns (bool) {
        // BK Ok
        return saleEnded() && now <= refundEndTime;
    }

    // BK NOTE - Comment 'during' should be 'after'
    /// @dev Returns whether the sale is during its refund period.
    /// @return bool whether the sale is during its refund period.
    // BK Ok - View function
    function saleAfterRefundPeriod() private view returns (bool) {
        // BK Ok
        return saleEnded() && now > refundEndTime;
    }
}

```
