require('babel-register');
require('babel-polyfill');

const Web3 = require('web3');
const Web3Helper = require('web3-api-helper');
const BigNumber = require('bignumber.js');
const fs = require('fs');
const path = require('path');
const csv = require('csv');

const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/ciS27F9JQYk8MaJd8Fbu'));

const ETH = 10 ** 18;

const VIT_PRESALE_REGISTRATION = '0x7F0d52c707CAde2666bca774140440EaAe121160';

const getPresaleRegistrationTransactions = async (startBlockNumber = 1, endBlockNumber) => {
  const transactionsOutput = path.join(__dirname, `./transactions_${startBlockNumber}-${endBlockNumber}.csv`);
  const address = VIT_PRESALE_REGISTRATION.toUpperCase();

  const processBlocks = (blockNumber) => {
    if (blockNumber > endBlockNumber) {
      return;
    }

    console.log(`Searching block ${blockNumber}...`);

    web3.eth.getBlock(blockNumber, true, (error, block) => {
      if (error) {
        console.error(error);

        return;
      }

      if (block === null || block.transactions === null) {
        throw new Error(`Invalid block: ${blockNumber}`);
      }

      block.transactions.forEach((t) => {
        if (t.to === null || address !== t.to.toUpperCase()) {
          return;
        }

        console.log(`\tFound ${t.from} (${t.value.div(ETH)})...`);

        fs.appendFileSync(transactionsOutput, `${t.from},${t.value.toFixed()}\n`);
      });


      processBlocks(blockNumber + 1);
    });
  };

  console.log(`Searching for transactions to account "${address}" within blocks ${startBlockNumber} and ` +
    `${endBlockNumber}`);

  processBlocks(startBlockNumber);
};

const TIER1_DEPOSIT = new BigNumber(0.1).mul(ETH);
const TIER1_CAP = new BigNumber(10).mul(ETH);
const TIER2_DEPOSIT = new BigNumber(0.05).mul(ETH);
const TIER2_CAP = new BigNumber(5).mul(ETH);
const TIER3_DEPOSIT = new BigNumber(0.001).mul(ETH);
const TIER3_CAP = new BigNumber(1).mul(ETH);

const processPresaleRegistrationTransactions = async (transactionsPath) => {
  csv.parse(fs.readFileSync(path.resolve(path.join(__dirname, transactionsPath)), 'utf-8'), (err, transactions) => {
    const registrants = {};

    transactions.forEach((t) => {
      const from = t[0].toLowerCase();
      const value = new BigNumber(t[1]);

      if (!registrants[from]) {
        registrants[from] = new BigNumber(0);
      }

      registrants[from] = registrants[from].plus(value);
    });

    const tier1OutputStream = fs.createWriteStream(path.join(__dirname, './tier1.csv'));
    const tier2OutputStream = fs.createWriteStream(path.join(__dirname, './tier2.csv'));
    const tier3OutputStream = fs.createWriteStream(path.join(__dirname, './tier3.csv'));

    Object.keys(registrants).forEach((from) => {
      const value = registrants[from];

      if (value.greaterThanOrEqualTo(TIER1_DEPOSIT)) {
        tier1OutputStream.write(`${from},${value.toFixed()},${TIER1_CAP.toFixed()}\n`);
      } else if (value.greaterThanOrEqualTo(TIER2_DEPOSIT)) {
        tier2OutputStream.write(`${from},${value.toFixed()},${TIER2_CAP.toFixed()}\n`);
      } else if (value.greaterThanOrEqualTo(TIER3_DEPOSIT)) {
        tier3OutputStream.write(`${from},${value.toFixed()},${TIER3_CAP.toFixed()}\n`);
      }
    });

    tier1OutputStream.end();
    tier2OutputStream.end();
    tier3OutputStream.end();
  });
};

const BATCH_SIZE = 100;
const MAX_TRANSACTIONS = 20;
const MINING_WARNING = 'Transaction was not mined within 50 blocks, please make sure your transaction was properly send. Be aware that it might still be mined!!!!';

const SET_RESTRICTED_PARTICIPATION_CAPS_ABI = {
  name: 'setRestrictedParticipationCap',
  type: 'function',
  inputs: [{
    type: 'address[]',
    name: '_participants',
  },
  {
    type: 'uint256',
    name: '_cap',
  }],
};

const setRestrictedParticipationCaps = async (fromAccount, tokenSaleAddress, gasPriceWei) => {
  const tiers = [
    fs.readFileSync(path.join(__dirname, './tier1.csv'), 'utf-8').split('\n').filter(t => t.length > 0),
    fs.readFileSync(path.join(__dirname, './tier2.csv'), 'utf-8').split('\n').filter(t => t.length > 0),
    fs.readFileSync(path.join(__dirname, './tier3.csv'), 'utf-8').split('\n').filter(t => t.length > 0),
  ];

  const gasPrice = web3.utils.toWei(gasPriceWei, 'gwei');

  async function addWhiteListToTier(tier, cap) {
    console.log(`Adding tier members, with a cap of ${cap}...`);

    let transactions = [];
    let transactionsInfo = [];

    for (let i = 0; i < tier.length; i += BATCH_SIZE) {
      console.log(`\t[${i} - ${i + BATCH_SIZE}]...`);

      const addresses = tier.slice(i, i + BATCH_SIZE);

      console.log('First address in the batch:', addresses[0]);
      console.log('Last address in the batch:', addresses[addresses.length - 1]);

      const setRestrictedParticipants = web3Helper.encodeMethod(SET_RESTRICTED_PARTICIPATION_CAPS_ABI,
        [addresses, cap]);

      transactions.push(web3.eth.sendTransaction({
        from: fromAccount,
        to: tokenSaleAddress,
        value: 0,
        data: setRestrictedParticipants,
        gas: 4600000,
        gasPrice,
      }));

      transactionsInfo.push(addresses);

      if (transactions.length % MAX_TRANSACTIONS === 0) {
        for (let j = 0; j < transactions.length; ++j) {
          try {
            await transactions[j];
          } catch (error) {
            if (error.message !== MINING_WARNING) {
              console.error(`Failed sending transaction for batch starting from ${transactionsInfo[j][0]} with: ${error.message}!!!`);
            }
          }
        }

        transactions = [];
        transactionsInfo = [];
      }
    }

    for (let i = 0; i < transactions.length; ++i) {
      try {
        await transactions[i];
      } catch (error) {
        if (error.message !== MINING_WARNING) {
          console.error(`Failed sending transaction for batch starting from ${transactionsInfo[i][0]} with: ` +
            `${error.message}!!!`);
        }
      }
    }
  }

  await addWhiteListToTier(tiers[0], TIER1_CAP);
  await addWhiteListToTier(tiers[1], TIER2_CAP);
  await addWhiteListToTier(tiers[2], TIER2_CAP);
};

const main = async () => {
  // First, call getPresaleRegistrationTransactions with a start and end block numbers. This will create a
  // "transactions_X-Y.csv" file with all the transactions to the presale address.

  // await getPresaleRegistrationTransactions(4894530, 5073420);

  // Next, call the processPresaleRegistrationTransactions with the input file from before. It'll create the
  // first day participation tiers input CSV files.

  // await processPresaleRegistrationTransactions("transactions_4894530-5073009.csv");

  // Lastly, call the setRestrictedParticipationCaps method with the address of the locally connected owner account,
  // the address of the token sale and the gas price for every transaction.

  // await setRestrictedParticipationCaps(fromAccount, tokenSaleAddress, 20);
};

setTimeout(() => main(), 0);
