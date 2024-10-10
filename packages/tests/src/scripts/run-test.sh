#!/bin/bash

if [ -z "$1" ]; then
  echo "Please provide the test file name."
  exit 1
fi

TEST_FILE="../src/$1"

NODE_OPTIONS="--no-warnings" node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand $TEST_FILE 
