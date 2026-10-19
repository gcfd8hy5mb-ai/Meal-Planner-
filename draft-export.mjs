// Local-only export of an unsaved Tablewise plan. Never uploads data or restores cloud state.
export function serializeUnsavedPlan(plan, date = new Date()) {
 if (!plan || typeof plan !== 'object' || Array.isArray(plan) ||
     !plan.plan || typeof plan.plan !== 'object' || Array.isArray(plan.plan) ||
     !plan.preferences || typeof plan.preferences !== 'object' ||
     !plan.goals || typeof plan.goals !== 'object')
   throw new Error('Cannot export an incomplete meal plan');
 if (!(date instanceof Date) || !Number.isFinite(date.getTime()))
   throw new Error('Invalid backup timestamp');
 const snapshot=JSON.parse(JSON.stringify(plan));
 if (!snapshot.plan || !snapshot.preferences || !snapshot.goals)
   throw new Error('Meal plan cannot be serialized safely');
 return JSON.stringify({
   format:'tablewise-unsaved-plan-v1',
   savedAt:date.toISOString(),
   warning:'Offline safety copy only. Import is not automatic; review changes before any cloud restore.',
   plan:snapshot
 },null,2);
}
