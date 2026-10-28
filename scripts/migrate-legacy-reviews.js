'use strict';

// Audit/export legacy reviews without ownership fields. Apply explicit per-review mappings only
// after inspecting the backup. This script never guesses who owns a legacy record.
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const User = require('../models/User');

async function writePrivateBackup(records) {
  const dir = path.resolve(process.env.LEGACY_REVIEW_BACKUP_DIR || 'backups');
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const filename = path.join(dir, `legacy-reviews-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const handle = await fs.open(filename, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(records, null, 2) + '\n', 'utf8'); }
  finally { await handle.close(); }
  return filename;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  await mongoose.connect(process.env.DATABASE_URL, { serverSelectionTimeoutMS: 10000, maxPoolSize: 2 });
  try {
    const collection = mongoose.connection.collection('reviews');
    const legacy = await collection.find({ $or: [{ owner: { $exists: false } }, { owner: null }] }).toArray();
    console.log(`Found ${legacy.length} review records without an owner.`);
    if (legacy.length === 0) return;

    const backupPath = await writePrivateBackup(legacy);
    console.log(`Private backup created at ${backupPath}`);
    console.log('No records were modified.');

    const applyIndex = process.argv.indexOf('--apply');
    if (applyIndex === -1) {
      console.log('Audit only. To assign owners, prepare a JSON object mapping each review _id to a valid user _id, then run with --apply <mapping-file>.');
      return;
    }
    const mappingPath = process.argv[applyIndex + 1];
    if (!mappingPath) throw new Error('--apply requires a mapping JSON file');
    const mapping = JSON.parse(await fs.readFile(path.resolve(mappingPath), 'utf8'));
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) throw new Error('Mapping must be a JSON object of review ID to user ID');
    const legacyIds = new Set(legacy.map((item) => String(item._id)));
    const entries = Object.entries(mapping);
    if (entries.length !== legacy.length || entries.some(([reviewId]) => !legacyIds.has(reviewId))) {
      throw new Error('Mapping must contain exactly one explicit owner for every ownerless review in the current audit');
    }
    for (const [reviewId, ownerId] of entries) {
      if (!mongoose.isValidObjectId(reviewId) || !mongoose.isValidObjectId(ownerId)) throw new Error('Every review and owner mapping must use valid MongoDB ObjectIds');
    }
    const ownerIds = [...new Set(entries.map(([, ownerId]) => ownerId))];
    const users = await User.find({ _id: { $in: ownerIds } }).select('_id').lean();
    const validOwners = new Set(users.map((user) => String(user._id)));
    if (ownerIds.some((ownerId) => !validOwners.has(ownerId))) throw new Error('One or more mapped owners do not exist');
    const operations = entries.map(([reviewId, ownerId]) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(reviewId), $or: [{ owner: { $exists: false } }, { owner: null }] },
        update: { $set: { owner: new mongoose.Types.ObjectId(ownerId), collaborators: [] } }
      }
    }));
    const result = await collection.bulkWrite(operations, { ordered: true });
    if (result.modifiedCount !== entries.length) throw new Error(`Expected ${entries.length} migrated records, updated ${result.modifiedCount}. Restore from the backup and investigate before retrying.`);
    console.log(`Successfully assigned explicit owners to ${result.modifiedCount} records.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Legacy review migration failed:', error.message);
  process.exitCode = 1;
});
