import chai from 'chai';
import dirtyChai from 'dirty-chai';
import BigNumber from 'bignumber.js';
import expectRevert from './helpers/expectRevert';
import time from './helpers/time';

const { expect } = chai;
chai.use(dirtyChai);

const VITToken = artifacts.require('../contracts/VITToken.sol');
const VITTokenSaleMock = artifacts.require('./helpers/VITTokenSaleMock.sol');
const TestERC20Token = artifacts.require('.helpers/TestERC20Token.sol');

contract('VITTokenSale', (accounts) => {
  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const DEFAULT_GAS_PRICE = new BigNumber(100000000000);
  const GAS_COST_ERROR = process.env.SOLIDITY_COVERAGE ? 30000000000000000 : 0;

  const TOKEN_UNIT = 10 ** 18;
  const MAX_TOKENS = new BigNumber(4 * (10 ** 9)).mul(TOKEN_UNIT);
  const MAX_TOKENS_SOLD = new BigNumber(2 * (10 ** 9)).mul(TOKEN_UNIT);
  const ETH = 10 ** 18;

  const SALE_DURATION = 30 * DAY;
  const RESTRICTED_PERIOD_DURATION = 1 * DAY;
  const REFUND_PERIOD_DURATION = 180 * DAY;

  const TOKKEN_MSB_INC_ADDRESS = '0x1ed4304324baf24e826f267861bfbbad50228599';
  const TOKKEN_MSB_INC_ALLOCATION = new BigNumber(10 ** 9).mul(TOKEN_UNIT);
  const STRATEGIC_PARTNERS_ADDRESS = '0x6f46cf5569aefa1acc1009290c8e043747172d89';
  const STRATEGIC_PARTNERS_ALLOCATION = new BigNumber(600 * (10 ** 6)).mul(TOKEN_UNIT);
  const STEEM_HOLDERS_ADDRESS = '0x90e63c3d53e0ea496845b7a03ec7548b70014a91';
  const STEEM_HOLDERS_ALLOCATION = new BigNumber(400 * (10 ** 6)).mul(TOKEN_UNIT);

  let now;

  const increaseTime = async (by) => {
    await time.increaseTime(by);
    now += by;
  };

  const owner = accounts[0];
  const notOwner = accounts[1];

  // Get block timestamp.
  beforeEach(async () => {
    now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
  });

  describe('construction', async () => {
    const fundRecipient = accounts[5];
    const vitPerWei = 1000;

    it('should not allow to initialize with null funding recipient address', async () => {
      await expectRevert(VITTokenSaleMock.new(null, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS));
    });

    it('should not allow to initialize with null funding recipient address', async () => {
      await expectRevert(VITTokenSaleMock.new(0, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS));
    });

    it('should not allow to initialize with 0 VIT exchange rate', async () => {
      await expectRevert(VITTokenSaleMock.new(fundRecipient, now + 100, 0, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS));
    });

    it('should be initialized with a future starting time', async () => {
      await expectRevert(VITTokenSaleMock.new(fundRecipient, now - 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS));
    });

    it('should not allow to initialize with 0 tokken address', async () => {
      await expectRevert(VITTokenSaleMock.new(0, now + 100, vitPerWei, 0,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS));
    });

    it('should not allow to initialize with 0 strategic partnership address', async () => {
      await expectRevert(VITTokenSaleMock.new(0, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        0, STEEM_HOLDERS_ADDRESS));
    });

    it('should not allow to initialize with 0 steem holders address', async () => {
      await expectRevert(VITTokenSaleMock.new(0, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, 0));
    });

    it('should be initialized with a derived ending time', async () => {
      const startTime = now + 100;
      const sale = await VITTokenSaleMock.new(fundRecipient, startTime, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);

      expect((await sale.endTime()).toNumber()).to.eql(startTime + SALE_DURATION);
    });

    it('should deploy the VITToken contract and own it', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect(await sale.vitToken()).not.to.be.zero();

      const token = VITToken.at(await sale.vitToken());
      expect(await token.owner()).to.eql(sale.address);
    });

    it('should be initialized with an exchange price', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect((await sale.vitPerWei()).toNumber()).to.eql(vitPerWei);
    });

    it('should be initialized with a tokken msb address', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect(await sale.tokkenMsbIncAddress()).to.eql(TOKKEN_MSB_INC_ADDRESS);
    });

    it('should be initialized with a strategic partners address', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect(await sale.strategicPartnersAddress()).to.eql(STRATEGIC_PARTNERS_ADDRESS);
    });

    it('should be initialized with a steem holders address', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect(await sale.steemHoldersAddress()).to.eql(STEEM_HOLDERS_ADDRESS);
    });

    it('should be initialized in minting enabled mode', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      const token = VITToken.at(await sale.vitToken());
      expect(await token.mintingFinished()).to.be.false();
    });

    it('should be initialized with 0 total sold tokens', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect((await sale.tokensSold()).toNumber()).to.eql(0);
    });

    it('should be initialized with 0 total claimable tokens', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect((await sale.totalClaimableTokens()).toNumber()).to.eql(0);
    });

    it('should be initialized with false finalizedRefund', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect(await sale.finalizedRefund()).to.be.false();
    });

    it('should be ownable', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 10000, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      expect(await sale.owner()).to.eql(accounts[0]);
    });

    it('should allocate initial grants', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 10000, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      const token = VITToken.at(await sale.vitToken());

      expect((await token.balanceOf(TOKKEN_MSB_INC_ADDRESS)).toNumber()).to
        .eql(TOKKEN_MSB_INC_ALLOCATION.toNumber());
      expect((await token.balanceOf(STRATEGIC_PARTNERS_ADDRESS)).toNumber()).to
        .eql(STRATEGIC_PARTNERS_ALLOCATION.toNumber());
      expect((await token.balanceOf(STEEM_HOLDERS_ADDRESS)).toNumber()).to
        .eql(STEEM_HOLDERS_ALLOCATION.toNumber());

      expect((await token.totalSupply()).toNumber()).to.eql(TOKKEN_MSB_INC_ALLOCATION
        .plus(STRATEGIC_PARTNERS_ALLOCATION).plus(STEEM_HOLDERS_ALLOCATION).toNumber());
    });
  });

  describe('reclaim tokens', async () => {
    const fundRecipient = accounts[5];
    let sale;
    let start;
    const startFrom = 1000;
    const vitPerWei = 2000;

    beforeEach(async () => {
      start = now + startFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
    });

    it('should be able to reclaim ERC20 tokens', async () => {
      const value = 1235;
      const token = await TestERC20Token.new(value);
      await token.transfer(sale.address, value);

      expect((await token.balanceOf(sale.address)).toNumber()).to.eql(value);
      expect((await token.balanceOf(owner)).toNumber()).to.eql(0);

      await sale.reclaimToken(token.address);

      expect((await token.balanceOf(sale.address)).toNumber()).to.eql(0);
      expect((await token.balanceOf(owner)).toNumber()).to.eql(value);
    });

    it('should allow only owner to reclaim tokens', async () => {
      const value = 1235;
      const token = await TestERC20Token.new(value);
      await token.transfer(sale.address, value);

      await expectRevert(sale.reclaimToken(token.address, { from: notOwner }));
    });

    it('should not be able to reclaim more than reserved for refund VIT tokens', async () => {
      const value = 1;
      const extra = 10000;
      const sender = accounts[2];
      const token = VITToken.at(await sale.vitToken());

      await increaseTime((start - now) + 1);

      await sale.setRestrictedParticipationCap([sender], value);
      await sale.sendTransaction({ from: sender, value });

      expect(web3.eth.getBalance(sale.address).toNumber()).to.be.above(0);
      const balance = (await token.balanceOf(sale.address)).toNumber();

      await sale.issue(sale.address, extra);
      await sale.finishMinting();

      expect((await token.balanceOf(sale.address)).toNumber()).to.eql(balance + extra);
      expect((await token.balanceOf(owner)).toNumber()).to.eql(0);

      // Try to reclaim the tokens twice.
      for (let i = 0; i <= 1; ++i) {
        await sale.reclaimToken(token.address);

        expect((await token.balanceOf(sale.address)).toNumber()).to.eql(balance);
        expect((await token.balanceOf(owner)).toNumber()).to.eql(extra);
      }
    });
  });

  describe('restricted participation caps', async () => {
    const fundRecipient = accounts[5];
    const cap = 10000;
    const vitPerWei = 250;
    let sale;

    // Test all accounts have their participation caps set properly.
    beforeEach(async () => {
      sale = await VITTokenSaleMock.new(fundRecipient, now + 1000, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);

      for (const participant of accounts) {
        expect((await sale.participationCaps(participant)).toNumber()).to.eql(0);
      }
    });

    it('should be able to get called with an empty list of participants', async () => {
      await sale.setRestrictedParticipationCap([], cap);
    });

    it('should not allow to be called by non-owner', async () => {
      await expectRevert(sale.setRestrictedParticipationCap([], cap, { from: notOwner }));
    });

    it('should set participation cap', async () => {
      const participants = [accounts[1], accounts[4]];

      await sale.setRestrictedParticipationCap(participants, cap);

      for (const participant of participants) {
        expect((await sale.participationCaps(participant)).toNumber()).to.eql(cap);
      }
    });

    it('should allow changing existing participants', async () => {
      const participants = [accounts[2], accounts[3], accounts[4]];

      await sale.setRestrictedParticipationCap(participants, cap);

      for (const participant of participants) {
        expect((await sale.participationCaps(participant)).toNumber()).to.eql(cap);
      }

      const cap2 = 354666;
      await sale.setRestrictedParticipationCap(participants, cap2);

      for (const participant of participants) {
        expect((await sale.participationCaps(participant)).toNumber()).to.eql(cap2);
      }
    });
  });

  describe('finalize', async () => {
    let sale;
    let token;
    let start;
    const startFrom = 1000;
    let end;
    const fundRecipient = accounts[5];
    const vitPerWei = 1234;

    beforeEach(async () => {
      start = now + startFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      end = (await sale.endTime()).toNumber();
      token = VITToken.at(await sale.vitToken());

      expect(await token.mintingFinished()).to.be.false();
    });

    context('before sale has started', async () => {
      beforeEach(async () => {
        expect(now).to.be.below(start);
      });

      it('should not allow to finalize before selling all tokens', async () => {
        await expectRevert(sale.finalize());
      });
    });

    context('during the sale', async () => {
      beforeEach(async () => {
        // Increase time to be the in the middle of start and end.
        await increaseTime((start - now) + ((end - start) / 2));

        expect(now).to.be.within(start, end);
      });

      it('should not allow to finalize before selling all tokens', async () => {
        await expectRevert(sale.finalize());
      });
    });

    const testFinalization = async () => {
      const testFinalizationFrom = async (from) => {
        const TIME_ERROR = 10;

        beforeEach(async () => {
          await sale.finalize({ from });
        });

        it('should finish minting after sale was finalized', async () => {
          expect(await token.mintingFinished()).to.be.true();
        });

        it('should allocate any unsold tokens to the beneficiary', async () => {
          const fundRecipientTokenBalance = await token.balanceOf(fundRecipient);
          const tokensSold = await sale.tokensSold();

          expect(fundRecipientTokenBalance.plus(tokensSold).toNumber()).to.eql(MAX_TOKENS_SOLD.toNumber());
        });

        it('should not allow to finalize token sale more than once', async () => {
          await expectRevert(sale.finalize({ from }));
        });

        it('should update refundEndTime', async () => {
          expect((await sale.refundEndTime()).toNumber()).to.be.closeTo(now + REFUND_PERIOD_DURATION, TIME_ERROR);
        });
      };

      context('from the owner', async () => {
        testFinalizationFrom(owner);
      });

      context('from not an owner', async () => {
        testFinalizationFrom(notOwner);
      });
    };

    context('after sale time has ended', async () => {
      beforeEach(async () => {
        await increaseTime((end - now) + 1);
        expect(now).to.be.above(end);
      });

      context('sold all of the tokens', async () => {
        beforeEach(async () => {
          await sale.setTokensSold(MAX_TOKENS_SOLD.toNumber());
        });

        testFinalization();
      });

      context('sold only 0.5 of the tokens', async () => {
        beforeEach(async () => {
          await sale.setTokensSold(MAX_TOKENS_SOLD.div(2).floor().toNumber());
        });

        testFinalization();
      });

      context('sold only 0.1 of the tokens', async () => {
        beforeEach(async () => {
          await sale.setTokensSold(MAX_TOKENS_SOLD.div(10).floor().toNumber());
        });

        testFinalization();
      });
    });

    context('reached token cap', async () => {
      beforeEach(async () => {
        await sale.setTokensSold(MAX_TOKENS_SOLD.toNumber());
      });

      testFinalization();
    });
  });

  describe('finalizeRefunds', async () => {
    let sale;
    let token;
    let start;
    const startFrom = 1000;
    let end;
    const fundRecipient = accounts[5];
    const vitPerWei = 1000;

    beforeEach(async () => {
      start = now + startFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      end = (await sale.endTime()).toNumber();
      token = VITToken.at(await sale.vitToken());

      expect(await token.mintingFinished()).to.be.false();
    });

    context('before sale has started', async () => {
      beforeEach(async () => {
        expect(now).to.be.below(start);
      });

      it('should not allow to finalize refunds before selling all tokens', async () => {
        await expectRevert(sale.finalizeRefunds());
      });
    });

    context('during the sale', async () => {
      beforeEach(async () => {
        // Increase time to be the in the middle of start and end.
        await increaseTime((start - now) + ((end - start) / 2));

        expect(now).to.be.within(start, end);
      });

      it('should not allow to finalize refunds before selling all tokens', async () => {
        await expectRevert(sale.finalizeRefunds());
      });
    });

    context('after sale, but before the end of refunding period', async () => {
      beforeEach(async () => {
        await increaseTime((end - now) + 1);
        expect(now).to.be.above(end);

        await sale.finalize();

        // Increase time to after the sale, but before the end of refunding period.
        const refundEndTime = (await sale.refundEndTime()).toNumber();
        await increaseTime((end - now) + ((refundEndTime - end) / 2));

        expect(now).to.be.within(end, refundEndTime);
      });

      it('should not allow to finalize refunds', async () => {
        await expectRevert(sale.finalizeRefunds());
      });
    });

    const testRefundFinalization = async () => {
      const testRefundFinalizationFrom = async (from) => {
        let balance;
        let fundRecipientBalance;

        beforeEach(async () => {
          expect(await sale.finalizedRefund()).to.be.false();

          balance = web3.eth.getBalance(sale.address).toNumber();
          expect(balance).to.be.above(0);

          fundRecipientBalance = web3.eth.getBalance(fundRecipient).toNumber();

          await sale.finalizeRefunds({ from });
        });

        it('should finish minting after sale was finalized', async () => {
          expect(await token.mintingFinished()).to.be.true();
        });

        it('should finish refund after sale was finalized', async () => {
          expect(await sale.finalizedRefund()).to.be.true();
        });

        it('should not allow to finalize refunds more than once', async () => {
          await expectRevert(sale.finalizeRefunds({ from }));
        });

        it('should transfer all the funds to the funding recipient ', async () => {
          expect(web3.eth.getBalance(sale.address).toNumber()).to.eql(0);
          expect(web3.eth.getBalance(fundRecipient).toNumber()).to.eql(fundRecipientBalance + balance);
        });
      };

      context('from the owner', async () => {
        testRefundFinalizationFrom(owner);
      });

      context('from not an owner', async () => {
        testRefundFinalizationFrom(notOwner);
      });
    };

    context('after refund period has ended', async () => {
      beforeEach(async () => {
        const value = 100;
        const sender = accounts[2];

        await increaseTime((start - now) + 1);
        expect(now).to.be.within(start, end);

        await sale.setRestrictedParticipationCap([sender], value);
        await sale.sendTransaction({ from: sender, value });

        expect(web3.eth.getBalance(sale.address).toNumber()).to.be.above(0);

        await increaseTime((end - now) + 1);
        expect(now).to.be.above(end);

        await sale.finalize();
        const refundEndTime = (await sale.refundEndTime()).toNumber();
        await increaseTime((refundEndTime - now) + 1);
        expect(now).to.be.above(refundEndTime);
      });

      context('sold all of the tokens', async () => {
        beforeEach(async () => {
          await sale.setTokensSold(MAX_TOKENS_SOLD.toNumber());
        });

        testRefundFinalization();
      });

      context('sold only 0.5 of the tokens', async () => {
        beforeEach(async () => {
          await sale.setTokensSold(MAX_TOKENS_SOLD.div(2).floor().toNumber());
        });

        testRefundFinalization();
      });

      context('sold only 0.1 of the tokens', async () => {
        beforeEach(async () => {
          await sale.setTokensSold(MAX_TOKENS_SOLD.div(10).floor().toNumber());
        });

        testRefundFinalization();
      });
    });
  });

  describe('claimTokens', async () => {
    let sale;
    let token;
    let start;
    const startFrom = 1000;
    let end;
    const fundRecipient = accounts[5];
    const participant = accounts[6];
    const nonParticipant = accounts[7];
    const value = new BigNumber(10).mul(ETH);
    const vitPerWei = 1000;
    const tokens = value.mul(vitPerWei);

    beforeEach(async () => {
      start = now + startFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      end = (await sale.endTime()).toNumber();
      token = VITToken.at(await sale.vitToken());

      expect(await token.mintingFinished()).to.be.false();
    });

    context('before sale has started', async () => {
      beforeEach(async () => {
        expect(now).to.be.below(start);
      });

      it('should not allow to claim tokens', async () => {
        await expectRevert(sale.claimTokens(value, { from: participant }));
        await expectRevert(sale.claimAllTokens({ from: participant }));
      });
    });

    context('participant', async () => {
      let refundableEtherAmount;
      let claimableTokens;

      beforeEach(async () => {
        // Increase time to be the in the middle of start and end.
        await increaseTime((start - now) + ((end - start) / 2));
        expect(now).to.be.within(start, end);

        refundableEtherAmount = await sale.refundableEther(participant);
        claimableTokens = await sale.claimableTokens(participant);
        await sale.sendTransaction({ from: participant, value });

        expect((await token.balanceOf(participant)).toNumber()).to.eql(0);
        expect((await token.balanceOf(sale.address)).toNumber()).to.eql(tokens.toNumber());

        expect((await sale.refundableEther(participant)).toNumber()).to
          .eql(refundableEtherAmount.plus(value).toNumber());
        expect((await sale.claimableTokens(participant)).toNumber()).to
          .eql(claimableTokens.plus(tokens).toNumber());
      });

      context('during the sale', async () => {
        beforeEach(async () => {
          expect(now).to.be.within(start, end);
        });

        it('should not allow to claim tokens', async () => {
          await expectRevert(sale.claimTokens(value, { from: participant }));
          await expectRevert(sale.claimAllTokens({ from: participant }));
        });
      });

      const testClaimTokens = async () => {
        let balance;
        let afterRefund = false;

        beforeEach(async () => {
          expect((await token.balanceOf(participant)).toNumber()).to.eql(0);
          expect((await token.balanceOf(sale.address)).toNumber()).to.eql(tokens.toNumber());
          expect(await sale.finalizedRefund()).to.be.false();

          balance = web3.eth.getBalance(sale.address);
          expect(balance.toNumber()).to.eql(value.toNumber());

          afterRefund = now > (await sale.refundEndTime()).toNumber();
        });

        it('should not allow to claim tokens for non-participants', async () => {
          expect((await sale.refundableEther(nonParticipant)).toNumber()).to.eql(0);
          expect((await sale.claimableTokens(nonParticipant)).toNumber()).to.eql(0);

          await expectRevert(sale.claimTokens(1, { from: nonParticipant }));
          await expectRevert(sale.claimAllTokens({ from: nonParticipant }));
        });

        it('should not allow to claim 0 tokens', async () => {
          await expectRevert(sale.claimTokens(0, { from: participant }));
        });

        it('should allow to claim tokens multiple times', async () => {
          const claims = 5;
          const claim = tokens.div(claims);
          for (let i = 0; i < claims; ++i) {
            const claimValue = claim.div(vitPerWei).floor();
            const prevParticipantTokenBalance = await token.balanceOf(participant);
            const prevSaleTokenBalance = await token.balanceOf(sale.address);
            const prevParticipantBalance = web3.eth.getBalance(participant);
            const prevSaleBalance = web3.eth.getBalance(sale.address);
            const prevRefundableEtherAmount = await sale.refundableEther(participant);
            const prevClaimableTokens = await sale.claimableTokens(participant);
            const prevFundRecipientBalance = web3.eth.getBalance(fundRecipient);
            const prevFundRecipientTokenBalance = await token.balanceOf(fundRecipient);

            const transaction = await sale.claimTokens(claim, { from: participant });
            const gasUsed = DEFAULT_GAS_PRICE.mul(transaction.receipt.gasUsed);

            expect(web3.eth.getBalance(participant).toNumber()).to.be
              .closeTo(prevParticipantBalance.minus(gasUsed).toNumber(), GAS_COST_ERROR);
            expect(web3.eth.getBalance(sale.address).toNumber()).to
              .eql(prevSaleBalance.minus(claimValue).toNumber());
            expect((await token.balanceOf(participant)).toNumber()).to
              .eql(prevParticipantTokenBalance.plus(claim).toNumber());
            expect((await token.balanceOf(sale.address)).toNumber()).to
              .eql(prevSaleTokenBalance.minus(claim).toNumber());
            expect((await sale.refundableEther(participant)).toNumber()).to
              .eql(prevRefundableEtherAmount.minus(claimValue).toNumber());
            expect((await sale.claimableTokens(participant)).toNumber()).to
              .eql(prevClaimableTokens.minus(claim).toNumber());

            if (!afterRefund) {
              expect(web3.eth.getBalance(fundRecipient).toNumber()).to
                .eql(prevFundRecipientBalance.plus(claimValue).toNumber());
            }

            expect((await token.balanceOf(fundRecipient)).toNumber()).to
              .eql(prevFundRecipientTokenBalance.toNumber());

            expect(transaction.logs).to.have.length(1);
            const event = transaction.logs[0];
            expect(event.event).to.eql('TokensClaimed');
            expect(event.args.from).to.eql(participant);
            expect(Number(event.args.tokens)).to.eql(claim.toNumber());
          }

          // Don't allow claiming more than entitled.
          await expectRevert(sale.claimTokens(1, { from: participant }));
        });

        it('should allow to claim all tokens', async () => {
          const prevParticipantTokenBalance = await token.balanceOf(participant);
          const prevSaleTokenBalance = await token.balanceOf(sale.address);
          const prevParticipantBalance = web3.eth.getBalance(participant);
          const prevSaleBalance = web3.eth.getBalance(sale.address);
          const prevRefundableEtherAmount = await sale.refundableEther(participant);
          const prevClaimableTokens = await sale.claimableTokens(participant);
          const prevFundRecipientBalance = web3.eth.getBalance(fundRecipient);
          const prevFundRecipientTokenBalance = await token.balanceOf(fundRecipient);

          const transaction = await sale.claimAllTokens({ from: participant });
          const gasUsed = DEFAULT_GAS_PRICE.mul(transaction.receipt.gasUsed);

          expect(web3.eth.getBalance(participant).toNumber()).to.be
            .closeTo(prevParticipantBalance.minus(gasUsed).toNumber(), GAS_COST_ERROR);
          expect(web3.eth.getBalance(sale.address).toNumber()).to
            .eql(prevSaleBalance.minus(value).toNumber());
          expect((await token.balanceOf(participant)).toNumber()).to
            .eql(prevParticipantTokenBalance.plus(tokens).toNumber());
          expect((await token.balanceOf(sale.address)).toNumber()).to
            .eql(prevSaleTokenBalance.minus(tokens).toNumber());
          expect((await sale.refundableEther(participant)).toNumber()).to
            .eql(prevRefundableEtherAmount.minus(value).toNumber());
          expect((await sale.claimableTokens(participant)).toNumber()).to
            .eql(prevClaimableTokens.minus(tokens).toNumber());

          if (!afterRefund) {
            expect(web3.eth.getBalance(fundRecipient).toNumber()).to
              .eql(prevFundRecipientBalance.plus(value).toNumber());
          }

          expect((await token.balanceOf(fundRecipient)).toNumber()).to
            .eql(prevFundRecipientTokenBalance.toNumber());

          expect(transaction.logs).to.have.length(1);
          const event = transaction.logs[0];
          expect(event.event).to.eql('TokensClaimed');
          expect(event.args.from).to.eql(participant);
          expect(Number(event.args.tokens)).to.eql(tokens.toNumber());
        });
      };

      context('after sale, but before the end of refunding period', async () => {
        beforeEach(async () => {
          await increaseTime((end - now) + 1);
          expect(now).to.be.above(end);

          await sale.finalize();

          // Increase time to after the sale, but before the end of refunding period.
          const refundEndTime = (await sale.refundEndTime()).toNumber();
          await increaseTime((end - now) + ((refundEndTime - end) / 2));

          expect(now).to.be.within(end, refundEndTime);
        });

        testClaimTokens();
      });

      context('after refund period has ended', async () => {
        beforeEach(async () => {
          await increaseTime((end - now) + 1);
          expect(now).to.be.above(end);

          await sale.finalize();

          const refundEndTime = (await sale.refundEndTime()).toNumber();
          await increaseTime((refundEndTime - now) + 1);
          expect(now).to.be.above(refundEndTime);
        });

        testClaimTokens();
      });
    });
  });

  describe('refundEther', async () => {
    let sale;
    let token;
    let start;
    const startFrom = 1000;
    let end;
    const fundRecipient = accounts[5];
    const participant = accounts[6];
    const nonParticipant = accounts[7];
    const value = new BigNumber(10).mul(ETH);
    const vitPerWei = 12345;
    const tokens = value.mul(vitPerWei);

    beforeEach(async () => {
      start = now + startFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
        STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
      end = (await sale.endTime()).toNumber();
      token = VITToken.at(await sale.vitToken());

      expect(await token.mintingFinished()).to.be.false();
    });

    context('before sale has started', async () => {
      beforeEach(async () => {
        expect(now).to.be.below(start);
      });

      it('should not allow to refund ether', async () => {
        await expectRevert(sale.refundEther(value, { from: participant }));
        await expectRevert(sale.refundAllEther({ from: participant }));
      });
    });

    context('participant', async () => {
      let refundableEtherAmount;
      let claimableTokens;

      beforeEach(async () => {
        // Increase time to be the in the middle of start and end.
        await increaseTime((start - now) + ((end - start) / 2));
        expect(now).to.be.within(start, end);

        refundableEtherAmount = await sale.refundableEther(participant);
        claimableTokens = await sale.claimableTokens(participant);
        await sale.sendTransaction({ from: participant, value });

        expect((await token.balanceOf(participant)).toNumber()).to.eql(0);
        expect((await token.balanceOf(sale.address)).toNumber()).to.eql(tokens.toNumber());

        expect((await sale.refundableEther(participant)).toNumber()).to
          .eql(refundableEtherAmount.plus(value).toNumber());
        expect((await sale.claimableTokens(participant)).toNumber()).to
          .eql(claimableTokens.plus(tokens).toNumber());
      });

      context('during the sale', async () => {
        beforeEach(async () => {
          expect(now).to.be.within(start, end);
        });

        it('should not allow to refund ether', async () => {
          await expectRevert(sale.refundEther(value, { from: participant }));
          await expectRevert(sale.refundAllEther({ from: participant }));
        });
      });

      const testRefundEther = async () => {
        let balance;

        beforeEach(async () => {
          expect((await token.balanceOf(participant)).toNumber()).to.eql(0);
          expect((await token.balanceOf(sale.address)).toNumber()).to.eql(tokens.toNumber());
          expect(await sale.finalizedRefund()).to.be.false();

          balance = web3.eth.getBalance(sale.address);
          expect(balance.toNumber()).to.eql(value.toNumber());
        });

        it('should not allow to refund ether for non-participants', async () => {
          expect((await sale.refundableEther(nonParticipant)).toNumber()).to.eql(0);
          expect((await sale.claimableTokens(nonParticipant)).toNumber()).to.eql(0);

          await expectRevert(sale.refundEther(1, { from: nonParticipant }));
          await expectRevert(sale.refundAllEther({ from: nonParticipant }));
        });

        it('should not allow to refund 0 ether', async () => {
          await expectRevert(sale.refundEther(0, { from: participant }));
        });

        it('should allow to refund ether multiple times', async () => {
          const claims = 5;
          const claim = value.div(claims);
          for (let i = 0; i < claims; ++i) {
            const claimTokenValue = claim.mul(vitPerWei);
            const prevParticipantTokenBalance = await token.balanceOf(participant);
            const prevSaleTokenBalance = await token.balanceOf(sale.address);
            const prevParticipantBalance = web3.eth.getBalance(participant);
            const prevSaleBalance = web3.eth.getBalance(sale.address);
            const prevRefundableEtherAmount = await sale.refundableEther(participant);
            const prevClaimableTokens = await sale.claimableTokens(participant);
            const prevFundRecipientBalance = web3.eth.getBalance(fundRecipient);
            const prevFundRecipientTokenBalance = await token.balanceOf(fundRecipient);

            const transaction = await sale.refundEther(claim, { from: participant });
            const gasUsed = DEFAULT_GAS_PRICE.mul(transaction.receipt.gasUsed);

            expect(web3.eth.getBalance(participant).toNumber()).to.be
              .closeTo(prevParticipantBalance.plus(claim).minus(gasUsed).toNumber(), GAS_COST_ERROR);
            expect(web3.eth.getBalance(sale.address).toNumber()).to
              .eql(prevSaleBalance.minus(claim).toNumber());
            expect((await token.balanceOf(participant)).toNumber()).to
              .eql(prevParticipantTokenBalance.toNumber());
            expect((await token.balanceOf(sale.address)).toNumber()).to
              .eql(prevSaleTokenBalance.minus(claimTokenValue).toNumber());
            expect((await sale.refundableEther(participant)).toNumber()).to
              .eql(prevRefundableEtherAmount.minus(claim).toNumber());
            expect((await sale.claimableTokens(participant)).toNumber()).to
              .eql(prevClaimableTokens.minus(claimTokenValue).toNumber());

            expect(web3.eth.getBalance(fundRecipient).toNumber()).to
              .eql(prevFundRecipientBalance.toNumber());
            expect((await token.balanceOf(fundRecipient)).toNumber()).to
              .eql(prevFundRecipientTokenBalance.plus(claimTokenValue).toNumber());

            expect(transaction.logs).to.have.length(1);
            const event = transaction.logs[0];
            expect(event.event).to.eql('EtherRefunded');
            expect(event.args.from).to.eql(participant);
            expect(Number(event.args.weiAmount)).to.eql(claim.toNumber());
          }

          // Don't allow claiming more than entitled.
          await expectRevert(sale.refundEther(1, { from: participant }));
        });

        it('should allow to refund all ether', async () => {
          const prevParticipantTokenBalance = await token.balanceOf(participant);
          const prevSaleTokenBalance = await token.balanceOf(sale.address);
          const prevParticipantBalance = web3.eth.getBalance(participant);
          const prevSaleBalance = web3.eth.getBalance(sale.address);
          const prevRefundableEtherAmount = await sale.refundableEther(participant);
          const prevClaimableTokens = await sale.claimableTokens(participant);
          const prevFundRecipientBalance = web3.eth.getBalance(fundRecipient);
          const prevFundRecipientTokenBalance = await token.balanceOf(fundRecipient);

          const transaction = await sale.refundAllEther({ from: participant });
          const gasUsed = DEFAULT_GAS_PRICE.mul(transaction.receipt.gasUsed);

          expect(web3.eth.getBalance(participant).toNumber()).to.be
            .closeTo(prevParticipantBalance.plus(value).minus(gasUsed).toNumber(), GAS_COST_ERROR);
          expect(web3.eth.getBalance(sale.address).toNumber()).to
            .eql(prevSaleBalance.minus(value).toNumber());
          expect((await token.balanceOf(participant)).toNumber()).to
            .eql(prevParticipantTokenBalance.toNumber());
          expect((await token.balanceOf(sale.address)).toNumber()).to
            .eql(prevSaleTokenBalance.minus(tokens).toNumber());
          expect((await sale.refundableEther(participant)).toNumber()).to
            .eql(prevRefundableEtherAmount.minus(value).toNumber());
          expect((await sale.claimableTokens(participant)).toNumber()).to
            .eql(prevClaimableTokens.minus(tokens).toNumber());

          expect(web3.eth.getBalance(fundRecipient).toNumber()).to
            .eql(prevFundRecipientBalance.toNumber());
          expect((await token.balanceOf(fundRecipient)).toNumber()).to
            .eql(prevFundRecipientTokenBalance.plus(tokens).toNumber());

          expect(transaction.logs).to.have.length(1);
          const event = transaction.logs[0];
          expect(event.event).to.eql('EtherRefunded');
          expect(event.args.from).to.eql(participant);
          expect(Number(event.args.weiAmount)).to.eql(value.toNumber());
        });
      };

      context('after sale, but before the end of refunding period', async () => {
        beforeEach(async () => {
          await increaseTime((end - now) + 1);
          expect(now).to.be.above(end);

          await sale.finalize();

          // Increase time to after the sale, but before the end of refunding period.
          const refundEndTime = (await sale.refundEndTime()).toNumber();
          await increaseTime((end - now) + ((refundEndTime - end) / 2));

          expect(now).to.be.within(end, refundEndTime);
        });

        testRefundEther();
      });

      context('after refund period has ended', async () => {
        beforeEach(async () => {
          await increaseTime((end - now) + 1);
          expect(now).to.be.above(end);

          await sale.finalize();

          const refundEndTime = (await sale.refundEndTime()).toNumber();
          await increaseTime((refundEndTime - now) + 1);
          expect(now).to.be.above(refundEndTime);
        });

        it('should not allow to refund ether', async () => {
          await expectRevert(sale.refundEther(value, { from: participant }));
          await expectRevert(sale.refundAllEther({ from: participant }));
        });
      });
    });
  });

  // Execute a transaction, and test that balances and total tokens sold have been updated correctly.
  //
  // NOTE: This function automatically finalizes the sale when the cap has been reached.]
  const verifyTransactions = async (sale, fundRecipient, method, transactions) => {
    const token = VITToken.at(await sale.vitToken());
    const start = (await sale.startTime()).toNumber();
    const vitPerWei = (await sale.vitPerWei()).toNumber();

    // Using large numerics, so we have to use BigNumber.
    let totalTokensSold = new BigNumber(0);
    let totalClaimableTokens = new BigNumber(0);

    let i = 0;
    for (const t of transactions) {
      if (t.fastForward) {
        // eslint-disable-next-line no-console
        console.log(`\t[${++i} / ${transactions.length}] fast-forward by ${t.fastForward}`);

        await increaseTime(t.fastForward);

        continue;
      }

      let tokens = t.value.mul(vitPerWei);

      // eslint-disable-next-line no-console
      console.log(`\t[${++i} / ${transactions.length}] expecting account ${t.from} to buy up to ` +
        `${tokens.div(TOKEN_UNIT).floor().toNumber()} VIT for ${t.value.div(ETH).floor()} ETH`);

      // Cache original balances before executing the transaction. We will test against these after the transaction has
      // been executed.
      const participantETHBalance = web3.eth.getBalance(t.from);
      const participantVITBalance = await token.balanceOf(t.from);
      const participantRefundableETH = await sale.refundableEther(t.from);
      const participantClaimableTokens = await sale.claimableTokens(t.from);
      const participantHistory = await sale.participationHistory(t.from);
      const saleETHBalance = web3.eth.getBalance(sale.address);
      const saleVITBalance = await token.balanceOf(sale.address);

      // Take into account the restricted period participation cap.
      const participantCap = await sale.participationCaps(t.from);
      const duringRestrictedPeriod = now <= start + RESTRICTED_PERIOD_DURATION;

      const tokensSold = await sale.tokensSold();
      expect(totalTokensSold.toNumber()).to.eql(tokensSold.toNumber());

      const tokensClaimable = await sale.totalClaimableTokens();
      expect(totalClaimableTokens.toNumber()).to.eql(tokensClaimable.toNumber());

      // If this transaction should fail, then theres no need to continue testing the current transaction and test for
      // updated balances, etc., since everything related to it was reverted.
      //
      // Reasons for failures can be:
      //  1. We already sold all the tokens
      //  2. Participant has reached his participation cap, during the restricted period.
      if (MAX_TOKENS_SOLD.equals(tokensSold) || (duringRestrictedPeriod &&
        participantHistory.greaterThanOrEqualTo(participantCap))) {
        await expectRevert(method(sale, t.value, t.from));

        continue;
      }

      // Execute transaction.
      const transaction = await method(sale, t.value, t.from);
      const gasUsed = DEFAULT_GAS_PRICE.mul(transaction.receipt.gasUsed);

      // Test for correct participant ETH, VIT balance, and total tokens sold:

      // NOTE: We take into account partial refund to the participant, in case transaction goes past its participation
      // cap.
      //
      // NOTE: We have to convert the (very) big numbers to strings, before converting them to BigNumber, since JS
      // standard Number type doesn't support numbers with more than 15 significant digits.
      let contribution = t.value;
      if (duringRestrictedPeriod) {
        contribution = BigNumber.min(contribution, participantCap.minus(participantHistory));
      }
      tokens = contribution.mul(vitPerWei);

      // Take into account the remaining amount of tokens which can be still sold:
      tokens = BigNumber.min(tokens, MAX_TOKENS_SOLD.minus(tokensSold));
      contribution = tokens.div(vitPerWei).floor();

      totalTokensSold = totalTokensSold.plus(tokens);
      totalClaimableTokens = totalClaimableTokens.plus(tokens);

      // Test for total tokens sold and total claimable tokens.
      expect((await sale.tokensSold()).toNumber()).to.eql(tokensSold.plus(tokens).toNumber());
      expect((await sale.totalClaimableTokens()).toNumber()).to.eql(tokensClaimable.plus(tokens).toNumber());

      // Test for correct participant ETH + VIT balances.

      // ETH:
      expect(web3.eth.getBalance(sale.address).toNumber()).to.eql(saleETHBalance.plus(contribution).toNumber());
      expect(web3.eth.getBalance(t.from).toNumber()).to.be
        .closeTo(participantETHBalance.minus(contribution).minus(gasUsed).toNumber(), GAS_COST_ERROR);

      // VIT + refunds:
      expect((await token.balanceOf(t.from)).toNumber()).to.eql(participantVITBalance.toNumber());
      expect((await token.balanceOf(sale.address)).toNumber()).to.eql(saleVITBalance.plus(tokens).toNumber());
      expect((await sale.refundableEther(t.from)).toNumber()).to.be
        .eql(participantRefundableETH.plus(contribution).toNumber());
      expect((await sale.claimableTokens(t.from)).toNumber()).to
        .eql(participantClaimableTokens.plus(tokens).toNumber());

      // Test for updated participant history.
      expect((await sale.participationHistory(t.from)).toNumber()).to
        .eql(participantHistory.plus(contribution).toNumber());

      // Test mint event.
      expect(transaction.logs).to.have.length(1);
      const event = transaction.logs[0];
      expect(event.event).to.eql('TokensIssued');
      expect(Number(event.args.tokens)).to.eql(tokens.toNumber());

      // Finalize sale if the all tokens have been sold.
      if (totalTokensSold.equals(MAX_TOKENS_SOLD)) {
        console.log('\tFinalizing sale...'); // eslint-disable-line no-console

        expect((await sale.tokensSold()).toNumber()).to.eql(MAX_TOKENS_SOLD.toNumber());
        expect((await token.totalSupply()).toNumber()).to.eql(MAX_TOKENS.toNumber());

        await sale.finalize();
      }
    }
  };

  const generateTokenTests = async (name, method) => {
    describe(name, async () => {
      let sale;
      let token;
      const fundRecipient = accounts[1];
      const restrictedParticipant = accounts[9];
      const restrictedCap = new BigNumber(32).mul(ETH);
      let start;
      const startFrom = 1000;
      let end;
      const value = 1000;
      const vitPerWei = 1500;

      beforeEach(async () => {
        start = now + startFrom;
        sale = await VITTokenSaleMock.new(fundRecipient, start, vitPerWei, TOKKEN_MSB_INC_ADDRESS,
          STRATEGIC_PARTNERS_ADDRESS, STEEM_HOLDERS_ADDRESS);
        end = (await sale.endTime()).toNumber();
        token = VITToken.at(await sale.vitToken());

        expect(await token.mintingFinished()).to.be.false();

        await sale.setRestrictedParticipationCap([restrictedParticipant], restrictedCap);
      });

      context('after the sale', async () => {
        beforeEach(async () => {
          await increaseTime((end - now) + 1);
          expect(now).to.be.above(end);
        });

        it('should not allow to execute', async () => {
          await expectRevert(method(sale, value));
        });

        context('and finalized', async () => {
          beforeEach(async () => {
            await sale.finalize();
          });

          it('should not allow to execute', async () => {
            await expectRevert(method(sale, value));
          });
        });
      });

      context('reached token cap', async () => {
        beforeEach(async () => {
          await sale.setTokensSold(MAX_TOKENS_SOLD.toNumber());
          expect((await sale.tokensSold()).toNumber()).to.eql(MAX_TOKENS_SOLD.toNumber());
        });

        it('should not allow to execute', async () => {
          await expectRevert(method(sale, value));
        });

        context('and finalized', async () => {
          beforeEach(async () => {
            await sale.finalize();
          });

          it('should not allow to execute', async () => {
            await expectRevert(method(sale, value));
          });
        });
      });

      context('before sale has started', async () => {
        beforeEach(async () => {
          expect(now).to.be.below(start);
        });

        it('should not allow to execute', async () => {
          await expectRevert(method(sale, value));
        });
      });

      context('during refund period', async () => {
        beforeEach(async () => {
          await increaseTime((end - now) + 1);
          expect(now).to.be.above(end);

          await sale.finalize();
        });

        it('should not allow to execute', async () => {
          await expectRevert(method(sale, value));
        });
      });

      context('after refund period', async () => {
        beforeEach(async () => {
          await increaseTime((end - now) + 1);
          expect(now).to.be.above(end);

          await sale.finalize();
          const refundEndTime = (await sale.refundEndTime()).toNumber();
          await increaseTime((refundEndTime - now) + 1);
          expect(now).to.be.above(refundEndTime);
        });

        it('should not allow to execute', async () => {
          await expectRevert(method(sale, value));
        });
      });

      context('during the restricted period', async () => {
        beforeEach(async () => {
          await increaseTime(((start + RESTRICTED_PERIOD_DURATION) - now) - (1 * HOUR));
          expect(now).to.be.within(start, start + RESTRICTED_PERIOD_DURATION);
        });

        context('non white-listed participants during the restricted period', async () => {
          [
            { from: accounts[1], value: new BigNumber(1).mul(TOKEN_UNIT) },
            { from: accounts[2], value: new BigNumber(2).mul(TOKEN_UNIT) },
            { from: accounts[3], value: new BigNumber(0.0001).mul(TOKEN_UNIT) },
            { from: accounts[4], value: new BigNumber(10).mul(TOKEN_UNIT) },
          ].forEach((t) => {
            it(`should not allow to participate with ${t.value.div(ETH).floor()} ETH`, async () => {
              expect((await sale.participationCaps(t.from)).toNumber()).to.eql(0);

              await expectRevert(method(sale, t.value));
            });
          });
        });
      });

      context('during the sale', async () => {
        beforeEach(async () => {
          await increaseTime((start - now) + 1);
          expect(now).to.be.within(start, end);
        });

        it('should not allow to execute with 0 ETH', async () => {
          await expectRevert(method(sale, 0));
        });

        context('white-listed participants', async () => {
          const restrictedParticipant1 = accounts[1];
          const restrictedParticipant2 = accounts[2];
          const restrictedParticipant3 = accounts[3];
          const participant1 = accounts[4];
          const participant2 = accounts[5];
          const participant3 = accounts[6];

          // Use default (limited) hard participation cap
          // and initialize tier 1 + tier 2 participants.
          beforeEach(async () => {
            await sale.setRestrictedParticipationCap([owner, restrictedParticipant1, restrictedParticipant2,
              restrictedParticipant3], restrictedCap);
          });

          [
            [
              { from: owner, value: new BigNumber(1).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(1).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(1).mul(ETH) },
              { from: owner, value: new BigNumber(1).mul(ETH) },
              { from: owner, value: new BigNumber(3).mul(ETH) },
            ],
            [
              { from: restrictedParticipant1, value: new BigNumber(1).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(1).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(1).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(150).mul(ETH) },
            ],
            [
              { from: restrictedParticipant1, value: new BigNumber(1).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(0.5).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(10).mul(ETH) },
              { from: participant1, value: new BigNumber(100).mul(ETH) },
              { from: participant2, value: new BigNumber(0.01).mul(ETH) },
              { from: participant3, value: new BigNumber(2.5).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(0.01).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(1200).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(0.01).mul(ETH) },
            ],
            [
              { from: restrictedParticipant1, value: restrictedCap.plus(10 * ETH) },
              { from: restrictedParticipant2, value: new BigNumber(100).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(100).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(2).mul(ETH) },
              { from: participant2, value: new BigNumber(1000).mul(ETH) },
              { from: participant3, value: new BigNumber(1.3).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(0.01).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(100).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(0.01).mul(ETH) },
            ],
            [
              { fastForward: RESTRICTED_PERIOD_DURATION + 1 },

              { from: restrictedParticipant2, value: new BigNumber(5000).mul(ETH) },
              { from: participant3, value: new BigNumber(1000000).mul(ETH) },
            ],
            [
              { from: restrictedParticipant1, value: new BigNumber(11).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(12).mul(ETH) },
              { from: participant3, value: new BigNumber(13).mul(ETH) },
              { from: participant1, value: new BigNumber(21).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(211).mul(ETH) },
              { from: participant2, value: new BigNumber(22).mul(ETH) },

              { fastForward: RESTRICTED_PERIOD_DURATION },

              { from: restrictedParticipant1, value: new BigNumber(5000).mul(ETH) },
              { from: participant1, value: new BigNumber(1000000).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(10000).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(121).mul(ETH) },
              { from: participant1, value: new BigNumber(1000000).mul(ETH) },
              { from: participant3, value: new BigNumber(131).mul(ETH) },
              { from: participant2, value: new BigNumber(5000000).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(1212).mul(ETH) },
              { from: participant2, value: new BigNumber(8000000).mul(ETH) },
            ],
            [
              { from: participant1, value: new BigNumber(100).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(1000).mul(ETH) },
              { from: participant1, value: new BigNumber(10000).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(100).mul(ETH) },
              { from: participant1, value: new BigNumber(1).mul(ETH) },
              { from: participant1, value: new BigNumber(0.1).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(0.01).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(10).mul(ETH) },
              { from: participant1, value: new BigNumber(1000000).mul(ETH) },
              { from: participant1, value: new BigNumber(1000).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(999).mul(ETH) },
              { from: participant1, value: new BigNumber(9999).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(99).mul(ETH) },
              { from: participant1, value: new BigNumber(10).mul(ETH) },
              { from: participant2, value: new BigNumber(10).mul(ETH) },
              { from: participant1, value: new BigNumber(1).mul(ETH) },
              { from: participant2, value: new BigNumber(100).mul(ETH) },
              { from: participant2, value: new BigNumber(100000).mul(ETH) },

              { fastForward: (1 * DAY) + RESTRICTED_PERIOD_DURATION },

              { from: participant1, value: new BigNumber(1000000).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(121).mul(ETH) },
              { from: participant1, value: new BigNumber(5000000).mul(ETH) },
              { from: participant2, value: new BigNumber(131).mul(ETH) },
              { from: participant1, value: new BigNumber(8000000).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(10000).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(1212).mul(ETH) },
            ],
            [
              { fastForward: (30 * MINUTE) + RESTRICTED_PERIOD_DURATION },

              { from: participant1, value: new BigNumber(100).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(1000).mul(ETH) },
              { from: participant1, value: new BigNumber(10000).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(100).mul(ETH) },
              { from: participant1, value: new BigNumber(1).mul(ETH) },
              { from: participant1, value: new BigNumber(0.1).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(0.01).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(10).mul(ETH) },
              { from: participant1, value: new BigNumber(1000000).mul(ETH) },
              { from: participant1, value: new BigNumber(1000).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(999).mul(ETH) },
              { from: participant1, value: new BigNumber(9999).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(99).mul(ETH) },
              { from: participant1, value: new BigNumber(10).mul(ETH) },
              { from: participant2, value: new BigNumber(10).mul(ETH) },
              { from: participant1, value: new BigNumber(1).mul(ETH) },
              { from: participant2, value: new BigNumber(100).mul(ETH) },
              { from: participant2, value: new BigNumber(100000).mul(ETH) },
              { from: participant1, value: new BigNumber(1000000).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(121).mul(ETH) },
              { from: participant1, value: new BigNumber(5000000).mul(ETH) },
              { from: participant2, value: new BigNumber(131).mul(ETH) },
              { from: participant1, value: new BigNumber(8000000).mul(ETH) },
              { from: restrictedParticipant1, value: new BigNumber(10000).mul(ETH) },
              { from: restrictedParticipant2, value: new BigNumber(1212).mul(ETH) },
            ],
            [
              { fastForward: (30 * MINUTE) + RESTRICTED_PERIOD_DURATION },

              { from: participant3, value: MAX_TOKENS_SOLD.div(vitPerWei).floor().minus(100) },
              { from: participant1, value: new BigNumber(10) },
            ],
          ].forEach((transactions) => {
            context(`${JSON.stringify(transactions).slice(0, 200)}...`, async function verify() {
              // These are long tests, so we need to disable timeouts.
              this.timeout(0);

              it('should execute sale orders', async () => {
                await verifyTransactions(sale, fundRecipient, method, transactions);
              });
            });
          });
        });
      });
    });
  };

  // Generate tests for fallback method.
  generateTokenTests('using fallback function', async (sale, value, from) => {
    if (from) {
      return sale.sendTransaction({ value, from });
    }

    return sale.send(value);
  });
});
