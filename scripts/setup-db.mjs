// Compatibility wrapper for Vercel deployments that still use scripts/setup-db.mjs.
// The real setup script lives at the repository root.
await import("../setup-db.mjs");
