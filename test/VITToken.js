import chai from 'chai';
import dirtyChai from 'dirty-chai';
import expectRevert from './helpers/expectRevert';

const { expect } = chai;
chai.use(dirtyChai);

const VITToken = artifacts.require('../contracts/VITToken.sol');

contract('VITToken', (accounts) => {
  let token;

  const owner = accounts[0];
  const spender = accounts[1];
  const to1 = accounts[2];
  const to2 = accounts[3];
  const to3 = accounts[4];

  const initialFunds = 100000;
  const allowedAmount = 100;
  const transferredFunds = 1200;

  beforeEach(async () => {
    token = await VITToken.new();
  });

  describe('construction', async () => {
    it('should be ownable', async () => {
      expect(await token.owner()).to.eql(owner);
    });

    it('should return correct name after construction', async () => {
      expect(await token.name()).to.eql('Vice');
    });

    it('should return correct symbol after construction', async () => {
      expect(await token.symbol()).to.eql('VIT');
    });

    it('should return correct decimal points after construction', async () => {
      expect((await token.decimals()).toNumber()).to.eql(18);
    });

    it('should return correct initial totalSupply after construction', async () => {
      expect((await token.totalSupply()).toNumber()).to.eql(0);
    });

    it('should have minting mode turned on', async () => {
      expect(await token.mintingFinished()).to.be.false();
    });
  });

  describe('operations', async () => {
    let balanceOwner;
    let balanceSpender;
    let balanceTo;

    beforeEach(async () => {
      // Should return 0 balance for owner account.
      expect((await token.balanceOf(owner)).toNumber()).to.eql(0);

      // Assign tokens to account[0] ('owner').
      await token.mint(owner, initialFunds);

      // Disable minting, in order to allow transfers.
      await token.finishMinting();

      balanceOwner = (await token.balanceOf(owner)).toNumber();
      balanceSpender = (await token.balanceOf(spender)).toNumber();
      balanceTo = (await token.balanceOf(to1)).toNumber();
    });

    // Tests involving simple transfer() of funds and fetching balanceOf() accounts.
    describe('transfer', async () => {
      it('should update balanceOf() after transfer()', async () => {
        await token.transfer(spender, transferredFunds);

        expect((await token.balanceOf(owner)).toNumber()).to.eql(balanceOwner - transferredFunds);
        expect((await token.balanceOf(spender)).toNumber()).to.eql(transferredFunds);
      });

      it('should not allow transfer() above balanceOf()', async () => {
        await expectRevert(token.transfer(to1, initialFunds + 1));
      });
    });

    // Tests involving transferring money from A to B via a third account C, which is the one actually making the
    // transfer, using transferFrom().
    describe('transferFrom', async () => {
      it('should not allow transfer() without approval', async () => {
        await expectRevert(token.transferFrom(owner, spender, 1, { from: spender }));
      });

      it('should not allow transfer() over approve() amount', async () => {
        await token.approve(spender, allowedAmount - 1);

        const spenderAllowance = (await token.allowance(owner, spender)).toNumber();

        await expectRevert(token.transferFrom(owner, to1, allowedAmount, { from: spender }));

        // Check that balances are unchanged.
        expect((await token.balanceOf(owner)).toNumber()).to.eql(balanceOwner);
        expect((await token.balanceOf(spender)).toNumber()).to.eql(balanceSpender);
        expect((await token.balanceOf(to1)).toNumber()).to.eql(balanceTo);

        // Check that allowance is unchanged.
        expect((await token.allowance(owner, spender)).toNumber()).to.eql(spenderAllowance);
      });

      it('should update balanceOf() after transferFrom()', async () => {
        await token.approve(spender, allowedAmount);
        await token.transferFrom(owner, to1, allowedAmount / 2, { from: spender });

        expect((await token.balanceOf(owner)).toNumber()).to.eql(balanceOwner - (allowedAmount / 2));
        expect((await token.balanceOf(spender)).toNumber()).to.eql(balanceSpender);
        expect((await token.balanceOf(to1)).toNumber()).to.eql(balanceTo + (allowedAmount / 2));
      });

      it('should reduce transfer() amount from allowance()', async () => {
        await token.approve(spender, allowedAmount);

        const spenderAllowance = (await token.allowance(owner, spender)).toNumber();

        await token.transferFrom(owner, to1, allowedAmount / 2, { from: spender });

        expect((await token.allowance(owner, spender)).toNumber()).to.eql(spenderAllowance / 2);
      });
    });
  });

  describe('minting', async () => {
    it('should update balances correctly after minting', async () => {
      expect((await token.balanceOf(owner)).toNumber()).to.eql(0);

      await token.mint(to1, transferredFunds);

      // Verify that owner balance stays at 0 since minting happens for other accounts.
      expect((await token.balanceOf(owner)).toNumber()).to.eql(0);
      expect((await token.balanceOf(to1)).toNumber()).to.eql(transferredFunds);

      await token.mint(to2, transferredFunds);
      expect((await token.balanceOf(to2)).toNumber()).to.eql(transferredFunds);

      await token.mint(to3, transferredFunds);
      expect((await token.balanceOf(to3)).toNumber()).to.eql(transferredFunds);
      expect((await token.balanceOf(owner)).toNumber()).to.eql(0);
    });

    it('should update totalSupply correctly after minting', async () => {
      expect((await token.totalSupply()).toNumber()).to.eql(0);

      await token.mint(to1, transferredFunds);
      expect((await token.totalSupply()).toNumber()).to.eql(transferredFunds);

      await token.mint(to1, transferredFunds);
      expect((await token.totalSupply()).toNumber()).to.eql(transferredFunds * 2);

      await token.mint(to2, transferredFunds);
      expect((await token.totalSupply()).toNumber()).to.eql(transferredFunds * 3);
    });

    it('should end minting', async () => {
      await token.finishMinting();
      expect(await token.mintingFinished()).to.be.true();
    });

    it('should not allow to end minting more than once', async () => {
      await token.finishMinting();
      await expectRevert(token.finishMinting());
    });

    it('should not allow to mint after minting has ended', async () => {
      await token.finishMinting();
      await expectRevert(token.mint(to1, transferredFunds));
    });

    it('should allow approve() before minting has ended', async () => {
      await token.approve(spender, allowedAmount);
    });

    it('should allow approve() after minting has ended', async () => {
      await token.finishMinting();
      await token.approve(spender, allowedAmount);
    });

    it('should not allow transfer() before minting has ended', async () => {
      await expectRevert(token.transfer(spender, allowedAmount));
    });

    it('should allow transfer() after minting has ended', async () => {
      await token.mint(owner, transferredFunds);
      await token.finishMinting();
      await token.transfer(to1, transferredFunds);
    });

    it('should not allow transferFrom() before minting has ended', async () => {
      await expectRevert(token.transferFrom(owner, to1, allowedAmount, { from: spender }));
    });

    it('should allow transferFrom() after minting has ended', async () => {
      await token.mint(owner, transferredFunds);
      await token.finishMinting();
      await token.approve(spender, allowedAmount);
      await token.transferFrom(owner, to1, allowedAmount, { from: spender });
    });
  });

  describe('events', async () => {
    describe('transfer', async () => {
      beforeEach(async () => {
        // Assign tokens to account[0] ('owner').
        await token.mint(owner, initialFunds);

        // Disable minting, in order to allow transfers.
        await token.finishMinting();
      });

      it('should log Transfer event after transfer()', async () => {
        const result = await token.transfer(spender, transferredFunds);

        expect(result.logs).to.have.length(1);
        const event = result.logs[0];
        expect(event.event).to.eql('Transfer');
        expect(event.args.from).to.eql(owner);
        expect(event.args.to).to.eql(spender);
        expect(Number(event.args.value)).to.eql(transferredFunds);
      });

      it('should log Transfer event after transferFrom()', async () => {
        await token.approve(spender, allowedAmount);

        const value = allowedAmount / 2;
        const result = await token.transferFrom(owner, to1, value, { from: spender });

        expect(result.logs).to.have.length(1);
        const event = result.logs[0];
        expect(event.event).to.eql('Transfer');
        expect(event.args.from).to.eql(owner);
        expect(event.args.to).to.eql(to1);
        expect(Number(event.args.value)).to.eql(value);
      });

      it('should log Approve event after approve()', async () => {
        const result = await token.approve(spender, allowedAmount);

        expect(result.logs).to.have.length(1);
        const event = result.logs[0];
        expect(event.event).to.eql('Approval');
        expect(event.args.spender).to.eql(spender);
        expect(Number(event.args.value)).to.eql(allowedAmount);
      });
    });

    describe('minting', async () => {
      it('should log mint event after minting', async () => {
        const result = await token.mint(to1, transferredFunds);

        expect(result.logs).to.have.length(2);

        const event = result.logs[0];
        expect(event.event).to.eql('Mint');
        expect(event.args.to).to.eql(to1);
        expect(Number(event.args.amount)).to.eql(transferredFunds);

        const event2 = result.logs[1];
        expect(event2.event).to.eql('Transfer');
        expect(event2.args.from).to.eql('0x0000000000000000000000000000000000000000');
        expect(event2.args.to).to.eql(to1);
        expect(Number(event2.args.value)).to.eql(transferredFunds);
      });

      it('should log minting ended event after minting has ended', async () => {
        const result = await token.finishMinting();

        expect(result.logs).to.have.length(1);
        expect(result.logs[0].event).to.eql('MintFinished');
      });
    });
  });
});
