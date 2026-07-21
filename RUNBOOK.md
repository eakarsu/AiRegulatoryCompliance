# Operations runbook

## Scope and safety

The governed API is the durable source of truth for regulatory matters. Qualified compliance or legal reviewers must decide every matter. This system records evidence and workflow state; it does not provide legal advice. Generated backlog endpoints are disabled by default and cannot be enabled in production.

## Deploy and migrate

1. Provision PostgreSQL, a 32+ character signing secret, an explicit tenant identifier, and provider secret references.
2. Run `./start.sh check`.
3. Back up the database and run `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`.
4. Run the governance tests and then `./start.sh start`. Health proves process availability only; inspect connector checkpoints before enabling traffic.

Migrations are additive and re-runnable. Never run a seed as part of startup. Rollback begins by deploying prior application code while retaining additive tables. Restore from the pre-migration backup only after confirming no accepted writes would be lost.

## Provider operations

Workers claim outbox rows with `FOR UPDATE SKIP LOCKED`, retain the claim token, and send the provider idempotency key. Record a typed receipt containing `receiptRef`, `receivedAt`, and provider status. Retry transient failures with backoff; after five attempts the row enters the dead-letter queue. Operators must reconcile the provider before replaying a dead-letter row. Connector checkpoint counts and source versions are tenant scoped.

## Review, privacy, and incident response

Independent approvers cannot approve their own work. Preserve immutable decision events and source provenance. Apply the configured retention schedule and legal holds; erasure completes only after every downstream deletion receipt is delivered. For an authorization, tenant-isolation, receipt, or provenance incident, stop workers, revoke signing/provider credentials, preserve audit evidence, notify the owner, and reconcile affected tenants before resuming.
