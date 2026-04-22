#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
CONTRACTS="$ROOT/contracts"

# Anvil default accounts
ALICE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
BOB_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
RPC="http://localhost:8545"
API="http://localhost:3001"
TRACKER="ws://localhost:8000"

cleanup() {
  echo ""
  echo "=== Cleaning up ==="
  [[ -n "${ANVIL_PID:-}" ]] && kill "$ANVIL_PID" 2>/dev/null && echo "Stopped Anvil"
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null && echo "Stopped server"
  [[ -n "${SEED_PID:-}" ]] && kill "$SEED_PID" 2>/dev/null && echo "Stopped seeder"
  wait 2>/dev/null
}
trap cleanup EXIT

# ── 1. Start Anvil ──────────────────────────────────────────────────────────
echo "=== Starting Anvil ==="
anvil --silent &
ANVIL_PID=$!
sleep 2

# Verify Anvil is running
if ! kill -0 "$ANVIL_PID" 2>/dev/null; then
  echo "ERROR: Anvil failed to start"
  exit 1
fi
echo "Anvil running (PID $ANVIL_PID)"

# ── 2. Deploy contract ─────────────────────────────────────────────────────
echo ""
echo "=== Deploying ReputationTracker ==="
DEPLOY_OUTPUT=$(cd "$CONTRACTS" && forge script script/DeployDirect.s.sol \
  --rpc-url "$RPC" \
  --private-key "$ALICE_KEY" \
  --broadcast 2>&1)

CONTRACT_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "ReputationTracker:" | awk '{print $2}')
if [[ -z "$CONTRACT_ADDR" ]]; then
  echo "ERROR: Failed to extract contract address"
  echo "$DEPLOY_OUTPUT"
  exit 1
fi
echo "Contract deployed at: $CONTRACT_ADDR"

# ── 3. Start backend server ────────────────────────────────────────────────
echo ""
echo "=== Starting backend server ==="
cd "$BACKEND"
DEPLOYER_PRIVATE_KEY="$ALICE_KEY" \
REPUTATION_TRACKER_ADDRESS="$CONTRACT_ADDR" \
RPC_URL="$RPC" \
ADMIN_SECRET="test-secret" \
FACTORY_ADDRESS="0x0000000000000000000000000000000000000000" \
  npx tsx server.ts &
SERVER_PID=$!
sleep 3

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "ERROR: Server failed to start"
  exit 1
fi
echo "Server running (PID $SERVER_PID)"

# ── 4. Register Alice ──────────────────────────────────────────────────────
echo ""
echo "=== Registering Alice ==="
PRIVATE_KEY="$ALICE_KEY" \
PBTS_API_URL="$API" \
PBTS_TRACKER_URL="$TRACKER" \
  npx tsx client/cli.ts register

# ── 5. Alice seeds a file ──────────────────────────────────────────────────
echo ""
echo "=== Alice seeding package.json ==="
PRIVATE_KEY="$ALICE_KEY" \
PBTS_API_URL="$API" \
PBTS_TRACKER_URL="$TRACKER" \
  npx tsx client/cli.ts seed ./package.json > /tmp/pbts-seed.log 2>&1 &
SEED_PID=$!

# Wait for magnet URI to appear
echo "Waiting for torrent to be created..."
for i in $(seq 1 30); do
  if grep -q "Magnet:" /tmp/pbts-seed.log 2>/dev/null; then
    break
  fi
  sleep 1
done

MAGNET=$(grep "Magnet:" /tmp/pbts-seed.log 2>/dev/null | awk '{print $2}')
if [[ -z "$MAGNET" ]]; then
  echo "ERROR: Magnet URI not found after 30s. Seed log:"
  cat /tmp/pbts-seed.log
  exit 1
fi
echo "Magnet URI: $MAGNET"

# ── 6. Register Bob ────────────────────────────────────────────────────────
echo ""
echo "=== Registering Bob ==="
PRIVATE_KEY="$BOB_KEY" \
PBTS_API_URL="$API" \
PBTS_TRACKER_URL="$TRACKER" \
  npx tsx client/cli.ts register

# ── 7. Bob downloads ───────────────────────────────────────────────────────
echo ""
echo "=== Bob downloading ==="
PRIVATE_KEY="$BOB_KEY" \
PBTS_API_URL="$API" \
PBTS_TRACKER_URL="$TRACKER" \
  npx tsx client/cli.ts download "$MAGNET"

# ── 8. Check status ────────────────────────────────────────────────────────
echo ""
echo "=== Bob's reputation ==="
PRIVATE_KEY="$BOB_KEY" \
PBTS_API_URL="$API" \
PBTS_TRACKER_URL="$TRACKER" \
  npx tsx client/cli.ts status

echo ""
echo "=== Alice's reputation ==="
PRIVATE_KEY="$ALICE_KEY" \
PBTS_API_URL="$API" \
PBTS_TRACKER_URL="$TRACKER" \
  npx tsx client/cli.ts status

echo ""
echo "=== E2E TEST COMPLETE ==="
