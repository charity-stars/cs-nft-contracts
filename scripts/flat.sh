#!/usr/bin/env bash

for contract in "CharityStarsToken"
do
  npx truffle-flattener contracts/$contract.sol > dist/$contract.dist.sol
done
