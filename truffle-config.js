require('babel-register')({
  only: /test|node_modules\/zeppelin-solidity/,
});

require('babel-polyfill');

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(require('bignumber.js')))
  .should();

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 7545,
      network_id: '*',
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 7555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
  },
  mocha: {
    useColors: true,
    slow: 30000,
    bail: true,
  },
};
