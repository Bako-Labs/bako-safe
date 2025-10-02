import { Wallet, walletOrigin } from '../../modules/vault/utils/configurable';
import { FuelToolChain, Version, versions } from './';
import { Vault } from '../../modules';
import { Address, CoinQuantity, JsonAbi, Provider } from 'fuels';

/** Default predicate bytecode version used when none is specified. */
export const DEFAULT_PREDICATE_VERSION =
  `0x967aaa71b3db34acd8104ed1d7ff3900e67cff3d153a0ffa86d85957f579aa6a` as const;

/** Default Fuel provider URL. */
export const DEFAULT_PROVIDER_URL =
  `https://mainnet.fuel.network/v1/graphql` as const;

/**
 * Default asset metadata (temporary until dynamic assets are wired).
 * @todo replace with dynamic asset id/decimals discovery.
 */
export const DEFAULT_ASSET_ID = {
  assetId: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07',
  decimals: 9,
  slug: 'ETH',
} as const;

/**
 * Configuration passed to the Vault depending on the wallet origin.
 * - BAKO uses multiple signers and a signature count.
 * - Others use a single signer.
 */
type Configurable =
  | { SIGNERS: string[]; SIGNATURES_COUNT: number; HASH_PREDICATE: string }
  | { SIGNER: string };

/** Narrow Result helper for Promise.allSettled */
type Settled<T> = PromiseSettledResult<T>;
const isFulfilled = <T>(r: Settled<T>): r is PromiseFulfilledResult<T> =>
  r.status === 'fulfilled';

/** Safely check if a numeric-like amount is positive (handles bigint/number/BN-like .format()) */
function isPositiveAmount(input: unknown): boolean {
  const raw =
    typeof (input as any)?.format === 'function'
      ? (input as any).format()
      : String(input ?? '0');

  try {
    return BigInt(raw) > 0n;
  } catch {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0;
  }
}

/** Return the ETH (default asset) balance formatted in units for the given balances array. */
function extractEthBalance(
  balances: CoinQuantity[],
  asset = DEFAULT_ASSET_ID,
): { assetId: string; amount: string; symbol: string } {
  const match = balances.find((b) => b.assetId === asset.assetId);
  return {
    assetId: match?.assetId ?? asset.assetId,
    amount: match?.amount?.formatUnits?.(asset.decimals) ?? '0.00',
    symbol: asset.slug,
  };
}

/**
 * Get the latest (most recent by time) predicate version compatible with the given wallet type.
 *
 * @param wallet Wallet origin/type (e.g., EVM, SVM, BAKO).
 * @returns An object containing bytecode, ABI and the version key.
 * @throws Error if no compatible version exists for the wallet type.
 *
 * @example
 * const latest = getLatestPredicateVersion(Wallet.EVM);
 * console.log(latest.version);
 */
export function getLatestPredicateVersion(wallet: Wallet): {
  bytecode: string;
  abi: JsonAbi;
  version: string;
} {
  const latestKey = Object.keys(versions).reduce<string | undefined>(
    (acc, key) => {
      const v = versions[key];
      if (!v.walletOrigin.includes(wallet)) return acc;
      if (!acc) return key;
      return v.time > versions[acc].time ? key : acc;
    },
    undefined,
  );

  if (!latestKey) {
    throw new Error(
      `No compatible predicate version found for wallet type "${wallet}".`,
    );
  }

  return {
    bytecode: versions[latestKey].bytecode,
    abi: versions[latestKey].abi,
    version: latestKey,
  };
}

/**
 * Load a specific predicate version (if provided) or the latest compatible one for the wallet type.
 *
 * @param wallet Wallet origin/type.
 * @param version Optional explicit predicate version key.
 * @returns An object containing bytecode, ABI and the resolved version key.
 * @throws Error when the version does not exist or is incompatible with the wallet type.
 *
 * @example
 * // get explicit version
 * const v = loadPredicate(Wallet.SVM, 'v0.3.1');
 *
 * @example
 * // fallback to latest compatible
 * const v = loadPredicate(Wallet.EVM);
 */
export function loadPredicate(
  wallet: Wallet,
  version?: string,
): { bytecode: string; abi: JsonAbi; version: string } {
  if (!version) return getLatestPredicateVersion(wallet);

  const v = versions[version];
  if (!v) {
    const msg = `Predicate version "${version}" not found${wallet ? ` for wallet type "${wallet}"` : ''
      }.`;
    throw new Error(msg);
  }

  if (!v.walletOrigin.includes(wallet)) {
    throw new Error(
      `Predicate version "${version}" is not compatible with wallet type "${wallet}".`,
    );
  }

  return { bytecode: v.bytecode, abi: v.abi, version };
}

/**
 * List predicate version keys compatible with a wallet type.
 * BAKO can load any version by design.
 *
 * @param wallet Wallet origin/type.
 * @returns Array of version keys.
 */
export function getCompatiblePredicateVersions(wallet: Wallet): string[] {
  return Object.keys(versions).filter((key) =>
    versions[key].walletOrigin.includes(wallet),
  );
}

/** List all available predicate version keys (no compatibility check). */
export function getAllPredicateVersions(): string[] {
  return Object.keys(versions);
}

/**
 * Get metadata details for all versions (excluding heavy `abi` and `bytecode`).
 *
 * @returns A map of version key -> version metadata without abi/bytecode.
 */
export function getAllVersionsDetails(): Record<
  keyof typeof versions,
  Omit<Version, 'abi' | 'bytecode'>
> {
  const result = {} as Record<
    keyof typeof versions,
    Omit<Version, 'abi' | 'bytecode'>
  >;

  (Object.keys(versions) as Array<keyof typeof versions>).forEach((key) => {
    const { bytecode, abi, ...rest } = versions[key];
    result[key] = rest;
  });

  return result;
}

/** Information about a predicate version used/resolved for a given wallet. */
export type UsedPredicateVersions = {
  version: string;
  hasBalance: boolean;
  ethBalance: {
    assetId: string;
    amount: string;
    symbol: string;
  };
  balances: CoinQuantity[];
  predicateAddress: string;
  details: {
    description?: string;
    toolchain: FuelToolChain;
    versionTime: number;
    origin: string;
  };
};

/**
 * Resolve legacy connector-compatible predicate versions for a wallet address,
 * checking balances and returning enriched version details ordered by recency.
 *
 * @param wallet Wallet address (bech32 or b256 convertible).
 * @param providerUrl Fuel provider URL. Defaults to {@link DEFAULT_PROVIDER_URL}.
 * @param HASH_PREDICATE Optional hash predicate value for deterministic predicate address generation.
 *                      Defaults to {@link DEFAULT_ASSET_ID.assetId}. When provided, ensures consistent
 *                      predicate addresses across multiple calls with the same configuration.
 * @returns Array of used predicate version descriptors, sorted by `details.versionTime` desc.
 * @throws Error if there are no compatible versions for the derived wallet type.
 *
 * @example
 * const list = await legacyConnectorVersion('0xabc123...');
 * console.log(list[0].version, list[0].predicateAddress);
 */

export async function legacyConnectorVersion(
  wallet: string,
  providerUrl: string = DEFAULT_PROVIDER_URL,
  HASH_PREDICATE: string = DEFAULT_ASSET_ID.assetId,
): Promise<UsedPredicateVersions[]> {
  const type = walletOrigin(wallet);

  // If you need to strictly restrict to EVM/SVM, uncomment below:
  // const isInvalid = type !== Wallet.EVM && type !== Wallet.SVM;
  // if (isInvalid) return [];

  const candidates = getCompatiblePredicateVersions(type);
  if (candidates.length === 0) {
    throw new Error(
      `No compatible predicate version found for wallet type "${type}".`,
    );
  }

  const provider = new Provider(providerUrl);
  const signer = new Address(wallet).toB256();

  const settled = await Promise.allSettled(
    candidates.map(async (version) => {
      const cfg: Configurable = versions[version].walletOrigin.includes(
        Wallet.FUEL,
      )
        ? { SIGNERS: [signer], SIGNATURES_COUNT: 1, HASH_PREDICATE }
        : { SIGNER: signer };

      const vault = new Vault(provider, cfg, version);

      const { balances } = await vault.getBalances();
      const hasBalance =
        Array.isArray(balances) &&
        balances.some((b) => isPositiveAmount(b.amount));

      const ethBalance = extractEthBalance(balances, DEFAULT_ASSET_ID);

      const result: UsedPredicateVersions = {
        // balances
        hasBalance,
        ethBalance,
        balances,

        // predicate info
        version,
        predicateAddress: vault.address.toB256(),

        // metadata
        details: {
          origin: versions[version].walletOrigin[0], // Use first supported wallet type for display
          description: versions[version].description,
          versionTime: new Date(versions[version].time).getTime(),
          toolchain: versions[version].toolchain,
        },
      };

      return result;
    }),
  );

  return settled
    .filter(isFulfilled)
    .map((r) => r.value)
    .sort(
      (a, b) => Number(b.details.versionTime) - Number(a.details.versionTime),
    );
}
