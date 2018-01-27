require('babel-register');
require('babel-polyfill');

const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const fs = require('fs');
const path = require('path');

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const ETH = 10 ** 18;
const VIT_PRESALE_REGISTRATION = '0x7F0d52c707CAde2666bca774140440EaAe121160';
const START_BLOCK = 4894530;

const TIER1_DEPOSIT = new BigNumber(0.1).mul(ETH);
const TIER1_CAP = new BigNumber(10).mul(ETH);
const TIER2_DEPOSIT = new BigNumber(0.05).mul(ETH);
const TIER2_CAP = new BigNumber(5).mul(ETH);
const TIER3_DEPOSIT = new BigNumber(0.001).mul(ETH);
const TIER3_CAP = new BigNumber(1).mul(ETH);

const fetchPresaleRegistration = (account, startBlockNumber = 1, endBlockNumber = web3.eth.blockNumber) => {
  const tier1Output = path.join(__dirname, `./tier1_${startBlockNumber}-${endBlockNumber}.csv`);
  const tier2Output = path.join(__dirname, `./tier2_${startBlockNumber}-${endBlockNumber}.csv`);
  const tier3Output = path.join(__dirname, `./tier3_${startBlockNumber}-${endBlockNumber}.csv`);

  const address = account.toUpperCase();
  console.log(`Searching for transactions to account "${account}" within blocks ${startBlockNumber} and ` +
    `${endBlockNumber}`);

  const registrants = {};
  for (let i = startBlockNumber; i <= endBlockNumber; ++i) {
    console.log(`Searching block ${i}...`);

    const block = web3.eth.getBlock(i, true);
    if (block !== null && block.transactions !== null) {
      block.transactions.forEach((e) => {
        if (e.to === null || address !== e.to.toUpperCase()) {
          return;
        }

        console.log(`\tFound ${e.from} (${e.value.div(ETH)})...`);

        if (!registrants[e.from]) {
          registrants[e.from] = new BigNumber(0);
        }

        registrants[e.from] = registrants[e.from].plus(e.value);
      });
    }
  }

  const tier1OutputStream = fs.createWriteStream(tier1Output);
  const tier2OutputStream = fs.createWriteStream(tier2Output);
  const tier3OutputStream = fs.createWriteStream(tier3Output);

  Object.keys(registrants).forEach((from) => {
    const value = registrants[from];

    if (value.greaterThanOrEqualTo(TIER1_DEPOSIT)) {
      tier1OutputStream.write(`${from},${TIER1_CAP.toFixed()}\n`);
    } else if (value.greaterThanOrEqualTo(TIER2_DEPOSIT)) {
      tier2OutputStream.write(`${from},${TIER2_CAP.toFixed()}\n`);
    } else if (value.greaterThanOrEqualTo(TIER3_DEPOSIT)) {
      tier3OutputStream.write(`${from},${TIER3_CAP.toFixed()}\n`);
    }
  });

  tier1OutputStream.end();
  tier2OutputStream.end();
  tier3OutputStream.end();
};

fetchPresaleRegistration(VIT_PRESALE_REGISTRATION, START_BLOCK, 4904581);
