/**
 * Dedup Attendance Records — Migration Script
 *
 * Finds and removes duplicate attendance records for single-instance purposes
 * (Check In, Check Out, On Leave) — keeps only the earliest record per user/date/purpose.
 *
 * Usage:
 *   node scripts/dedup-attendance.js              # dry-run (preview only)
 *   node scripts/dedup-attendance.js --execute    # actually delete duplicates
 *
 * Run this BEFORE deploying the unique index changes so the index creation
 * does not fail due to existing duplicate documents.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  image: String,
  location: { lat: Number, lng: Number },
  locationName: String,
  purpose: String,
  subPurpose: String,
  feedback: String,
  timestamp: { type: Date, default: Date.now },
  date: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

const SINGLE_INSTANCE_PURPOSES = ['Check In', 'Check Out', 'On Leave'];
const DRY_RUN = !process.argv.includes('--execute');

const run = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 120000,
  });
  console.log(`Connected to MongoDB: ${conn.connection.host}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'EXECUTE (will delete)'}`);
  console.log('');

  const totalBefore = await Attendance.countDocuments({});
  console.log(`Total attendance records before: ${totalBefore}`);
  console.log('');

  let allRemoveIds = [];
  let totalRemoved = 0;

  for (const purpose of SINGLE_INSTANCE_PURPOSES) {
    const duplicates = await Attendance.aggregate([
      { $match: { purpose } },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: { user: '$user', date: '$date', purpose: '$purpose' },
          ids: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length === 0) {
      console.log(`[${purpose}] No duplicates found.`);
      continue;
    }

    let purposeRemoved = 0;
    for (const group of duplicates) {
      const keepId = group.ids[0];
      const removeIds = group.ids.slice(1);
      allRemoveIds.push(...removeIds);
      purposeRemoved += removeIds.length;
    }

    console.log(`[${purpose}] ${duplicates.length} groups, ${purposeRemoved} duplicates to remove`);
    totalRemoved += purposeRemoved;
  }

  console.log('');
  console.log(`Total IDs to delete: ${totalRemoved}`);

  if (totalRemoved === 0) {
    console.log('No duplicates found. Nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!DRY_RUN) {
    const result = await Attendance.deleteMany({ _id: { $in: allRemoveIds } });
    console.log(`Deleted ${result.deletedCount} records`);
  }

  const totalAfter = DRY_RUN ? totalBefore : await Attendance.countDocuments({});

  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Records before: ${totalBefore}`);
  console.log(`Duplicates removed: ${totalRemoved}`);
  console.log(`Records after:  ${totalAfter}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN — rerun with --execute to actually delete' : 'EXECUTED'}`);

  if (totalRemoved > 0 && DRY_RUN) {
    console.log('');
    console.log('➡  To execute: node scripts/dedup-attendance.js --execute');
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Fatal error:', error);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
