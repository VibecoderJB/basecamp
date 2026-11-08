// Trail Knowledge content. Plain HTML strings — edit freely (see README "Editing content").
// Keep it accurate and conservative; link readers to authoritative sources for depth.

export const DISCLAIMER = `<div class="callout callout--warn"><strong>Safety disclaimer</strong>
These guides are general educational information, not professional, medical or legal advice, and they can't cover every situation.
Get hands-on training (wilderness first aid, navigation, avalanche courses), follow the rules of the land manager where you hike, and
check current local conditions. You are responsible for your own safety. In an emergency, call your local emergency number or use a satellite messenger.</div>`;

export const GUIDES = [
  {
    slug: 'lnt', title: 'Leave No Trace', tag: '7 Principles', blurb: 'Minimise your impact so wild places stay wild.',
    html: `
<p>The seven Leave No Trace principles are a widely used framework for low-impact travel, developed by the Leave No Trace Center for Outdoor Ethics. Here's what each means in practice.</p>
<ol class="principles">
  <li><h3>Plan ahead and prepare</h3>Know the regulations, permits and special concerns for the area. Prepare for weather, hazards and emergencies. Travel in small groups, repackage food to cut waste, and use a map and compass so you don't need cairns, flagging or paint marks.</li>
  <li><h3>Travel and camp on durable surfaces</h3>Stick to established trails and campsites, rock, gravel, dry grass or snow. Walk single file in the middle of the trail, even when it's wet or muddy. Camp at least <strong>200 feet (about 70 adult steps) from lakes and streams</strong>. Good campsites are found, not made. In pristine areas, spread out use and avoid places where impact is just beginning.</li>
  <li><h3>Dispose of waste properly</h3>Pack it in, pack it out — including food scraps and toilet paper where required. Bury human waste in a <strong>cathole 6–8 inches (15–20 cm) deep</strong>, at least 200 ft from water, camp and trails, or pack it out in a waste bag where catholes aren't appropriate. To wash yourself or dishes, carry water 200 ft from streams or lakes and use small amounts of biodegradable soap. Strain dishwater and scatter it.</li>
  <li><h3>Leave what you find</h3>Preserve the past: look at, but don't touch, cultural or historic structures and artifacts. Leave rocks, plants and other natural objects as you find them. Don't build structures or furniture or dig trenches. Avoid introducing non-native species — clean boots and gear between areas.</li>
  <li><h3>Minimize campfire impacts</h3>Fires can leave lasting marks. Use a lightweight stove for cooking and a lantern for light. Where fires are allowed, use established fire rings, pans or mound fires and keep fires small. Burn only small sticks from the ground that can be broken by hand. Burn everything to ash, put fires out completely (drown, stir, feel for heat), then scatter cool ashes. <strong>Always check for fire bans first.</strong></li>
  <li><h3>Respect wildlife</h3>Observe from a distance and don't follow or approach animals. Never feed wildlife — it damages their health, changes natural behaviour and exposes them to predators and other dangers. Store food and trash securely. Control pets at all times or leave them at home. Avoid wildlife during sensitive times: mating, nesting, raising young or winter.</li>
  <li><h3>Be considerate of other visitors</h3>Respect other visitors and protect the quality of their experience. Be courteous and yield to other users on the trail (generally, hikers yield to horses, and downhill hikers yield to those climbing). Take breaks and camp away from trails and other visitors. Let nature's sounds prevail; keep voices and noise down.</li>
</ol>
<p class="help">Learn more at <a href="https://lnt.org/why/7-principles/" rel="noopener">lnt.org</a>.</p>`,
  },
  {
    slug: 'essentials', title: 'The 10 Essentials', tag: 'Systems', blurb: 'The kit that gets you through an unplanned night out.',
    html: `
<p>The "Ten Essentials" started with mountaineering clubs in the 1930s and is now written as ten <em>systems</em>. Carry them on every trip, even a day hike — scaled to how remote, how long and what season.</p>
<table class="spec"><thead><tr><th>#</th><th>System</th><th>What that looks like</th></tr></thead><tbody>
<tr><td>01</td><td><strong>Navigation</strong></td><td>Map and compass (and the skills to use them), plus a GPS app or device with offline maps. Optional: personal locator beacon or satellite messenger.</td></tr>
<tr><td>02</td><td><strong>Headlamp</strong></td><td>Headlamp with spare batteries or a charged power bank.</td></tr>
<tr><td>03</td><td><strong>Sun protection</strong></td><td>Sunglasses, sunscreen, lip balm, and sun-protective clothing / hat.</td></tr>
<tr><td>04</td><td><strong>First aid</strong></td><td>A kit suited to your group and trip, including foot care and insect repellent, and knowing how to use it.</td></tr>
<tr><td>05</td><td><strong>Knife</strong></td><td>Knife or multi-tool, plus a repair kit (tape, cord, patches).</td></tr>
<tr><td>06</td><td><strong>Fire</strong></td><td>Waterproof matches or lighter, plus fire starter. For emergencies — follow fire restrictions.</td></tr>
<tr><td>07</td><td><strong>Shelter</strong></td><td>Something to keep you dry and out of the wind if stuck overnight: tent, bivy, tarp or emergency blanket.</td></tr>
<tr><td>08</td><td><strong>Extra food</strong></td><td>At least an extra day's food beyond what you plan to eat.</td></tr>
<tr><td>09</td><td><strong>Extra water</strong></td><td>Enough water and a way to treat more (filter, chemical, UV or boiling).</td></tr>
<tr><td>10</td><td><strong>Extra clothes</strong></td><td>Layers beyond what you expect to need — the forecast can be wrong.</td></tr>
</tbody></table>
<p class="mt">Tip: run the Gear module's checklist against this table before you leave.</p>`,
  },
  {
    slug: 'layering', title: 'Layering Basics', tag: 'Clothing', blurb: 'Stay dry and warm by managing sweat, not just cold.',
    html: `
<p>Layering lets you adjust to changing effort and weather. The goal is to <strong>stay dry</strong> — wet clothing (from sweat or rain) loses insulation and pulls heat from your body much faster than dry clothing.</p>
<h2>The three layers</h2>
<h3>1 · Base layer — moves moisture</h3>
<p>Next to skin. Merino wool or synthetic (polyester, nylon) fabrics wick sweat and dry relatively quickly. Avoid cotton: it absorbs water, dries slowly and insulates poorly when wet — dangerous in cool, wet or windy conditions.</p>
<h3>2 · Mid layer — insulates</h3>
<p>Traps warm air. Fleece is breathable and stays warm-ish when damp. Down has the best warmth-to-weight ratio and packs small, but loses most of its loft when wet. Synthetic insulation is heavier for the same warmth but keeps insulating when damp.</p>
<h3>3 · Outer layer — protects</h3>
<p>Blocks wind and rain. A waterproof-breathable shell is the standard for wet climates; a light wind shirt is great for dry, breezy days. Ventilation (pit zips, front zip) helps you avoid soaking from the inside.</p>
<h2>How to use them</h2>
<ul>
  <li><strong>"Be bold, start cold."</strong> Start hiking slightly chilly; you'll warm up within minutes. Shed layers <em>before</em> you start sweating heavily.</li>
  <li><strong>Add a layer at every stop.</strong> Put your puffy on as soon as you stop for a break, then take it off before you move again.</li>
  <li><strong>Protect the extremities:</strong> hat, buff, gloves — small items, big warmth.</li>
  <li><strong>Keep a dry set</strong> for camp and sleeping, sealed in a waterproof bag.</li>
  <li>Watch for the "umbles" — stumbles, mumbles, fumbles, grumbles — early signs of hypothermia. Get the person dry, insulated, fed and out of the wind.</li>
</ul>`,
  },
  {
    slug: 'water', title: 'Water Treatment', tag: 'Hydration', blurb: 'Filters, chemicals, UV and boiling — what each one stops.',
    html: `
<p>Clear, cold water can still carry pathogens. Backcountry water may contain <strong>protozoa</strong> (e.g. <em>Giardia</em>, <em>Cryptosporidium</em>), <strong>bacteria</strong> (e.g. <em>E. coli</em>) and <strong>viruses</strong> (e.g. norovirus, hepatitis A). Treat all water unless local authorities say otherwise.</p>
<table class="spec"><thead><tr><th>Method</th><th>Protozoa</th><th>Bacteria</th><th>Viruses</th><th>Notes</th></tr></thead><tbody>
<tr><td><strong>Boiling</strong></td><td>✔</td><td>✔</td><td>✔</td><td>Rolling boil for 1 minute; 3 minutes above about 6,500 ft (2,000 m). Uses fuel and time.</td></tr>
<tr><td><strong>Filter</strong> (~0.1–0.2 µm)</td><td>✔</td><td>✔</td><td>✘*</td><td>Fast, no wait. *Most backpacking filters don't remove viruses — only purifiers rated for viruses do. Hollow-fiber filters can be ruined by freezing: sleep with them in cold weather.</td></tr>
<tr><td><strong>Chlorine dioxide</strong></td><td>✔ (slow)</td><td>✔</td><td>✔</td><td>Light and simple. Bacteria and viruses in ~30 min; <em>Cryptosporidium</em> needs up to ~4 hours. Follow product contact times; cold or cloudy water needs longer.</td></tr>
<tr><td><strong>Iodine / chlorine (bleach)</strong></td><td>Partial</td><td>✔</td><td>✔</td><td>Not effective against <em>Cryptosporidium</em>. Iodine isn't advised for pregnant people or those with thyroid conditions.</td></tr>
<tr><td><strong>UV light</strong></td><td>✔</td><td>✔</td><td>✔</td><td>Needs clear water and batteries. Pre-filter cloudy water first.</td></tr>
</tbody></table>
<h2>Good practice</h2>
<ul>
  <li><strong>Pick the best source:</strong> flowing water upstream of camps, trails and grazing animals.</li>
  <li><strong>Pre-filter murky water</strong> through a bandana or let sediment settle before treating.</li>
  <li><strong>Keep dirty and clean separate</strong> — don't let untreated drips reach bottle threads or your mouth.</li>
  <li><strong>Carry a backup</strong> (a few chemical tablets) in case your filter clogs, freezes or breaks.</li>
  <li><strong>Wash your hands.</strong> Many trail stomach illnesses come from poor hygiene, not water. Use soap or sanitizer after toileting and before eating.</li>
</ul>
<p class="help">Further reading: the CDC's backcountry water treatment guidance (<a href="https://www.cdc.gov/search/?query=backcountry%20water%20treatment" rel="noopener">search cdc.gov</a>).</p>`,
  },
  {
    slug: 'bears', title: 'Bear Safety & Food Storage', tag: 'Wildlife', blurb: 'Store food right, and know what to do in an encounter.',
    html: `
<p>Most bear problems start with food. A bear that gets human food can become bold and dangerous and may have to be removed. Storing food properly protects you, the next hiker and the bear.</p>
<h2>Food storage</h2>
<ul>
  <li><strong>Follow local rules.</strong> Many areas <em>require</em> approved bear-resistant canisters; others provide metal food lockers or poles.</li>
  <li><strong>Bear canister:</strong> the most reliable option where trees are scarce or bears are habituated. Place it on flat ground about 200 ft from your tent, away from cliffs and water so it can't be rolled away.</li>
  <li><strong>Bear hang</strong> (where allowed and effective): typically at least 12 ft off the ground, 6 ft from the trunk and 6 ft below the branch. Hangs are hard to do well and many bears have learned to defeat them.</li>
  <li><strong>Everything with a scent goes in:</strong> food, trash, toothpaste, sunscreen, lip balm, deodorant, cooking gear.</li>
  <li><strong>Bear-country camp layout:</strong> cook, eat and store food at least 200 ft (≈70 steps) from your tent, ideally downwind. Never keep food in your tent.</li>
</ul>
<h2>On the trail</h2>
<ul>
  <li>Make noise in thick brush, near streams and on blind corners. Hike in groups where possible.</li>
  <li>Carry <strong>bear spray</strong> in grizzly country and keep it accessible (on your hip or chest, not in your pack). Know how to use it; it is effective at roughly 25–30 ft, so spray when a charging bear is close.</li>
  <li>Watch for fresh signs: tracks, scat, torn logs, carcasses. Leave the area if you find a carcass.</li>
</ul>
<h2>If you meet a bear</h2>
<ul>
  <li><strong>Stay calm. Don't run</strong> — running can trigger a chase, and bears are much faster than people.</li>
  <li>Identify yourself: talk in a calm, low voice and slowly wave your arms. Pick up small children.</li>
  <li><strong>Back away slowly</strong>, sideways if possible, keeping the bear in view. Give it an escape route.</li>
  <li>Don't climb a tree to escape, and never get between a mother and cubs.</li>
</ul>
<h2>If a bear makes contact</h2>
<p>Advice differs by species and situation (based on U.S. National Park Service guidance):</p>
<ul>
  <li><strong>Brown/grizzly bear, defensive attack</strong> (surprised or protecting cubs/food): leave your pack on, <em>play dead</em> — lie flat on your stomach, hands clasped behind your neck, legs spread. Stay still until the bear leaves. If the attack continues, fight back.</li>
  <li><strong>Black bear attack:</strong> do <em>not</em> play dead. Try to escape to a secure place (car, building); if you can't, <em>fight back</em> hard, aiming at the face and muzzle.</li>
  <li><strong>Any bear that stalks you or attacks in your tent at night</strong> (predatory behaviour): fight back with everything you have.</li>
</ul>
<p class="help">Further reading: <a href="https://www.nps.gov/subjects/bears/safety.htm" rel="noopener">NPS — Staying safe around bears</a>.</p>`,
  },
  {
    slug: 'blisters', title: 'Blister Care', tag: 'Feet', blurb: 'Prevent hot spots — and treat blisters cleanly when they happen.',
    html: `
<p>Blisters come from <strong>friction + moisture + heat</strong>. Most can be prevented, and the earlier you act the smaller the problem.</p>
<h2>Prevention</h2>
<ul>
  <li><strong>Fit first:</strong> footwear with room for your feet to swell (often a half size up for long days), and a secure heel.</li>
  <li><strong>Socks:</strong> moisture-wicking wool or synthetic, no cotton. Some people use thin liner socks or toe socks.</li>
  <li><strong>Break in</strong> new boots or shoes on shorter walks before a big trip.</li>
  <li><strong>Keep feet dry:</strong> air them out at breaks, change into dry socks, and let wet socks dry on your pack.</li>
  <li>Trim toenails straight across, and consider an anti-friction balm on problem spots.</li>
</ul>
<h2>Hot spots: stop now</h2>
<p>A warm, stinging or red patch is a blister about to happen. <strong>Stop immediately</strong>, dry the skin, and cover it with tape, a blister plaster or moleskin. Check for debris in your sock or shoe, and adjust lacing.</p>
<h2>Treating a blister</h2>
<ul>
  <li><strong>Small and intact:</strong> leave it closed — the skin roof is a natural, sterile barrier. Pad it with a "donut" of moleskin around the blister, and cover with tape or a dressing.</li>
  <li><strong>Large, tense or painful</strong> (and likely to tear anyway): wash your hands and the area; sterilize a needle with alcohol (or a flame, then let it cool); puncture the edge of the blister and press the fluid out gently. <strong>Leave the roof of skin in place.</strong> Apply antibiotic ointment if you carry it, then a non-stick dressing and tape.</li>
  <li><strong>Torn open:</strong> clean gently with treated water, trim only loose flaps of dead skin with clean scissors, apply ointment and cover with a non-stick dressing. Change dressings daily and whenever wet.</li>
</ul>
<h2>Watch for infection</h2>
<p>Increasing redness, warmth or swelling, pus, red streaks spreading from the area, or fever all mean infection — get medical care. People with diabetes or poor circulation should be extra cautious and avoid draining blisters themselves unless advised by a clinician.</p>`,
  },
];
