#!/usr/bin/env tsx

/**
 * Script to update ABIs from compiled contract artifacts
 * Run this after `forge build` in the contracts directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsDir = path.join(__dirname, '../../contracts/out');
const abisDir = path.join(__dirname, '../abis');

interface ContractArtifact {
  abi: any[];
  bytecode: string;
  // ... other fields
}

function extractAbi(contractName: string): any[] | null {
  const artifactPath = path.join(contractsDir, `${contractName}.sol`, `${contractName}.json`);

  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact not found: ${artifactPath}`);
    return null;
  }

  const artifact: ContractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact.abi;
}

function updateAbi(contractName: string, outputName: string): boolean {
  console.log(`Updating ${outputName}.json...`);

  const abi = extractAbi(contractName);
  if (!abi) {
    console.error(`Failed to extract ABI for ${contractName}`);
    return false;
  }

  const outputPath = path.join(abisDir, `${outputName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));
  console.log(`✓ Updated ${outputPath}`);
  return true;
}

// Update both ABIs
const success1 = updateAbi('ReputationTracker', 'reputationTracker');
const success2 = updateAbi('RepFactory', 'repFactory');

if (success1 && success2) {
  console.log('\n✓ All ABIs updated successfully!');
  console.log('Remember to test the backend after ABI updates.');
} else {
  console.error('\n✗ Some ABIs failed to update.');
  process.exit(1);
}