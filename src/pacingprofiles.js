// Sending pace profiles copied to each newly created campaign.
// Fast profiles still include deliberate pauses between batches.
const PACING_PROFILES = Object.freeze({
  very_fast:      { delayMin: 2000,  delayMax: 5000,   batchSize: 10, pauseMin: 300000, pauseMax: 600000 },
  fast:           { delayMin: 5000,  delayMax: 10000,  batchSize: 10, pauseMin: 300000, pauseMax: 600000 },
  quick:          { delayMin: 10000, delayMax: 15000,  batchSize: 15, pauseMin: 180000, pauseMax: 300000 },
  recommended:    { delayMin: 15000, delayMax: 45000,  batchSize: 20, pauseMin: 120000, pauseMax: 300000 },
  careful:        { delayMin: 30000, delayMax: 60000,  batchSize: 10, pauseMin: 300000, pauseMax: 600000 },
  slow:           { delayMin: 45000, delayMax: 90000,  batchSize: 10, pauseMin: 300000, pauseMax: 600000 },
  very_careful:   { delayMin: 60000, delayMax: 120000, batchSize: 10, pauseMin: 600000, pauseMax: 900000 },
});

const DEFAULT_PACING_PROFILE = 'recommended';

function isPacingProfile(profile) {
  return typeof profile === 'string' && Object.prototype.hasOwnProperty.call(PACING_PROFILES, profile);
}

module.exports = { PACING_PROFILES, DEFAULT_PACING_PROFILE, isPacingProfile };
