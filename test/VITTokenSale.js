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

  const RESTRICTED_PERIOD_DURATION = 1 * DAY;

  const STRATEGIC_PARTNERS_POOLS = [
    '0x2e45c5b4103f95a0135135b1e18598ded35ca1db',
    '0xcf7d979e3a3e8fbc22f3bfcbe8d9239b6bff6cef',
    '0x00a7493399b0e6b9c4c0bda02365ea868bb6dbf9',
    '0x153ee929806383a2160a0292a7d854588b4e458a',
    '0x95d937eb2efc5a6270c282ef1174b5f8624ec3ac',
    '0xfcdd3218988e3ea61fccaf8465f7d79cb95d7bad',
    '0x9dfb0935641c33314312beed90aa139d5a80010d',
    '0x95745e2b30a25483b763b40c2f1cf1cf30586016',
    '0x59adf303183ae61a0a04d74308152840599788a1',
    '0x86020fe369b7c946d965a4dd77531ad2838450c9',
    '0xfaf9d7a08298b347bf7e92383c78b69decf8f938',
    '0xd7045d13470dcd0ebd9ab1b493c4244d45bd607e',
    '0xeaa2324de07a430ba15258cc488511f64ae91f94',
    '0x92ec9d8bd961da8f89f6b71f6892abaa89ce2223',
    '0xd1ba6a403b761c009c9054987ab897c8418ab670',
    '0x59d83d4dbbbc80cfc9f3dbc6e86d3a62ae9458ab',
    '0xf3278783d956e0154c2b920a86e35f1cf7b769da',
    '0xb734f4e9f5f078213e66f79b01eb699040edf0f3',
    '0x46bbbc4a1c098ae58e00ee94e7e0cdc5c460defa',
    '0x629e21ad0724ec78fb330e9824ceced4bcc4a67a',
  ];

  const STRATEGIC_PARTNERS_POOL_ALLOCATION = new BigNumber(100 * (10 ** 6)).mul(TOKEN_UNIT);

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
      await expectRevert(VITTokenSaleMock.new(null, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS));
    });

    it('should not allow to initialize with null funding recipient address', async () => {
      await expectRevert(VITTokenSaleMock.new(0, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS));
    });

    it('should not allow to initialize with 0 VIT exchange rate', async () => {
      await expectRevert(VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, 0, STRATEGIC_PARTNERS_POOLS));
    });

    it('should be initialized with a future starting time', async () => {
      await expectRevert(VITTokenSaleMock.new(fundRecipient, now - 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS));
    });

    it('should be initialized with an ending time before the starting time', async () => {
      await expectRevert(VITTokenSaleMock.new(fundRecipient, now + 100, now - 99, now + 10000, vitPerWei,
        STRATEGIC_PARTNERS_POOLS));
    });

    it('should be initialized with an ending time after the restricted period', async () => {
      await expectRevert(VITTokenSaleMock.new(fundRecipient, now + 100, now + 100 + (RESTRICTED_PERIOD_DURATION - 1),
        now + RESTRICTED_PERIOD_DURATION + 100000, vitPerWei, STRATEGIC_PARTNERS_POOLS));
    });

    it('should be initialized with a refund ending time after the ending time', async () => {
      await expectRevert(VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 500, vitPerWei, STRATEGIC_PARTNERS_POOLS));
    });

    it('should not allow to initialize with no strategic partner pools addresses tokken address', async () => {
      await expectRevert(VITTokenSaleMock.new(0, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, 0, []));
    });

    it('should not allow to initialize with 0 strategic partner pools', async () => {
      const strategicPartnersPools = STRATEGIC_PARTNERS_POOLS.slice(0);
      strategicPartnersPools[5] = '0x0000000000000000000000000000000000000000';
      await expectRevert(VITTokenSaleMock.new(0, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, strategicPartnersPools));
    });

    it('should deploy the VITToken contract and own it', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS);
      expect(await sale.vitToken()).not.to.be.zero();

      const token = VITToken.at(await sale.vitToken());
      expect(await token.owner()).to.eql(sale.address);
    });

    it('should be initialized with an exchange price', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS);
      expect((await sale.vitPerWei()).toNumber()).to.eql(vitPerWei);
    });

    it('should be initialized with strategic pool partners', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS);

      for (let i = 0; i < STRATEGIC_PARTNERS_POOLS.length; ++i) {
        expect(await sale.strategicPartnersPools(i)).to.eql(STRATEGIC_PARTNERS_POOLS[i]);
      }
    });

    it('should be initialized in minting enabled mode', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS);
      const token = VITToken.at(await sale.vitToken());
      expect(await token.mintingFinished()).to.be.false();
    });

    it('should be initialized with 0 total sold tokens', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS);
      expect((await sale.tokensSold()).toNumber()).to.eql(0);
    });

    it('should be initialized with 0 total claimable tokens', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS);
      expect((await sale.totalClaimableTokens()).toNumber()).to.eql(0);
    });

    it('should be initialized with false finalizedRefund', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 1000,
        now + RESTRICTED_PERIOD_DURATION + 10000, vitPerWei, STRATEGIC_PARTNERS_POOLS);
      expect(await sale.finalizedRefund()).to.be.false();
    });

    it('should be ownable', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 10000,
        now + RESTRICTED_PERIOD_DURATION + 100000, vitPerWei, STRATEGIC_PARTNERS_POOLS);
      expect(await sale.owner()).to.eql(accounts[0]);
    });

    it('should allocate initial grants', async () => {
      const sale = await VITTokenSaleMock.new(fundRecipient, now + 100, now + RESTRICTED_PERIOD_DURATION + 10000,
        now + RESTRICTED_PERIOD_DURATION + 100000, vitPerWei, STRATEGIC_PARTNERS_POOLS);
      const token = VITToken.at(await sale.vitToken());

      for (let i = 0; i < STRATEGIC_PARTNERS_POOLS.length; ++i) {
        expect((await token.balanceOf(STRATEGIC_PARTNERS_POOLS[i])).toNumber()).to
          .eql(STRATEGIC_PARTNERS_POOL_ALLOCATION.toNumber());
      }
    });
  });

  describe('reclaim tokens', async () => {
    const fundRecipient = accounts[5];
    let sale;
    let start;
    let end;
    const startFrom = 1000;
    const endFrom = 30 * DAY;
    const refundFrom = 180 * DAY;
    const vitPerWei = 2000;

    beforeEach(async () => {
      start = now + startFrom;
      end = now + endFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, end, end + refundFrom, vitPerWei,
        STRATEGIC_PARTNERS_POOLS);
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
    let start;
    let end;
    const startFrom = 1000;
    const endFrom = 30 * DAY;
    const refundFrom = 180 * DAY;

    // Test all accounts have their participation caps set properly.
    beforeEach(async () => {
      start = now + startFrom;
      end = now + endFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, end, end + refundFrom, vitPerWei,
        STRATEGIC_PARTNERS_POOLS);

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
    const endFrom = 30 * DAY;
    const refundFrom = 180 * DAY;
    const fundRecipient = accounts[5];
    const vitPerWei = 1234;

    beforeEach(async () => {
      start = now + startFrom;
      end = now + endFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, end, end + refundFrom, vitPerWei,
        STRATEGIC_PARTNERS_POOLS);

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
    const endFrom = 30 * DAY;
    const refundFrom = 180 * DAY;
    const fundRecipient = accounts[5];
    const vitPerWei = 1000;

    beforeEach(async () => {
      start = now + startFrom;
      end = now + endFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, end, end + refundFrom, vitPerWei,
        STRATEGIC_PARTNERS_POOLS);

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
    const endFrom = 30 * DAY;
    const refundFrom = 180 * DAY;
    const fundRecipient = accounts[5];
    const participant = accounts[6];
    const nonParticipant = accounts[7];
    const value = new BigNumber(10).mul(ETH);
    const vitPerWei = 1000;
    const tokens = value.mul(vitPerWei);

    beforeEach(async () => {
      start = now + startFrom;
      end = now + endFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, end, end + refundFrom, vitPerWei,
        STRATEGIC_PARTNERS_POOLS);

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
    const endFrom = 30 * DAY;
    const refundFrom = 180 * DAY;
    const fundRecipient = accounts[5];
    const participant = accounts[6];
    const nonParticipant = accounts[7];
    const value = new BigNumber(10).mul(ETH);
    const vitPerWei = 12345;
    const tokens = value.mul(vitPerWei);

    beforeEach(async () => {
      start = now + startFrom;
      end = now + endFrom;
      sale = await VITTokenSaleMock.new(fundRecipient, start, end, end + refundFrom, vitPerWei,
        STRATEGIC_PARTNERS_POOLS);

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
      const endFrom = 30 * DAY;
      const refundFrom = 180 * DAY;
      const value = 1000;
      const vitPerWei = 1500;

      beforeEach(async () => {
        start = now + startFrom;
        end = now + endFrom;
        sale = await VITTokenSaleMock.new(fundRecipient, start, end, end + refundFrom, vitPerWei,
          STRATEGIC_PARTNERS_POOLS);

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
