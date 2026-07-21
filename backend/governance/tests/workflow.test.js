'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain');
const ctx = { actor: 'owner-1', tenant: 'tenant-1', role: 'compliance_officer', subjects: ['matter-1'] };
const base = { ownerId: 'owner-1', matterId: 'matter-1', framework: 'gdpr', jurisdiction: 'EU', ruleVersion: 'gdpr:2018-05-25', effectiveAt: '2018-05-25T00:00:00Z', deadline: '2026-08-01T00:00:00Z', controls: [{ controlId: 'ART-30', status: 'gap', evidenceRef: 'doc:ropa' }], conflicts: [] };
test('matter evaluation is deterministic and requires human review', () => { const a=evaluate(base,ctx); const b=evaluate(base,ctx); assert.deepEqual(a,b); assert.equal(a.result.state,'evidence_pending'); assert.equal(a.result.humanReviewRequired,true); assert.equal(a.result.legalAdvice,false); });
test('matter ownership, dates, evidence, privilege and redaction are fail closed', () => { const out=evaluate({ ...base, ownerId:'other', deadline:'bad', controls:[], privileged:true, containsPersonalData:true },ctx); assert.ok(out.errors.length>=5); });
