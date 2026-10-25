// Verify both weeks and the archived predecessor after a renewal transaction.
// The UI must not report success from a transaction acknowledgement alone.
export function verifyRenewalReadback(saved,archive,expected,original){
 if(!saved||!archive||!expected||!original)return false;
 if(saved.calendarWeekAnchor!==expected.calendarWeekAnchor||saved.calendarInitialWeek!==1)return false;
 if(JSON.stringify(saved.plan)!==JSON.stringify(expected.plan)||JSON.stringify(saved.alternateWeek?.plan)!==JSON.stringify(expected.alternateWeek?.plan))return false;
 if(archive.start!==original.calendarWeekAnchor||JSON.stringify(archive.plan)!==JSON.stringify(original.plan)||JSON.stringify(archive.alternateWeek?.plan)!==JSON.stringify(original.alternateWeek?.plan))return false;
 return true;
}
