// Set dummy environment variables so config/index.ts does not throw
// when the test suite imports the server module.
// All actual blockchain calls are mocked in api.test.ts.
process.env["DEPLOYER_PRIVATE_KEY"] =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
process.env["REPUTATION_TRACKER_ADDRESS"] =
  "0x0000000000000000000000000000000000000001";
process.env["FACTORY_ADDRESS"] =
  "0x0000000000000000000000000000000000000002";
process.env["ADMIN_SECRET"] = "test-admin-secret";
process.env["RPC_URL"] = "http://localhost:8545";
process.env["NODE_ENV"] = "test";
// Use port 0 so each test suite gets a random available port (avoids EADDRINUSE)
process.env["PORT"] = "0";
