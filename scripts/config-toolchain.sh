#!/bin/bash
FUEL_CORE_VERSION=${FUEL_CORE_VERSION:-"0.40.4"}
FORC_VERSION=${FORC_VERSION:-"0.66.6"}
TOOLCHAIN_NAME=${1:-"toolchain_$(openssl rand -hex 4)"}





# Create a new toolchain
echo "Creating a new toolchain: $TOOLCHAIN_NAME"
fuelup toolchain new "$TOOLCHAIN_NAME"

# Install specific versions of components
fuelup component add "fuel-core@$FUEL_CORE_VERSION"
fuelup component add "forc@$FORC_VERSION"

# Show the current toolchain setup
fuelup show

echo "Toolchain '$TOOLCHAIN_NAME' successfully configured with fuel-core@$FUEL_CORE_VERSION and forc@$FORC_VERSION!"
