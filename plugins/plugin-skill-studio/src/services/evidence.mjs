function dateValue(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be an ISO calendar date`);
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error(`${label} is not a valid date`);
  return time;
}

export function evidenceMatrix(input) {
  if (!input || typeof input !== 'object') throw new Error('Evidence input must be an object');
  const asOf = dateValue(input.asOf, 'asOf date');
  if (!Number.isSafeInteger(input.freshWithinDays) || input.freshWithinDays < 0) throw new Error('freshWithinDays must be a nonnegative integer');
  if (!Array.isArray(input.skills) || !Array.isArray(input.evidence)) throw new Error('skills and evidence must be arrays');
  if (!input.skills.every(x => typeof x === 'string' && x.trim())) throw new Error('skills must contain nonempty strings');
  const warnings = [], skills = [...new Set(input.skills)];
  if (skills.length !== input.skills.length) warnings.push('Duplicate skill names were grouped once.');
  const records = input.evidence.map((record, index) => {
    if (!record || typeof record.skill !== 'string' || !record.skill.trim()) throw new Error(`evidence[${index}].skill is required`);
    for (const key of ['source', 'fact']) if (record[key] !== undefined && typeof record[key] !== 'string') throw new Error(`evidence[${index}].${key} must be text`);
    return { ...record, time: record.date == null || record.date === '' ? null : dateValue(record.date, `evidence[${index}] date`) };
  });
  const unlisted = records.filter(r => !skills.includes(r.skill));
  if (unlisted.length) warnings.push(`${unlisted.length} evidence records use unlisted skills.`);
  const rows = skills.map(skill => {
    const all = records.filter(r => r.skill === skill);
    const dated = all.filter(r => r.time !== null && r.time <= asOf);
    const future = all.filter(r => r.time !== null && r.time > asOf);
    const undated = all.filter(r => r.time === null);
    if (future.length) warnings.push(`${skill}: ${future.length} future evidence records excluded from current recency.`);
    if (undated.length) warnings.push(`${skill}: ${undated.length} undated records cannot establish recency.`);
    const latest = dated.length ? Math.max(...dated.map(r => r.time)) : null;
    const days = latest === null ? null : (asOf - latest) / 86400000;
    return { skill, evidenceCount: all.length, datedEvidenceCount: dated.length, futureEvidenceCount: future.length,
      latestEvidenceDate: latest === null ? null : new Date(latest).toISOString().slice(0, 10), daysSinceLatest: days,
      status: days === null ? 'missing evidence' : days <= input.freshWithinDays ? 'recent evidence' : 'older evidence',
      facts: all.map(r => r.fact).filter(Boolean).join('; '), sources: [...new Set(all.map(r => r.source).filter(Boolean))].join('; ') };
  });
  return { kind: 'skills-evidence-matrix', schemaVersion: 1, asOf: input.asOf, freshWithinDays: input.freshWithinDays,
    summary: `${rows.filter(r => r.status === 'recent evidence').length} of ${rows.length} skills have evidence within your chosen window.`,
    rows, warnings, limitations: ['Recency is a planning rule, not a competence rating, skill-quality score, or hiring decision.',
      'Only supplied facts are organized; no external verification, lookup, storage or sending is performed.'] };
}
