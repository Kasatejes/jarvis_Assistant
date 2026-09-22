const assert = require('assert');
const reminderEngine = require('./reminderEngine');

console.log('--- TESTING J.A.R.V.I.S SCHEDULED REMINDER ENGINE ---');

// 1. Test parseTargetTime for clock time
const clockRes = reminderEngine.parseTargetTime("12:37");
console.log('[PASS] Parsed clock time "12:37":', clockRes);
assert(clockRes.targetTimestamp > 0, 'Target timestamp should be positive integer');
assert(clockRes.formattedTime.includes(':37'), 'Formatted time should show 37 minutes');

// 2. Test relative time parsing
const relRes = reminderEngine.parseTargetTime("in 15 minutes");
console.log('[PASS] Parsed relative time "in 15 minutes":', relRes);
const diffMin = Math.round((relRes.targetTimestamp - Date.now()) / 60000);
assert(diffMin === 15, `Expected 15 min difference, got ${diffMin}`);

// 3. Test scheduling a short reminder and cancellation
const cancelTest = reminderEngine.scheduleReminder({
  title: "Test To Cancel",
  delayMinutes: 60
});
console.log('[PASS] Scheduled cancel test:', cancelTest.reminder.id);
const cancelRes = reminderEngine.cancelReminder(cancelTest.reminder.id);
console.log('[PASS] Cancellation result:', cancelRes.message);
assert(cancelRes.success === true, 'Cancellation should succeed');

// 4. Test background ticker firing
console.log('Testing automated background ticker with a 2-second alert...');
const shortAlert = reminderEngine.scheduleReminder({
  title: "Automated Meeting Test",
  delaySeconds: 2
});
assert(shortAlert.success === true);

reminderEngine.startEngine();

setTimeout(() => {
  const all = reminderEngine.getAllReminders();
  const triggeredItem = all.find(r => r.id === shortAlert.reminder.id);
  console.log('[PASS] After 3 seconds, reminder status is:', triggeredItem ? triggeredItem.status : 'not found');
  assert(triggeredItem && triggeredItem.status === 'triggered', 'Reminder should be automatically triggered by background ticker');

  // Verify active alerts queue
  const active = reminderEngine.getActiveAlerts();
  console.log('[PASS] Active alerts queue contains:', active.length, 'alert(s)');
  assert(active.some(a => a.id === shortAlert.reminder.id), 'Active alert should be present in queue');

  // Cleanup test reminder
  reminderEngine.dismissActiveAlert(shortAlert.reminder.id);
  reminderEngine.stopEngine();

  console.log('\n>>> ALL REMINDER ENGINE TESTS PASSED WITH 100% SUCCESS! <<<');
  process.exit(0);
}, 3200);
