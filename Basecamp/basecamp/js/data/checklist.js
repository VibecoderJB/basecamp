// Default pre-trip checklist. Users can add their own items too.
export const CHECKLIST_GROUPS = [
  { id: 'research', name: 'Research & Permits', items: [
    'Get any required permits or reservations',
    'Check fire bans / fire restrictions for the area',
    'Check trail conditions, closures and recent reports',
    'Check water source reports (seasonal springs can be dry)',
    'Know if a bear canister or food storage is required',
    'Check the forecast within 24 hours of leaving',
    'Know sunrise / sunset and plan your daylight',
  ] },
  { id: 'plan', name: 'Trip Plan & Safety', items: [
    'Leave a written trip plan with a trusted contact',
    'Agree a "call for help if not back by" time with them',
    'Download offline maps / carry a paper map',
    'Note nearest exits and bail-out routes',
    'Program emergency numbers; know where you have signal',
    'Check the 10 Essentials are packed',
  ] },
  { id: 'gear', name: 'Gear & Prep', items: [
    'Charge phone, headlamp, power bank, messenger',
    'Test stove and check fuel level',
    'Inspect tent, poles and stakes',
    'Treat or pack enough water for the first leg',
    'Pack food in a scent-proof/bear-safe container',
    'Restock first aid kit and blister supplies',
  ] },
  { id: 'after', name: 'After the Trip', items: [
    'Check in with your contact — you are out safely',
    'Dry tent and sleeping bag fully before storing',
    'Clean and back-flush water filter',
    'Note gear that was unused or missing for next time',
  ] },
];
