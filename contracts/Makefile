# ReputationTracker — Foundry on-chain scripts
# Supports: Ethereum Sepolia (chain 11155111)

.PHONY: help build test deploy verify

# ─────────────────────────────────────────
# Help
# ─────────────────────────────────────────
help:
	@echo ""
	@echo "  USAGE: Environment variables are loaded from .env"
	@echo ""
	@echo "  FORGE"
	@echo "  ──────────────────────────────────────────────────────"
	@echo "  build              Build Solidity contracts"
	@echo "  test               Run Forge test suite"
	@echo "  deploy             Deploy to network specified in .env"
	@echo "  verify             Verify contracts on Etherscan (network specified in .env)"
	@echo ""

# ─────────────────────────────────────────
# Forge — build & test
# ─────────────────────────────────────────
build:
	forge build

test:
	forge test -vv

# ─────────────────────────────────────────
# Forge — Ethereum Sepolia deployment
# ─────────────────────────────────────────
deploy:
	@source .env && forge script script/DeployPBTS.s.sol:DeployPBTS \
		--rpc-url $$RPC_URL \
		--private-key $$PRIVATE_KEY \
		--broadcast \
		--chain-id $$CHAIN_ID

verify:
	@source .env && forge verify-contract \
		$$REP_FACTORY_ADDRESS \
		src/RepFactory.sol:RepFactory \
		--chain-id $$CHAIN_ID \
		--etherscan-api-key $$ETHERSCAN_API_KEY