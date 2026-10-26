const PQueue = require('p-queue').default;
const queues = new Map();

function getQueue(userId) {
  if (!queues.has(userId)) {
    queues.set(userId, new PQueue({ concurrency: 1 }));
  }
  return queues.get(userId);
}

module.exports = { getQueue };
