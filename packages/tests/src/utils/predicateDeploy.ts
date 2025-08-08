import { readFileSync } from 'fs';
import { Predicate, WalletUnlocked } from 'fuels';
import path from 'path';
import { versions } from '../../../sdk/src/sway/predicates';
import type { Version } from '../../../sdk/src/sway/predicates/types';

/**
 * Deploy all predicate versions from versions.json
 *
 * This function will:
 * 1. Read all versions from versions.json
 * 2. Deploy each version that is not already deployed on the current network
 * 3. Update the deployed status in versions.json
 */

const bytecodePath = path.resolve(
  __dirname,
  '../../../../packages/sway/src/predicate/out/release/bako-predicate.bin',
);
const abiPath = path.resolve(
  __dirname,
  '../../../../packages/sway/src/predicate/out/release/bako-predicate-abi.json',
);

export const deployPredicate = async (
  wallet: WalletUnlocked,
  testMode: boolean = false,
) => {
  const bytecode = new Uint8Array(readFileSync(bytecodePath));
  const abi = JSON.parse(readFileSync(abiPath, 'utf-8'));

  const _predicate = new Predicate({
    abi,
    bytecode,
    provider: wallet.provider,
  });

  const predicate = await _predicate.deploy(wallet);

  const p = await predicate.waitForResult().catch((e) => {
    return null;
  });

  return !!p;
};

/**
 * Deploy all predicate versions from versions.json
 * @param wallet - The wallet to use for deployment
 * @param networkUrl - The network URL to check deployment status
 * @returns Array of deployment results
 */
export const deployAllPredicateVersions = async (
  wallet: WalletUnlocked,
  networkUrl: string,
) => {
  const results: Array<{
    version: string;
    success: boolean;
    error?: string;
    alreadyDeployed: boolean;
  }> = [];

  console.log(
    `🚀 Starting deployment of all predicate versions to ${networkUrl}`,
  );
  console.log(`📊 Total versions to check: ${Object.keys(versions).length}`);

  for (const [version, versionData] of Object.entries(versions)) {
    const typedVersionData = versionData as Version;
    const isAlreadyDeployed = typedVersionData.deployed.includes(networkUrl);

    if (isAlreadyDeployed) {
      console.log(`✅ Version ${version} already deployed on ${networkUrl}`);
      results.push({
        version,
        success: true,
        alreadyDeployed: true,
      });
      continue;
    }

    console.log(`🔄 Deploying version ${version}...`);

    try {
      // Convert hex bytecode to Uint8Array
      const bytecode = new Uint8Array(
        typedVersionData.bytecode
          .slice(2)
          .match(/.{1,2}/g)!
          .map((byte: string) => parseInt(byte, 16)),
      );

      const predicate = new Predicate({
        abi: typedVersionData.abi,
        bytecode,
        provider: wallet.provider,
      });

      const deployedPredicate = await predicate.deploy(wallet);
      const result = await deployedPredicate.waitForResult();

      if (result) {
        console.log(`✅ Successfully deployed version ${version}`);

        // Update the versions.json file to mark this version as deployed
        await updateVersionDeployedStatus(version, networkUrl);

        results.push({
          version,
          success: true,
          alreadyDeployed: false,
        });
      } else {
        throw new Error('Deployment failed - no result returned');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to deploy version ${version}: ${errorMessage}`);

      results.push({
        version,
        success: false,
        error: errorMessage,
        alreadyDeployed: false,
      });
    }
  }

  // Print summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const alreadyDeployed = results.filter((r) => r.alreadyDeployed).length;

  console.log(`\n📈 Deployment Summary:`);
  console.log(`✅ Successfully deployed: ${successful}`);
  console.log(`❌ Failed deployments: ${failed}`);
  console.log(`🔄 Already deployed: ${alreadyDeployed}`);
  console.log(`📊 Total processed: ${results.length}`);

  return results;
};

/**
 * Update the versions.json file to mark a version as deployed on a specific network
 */
async function updateVersionDeployedStatus(
  version: string,
  networkUrl: string,
) {
  try {
    const versionsPath = path.resolve(
      __dirname,
      '../../../../packages/sdk/src/sway/predicates/versions.json',
    );

    const versionsContent = readFileSync(versionsPath, 'utf-8');
    const versionsData = JSON.parse(versionsContent);

    if (
      versionsData[version] &&
      !versionsData[version].deployed.includes(networkUrl)
    ) {
      versionsData[version].deployed.push(networkUrl);

      // Write back to file
      const fs = await import('fs/promises');
      await fs.writeFile(versionsPath, JSON.stringify(versionsData, null, 2));

      console.log(
        `📝 Updated versions.json - marked ${version} as deployed on ${networkUrl}`,
      );
    }
  } catch (error) {
    console.warn(`⚠️ Failed to update versions.json: ${error}`);
  }
}
