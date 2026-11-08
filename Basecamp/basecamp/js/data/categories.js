// Gear categories. `color` feeds the breakdown chart (legend also shows text + numbers,
// so colour is never the only carrier of meaning).
export const CATEGORIES = [
  { id: 'big3',  name: 'Big 3',          color: '#ff5a1f', hint: 'Pack, shelter, sleep system' },
  { id: 'sleep', name: 'Sleep',          color: '#f29a6b', hint: 'Pad, pillow, liner' },
  { id: 'kitchen', name: 'Kitchen',      color: '#8e4f30', hint: 'Stove, pot, utensils' },
  { id: 'water', name: 'Water',          color: '#4fa9c9', hint: 'Filter, bottles, bladder' },
  { id: 'clothing', name: 'Clothing',    color: '#6b7d3a', hint: 'Packed layers' },
  { id: 'electronics', name: 'Electronics', color: '#e8b500', hint: 'Light, power, comms' },
  { id: 'firstaid', name: 'First Aid',   color: '#c8342b', hint: 'Kit, meds, blister care' },
  { id: 'nav', name: 'Navigation',       color: '#2e6b5e', hint: 'Map, compass, GPS' },
  { id: 'hygiene', name: 'Hygiene',      color: '#8a7bb8', hint: 'Trowel, TP, sunscreen' },
  { id: 'tools', name: 'Tools & Repair', color: '#5f635d', hint: 'Knife, repair kit' },
  { id: 'food', name: 'Food',            color: '#d98e3b', hint: 'Usually consumable' },
  { id: 'misc', name: 'Misc',            color: '#a8a28f', hint: 'Everything else' },
];
export const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
