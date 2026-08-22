import assert from 'assert';
import {
  mockPlanCareSchedule,
  redistributePendingSlots,
} from './careSchedule.js';

const plan = mockPlanCareSchedule('3 apples this week', { startDate: '2026-08-22' });
assert.ok(plan.slots.length >= 3);
assert.equal(plan.windowDays, 7);
assert.ok(plan.slots.every((s) => s.prompt && !/calorie|bmi|weight/i.test(s.prompt)));

const tight = mockPlanCareSchedule('3 apples in 2 days', { startDate: '2026-08-22' });
assert.equal(tight.windowDays, 2);
assert.ok(tight.slots.length >= 3);

const moved = redistributePendingSlots(
  [
    { id: 'a', date: '2026-08-22', mealLabel: 'morning', prompt: 'x', status: 'pending' },
    { id: 'b', date: '2026-08-22', mealLabel: 'evening', prompt: 'y', status: 'pending' },
  ],
  '2026-08-23',
  '2026-08-28'
);
assert.equal(moved.length, 2);
assert.ok(moved.every((s) => s.date >= '2026-08-23'));
assert.notEqual(moved[0].date, moved[1].date);

console.log('careSchedule.test.js ok');
