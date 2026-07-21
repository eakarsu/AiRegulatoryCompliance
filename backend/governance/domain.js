'use strict';

const FRAMEWORKS = Object.freeze(['gdpr','ccpa','iso-27001','soc-2']);
const STATES = Object.freeze(['open','evidence_pending','review_pending','ready_for_filing','closed']);

function evaluate(input = {}, context = {}) {
  const errors = [];
  const owner = String(input.ownerId || '');
  const framework = String(input.framework || '').toLowerCase();
  const jurisdiction = String(input.jurisdiction || '').toUpperCase();
  const effectiveAt = Date.parse(input.effectiveAt || '');
  const deadline = Date.parse(input.deadline || '');
  const controls = Array.isArray(input.controls) ? input.controls : [];
  if (owner !== context.actor) errors.push('ownerId must match the signed actor');
  if (!FRAMEWORKS.includes(framework)) errors.push('supported framework required');
  if (!/^[A-Z][A-Z0-9-]{1,15}$/.test(jurisdiction)) errors.push('versioned jurisdiction required');
  if (!String(input.ruleVersion || '').trim() || !Number.isFinite(effectiveAt)) errors.push('ruleVersion and effectiveAt required');
  if (!Number.isFinite(deadline) || deadline < effectiveAt) errors.push('deadline must follow the rule effective date');
  if (!controls.length) errors.push('at least one control assessment required');
  const normalized = controls.map((control, index) => {
    const status = String(control.status || 'unknown');
    if (!String(control.controlId || '').trim()) errors.push(`controls[${index}].controlId required`);
    if (!['satisfied','gap','not_applicable','unknown'].includes(status)) errors.push(`controls[${index}].status invalid`);
    if (!String(control.evidenceRef || '').trim()) errors.push(`controls[${index}].evidenceRef required`);
    return { controlId: String(control.controlId || ''), status, evidenceRef: String(control.evidenceRef || '') };
  });
  if (input.privileged === true && !input.legalHoldRef) errors.push('privileged matters require a legalHoldRef');
  if (input.containsPersonalData === true && !Array.isArray(input.redactions)) errors.push('personal data requires an explicit redaction manifest');
  const gaps = normalized.filter((item) => item.status === 'gap' || item.status === 'unknown').map((item) => item.controlId).sort();
  const conflicts = [...new Set((input.conflicts || []).map(String))].sort();
  const state = gaps.length || conflicts.length ? 'evidence_pending' : 'review_pending';
  return {
    errors,
    result: {
      schemaVersion: 1, matterId: String(input.matterId || ''), framework, jurisdiction,
      ruleVersion: String(input.ruleVersion || ''), state: STATES.includes(state) ? state : 'open',
      gaps, conflicts, deadline: input.deadline, ownerId: owner,
      humanReviewRequired: true, legalAdvice: false,
      evidenceIndex: normalized.map(({ controlId, evidenceRef }) => ({ controlId, evidenceRef }))
    },
    assumptions: ['Source materials were supplied by the matter owner and remain subject to qualified review.'],
    uncertainty: { unresolvedControls: gaps, conflicts, authoritativeInterpretationRequired: true }
  };
}

module.exports = { evaluate, FRAMEWORKS };
