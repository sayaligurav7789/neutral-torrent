import { ethers } from "ethers";
import config from "../config/index";
import reputationTrackerAbi from "../abis/reputationTracker.json";
import repFactoryAbi from "../abis/repFactory.json";

// Minimal ABI — only the functions the server needs to call.
const REPUTATION_TRACKER_ABI = reputationTrackerAbi;

// Minimal ABI for the RepFactory contract.
const REP_FACTORY_ABI = repFactoryAbi;

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.NonceManager | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }
  return _provider;
}

function getSigner(): ethers.NonceManager {
  if (!_signer) {
    const wallet = new ethers.Wallet(config.trackerPrivateKey, getProvider());
    _signer = new ethers.NonceManager(wallet);
  }
  return _signer;
}

/**
 * Return a ReputationTracker contract instance connected to the tracker signer
 * (for writes) or to the plain provider (for reads, when `readonly` is true).
 * Always uses the current CURRENT_CONTRACT_ADDRESS from config.
 */
export function getContract(readonly = false): ethers.Contract {
  return new ethers.Contract(
    config.contractAddress,
    REPUTATION_TRACKER_ABI,
    readonly ? getProvider() : getSigner()
  );
}

/**
 * Return a RepFactory contract instance.
 */
export function getFactory(readonly = false): ethers.Contract {
  return new ethers.Contract(
    config.factoryAddress,
    REP_FACTORY_ABI,
    readonly ? getProvider() : getSigner()
  );
}

// -------------------------------------------------------------------------
// Typed wrappers
// -------------------------------------------------------------------------

export interface UserReputation {
  uploadBytes: bigint;
  downloadBytes: bigint;
  lastUpdated: bigint;
}

/** Register a new user on-chain. Throws if already registered or call fails. */
export async function registerUser(userAddress: string): Promise<ethers.TransactionReceipt> {
  const contract = getContract();
  const tx: ethers.TransactionResponse = await contract["register"](userAddress);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction receipt is null");
  return receipt;
}

/**
 * Check whether a user is registered without spending gas.
 * A user is considered registered if their lastUpdated timestamp is non-zero.
 */
export async function isUserRegistered(userAddress: string): Promise<boolean> {
  const rep = await getContract(true)["getReputation"](userAddress);
  return (rep.lastUpdated as bigint) > 0n;
}

/** Read full reputation from the chain (delegates to referrer if needed). */
export async function getUserReputation(userAddress: string): Promise<UserReputation> {
  const rep = await getContract(true)["getReputation"](userAddress);
  return {
    uploadBytes: rep.uploadBytes as bigint,
    downloadBytes: rep.downloadBytes as bigint,
    lastUpdated: rep.lastUpdated as bigint,
  };
}

/**
 * Return the ratio scaled by 1e18 as returned by the contract.
 * Returns MaxUint256 when the user has never downloaded anything.
 */
export async function getUserRatio(userAddress: string): Promise<bigint> {
  return getContract(true)["getRatio"](userAddress);
}

/** Update upload and/or download counters for a single user. */
export async function updateReputation(
  userAddress: string,
  uploadDelta: bigint,
  downloadDelta: bigint
): Promise<ethers.TransactionReceipt> {
  const contract = getContract();
  const tx: ethers.TransactionResponse = await contract["updateReputation"](
    userAddress,
    uploadDelta,
    downloadDelta
  );
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction receipt is null");
  return receipt;
}

/**
 * Deploy a new ReputationTracker via the RepFactory, pointing its referrer at
 * the old contract so that reputation is preserved.  The caller (deployer
 * wallet) becomes the permanent tracker of the new contract.
 * Returns the address of the newly deployed tracker.
 */
export async function migrateFrom(oldContract: string): Promise<string> {
  const factory = getFactory();
  const tx: ethers.TransactionResponse = await factory["deployNewTracker"](oldContract);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Migration transaction receipt is null");

  // Parse the NewReputationTracker event to retrieve the deployed address.
  const iface = new ethers.Interface(REP_FACTORY_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === "NewReputationTracker") {
        return parsed.args[0] as string;
      }
    } catch {
      // skip logs from other contracts
    }
  }
  throw new Error("NewReputationTracker event not found in migration receipt");
}

/**
 * Compute a human-readable ratio (regular JS number) from a contract ratio
 * value that is scaled by 1e18.  Returns Infinity when ratio === MaxUint256.
 */
export function formatRatio(ratioScaled: bigint): number {
  if (ratioScaled === ethers.MaxUint256) return Infinity;
  return Number(ratioScaled) / 1e18;
}
