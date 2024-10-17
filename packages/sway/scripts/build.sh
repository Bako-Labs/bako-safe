#!/bin/bash

# stop on error
set -e

# make a bin and abi
pnpm fuels build

# deploiement of the predicate
pnpm fuels deploy

# publish on sdk package
pnpm versioning