# Viper Contracts

## Setup
To install dependencies, run:
```js
yarn
```
Then create a `.env` file in the root directory and add the following:
```js
localKey="your mnemonic for local development here, I usually use the phrase seen in package.json"
deploymentKey="your mainnet and testnet mnemonic goes here"
etherscanApiNew=YOUR_ETHERSCAN_API_KEY
INFURA_API_KEY=YOUR_INFURA_API_KEY
```

Commands available in `package.json`:


## Test Contracts
There are three test files to cover three different contracts. They can be run all together using:
```js
yarn test
```
To test a specific file you can run it directly by using:
```js
npx hardhat test test/{filename}.js
```
Specific tests within a file can be disabled by adding `.skip` to the `it` function like as follows:
```js
it.skip("should do something", async () => {
  // ...
});
```

## Run Local Chain
To run a local chain, run:
```js
yarn chain
```

## Deploy Contracts
To deploy the contracts to the local network created using `yarn chain`, run:
```js
yarn deploy
```
To deploy to a different network, you can use the `--network` flag:
```js
yarn deploy --network goerli
```

# For local development with front end app

```js
yarn chain
```
in new terminal
```js
yarn deploy --network localhost
npx hardhat run scripts/mint.js --network localhost
```
if you need to send yourself eth you can edit the recipient in `scripts/send.js` and run
```js
npx hardhat run scripts/send.js --network localhost
```
Then update the contracts from the `yarn deploy` command in the front end.