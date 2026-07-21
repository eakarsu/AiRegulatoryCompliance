'use strict';
const express = require('express');
const crypto = require('node:crypto');
const { context, validKey, requestDigest, containsSecret, provenanceErrors } = require('./policy');
const ERROR_CODE = /^[A-Z0-9][A-Z0-9._:-]{1,63}$/;

function canAccessSubject(ctx, subject) {
  return ctx.subjects.includes('*') || ctx.subjects.includes(subject);
}

function createRouter({ db, auth, evaluate, workflow, providers, approverRoles }) {
  const router = express.Router();
  const providerSet = new Set(providers);
  const approverSet = new Set(approverRoles);

  router.use(auth);
  router.use((req, res, next) => {
    req.governance = context(req.user);
    if (!req.governance) return res.status(403).json({ error: 'signed actor, tenant, and role claims are required' });
    next();
  });

  router.param('id', async (req, res, next, id) => {
    try {
      const found = await db.query(
        'SELECT subject_id FROM governed_work_items WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3',
        [id, req.governance.tenant, workflow]
      );
      if (!found.rowCount || !canAccessSubject(req.governance, found.rows[0].subject_id)) return res.status(404).json({ error: 'not found' });
      req.governedSubject = found.rows[0].subject_id;
      next();
    } catch (error) { next(error); }
  });

  router.get('/', async (req, res, next) => {
    try {
      const { tenant } = req.governance;
      const result = await db.query(
        'SELECT id,subject_id,status,version,result,assumptions,uncertainty,created_by,approved_by,created_at,updated_at FROM governed_work_items WHERE tenant_id=$1 AND workflow_type=$2 AND ($3::boolean OR subject_id=ANY($4::text[])) ORDER BY updated_at DESC LIMIT 100',
        [tenant, workflow, req.governance.subjects.includes('*'), req.governance.subjects.filter((id) => id !== '*')]
      );
      res.json(result.rows);
    } catch (error) { next(error); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const ctx = req.governance;
      const key = req.get('Idempotency-Key');
      const subject = String(req.body.subjectId || '').trim();
      if (!validKey(key)) return res.status(400).json({ error: 'valid Idempotency-Key required' });
      if (!validKey(subject) || !canAccessSubject(ctx, subject)) return res.status(403).json({ error: 'signed subject scope required' });
      if (containsSecret(req.body.input)) return res.status(422).json({ error: 'input must use secret references, never credentials' });
      const pErrors = provenanceErrors(req.body.provenance);
      if (pErrors.length) return res.status(422).json({ errors: pErrors });
      const evaluation = evaluate(req.body.input || {}, ctx);
      if (evaluation.errors.length) return res.status(422).json(evaluation);
      const digest = requestDigest({ subjectId: subject, input: req.body.input || {}, provenance: req.body.provenance });
      const result = await db.query(
        `WITH inserted AS (
          INSERT INTO governed_work_items
            (tenant_id,workflow_type,input,result,assumptions,uncertainty,provenance,created_by,idempotency_key,request_hash,subject_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT(tenant_id,workflow_type,idempotency_key) DO NOTHING RETURNING *
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type,details)
          SELECT tenant_id,id,$8,'evaluated',jsonb_build_object('idempotencyKey',$9) FROM inserted
        )
        SELECT inserted.*,false AS idempotent_replay FROM inserted
        UNION ALL
        SELECT existing.*,true AS idempotent_replay FROM governed_work_items existing
        WHERE existing.tenant_id=$1 AND existing.workflow_type=$2 AND existing.idempotency_key=$9
          AND existing.request_hash=$10 AND existing.subject_id=$11
          AND NOT EXISTS(SELECT 1 FROM inserted) LIMIT 1`,
        [ctx.tenant, workflow, req.body.input, evaluation.result, evaluation.assumptions,
          evaluation.uncertainty, req.body.provenance, ctx.actor, key, digest, subject]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'Idempotency-Key was already used for a different request' });
      res.status(result.rows[0].idempotent_replay ? 200 : 201).json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.get('/:id/export', async (req, res, next) => {
    try {
      const ctx = req.governance;
      const result = await db.query(
        `SELECT id,workflow_type,status,version,input,result,assumptions,uncertainty,provenance,created_at,updated_at
         FROM governed_work_items
         WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3
           AND (created_by=$4 OR approved_by=$4 OR $5='admin')`,
        [req.params.id, ctx.tenant, workflow, ctx.actor, ctx.role]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'not found' });
      res.json({ schemaVersion: 1, exportedAt: new Date().toISOString(), workItem: result.rows[0] });
    } catch (error) { next(error); }
  });

  router.get('/:id/events', async (req, res, next) => {
    try {
      const ctx = req.governance;
      const result = await db.query(
        `SELECT e.actor_id,e.event_type,e.details,e.created_at
         FROM governed_work_events e JOIN governed_work_items w
           ON w.tenant_id=e.tenant_id AND w.id=e.work_item_id
         WHERE w.id=$1 AND w.tenant_id=$2 AND w.workflow_type=$3
           AND (w.created_by=$4 OR w.approved_by=$4 OR $5='admin') ORDER BY e.id`,
        [req.params.id, ctx.tenant, workflow, ctx.actor, ctx.role]
      );
      res.json(result.rows);
    } catch (error) { next(error); }
  });

  router.post('/:id/submit', async (req, res, next) => {
    try {
      const ctx = req.governance;
      const result = await db.query(
        `WITH changed AS (
          UPDATE governed_work_items SET status='submitted',version=version+1,updated_at=NOW()
          WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3 AND status='draft' AND version=$4 RETURNING *
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type)
          SELECT tenant_id,id,$5,'submitted' FROM changed
        ) SELECT * FROM changed`,
        [req.params.id, ctx.tenant, workflow, Number(req.body.version), ctx.actor]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'missing, stale, or not draft' });
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.post('/:id/decision', async (req, res, next) => {
    try {
      const ctx = req.governance;
      if (!approverSet.has(ctx.role)) return res.status(403).json({ error: 'authorized independent approver required' });
      if (!['approved','rejected'].includes(req.body.decision) || !String(req.body.note || '').trim()) {
        return res.status(422).json({ error: 'decision and note required' });
      }
      const result = await db.query(
        `WITH changed AS (
          UPDATE governed_work_items SET status=$1,approved_by=$2,approval_note=$3,version=version+1,updated_at=NOW()
          WHERE id=$4 AND tenant_id=$5 AND workflow_type=$6 AND status='submitted' AND version=$7 AND created_by<>$2 RETURNING *
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type,details)
          SELECT tenant_id,id,$2,$1,jsonb_build_object('note',$3) FROM changed
        ) SELECT * FROM changed`,
        [req.body.decision, ctx.actor, String(req.body.note).slice(0, 1000), req.params.id,
          ctx.tenant, workflow, Number(req.body.version)]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'stale, unsubmitted, or self-approval denied' });
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.post('/:id/retire', async (req, res, next) => {
    try {
      const ctx = req.governance;
      if (!approverSet.has(ctx.role) || !String(req.body.reason || '').trim()) {
        return res.status(403).json({ error: 'approver role and retirement reason required' });
      }
      const result = await db.query(
        `WITH changed AS (
          UPDATE governed_work_items SET status='retired',version=version+1,updated_at=NOW()
          WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3 AND status='approved' AND version=$4 RETURNING *
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type,details)
          SELECT tenant_id,id,$5,'retired',jsonb_build_object('reason',$6) FROM changed
        ) SELECT * FROM changed`,
        [req.params.id, ctx.tenant, workflow, Number(req.body.version), ctx.actor, String(req.body.reason).slice(0, 500)]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'approved current version required' });
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.post('/:id/integrations', async (req, res, next) => {
    try {
      const ctx = req.governance;
      const key = req.get('Idempotency-Key');
      if (!validKey(key) || !providerSet.has(req.body.provider)) return res.status(422).json({ error: 'allow-listed provider and Idempotency-Key required' });
      if (!['export','delete','notify','synchronize','execute'].includes(req.body.operation)) return res.status(422).json({ error: 'supported operation required' });
      if (containsSecret(req.body.payload)) return res.status(422).json({ error: 'payload must not contain credentials' });
      const digest = requestDigest({ workItemId: req.params.id, provider: req.body.provider,
        operation: req.body.operation, payload: req.body.payload || {} });
      const result = await db.query(
        `WITH owned AS (
          SELECT id,tenant_id FROM governed_work_items WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3
            AND (status='approved' OR (status='erasure_pending' AND $4='delete'))
        ), inserted AS (
          INSERT INTO governed_integration_outbox(tenant_id,work_item_id,provider,operation,payload,idempotency_key,request_hash)
          SELECT tenant_id,id,$5,$4,$6,$7,$9 FROM owned
          ON CONFLICT(tenant_id,provider,idempotency_key) DO NOTHING RETURNING *
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type,details)
          SELECT tenant_id,work_item_id,$8,'integration_queued',jsonb_build_object('provider',$5,'operation',$4) FROM inserted
        )
        SELECT * FROM inserted UNION ALL
        SELECT o.* FROM governed_integration_outbox o
        WHERE o.tenant_id=$2 AND o.provider=$5 AND o.idempotency_key=$7 AND o.request_hash=$9
          AND NOT EXISTS(SELECT 1 FROM inserted) LIMIT 1`,
        [req.params.id, ctx.tenant, workflow, req.body.operation, req.body.provider,
          req.body.payload || {}, key, ctx.actor, digest]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'approved work item and matching idempotent request required' });
      res.status(202).json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.post('/:id/erasure-request', async (req, res, next) => {
    try {
      const ctx = req.governance;
      const key = req.get('Idempotency-Key');
      if (!validKey(key) || !String(req.body.reason || '').trim()) {
        return res.status(422).json({ error: 'Idempotency-Key and reason required' });
      }
      const result = await db.query(
        `WITH changed AS (
          UPDATE governed_work_items SET status='erasure_pending',erasure_idempotency_key=$7,
            version=version+1,updated_at=NOW()
          WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3 AND status IN('approved','rejected','retired')
            AND (created_by=$4 OR $5='admin') RETURNING *
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type,details)
          SELECT tenant_id,id,$4,'erasure_requested',jsonb_build_object('reason',$6,'idempotencyKey',$7) FROM changed
        )
        SELECT changed.*,false AS idempotent_replay FROM changed
        UNION ALL
        SELECT existing.*,true AS idempotent_replay FROM governed_work_items existing
        WHERE existing.id=$1 AND existing.tenant_id=$2 AND existing.workflow_type=$3
          AND existing.status='erasure_pending' AND existing.erasure_idempotency_key=$7
          AND NOT EXISTS(SELECT 1 FROM changed) LIMIT 1`,
        [req.params.id, ctx.tenant, workflow, ctx.actor, ctx.role, String(req.body.reason).slice(0, 500), key]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'eligible owned work item required' });
      res.status(result.rows[0].idempotent_replay ? 200 : 202).json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.post('/:id/erasure-complete', async (req, res, next) => {
    try {
      const ctx = req.governance;
      if (!['integration_worker','privacy_officer','data_owner','admin'].includes(ctx.role)) {
        return res.status(403).json({ error: 'authorized erasure verifier required' });
      }
      const result = await db.query(
        `WITH evidence AS (
          SELECT work_item_id,COUNT(*)::int total,
            COUNT(*) FILTER(WHERE status='delivered' AND provider_receipt->>'receiptRef' IS NOT NULL)::int delivered
          FROM governed_integration_outbox WHERE tenant_id=$1 AND work_item_id=$2 AND operation='delete' GROUP BY work_item_id
        ), changed AS (
          UPDATE governed_work_items w SET status='erased',input='{"erased":true}'::jsonb,
            result='{"erased":true}'::jsonb,assumptions='[]'::jsonb,uncertainty='{}'::jsonb,
            provenance='[]'::jsonb,version=version+1,updated_at=NOW()
          FROM evidence e WHERE w.id=$2 AND w.tenant_id=$1 AND w.workflow_type=$3
            AND w.status='erasure_pending' AND e.total>0 AND e.total=e.delivered RETURNING w.*
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type)
          SELECT tenant_id,id,$4,'erasure_completed' FROM changed
        ) SELECT * FROM changed`,
        [ctx.tenant, req.params.id, workflow, ctx.actor]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'delivered deletion receipts required' });
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.post('/connectors/:provider/checkpoint', async (req, res, next) => {
    try {
      const ctx = req.governance;
      const provider = req.params.provider;
      const key = req.get('Idempotency-Key');
      const status = req.body.status;
      const recordsSeen = Number(req.body.recordsSeen);
      const recordsAccepted = Number(req.body.recordsAccepted);
      if (!['integration_worker','admin'].includes(ctx.role)) return res.status(403).json({ error: 'integration worker role required' });
      if (!providerSet.has(provider) || !validKey(key)) return res.status(422).json({ error: 'allow-listed provider and Idempotency-Key required' });
      if (!['success','failed'].includes(status) || !String(req.body.sourceVersion || '').trim()
          || !req.body.capturedAt || Number.isNaN(Date.parse(req.body.capturedAt))) {
        return res.status(422).json({ error: 'status, sourceVersion, and capturedAt required' });
      }
      if (!Number.isInteger(recordsSeen) || !Number.isInteger(recordsAccepted)
          || recordsSeen < 0 || recordsAccepted < 0 || recordsAccepted > recordsSeen) {
        return res.status(422).json({ error: 'valid record counts required' });
      }
      if (status === 'failed' && !ERROR_CODE.test(String(req.body.errorCode || ''))) return res.status(422).json({ error: 'bounded failure errorCode required' });
      const digest = requestDigest({ provider, status, cursorValue: req.body.cursorValue || null,
        sourceVersion: req.body.sourceVersion, capturedAt: req.body.capturedAt, recordsSeen, recordsAccepted,
        errorCode: status === 'failed' ? req.body.errorCode : null });
      const result = await db.query(
        `WITH event AS (
          INSERT INTO governed_connector_events
            (tenant_id,provider,actor_id,status,cursor_value,source_version,captured_at,
             records_seen,records_accepted,error,idempotency_key,request_hash)
          VALUES($1,$2,$3,$4,$5,$6,$7::timestamptz,$8,$9,$10,$11,$12)
          ON CONFLICT(tenant_id,provider,idempotency_key) DO NOTHING RETURNING *
        ), changed AS (
          INSERT INTO governed_connector_checkpoints
            (tenant_id,provider,cursor_value,source_version,last_success_at,last_failure_at,last_error,
             records_seen,records_accepted,updated_at)
          SELECT tenant_id,provider,cursor_value,source_version,
            CASE WHEN status='success' THEN captured_at END,
            CASE WHEN status='failed' THEN captured_at END,error,records_seen,records_accepted,NOW()
          FROM event
          ON CONFLICT(tenant_id,provider) DO UPDATE SET
            cursor_value=COALESCE(EXCLUDED.cursor_value,governed_connector_checkpoints.cursor_value),
            source_version=EXCLUDED.source_version,
            last_success_at=COALESCE(EXCLUDED.last_success_at,governed_connector_checkpoints.last_success_at),
            last_failure_at=COALESCE(EXCLUDED.last_failure_at,governed_connector_checkpoints.last_failure_at),
            last_error=EXCLUDED.last_error,
            records_seen=governed_connector_checkpoints.records_seen+EXCLUDED.records_seen,
            records_accepted=governed_connector_checkpoints.records_accepted+EXCLUDED.records_accepted,
            updated_at=NOW()
          RETURNING *
        )
        SELECT changed.*,false AS idempotent_replay FROM changed
        UNION ALL
        SELECT checkpoint.*,true AS idempotent_replay
        FROM governed_connector_checkpoints checkpoint
        JOIN governed_connector_events existing
          ON existing.tenant_id=checkpoint.tenant_id AND existing.provider=checkpoint.provider
        WHERE existing.tenant_id=$1 AND existing.provider=$2 AND existing.idempotency_key=$11
          AND existing.request_hash=$12 AND NOT EXISTS(SELECT 1 FROM changed) LIMIT 1`,
        [ctx.tenant, provider, ctx.actor, status, req.body.cursorValue || null,
          String(req.body.sourceVersion), req.body.capturedAt, recordsSeen, recordsAccepted,
          status === 'failed' ? String(req.body.errorCode) : null, key, digest]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'Idempotency-Key was already used for a different checkpoint' });
      res.status(result.rows[0].idempotent_replay ? 200 : 201).json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.post('/integrations/claim', async (req, res, next) => {
    try {
      const ctx = req.governance;
      if (!['integration_worker','admin'].includes(ctx.role)) return res.status(403).json({ error: 'integration worker role required' });
      const claimToken = crypto.randomUUID();
      const result = await db.query(
        `WITH candidate AS (
          SELECT id FROM governed_integration_outbox WHERE tenant_id=$1 AND attempts<5
            AND ((status IN('queued','failed') AND next_attempt_at<=NOW()) OR (status='processing' AND lease_expires_at<NOW()))
          ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1
        ), changed AS (
          UPDATE governed_integration_outbox o SET status='processing',claim_token=$2,
            lease_expires_at=NOW()+INTERVAL '2 minutes',updated_at=NOW()
          FROM candidate c WHERE o.id=c.id RETURNING o.*
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type,details)
          SELECT tenant_id,work_item_id,$3,'integration_claimed',jsonb_build_object('provider',provider) FROM changed
        ) SELECT * FROM changed`, [ctx.tenant, claimToken, ctx.actor]
      );
      if (!result.rowCount) return res.status(204).end();
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.post('/integrations/:outboxId/result', async (req, res, next) => {
    try {
      const ctx = req.governance;
      if (!['integration_worker','admin'].includes(ctx.role)) return res.status(403).json({ error: 'integration worker role required' });
      if (!['delivered','failed'].includes(req.body.status)) return res.status(422).json({ error: 'delivered or failed required' });
      if (req.body.status === 'failed' && !ERROR_CODE.test(String(req.body.errorCode || ''))) return res.status(422).json({ error: 'bounded failure errorCode required' });
      const receiptKeys = req.body.receipt && typeof req.body.receipt === 'object' ? Object.keys(req.body.receipt) : [];
      if (req.body.status === 'delivered' && (!req.body.receipt || !validKey(req.body.receipt.receiptRef)
          || !req.body.receipt.receivedAt || Number.isNaN(Date.parse(req.body.receipt.receivedAt))
          || receiptKeys.some((key) => !['receiptRef','receivedAt','providerStatus'].includes(key))
          || (req.body.receipt.providerStatus && !ERROR_CODE.test(String(req.body.receipt.providerStatus))))) {
        return res.status(422).json({ error: 'delivered result requires receiptRef and receivedAt' });
      }
      if (containsSecret(req.body.receipt)) return res.status(422).json({ error: 'receipt must not contain credentials' });
      const claimToken = req.get('X-Claim-Token');
      if (!claimToken) return res.status(422).json({ error: 'X-Claim-Token required' });
      const result = await db.query(
        `WITH changed AS (
          UPDATE governed_integration_outbox SET
            status=CASE WHEN $1='delivered' THEN 'delivered' WHEN attempts+1>=5 THEN 'dead_letter' ELSE 'failed' END,
            attempts=attempts+1,last_error=CASE WHEN $1='failed' THEN $2 ELSE NULL END,
            provider_receipt=CASE WHEN $1='delivered' THEN $7 ELSE NULL END,
            delivered_at=CASE WHEN $1='delivered' THEN NOW() ELSE NULL END,
            next_attempt_at=NOW()+(INTERVAL '1 minute'*LEAST(60,POWER(2,attempts))),
            claim_token=NULL,lease_expires_at=NULL,updated_at=NOW()
          WHERE id=$3 AND tenant_id=$4 AND status='processing' AND claim_token=$6 AND lease_expires_at>=NOW() RETURNING *
        ), logged AS (
          INSERT INTO governed_work_events(tenant_id,work_item_id,actor_id,event_type,details)
          SELECT tenant_id,work_item_id,$5,'integration_result',jsonb_build_object('provider',provider,'status',status) FROM changed
        ) SELECT * FROM changed`,
        [req.body.status, req.body.status === 'failed' ? String(req.body.errorCode) : '', req.params.outboxId, ctx.tenant, ctx.actor, claimToken,
          req.body.status === 'delivered' ? req.body.receipt : null]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'missing or terminal outbox item' });
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createRouter };
