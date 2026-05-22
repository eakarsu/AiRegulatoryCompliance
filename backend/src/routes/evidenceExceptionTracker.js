const express = require('express');

const router = express.Router();

const exceptions = [
  { id: 1, control: 'SOC2-CC6.1', owner: 'IT Ops', evidence: 'MFA enrollment export', ageDays: 42, reason: 'missing privileged users', status: 'remediation open' },
  { id: 2, control: 'ISO-A.5.1', owner: 'GRC', evidence: 'policy attestation', ageDays: 8, reason: 'late signer', status: 'pending attestation' },
  { id: 3, control: 'HIPAA-164.308', owner: 'Security', evidence: 'risk assessment PDF', ageDays: 3, reason: 'review note requested', status: 'review' },
];

router.get('/', (req, res) => {
  res.json({
    summary: {
      openExceptions: exceptions.length,
      staleEvidence: exceptions.filter((item) => item.ageDays > 30).length,
      pendingAttestation: exceptions.filter((item) => item.status.includes('attestation')).length,
    },
    exceptions,
  });
});

router.post('/resolve-plan', (req, res) => {
  const item = exceptions.find((entry) => entry.id === Number(req.body?.id)) || exceptions[0];
  res.json({
    exceptionId: item.id,
    plan: [`Request replacement evidence for ${item.control}`, `Assign owner ${item.owner}`, 'Record reviewer sign-off before close'],
    riskNote: item.ageDays > 30 ? 'Evidence is stale for audit readiness.' : 'Evidence is recent but incomplete.',
  });
});

module.exports = router;
