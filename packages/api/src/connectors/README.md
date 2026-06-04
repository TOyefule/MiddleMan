# Provider direct connectors

Per-provider modules that talk to a third-party subscription API and return
`SubscriptionCandidate[]` to the ingestion pipeline.

V1 ships **none** — this folder exists as a seam. Add a connector by:

1. Create `<slug>.ts` exporting a `ProviderConnector` implementation.
2. Register it in `_registry.ts` (create when needed).
3. Add a feature flag so it can be rolled out per-user.
