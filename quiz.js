/**
 * Buddyz Quiz — quiz.js v3.3
 *
 * NEW in v3.3 (replaces the image-based v3.2 approach):
 *  ① Score card redesigned — flat full-bleed gradient (no glass
 *     panel / gradient top bar), new fonts, cleaner spacing
 *  ② Question bank rewritten as 108 SHORT, text+emoji-only
 *     questions — no images, no external CDN, no asset folder
 *  ③ Colorful per-question cards — 6 selectable gradients,
 *     creator picks a color per question via inline swatches;
 *     friend sees the same colors. Options render as a single
 *     vertical stack of white pill rows (no grid/columns)
 *  ④ index.html + bffchallenge.html merged into one page —
 *     visiting the site goes straight to name entry; friends
 *     opening a ?id= link see the quiz, not the homepage pitch
 *  ⑤ "View" button next to each leaderboard entry — lets the
 *     creator see a friend's full per-question answer breakdown
 *  ⑥ Tiny addictive feature — a 🔥 "fast streak" badge that
 *     builds when the friend answers quickly, purely about
 *     pace (never reveals correctness, can't spoil the score)
 *
 * Carried over:
 *  - Full-screen "Create Your Own" conversion nudge
 *  - Competitive WhatsApp share message with friend's score
 *  - Quiz expiry (7-day) + urgency countdown banner
 *  - Live global quiz counter from Firebase meta node
 *  - PWA Service Worker + Web Push notifications
 *  - Reaction feed (emoji reactions to a quiz)
 *
 * Architecture notes:
 *  - All new features are additive; existing DOM contracts (IDs, events) untouched
 *  - escapeHTML, AudioEngine, showToast, getTier, injectName reused as-is
 *  - Canvas scorecard generation is entirely client-side — zero server cost
 *  - expiresAt field added to creator payload; friend flow + history check it
 *  - Question options are now plain strings (emoji baked in), not {text,image}
 *  - Per-question `color` travels: creator pick -> Firebase answers[i].color
 *    -> friend's rendered card -> friend's response details[i].color
 */


/* ══════════════════════════════════════════════
   1. AUDIO ENGINE — Web Audio API (zero-lag)
══════════════════════════════════════════════ */
const AudioEngine = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, type, duration, gain = 0.18) {
    const c = getCtx();
    if (!c) return;
    try {
      const osc      = c.createOscillator();
      const gainNode = c.createGain();
      osc.connect(gainNode);
      gainNode.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gainNode.gain.setValueAtTime(gain, c.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch { /* silent fail */ }
  }

  return {
    select()   { playTone(880, 'sine', 0.12, 0.15); },
    advance()  {
      playTone(660, 'sine', 0.08, 0.12);
      setTimeout(() => playTone(880, 'sine', 0.1, 0.12), 80);
    },
    success()  {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => playTone(f, 'sine', 0.18, 0.13), i * 90)
      );
    },
    error()    { playTone(220, 'sawtooth', 0.2, 0.1); },
    reaction() { playTone(1200, 'sine', 0.08, 0.1); },
  };
})();

/* ══════════════════════════════════════════════
   2. TOAST UTILITY
══════════════════════════════════════════════ */
function showToast(msg, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = `toast${type ? ' ' + type : ''}`;
  t.textContent = msg;
  document.body.appendChild(t);
  t.style.transition = 'opacity 0.4s';
  setTimeout(() => { t.style.opacity = '0'; }, 2200);
  setTimeout(() => t.remove(), 2700);
}

/* ══════════════════════════════════════════════
   3. ESCAPE HTML
══════════════════════════════════════════════ */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════
   4. QUESTION BANK — 108 questions
      (15 randomly selected each session)
      Placeholder: {{CREATOR}} replaced at runtime

   Options are plain strings with a leading emoji —
   no images required. Keeping the emoji inside the
   string keeps everything simple: one source of
   truth, easy to scan, easy to add more later.
══════════════════════════════════════════════ */
const BASE_QUESTIONS = [
  { id: 'q01', question: "{{CREATOR}} gets unsolicited advice — first reaction?", options: [
    '😊 Nods and secretly ignores it',
    '🔥 Claps back immediately',
    '😐 Says "thanks" with zero emotion',
    '📝 Actually considers it, maybe',
  ]},
  { id: 'q02', question: "Someone cancels plans on {{CREATOR}} last minute — they:", options: [
    '😌 Feel secretly relieved, honestly',
    '😤 Gets annoyed and makes it known',
    '🤷 Whatever, plans something else',
    '📞 Immediately reschedules, non-negotiable',
  ]},
  { id: 'q03', question: "{{CREATOR}}'s villain origin story would be:", options: [
    '🐌 Slow walkers blocking the whole path',
    '🔇 Someone who chews with their mouth open',
    '📱 Chronic unreplied texts from "close" friends',
    '⏰ Being made to wait for absolutely no reason',
  ]},
  { id: 'q04', question: "{{CREATOR}} wins an argument they were actually wrong about. They:", options: [
    '😏 Enjoys the win, revisits it later quietly',
    '😬 Admits it immediately, can\'t handle the guilt',
    '🤐 Never brings it up again — take it to the grave',
    '🔄 Changes the subject and acts like it never happened',
  ]},
  { id: 'q05', question: "{{CREATOR}}'s 2am energy is:", options: [
    '🍟 Aggressively hungry, raids everything',
    '💭 Spiraling about a random life decision',
    '🎵 Playing one song on repeat for an hour',
    '😴 Asleep since 10pm. Who is "2am"?',
  ]},
  { id: 'q06', question: "How does {{CREATOR}} handle a long awkward silence?", options: [
    '😂 Cracks a joke, instantly',
    '📱 Pulls out their phone like it vibrated',
    '🗣️ Starts talking about literally anything',
    '😐 Sits in it unbothered — not their problem',
  ]},
  { id: 'q07', question: "{{CREATOR}}'s toxic trait (their words, not ours):", options: [
    '😅 Overcommits and then regrets everything',
    '🧊 Goes cold when overwhelmed instead of talking',
    '🎭 Says "I\'m fine" when they are not fine',
    '📋 Overthinks every single decision to death',
  ]},
  { id: 'q08', question: "What does {{CREATOR}} do right before a big moment?", options: [
    '🎧 Hypes themselves up with a specific song',
    '🧘 Goes completely quiet, needs a minute',
    '😂 Makes jokes to shake off the nerves',
    '🏃 Moves around, can\'t stay still',
  ]},
  { id: 'q09', question: "{{CREATOR}} in a group chat is definitely:", options: [
    '🌅 The one who sends good morning every day without fail',
    '😂 Pure chaos — memes at all hours, no context',
    '🔕 Reads everything, replies never',
    '🧠 Only shows up when there\'s something important to say',
  ]},
  { id: 'q10', question: "{{CREATOR}}'s energy at a party is:", options: [
    '🕺 On the dance floor, zero shame',
    '💬 One deep conversation in a corner all night',
    '🍽️ Physically attached to the snack table',
    '🚪 Already calculating the earliest polite exit',
  ]},
  { id: 'q100', question: "{{CREATOR}} gets a compliment from a stranger — they:", options: [
    '😊 Says thanks and glows about it for days',
    '😳 Gets weirdly flustered and can\'t move on',
    '😐 Says "thanks" and forgets it immediately',
    '🤨 Low-key wonders what they actually want',
  ]},
  { id: 'q101', question: "If {{CREATOR}} could delete one social media app:", options: [
    '📸 Instagram — too much comparison energy',
    '🐦 X/Twitter — it\'s just stress in app form',
    '🎵 TikTok — the time vortex is too real',
    '👻 Snapchat — nobody uses it right anyway',
  ]},
  { id: 'q102', question: "How does {{CREATOR}} handle making a big decision?", options: [
    '⚡ Decides immediately, no looking back',
    '📝 Makes a list, weighs every angle',
    '🙋 Polls everyone they know until they\'re sure',
    '😩 Delays it for as long as humanly possible',
  ]},
  { id: 'q103', question: "{{CREATOR}}'s reaction to losing something important:", options: [
    '🔍 Calm, methodical, retraces every step',
    '😱 Mild spiral and texts four people at once',
    '🤷 Accepts it\'s gone and moves on fast',
    '💸 Already on the internet buying a replacement',
  ]},
  { id: 'q104', question: "If {{CREATOR}} were a main character, their arc would be:", options: [
    '🦸 Underestimated person who ends up saving everyone',
    '🧠 The strategist nobody realizes is ten steps ahead',
    '💫 Chaotic wildcard that somehow always lands right',
    '🤝 The loyal one everyone else leans on',
  ]},
  { id: 'q105', question: "{{CREATOR}}'s texting style:", options: [
    '⚡ Replies fast and often in rapid-fire bursts',
    '📖 One very long, very detailed message',
    '👻 Reads it, will reply when the spirit moves them',
    '🎙️ Voice notes only — typing is exhausting',
  ]},
  { id: 'q106', question: "After a disagreement, {{CREATOR}} is most likely to:", options: [
    '🗣️ Address it head-on the same day',
    '✍️ Write out exactly what they feel first',
    '🤝 Let actions do the talking instead of words',
    '⏳ Need a day or two to process before coming back',
  ]},
  { id: 'q107', question: "{{CREATOR}}'s most irresistible comfort thing:", options: [
    '🛋️ A hoodie, blanket, and nothing to do',
    '🎵 One specific playlist that fixes everything',
    '🍜 Their go-to comfort food, no exceptions',
    '📞 A long phone call with the right person',
  ]},
  { id: 'q108', question: "If {{CREATOR}}'s life was a movie, the vibe would be:", options: [
    '🎬 Indie coming-of-age — beautiful chaos',
    '🏆 Underdog sports drama — they always come through',
    '💫 Romcom with too many plot twists',
    '🧠 Psychological thriller — nobody really knows them',
  ]},
  { id: 'q11', question: "How does {{CREATOR}} handle being late?", options: [
    '⏳ Never late, it\'s a personal moral code',
    '📱 Texts "on my way" while still at home',
    '😬 Arrives late, no apology, unbothered',
    '🏃 Sprints in, fully out of breath, apologizes twice',
  ]},
  { id: 'q12', question: "{{CREATOR}} just got amazing news — first move:", options: [
    '🎉 Screams and tells the nearest person immediately',
    '😌 Sits with it quietly and smiles to themselves',
    '📞 Calls their one person before anyone else',
    '📱 Posts it before they\'ve even fully processed it',
  ]},
  { id: 'q13', question: "Pick {{CREATOR}}'s most-used phrase:", options: [
    '"I\'m on my way" (not on the way)',
    '"No but actually though"',
    '"It\'s giving…" (something)',
    '"I\'ll do it tomorrow" (won\'t do it tomorrow)',
  ]},
  { id: 'q14', question: "How does {{CREATOR}} make decisions?", options: [
    '⚡ Trusts the gut — fast and final',
    '📋 Weighs pros and cons properly',
    '🙋 Runs it by everyone first',
    '🎲 Genuinely just vibes it',
  ]},
  { id: 'q15', question: "{{CREATOR}}'s love language (giving):", options: [
    '🎁 Thoughtful gifts that prove they were paying attention',
    '🗣️ Hypes people up constantly, unprompted',
    '⏰ Shows up and stays — quality time above all',
    '🤝 Does the thing you mentioned needing done',
  ]},
  { id: 'q16', question: "What does {{CREATOR}} look like when they\'re annoyed?", options: [
    '🧊 Goes completely quiet and distant',
    '🗯️ Says it straight — you will know immediately',
    '😤 Vents to one specific person privately',
    '🎭 Says "I\'m fine" with the energy of someone who is not fine',
  ]},
  { id: 'q17', question: "{{CREATOR}}'s biggest pet peeve:", options: [
    '⏰ People who are chronically, unapologetically late',
    '✂️ Being interrupted mid-sentence',
    '🔊 Loud eating — we all heard it',
    '📱 Texting during a face-to-face conversation',
  ]},
  { id: 'q18', question: "{{CREATOR}}'s ideal Friday night is:", options: [
    '🛋️ Couch, something to watch, absolutely no plans',
    '🎉 Out with the whole crew, loud, chaotic',
    '👯 One close friend, good food, talking for hours',
    '🎨 Solo time doing something creative or focused',
  ]},
  { id: 'q19', question: "{{CREATOR}}'s room right now:", options: [
    '✨ Spotlessly clean — they maintain it constantly',
    '📦 Organized chaos — messy but they know exactly where everything is',
    '🌪️ A disaster zone with no known explanation',
    '🧹 Clean in the visible parts, chaos behind closed doors',
  ]},
  { id: 'q20', question: "{{CREATOR}}'s relationship with mornings:", options: [
    '🌅 Up before the alarm and actually happy about it',
    '😩 Hits snooze three times minimum, every single day',
    '☕ Technically awake but not human until caffeine hits',
    '🌙 Night person — mornings are a choice they refuse to make',
  ]},
  { id: 'q21', question: "How does {{CREATOR}} handle a deadline?", options: [
    '🏆 Finishes early, double-checks',
    '📅 Steady pace, done on time',
    '⚡ Last-minute rush, somehow pulls it off',
    '⏰ Needs the panic to even start',
  ]},
  { id: 'q22', question: "{{CREATOR}}'s phone screen time habit?", options: [
    '📵 Barely on it',
    '📱 A few hours, balanced',
    '😬 Embarrassingly high',
    '🤷 Refuses to check',
  ]},
  { id: 'q23', question: "What's {{CREATOR}}'s exercise routine, really?", options: [
    '🏋️ Gym regular, sticks to it',
    '🚶 Walks count, right?',
    '🏠 Home workouts when motivated',
    '🛋️ Exercise is a rumor',
  ]},
  { id: 'q24', question: "How does {{CREATOR}} water their plants — or lack thereof?", options: [
    '🌱 Green thumb, thriving plants',
    '🥀 Means well, plants disagree',
    '🚫 No plants, no drama',
    '🪴 One survivor plant, against all odds',
  ]},
  { id: 'q25', question: "{{CREATOR}}'s sleep schedule?", options: [
    '🌙 Early to bed, early to rise',
    '🦉 Night owl, no shame',
    '📵 Inconsistent, depends on the day',
    '😴 Could sleep anywhere, anytime',
  ]},
  { id: 'q26', question: "How does {{CREATOR}} greet a close friend?", options: [
    '🤗 Big hug, no hesitation',
    '👊 Fist bump or handshake',
    '📣 Loud shout across the room',
    '🙂 Calm nod and a smile',
  ]},
  { id: 'q27', question: "{{CREATOR}}'s role when a friend needs advice?", options: [
    '💡 "Here\'s exactly what to do"',
    '❤️ "I\'m not sure, but I\'m here"',
    '🤔 "Let\'s think it through"',
    '🛋️ "Just sleep on it"',
  ]},
  { id: 'q28', question: "Group photo time — what does {{CREATOR}} do?", options: [
    '📸 Perfect pose, every time',
    '😜 Pulls a silly face on purpose',
    '🔁 Asks for a retake',
    '👀 Standing in the back, barely visible',
  ]},
  { id: 'q29', question: "{{CREATOR}}'s favourite kind of memory with friends?", options: [
    '🌌 Late-night talks that go nowhere',
    '🚗 A spontaneous road trip',
    '🎊 A big celebration',
    '🛋️ Just chilling, nothing special',
  ]},
  { id: 'q30', question: "How does {{CREATOR}} handle a group bill?", options: [
    '🧮 Calculates everyone\'s exact share',
    '🤝 "Let\'s just split it evenly"',
    '💳 Covers it, sorts it out later',
    '🚶 Conveniently steps away',
  ]},
  { id: 'q31', question: "What's {{CREATOR}} most likely doing at the end of a party?", options: [
    '🧹 Helping clean up',
    '💬 Still talking, lost track of time',
    '😴 Asleep on the couch',
    '👋 Already gone, left ages ago',
  ]},
  { id: 'q32', question: "First thing {{CREATOR}} does with new money?", options: [
    '🏦 Straight into savings',
    '🍽️ Treats themselves to food',
    '👟 Clothes or shoes',
    '📱 Gadgets and gear',
  ]},
  { id: 'q33', question: "{{CREATOR}}'s wallet situation right now?", options: [
    '💳 Organized, everything in place',
    '🪙 Empty, payday can\'t come soon',
    '🧾 Stuffed with receipts',
    '📱 Mostly digital, barely any cash',
  ]},
  { id: 'q34', question: "How does {{CREATOR}} react to a price hike on something they love?", options: [
    '💸 Pays it, no complaints',
    '😤 Complains, pays it anyway',
    '🔍 Finds a cheaper option fast',
    '🚫 Boycotts it... for a week',
  ]},
  { id: 'q35', question: "How many browser tabs does {{CREATOR}} have open right now?", options: [
    '📑 One, maybe two',
    '🗂️ A small army, 10-20',
    '🔥 So many the phone is lagging',
    '🤷 Doesn\'t even remember opening them',
  ]},
  { id: 'q36', question: "{{CREATOR}}'s phone home screen?", options: [
    '📁 Perfectly organized folders',
    '📦 One giant \'Apps\' folder',
    '🌪️ Apps everywhere, no order',
    '🧘 Minimal, just the essentials',
  ]},
  { id: 'q37', question: "What's {{CREATOR}}'s posting style on social media?", options: [
    '📸 Frequent, almost daily',
    '⭐ Rare, only big moments',
    '📍 Stories only, never the main feed',
    '👀 Lurks more than posts',
  ]},
  { id: 'q38', question: "{{CREATOR}}'s notification habits?", options: [
    '🔔 Clears every badge instantly',
    '📵 Hundreds unread, unbothered',
    '🤐 Most things on silent',
    '🤷 Replies whenever they feel like it',
  ]},
  { id: 'q39', question: "What does {{CREATOR}} send most in chats?", options: [
    '🤣 Memes, constantly',
    '🎙️ Voice notes, typing\'s too slow',
    '📝 Long thoughtful paragraphs',
    '😂 Just emojis and reactions',
  ]},
  { id: 'q40', question: "How long does {{CREATOR}} take to get ready?", options: [
    '⚡ Under 10 minutes',
    '⏳ A solid 30-45 minutes',
    '💅 An hour or more, it\'s an event',
    '🤷 Depends entirely on the mood',
  ]},
  { id: 'q41', question: "{{CREATOR}}'s most-worn item?", options: [
    '🧥 A hoodie, comfort first',
    '👟 Same sneakers, every day',
    '🧢 A cap, rarely seen without one',
    '🤷 Whatever\'s clean',
  ]},
  { id: 'q42', question: "If {{CREATOR}} wore one colour for a year, it'd be:", options: [
    '⚫ Black, goes with everything',
    '⚪ White, clean and fresh',
    '🌈 Something bold and bright',
    '🤷 Whatever they own the most of',
  ]},
  { id: 'q43', question: "{{CREATOR}}'s go-to when feeling under the weather?", options: [
    '🛏️ Sleeps it off completely',
    '🍲 Tea, soup, full rest mode',
    '💪 Pushes through regardless',
    '📱 Googles symptoms, assumes the worst',
  ]},
  { id: 'q44', question: "How does {{CREATOR}} handle drinking water?", options: [
    '🚰 Bottle always nearby',
    '🤷 Forgets until suddenly thirsty',
    '⏰ Sets reminders',
    '☕ Counts tea and coffee as water',
  ]},
  { id: 'q45', question: "{{CREATOR}}'s stress relief method?", options: [
    '🎵 Music, loud and clear',
    '🚶 A long walk alone',
    '💬 Venting to someone close',
    '😶 Bottles it up, deals later',
  ]},
  { id: 'q46', question: "How does {{CREATOR}} pack for a trip?", options: [
    '📋 A checklist, days in advance',
    '🎒 Night before, somehow fits',
    '😅 Packs way too much \'just in case\'',
    '😱 Last minute, forgets something',
  ]},
  { id: 'q47', question: "{{CREATOR}}'s ideal seat on a long flight?", options: [
    '🪟 Window, has to see outside',
    '🚪 Aisle, easy access',
    '😴 Doesn\'t matter, sleeps either way',
    '👯 Wherever the friends are sitting',
  ]},
  { id: 'q48', question: "If {{CREATOR}} got a free day with no plans:", options: [
    '🧭 Spontaneous outing, somewhere new',
    '😴 Catches up on sleep first',
    '✅ Tackles the to-do list',
    '🛋️ Spends it entirely on the couch',
  ]},
  { id: 'q49', question: "{{CREATOR}}'s travel style?", options: [
    '📅 Every hour planned out',
    '🌊 Goes with the flow completely',
    '🗺️ A loose plan, flexible',
    '🛏️ Mostly just wants to relax somewhere new',
  ]},
  { id: 'q50', question: "{{CREATOR}}'s ideal work or study environment?", options: [
    '🤫 Total silence, fully focused',
    '🎧 Music or a podcast playing',
    '☕ A busy café, productive chaos',
    '🛏️ In bed, laptop barely balanced',
  ]},
  { id: 'q51', question: "How does {{CREATOR}} handle criticism at work or school?", options: [
    '📝 Takes notes, improves fast',
    '😤 Defensive at first, comes around',
    '🤐 Nods, internally disagrees',
    '🙏 Genuinely welcomes it',
  ]},
  { id: 'q52', question: "If {{CREATOR}} woke up famous overnight, first move?", options: [
    '📞 Calls their closest friends',
    '📸 Posts about it immediately',
    '🧘 Stays quiet, processes it first',
    '🤷 Treats it like nothing changed',
  ]},
  { id: 'q53', question: "Which animal matches {{CREATOR}}'s energy?", options: [
    '🐶 A golden retriever, loyal and excitable',
    '🐱 A cat, independent, own agenda',
    '🦉 An owl, most alive at night',
    '🐝 A bee, always busy',
  ]},
  { id: 'q54', question: "If {{CREATOR}} got a pet tomorrow:", options: [
    '🐶 A dog, needs the companionship',
    '🐱 A cat, loving but low-key',
    '🐠 Fish or a plant, something chill',
    '🚫 Nothing, too much responsibility',
  ]},
  { id: 'q55', question: "{{CREATOR}}'s autobiography title would be:", options: [
    '⭐ "It Worked Out Eventually"',
    '🏃 "I\'ll Explain Later"',
    '🤷 "Just Going With It"',
    '💬 "Ask Me Anything, Seriously"',
  ]},
  { id: 'q56', question: "Which plot twist fits {{CREATOR}} best?", options: [
    '🧠 Secretly planned everything from the start',
    '😴 Was exhausted the whole time',
    '🤝 Already knew everyone in the room',
    '💭 Wasn\'t paying attention to any of it',
  ]},
  { id: 'q57', question: "If {{CREATOR}} had a talk show, the vibe would be:", options: [
    '🎊 High energy, chaos every episode',
    '🗣️ Deep one-on-one conversations',
    '😂 Comedy-focused, laughs over everything',
    '📚 Educational, actually teaches something',
  ]},
  { id: 'q58', question: "{{CREATOR}}'s 'main character' moment usually involves:", options: [
    '🎤 Singing way too confidently',
    '💃 An unplanned dance break',
    '🎬 A dramatic exit',
    '😎 Walking in slow motion, somehow',
  ]},
  { id: 'q59', question: "Stuck in an elevator — what does {{CREATOR}} do?", options: [
    '💬 Starts a conversation with everyone',
    '📱 Calmly waits, scrolls their phone',
    '😱 Mild internal panic, stays quiet',
    '😂 Makes a joke to ease the tension',
  ]},
  { id: 'q60', question: "{{CREATOR}}'s superpower of choice?", options: [
    '🕰️ Time travel',
    '🧠 Mind reading',
    '✈️ Flight',
    '👻 Invisibility',
  ]},
  { id: 'q61', question: "Small habit friends always notice about {{CREATOR}}?", options: [
    '🔒 Double-checks locks and switches',
    '⏰ Always a few minutes behind',
    '🗣️ Narrates what they\'re doing out loud',
    '🎵 Hums without noticing',
  ]},
  { id: 'q62', question: "How does {{CREATOR}} react to a long queue?", options: [
    '📱 Patient, scrolls through their phone',
    '💬 Strikes up chat with strangers',
    '😤 Visibly restless within minutes',
    '🧮 Calculates if it\'s worth the wait',
  ]},
  { id: 'q63', question: "{{CREATOR}}'s reaction to a jump-scare in a movie?", options: [
    '😱 Screams, no shame',
    '😐 Barely flinches',
    '🙈 Covers their eyes before it happens',
    '😂 Laughs it off immediately after',
  ]},
  { id: 'q64', question: "What does {{CREATOR}} do when they can't sleep?", options: [
    '📱 Scrolls the phone for hours',
    '📖 Reads until eyes get heavy',
    '🥛 Gets up for a snack',
    '🐑 Just lies there, overthinking',
  ]},
  { id: 'q65', question: "{{CREATOR}}'s go-to excuse for being late?", options: [
    '🚗 "Traffic was insane"',
    '⏰ "Lost track of time"',
    '😅 Honest — "I just woke up"',
    '🤷 Doesn\'t bother explaining',
  ]},
  { id: 'q66', question: "{{CREATOR}}'s movie night pick?", options: [
    '😂 Comedy, needs to laugh',
    '😱 Horror, loves the scare',
    '💕 Romance, every time',
    '💥 Action, nonstop explosions',
  ]},
  { id: 'q67', question: "How does {{CREATOR}} watch a series?", options: [
    '🍿 Binges the whole season in one sitting',
    '📅 One episode a night, disciplined',
    '⏸️ Starts strong, abandons halfway',
    '🔁 Rewatches old favourites instead',
  ]},
  { id: 'q68', question: "{{CREATOR}}'s karaoke song of choice?", options: [
    '🎤 A power ballad, full commitment',
    '😂 Something silly and fun',
    '🚫 Refuses to do karaoke',
    '🎶 Whatever\'s trending right now',
  ]},
  { id: 'q69', question: "What kind of music does {{CREATOR}} actually have on repeat?", options: [
    '🎧 Whatever\'s popular right now',
    '💭 Sad songs, surprisingly often',
    '🕺 High-energy, dance-ready tracks',
    '🎻 Something nobody expects',
  ]},
  { id: 'q70', question: "{{CREATOR}}'s reaction to spoilers?", options: [
    '😡 Unforgivable, blocks people over it',
    '😐 Doesn\'t really care',
    '🙈 Avoids the internet entirely until they watch it',
    '🤔 Secretly looks them up anyway',
  ]},
  { id: 'q71', question: "{{CREATOR}}'s seat choice in a classroom or meeting?", options: [
    '🙋 Front row, fully engaged',
    '👀 Middle, blends in',
    '🚪 Back row, near the exit',
    '🤷 Wherever\'s left when they arrive',
  ]},
  { id: 'q72', question: "How does {{CREATOR}} handle group projects?", options: [
    '📋 Takes charge, organizes everyone',
    '✅ Does their part, no fuss',
    '😩 Ends up doing everyone\'s part',
    '🙈 Contributes the bare minimum',
  ]},
  { id: 'q73', question: "{{CREATOR}}'s go-to icebreaker with new people?", options: [
    '😂 A joke, breaks the tension fast',
    '❓ Genuine questions about them',
    '🤝 Compliments something right away',
    '😶 Lets the other person lead',
  ]},
  { id: 'q74', question: "{{CREATOR}}'s biggest green flag in a partner?", options: [
    '👂 Actually listens',
    '😂 Makes them laugh constantly',
    '🎯 Has their own goals and drive',
    '🫶 Treats their friends well',
  ]},
  { id: 'q75', question: "How does {{CREATOR}} show they like someone?", options: [
    '💬 Texts constantly',
    '🎁 Small thoughtful gestures',
    '😬 Gets visibly awkward around them',
    '🙈 Pretends not to be interested at all',
  ]},
  { id: 'q76', question: "{{CREATOR}}'s idea of a perfect first date?", options: [
    '🍽️ A nice dinner, classic',
    '🎢 Something active and fun',
    '🛋️ Low-key, at home',
    '🚶 A long walk, just talking',
  ]},
  { id: 'q77', question: "{{CREATOR}}'s feelings about cooking?", options: [
    '👨‍🍳 Genuinely loves it',
    '📦 Survival mode only',
    '🛍️ Takeout is basically a hobby',
    '🎲 Hit or miss, depends on the day',
  ]},
  { id: 'q78', question: "What does {{CREATOR}} do with leftovers?", options: [
    '♻️ Eats them happily, zero waste',
    '🗑️ \'Forgets\' they exist in the fridge',
    '🍱 Reinvents them into something new',
    '🙅 Refuses to eat leftovers, ever',
  ]},
  { id: 'q79', question: "{{CREATOR}}'s drink order at a party?", options: [
    '🥤 Soda or juice, keeping it simple',
    '🍹 Something fun and colourful',
    '💧 Just water, staying sharp',
    '🤷 Whatever\'s already in their hand',
  ]},
  { id: 'q80', question: "Fast food cravings — {{CREATOR}}'s order?", options: [
    '🍔 Burger combo, no thinking required',
    '🍗 Fried chicken, every time',
    '🌮 Something with a wrap or tortilla',
    '🥗 Tries to order the \'healthy\' option',
  ]},
  { id: 'q81', question: "{{CREATOR}}'s default mood on a Monday morning?", options: [
    '☕ Surprisingly upbeat',
    '😩 Visibly suffering',
    '🤖 Functional, no emotion either way',
    '📅 Already planning the weekend',
  ]},
  { id: 'q82', question: "How competitive is {{CREATOR}} in games?", options: [
    '🏆 Extremely, hates losing',
    '😄 Plays for fun, doesn\'t mind losing',
    '🎯 Competitive only in certain games',
    '🙅 Avoids competitive games altogether',
  ]},
  { id: 'q83', question: "{{CREATOR}}'s reaction to unsolicited advice?", options: [
    '🙏 Appreciates it, takes it seriously',
    '😐 Nods, ignores it completely',
    '😤 Gets a little defensive',
    '🤔 Considers it, decides for themselves',
  ]},
  { id: 'q84', question: "What's {{CREATOR}} like when plans suddenly change?", options: [
    '🌊 Goes with it, no stress',
    '😤 Visibly thrown off',
    '📋 Immediately makes a new plan',
    '🤷 Honestly doesn\'t care either way',
  ]},
  { id: 'q85', question: "{{CREATOR}}'s comfort activity when stressed?", options: [
    '🎮 Gaming, zones out completely',
    '🍳 Cooking or baking something',
    '🚿 A long shower, alone time',
    '📺 Comfort show, watched a hundred times',
  ]},
  { id: 'q86', question: "{{CREATOR}} finds a wallet on the street — what happens?", options: [
    '🏃 Tries to track down the owner immediately',
    '🚓 Hands it to the nearest authority',
    '🤔 Checks for ID, then decides',
    '😅 Honestly might just keep walking',
  ]},
  { id: 'q87', question: "If {{CREATOR}} won the lottery tomorrow:", options: [
    '✈️ Books a trip immediately',
    '🏡 Buys property first',
    '🤐 Tells absolutely nobody',
    '🎁 Spends it mostly on people they love',
  ]},
  { id: 'q88', question: "{{CREATOR}}'s reaction to a power outage?", options: [
    '🕯️ Lights candles, makes it cozy',
    '📱 Panics about phone battery',
    '😴 Treats it as a free nap',
    '🔋 Already has a backup plan ready',
  ]},
  { id: 'q89', question: "How does {{CREATOR}} react to being put on the spot publicly?", options: [
    '😎 Thrives, loves the attention',
    '😳 Freezes completely',
    '😂 Deflects with a joke',
    '🙈 Quietly wishes the floor would open',
  ]},
  { id: 'q90', question: "{{CREATOR}}'s 'main character soundtrack' walking into a room?", options: [
    '🎵 Something upbeat and confident',
    '🎻 Dramatic, slow-motion energy',
    '😂 A comedy sound effect, honestly',
    '🤫 No soundtrack, just vibes',
  ]},
  { id: 'q91', question: "{{CREATOR}}'s 5-year plan, realistically?", options: [
    '📈 Clearly mapped out, on track',
    '🌊 Going with the flow, figuring it out',
    '🎯 One big specific goal in mind',
    '🤷 Hasn\'t really thought that far',
  ]},
  { id: 'q92', question: "If {{CREATOR}} could master any skill overnight:", options: [
    '🎸 A musical instrument',
    '🗣️ Speaking another language fluently',
    '🍳 Cooking like a professional chef',
    '💻 Coding or building things',
  ]},
  { id: 'q93', question: "{{CREATOR}}'s dream living situation?", options: [
    '🏙️ A busy city apartment',
    '🌳 A quiet house surrounded by nature',
    '🏖️ Somewhere by the beach',
    '🏠 Stays close to family, always',
  ]},
  { id: 'q94', question: "{{CREATOR}}'s favourite childhood snack?", options: [
    '🍭 Candy or sweets',
    '🍪 Homemade baked goods',
    '🥤 A specific drink, very specific',
    '🍿 Whatever was in the house',
  ]},
  { id: 'q95', question: "What was {{CREATOR}} like as a kid in class?", options: [
    '🙋 The one with their hand always up',
    '😴 Daydreaming out the window',
    '😂 The class clown',
    '📚 Quiet, but always prepared',
  ]},
  { id: 'q96', question: "{{CREATOR}}'s most-used childhood phrase?", options: [
    '"Are we there yet?"',
    '"That\'s not fair!"',
    '"Five more minutes"',
    '"I\'m not tired" (was very tired)',
  ]},
  { id: 'q97', question: "What cartoon or show defined {{CREATOR}}'s childhood?", options: [
    '📺 Something everyone watched',
    '🎮 Barely watched TV, was outside',
    '🔁 Rewatched the same one constantly',
    '🤷 Honestly can\'t remember',
  ]},
  { id: 'q98', question: "{{CREATOR}}'s holiday season energy?", options: [
    '🎄 Decorates everything, way too early',
    '🎁 Last-minute shopper, every year',
    '🛋️ Just wants the time off',
    '👨‍👩‍👧 All about the family gatherings',
  ]},
  { id: 'q99', question: "How does {{CREATOR}} celebrate their own birthday?", options: [
    '🎉 Big party, everyone invited',
    '🍽️ Quiet dinner, close friends only',
    '😴 Treats it like a normal day',
    '🎂 Plans it for weeks in advance',
  ]},
];



/* ── Random selection engine ── */
const TOTAL_QUESTIONS = 15;

/* ── Question card colors ──
   6 curated gradients (CSS classes defined in styles.css).
   Each question gets a random default color; the creator
   can tap a swatch to change it for that specific question.
   The chosen slug is saved with the quiz so the friend sees
   the same colors the creator picked. */
const QUESTION_COLORS = ['sunset', 'grape', 'ocean', 'mint', 'amber', 'midnight'];

function randomColorSlug() {
  return QUESTION_COLORS[Math.floor(Math.random() * QUESTION_COLORS.length)];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomQuestions(bank, count) {
  return shuffleArray(bank).slice(0, count);
}

/* ══════════════════════════════════════════════
   5. NAME INJECTION ENGINE
══════════════════════════════════════════════ */
function injectName(template, name) {
  if (!name || !template) return template || '';
  return template.replace(/\{\{CREATOR\}\}/g, escapeHTML(name));
}

function injectNameIntoQuestions(questions, creatorName) {
  return questions.map(q => ({
    ...q,
    question: injectName(q.question, creatorName),
    options:  q.options.map(opt => injectName(opt, creatorName)),
    color:    q.color || randomColorSlug(),
  }));
}

/* ══════════════════════════════════════════════
   6. TIER ENGINE
══════════════════════════════════════════════ */
function getTier(score, max) {
  if (!max || max === 0) return { label: '—', icon: '❓', sub: 'No questions answered', cls: 'tier-acquaintance' };
  const pct = score / max;
  if (pct >= 0.9) return {
    label: 'Certified Bestie', icon: '👑',
    sub:   'You know them inside out. Absolute legend.',
    cls:   'tier-certified',
  };
  if (pct >= 0.7) return {
    label: 'True Friend',      icon: '🤝',
    sub:   'You really pay attention. Solid friendship!',
    cls:   'tier-bestie',
  };
  if (pct >= 0.5) return {
    label: 'Close Buddy',      icon: '😊',
    sub:   'You know the highlights — keep getting closer.',
    cls:   'tier-close',
  };
  if (pct >= 0.3) return {
    label: 'Casual Friend',    icon: '🙂',
    sub:   `There's still a lot to discover about each other.`,
    cls:   'tier-acquaintance',
  };
  return {
    label: 'Just Getting Started', icon: '👋',
    sub:   `Time to hang out more — you've got this!`,
    cls:   'tier-acquaintance',
  };
}

/* ══════════════════════════════════════════════
   ① SCORE CARD IMAGE GENERATOR
   Renders a portrait (1080×1920, story-ratio) branded
   canvas card — logo, tier, circular score ring, link.
   Returns a Promise<canvas>. Used by openImageShareSheet.
══════════════════════════════════════════════ */

/* Load an image and resolve once it's ready (needed before drawImage) */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* Wrap text across multiple centered lines within maxWidth */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length;
}

async function generateScoreCard({ friendName, creatorName, score, max, tierLabel, tierIcon, quizLink }) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';

  const DISPLAY = '"Baloo 2", "Arial Rounded MT Bold", sans-serif';
  const BODY    = '"Plus Jakarta Sans", Arial, sans-serif';

  /* ── Background — full-bleed deep purple/pink gradient, no card-in-card ── */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#1a0533');
  bg.addColorStop(0.5, '#2d0a5e');
  bg.addColorStop(1,   '#0d1b4b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* Soft brand-colour glows for depth — kept subtle, no glass panel on top */
  const glowPink = ctx.createRadialGradient(W * 0.88, H * 0.04, 0, W * 0.88, H * 0.04, 480);
  glowPink.addColorStop(0, 'rgba(255,45,120,0.30)');
  glowPink.addColorStop(1, 'rgba(255,45,120,0)');
  ctx.fillStyle = glowPink;
  ctx.fillRect(0, 0, W, H);

  const glowPurple = ctx.createRadialGradient(W * 0.08, H * 0.98, 0, W * 0.08, H * 0.98, 520);
  glowPurple.addColorStop(0, 'rgba(168,85,247,0.28)');
  glowPurple.addColorStop(1, 'rgba(168,85,247,0)');
  ctx.fillStyle = glowPurple;
  ctx.fillRect(0, 0, W, H);

  /* ── Logo ── */
  let logoBottom = 210;
  try {
    const logo  = await loadImage('previews.png');
    const logoW = 230;
    const logoH = logoW * (logo.height / logo.width);
    ctx.drawImage(logo, (W - logoW) / 2, 96, logoW, logoH);
    logoBottom = 96 + logoH;
  } catch {
    ctx.font      = `800 52px ${DISPLAY}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Buddyz', W / 2, 170);
    logoBottom = 195;
  }

  /* Eyebrow label */
  ctx.font      = `700 26px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
  ctx.fillText('FRIENDSHIP QUIZ RESULT', W / 2, logoBottom + 56);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  /* ── Tier icon + label — generous spacing, no overlap with logo ── */
  const tierIconY  = logoBottom + 168;
  const tierLabelY = tierIconY + 96;

  ctx.font = '128px serif';
  ctx.fillText(tierIcon, W / 2, tierIconY);

  ctx.font      = `800 58px ${DISPLAY}`;
  ctx.fillStyle = '#FFFFFF';
  const tierLines = wrapText(ctx, tierLabel, W / 2, tierLabelY, W - 200, 66);

  /* ── Circular score ring — sits clearly below the tier text,
     spacing scales with how many lines the tier label wrapped to ── */
  const cy = tierLabelY + (tierLines > 1 ? 70 : 20) + 260;
  const cx = W / 2, r = 178, ringWidth = 24;
  const pct = max ? Math.max(0, Math.min(1, score / max)) : 0;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth   = ringWidth;
  ctx.stroke();

  const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrad.addColorStop(0, '#FF6FA3');
  ringGrad.addColorStop(1, '#C084FC');
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth   = ringWidth;
  ctx.lineCap     = 'round';
  ctx.stroke();
  ctx.lineCap     = 'butt';

  ctx.font      = `800 88px ${DISPLAY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${score}/${max}`, cx, cy + 18);

  ctx.font      = `700 24px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
  ctx.fillText('SCORE', cx, cy + 60);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  /* Result Summary */
  ctx.font      = `600 32px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`✅ ${score} Correct  |  ❌ ${max - score} Wrong`, cx, cy + 130);

  /* ── Names — clear gap below the ring ── */
  const namesY = cy + r + 110;
  ctx.font      = `600 38px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`${friendName} scored on`, W / 2, namesY);

  ctx.font      = `700 44px ${DISPLAY}`;
  ctx.fillStyle = '#FF9FC2';
  const nameLines = wrapText(ctx, `${creatorName}'s Buddyz Quiz`, W / 2, namesY + 60, W - 180, 54);

  /* ── CTA ── */
  const ctaY = namesY + 60 + (nameLines > 1 ? 54 : 0) + 88;
  ctx.font      = `700 40px ${DISPLAY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Think you can beat them? 👀', W / 2, ctaY);

  /* ── Link pill — flat, no border/glass treatment ── */
  const pillY = ctaY + 56;
  const pillW = W - 220, pillH = 72, pillX = (W - pillW) / 2;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, pillX, pillY, pillW, pillH, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.restore();

  ctx.font      = `600 28px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const displayLink = quizLink.replace(/^https?:\/\//, '');
  ctx.fillText(displayLink, W / 2, pillY + 46);

  /* ── Footer ── */
  ctx.font      = `700 24px ${DISPLAY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.fillText('buddyz.xyz', W / 2, H - 70);

  return canvas;
}

/* Helper: canvas roundRect polyfill for older browsers */
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  const [tl, tr, br, bl] = r;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/* ══════════════════════════════════════════════
   ①b SHARE-AS-IMAGE SHEET
   Shows a preview of the generated score card with
   two actions: "Share Image" (Web Share API with the
   image file — opens the OS share sheet so the user
   can send it to WhatsApp/Instagram/etc) and
   "Download" (saves the PNG directly).
══════════════════════════════════════════════ */
function openImageShareSheet(canvas, friendName, creatorName, quizLink) {
  const existing = document.getElementById('buddyz-image-sheet');
  if (existing) existing.remove();

  canvas.toBlob(blob => {
    if (!blob) { showToast('Could not generate image.', 'error'); return; }
    const url      = URL.createObjectURL(blob);
    const filename = `buddyz-score-${friendName.replace(/\s+/g, '-').toLowerCase()}.png`;

    const overlay = document.createElement('div');
    overlay.id        = 'buddyz-image-sheet';
    overlay.className = 'share-sheet-overlay';
    overlay.setAttribute('role',       'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Share your score card image');

    overlay.innerHTML = `
      <div class="share-sheet image-share-sheet" role="document">
        <div class="share-sheet-handle"></div>
        <p class="share-sheet-title">Your Score Card 🔥</p>
        <p class="share-sheet-sub">Share it as an image, or save it to your gallery.</p>

        <div class="score-card-preview">
          <img src="${url}" alt="Your Buddyz score card" />
        </div>

        <div class="image-share-actions">
          <button class="btn btn-primary" id="is-share">
            <i class="fa-solid fa-share-nodes"></i>&nbsp;Share Image
          </button>
          <button class="btn btn-outline" id="is-download">
            <i class="fa-solid fa-download"></i>&nbsp;Download
          </button>
        </div>

        <button class="btn btn-outline" id="is-close" style="max-width:100%; margin-top:0.5rem;">
          Close
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('share-sheet-visible'));

    overlay.querySelector('#is-download').addEventListener('click', () => {
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Image saved! 📲', 'success');
    });

    overlay.querySelector('#is-share').addEventListener('click', async () => {
      const file = new File([blob], filename, { type: 'image/png' });
      const shareText = `I scored on ${creatorName}'s Buddyz Quiz — can you beat me? 👀\n${quizLink}`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${friendName}'s Buddyz Score`,
            text:  shareText,
          });
        } catch (err) {
          if (err && err.name !== 'AbortError') {
            showToast('Could not open the share menu. Try Download instead.', 'error');
          }
        }
      } else if (navigator.share) {
        /* Browser supports sharing but not files — share link/text instead */
        navigator.share({
          title: `${friendName}'s Buddyz Score`,
          text:  shareText,
          url:   quizLink,
        }).catch(() => {});
        showToast("This browser can't share images directly — tap Download to save it.", '');
      } else {
        showToast("Sharing isn't supported here — tap Download to save the image.", '');
      }
    });

    const close = () => {
      overlay.style.transition = 'opacity 0.2s';
      overlay.style.opacity    = '0';
      setTimeout(() => { overlay.remove(); URL.revokeObjectURL(url); }, 200);
    };
    overlay.querySelector('#is-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const onKey = e => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
  }, 'image/png');
}

/* ══════════════════════════════════════════════
   ⓒ ANSWER DETAIL SHEET
   Lets the creator (User A) see exactly how a friend
   (User B) answered each question — correct/incorrect,
   their pick vs. the creator's actual answer. Opened via
   the small "eye" button next to a friend's name in the
   leaderboard. Doesn't touch the leaderboard's own layout.
══════════════════════════════════════════════ */
function openAnswerDetailSheet(response) {
  const existing = document.getElementById('buddyz-answer-sheet');
  if (existing) existing.remove();

  const details = response.details || [];
  const tier     = getTier(response.score, response.possiblePoints);

  const rowsHTML = details.map(d => `
    <div class="answer-detail-row ${d.isCorrect ? 'answer-correct' : 'answer-wrong'}">
      <div class="answer-detail-q">${escapeHTML(d.question)}</div>
      <div class="answer-detail-line">
        <span class="answer-detail-icon">${d.isCorrect ? '✅' : '❌'}</span>
        <span class="answer-detail-text">
          Picked: <strong>${escapeHTML(d.friendAnswer)}</strong>
          ${!d.isCorrect ? `<br><span class="answer-detail-correct">Correct: ${escapeHTML(d.correctAnswer)}</span>` : ''}
        </span>
      </div>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.id        = 'buddyz-answer-sheet';
  overlay.className = 'share-sheet-overlay';
  overlay.setAttribute('role',       'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${response.friendName}'s answers`);

  overlay.innerHTML = `
    <div class="share-sheet answer-detail-sheet" role="document">
      <div class="share-sheet-handle"></div>
      <p class="share-sheet-title">${escapeHTML(response.friendName)}'s Answers</p>
      <p class="share-sheet-sub">
        ${tier.icon} ${tier.label} · ${response.score}/${response.possiblePoints} correct
      </p>
      <div class="answer-detail-list">
        ${rowsHTML || '<p style="text-align:center; color:var(--text-muted); padding:1rem;">No answer breakdown available for this response.</p>'}
      </div>
      <button class="btn btn-primary" id="ad-share-img" style="max-width:100%; margin-top:1rem; gap:8px;">
        <i class="fa-solid fa-camera"></i> Share Result as Image
      </button>
      <button class="btn btn-outline" id="ad-close" style="max-width:100%; margin-top:0.75rem;">
        Close
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('share-sheet-visible'));

  const close = () => {
    overlay.style.transition = 'opacity 0.2s';
    overlay.style.opacity    = '0';
    setTimeout(() => overlay.remove(), 200);
  };
  overlay.querySelector('#ad-close').addEventListener('click', close);

  overlay.querySelector('#ad-share-img').addEventListener('click', async () => {
    const btn = overlay.querySelector('#ad-share-img');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';

    try {
      const quizID = window.friendQuizID || (new URLSearchParams(window.location.search).get('id'));
      const quizLink = `${window.location.origin}${window.location.pathname}?id=${quizID}`;

      // We need creatorName. In friend flow it's in a variable, but in dashboard it might be harder.
      // However, we can try to get it from the page or a global.
      // For now, let's assume we can find it.
      const creatorName = window.creatorName || 'Friend';

      const canvas = await generateScoreCard({
        friendName:  response.friendName,
        creatorName: creatorName,
        score:       response.score,
        max:         response.possiblePoints,
        tierLabel:   tier.label,
        tierIcon:    tier.icon,
        quizLink:    quizLink
      });
      openImageShareSheet(canvas, response.friendName, creatorName, quizLink);
    } catch (err) {
      console.error(err);
      showToast('Error generating image', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  const onKey = e => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

/* ══════════════════════════════════════════════
   7. SMART SHARE SHEET
   ③  When isFriend + score provided, the WA message
      includes the friend's score for competition.
══════════════════════════════════════════════ */
function openShareSheet(quizLink, creatorName, friendScore, friendMax) {
  const existing = document.getElementById('buddyz-share-sheet');
  if (existing) existing.remove();

  /* ③ Competitive message when a friend is sharing after scoring */
  let waText;
  if (typeof friendScore === 'number' && typeof friendMax === 'number') {
    waText =
      `I just scored ${friendScore}/${friendMax} on ${escapeHTML(creatorName)}'s Buddyz Quiz 🔥\n` +
      `Think you can beat me? 👀\n${quizLink}`;
  } else {
    waText =
      `👋 Hey! I made a Buddyz friendship quiz — can you answer these questions about me?\n` +
      `Let's see how well you know me! 🎯\n\n${quizLink}`;
  }
  const waMsg = encodeURIComponent(waText);

  const overlay = document.createElement('div');
  overlay.id        = 'buddyz-share-sheet';
  overlay.className = 'share-sheet-overlay';
  overlay.setAttribute('role',       'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Share your quiz');

  overlay.innerHTML = `
    <div class="share-sheet" role="document">
      <div class="share-sheet-handle"></div>
      <p class="share-sheet-title">
        ${typeof friendScore === 'number' ? 'Challenge Your Friends 🔥' : 'Share Your Quiz 🎉'}
      </p>
      <p class="share-sheet-sub">
        ${typeof friendScore === 'number'
          ? `You scored ${friendScore}/${friendMax} — dare your friends to beat it!`
          : `Challenge your friends — see who knows ${escapeHTML(creatorName)} best!`}
      </p>

      <div class="share-link-box" id="ss-link-box" title="Tap to copy" role="button" tabindex="0" aria-label="Copy quiz link">
        🔗 ${quizLink}
      </div>

      <div class="share-actions-grid">
        <button class="share-action-btn share-btn-whatsapp" id="ss-wa" aria-label="Share on WhatsApp">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp
        </button>
        <button class="share-action-btn share-btn-copy" id="ss-copy" aria-label="Copy link">
          <i class="fa-regular fa-copy"></i> Copy Link
        </button>
        <button class="share-action-btn share-btn-instagram" id="ss-ig" aria-label="Share on Instagram">
          <i class="fa-brands fa-instagram"></i> Instagram
        </button>
        <button class="share-action-btn share-btn-more" id="ss-more" aria-label="More sharing options">
          <i class="fa-solid fa-share-nodes"></i> More&nbsp;…
        </button>
      </div>

      <button class="btn btn-outline" id="ss-close" style="max-width:100%; margin-top:0.5rem;">
        Done
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  /* slight delay so slide-up animation kicks in */
  requestAnimationFrame(() => overlay.classList.add('share-sheet-visible'));

  function copyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(quizLink)
        .then(() => showToast('Link copied! Share it with your friends. 🎉', 'success'))
        .catch(fallbackCopy);
    } else { fallbackCopy(); }
  }
  function fallbackCopy() {
    const ta = Object.assign(document.createElement('textarea'), {
      value: quizLink, style: 'position:fixed;opacity:0;',
    });
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try   { document.execCommand('copy'); showToast('Link copied!', 'success'); }
    catch { showToast('Please copy the link manually.', 'error'); }
    ta.remove();
  }

  overlay.querySelector('#ss-link-box').addEventListener('click',  copyLink);
  overlay.querySelector('#ss-link-box').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') copyLink();
  });
  overlay.querySelector('#ss-copy').addEventListener('click', copyLink);

  overlay.querySelector('#ss-wa').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${waMsg}`, '_blank', 'noopener,noreferrer');
  });

  overlay.querySelector('#ss-ig').addEventListener('click', () => {
    copyLink();
    setTimeout(() => showToast('Now paste the link in your Instagram story or bio! 📸', ''), 800);
  });

  overlay.querySelector('#ss-more').addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({
        title: `${escapeHTML(creatorName)}'s Buddyz Quiz`,
        text:  waText,
        url:   quizLink,
      }).catch(() => {});
    } else { copyLink(); }
  });

  const close = () => {
    overlay.style.transition = 'opacity 0.2s';
    overlay.style.opacity    = '0';
    setTimeout(() => overlay.remove(), 200);
  };
  overlay.querySelector('#ss-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  const onKey = e => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

/* ══════════════════════════════════════════════
   8. REACTION FEED
══════════════════════════════════════════════ */
const REACTIONS = ['🔥', '😂', '💀', '🥹', '👑', '😭', '🤯', '💯'];

function buildReactionFeed(quizID, score, max, creatorName) {
  const feed = document.createElement('div');
  feed.className = 'reaction-feed';
  feed.innerHTML = `
    <div class="reaction-feed-title">Send a reaction to ${escapeHTML(creatorName)}</div>
    <div class="reaction-buttons" id="reaction-buttons">
      ${REACTIONS.map(r => `
        <button class="reaction-btn" data-emoji="${r}" aria-label="React with ${r}">
          ${r} <span class="reaction-count" id="rc-${encodeURIComponent(r)}">0</span>
        </button>
      `).join('')}
    </div>
    <div style="font-size:0.78rem; color:var(--text-light); text-align:center;">
      Your reaction will be visible to ${escapeHTML(creatorName)}
    </div>
  `;

  if (quizID) {
    database.ref(`quizzes/${quizID}/reactions`).once('value').then(snap => {
      const data = snap.val() || {};
      REACTIONS.forEach(r => {
        const el = feed.querySelector(`#rc-${encodeURIComponent(r)}`);
        if (el && data[encodeURIComponent(r)]) el.textContent = data[encodeURIComponent(r)];
      });
    }).catch(() => {});
  }

  feed.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      AudioEngine.reaction();

      const floater    = document.createElement('div');
      floater.className = 'floating-emoji';
      floater.textContent = emoji;
      const rect = btn.getBoundingClientRect();
      floater.style.left = `${rect.left + rect.width / 2 - 14}px`;
      floater.style.top  = `${rect.top}px`;
      document.body.appendChild(floater);
      setTimeout(() => floater.remove(), 1300);

      const countEl = feed.querySelector(`#rc-${encodeURIComponent(emoji)}`);
      if (countEl) countEl.textContent = parseInt(countEl.textContent || '0', 10) + 1;

      if (quizID) {
        database.ref(`quizzes/${quizID}/reactions/${encodeURIComponent(emoji)}`)
          .transaction(cur => (cur || 0) + 1)
          .catch(() => {});
      }

      btn.disabled = true;
      setTimeout(() => { btn.disabled = false; }, 1500);
    });
  });

  return feed;
}

/* ══════════════════════════════════════════════
   ④ EXPIRY BANNER
   Shows a countdown if the quiz has an expiresAt.
   Called inside the friend flow before questions start.
══════════════════════════════════════════════ */
function buildExpiryBanner(expiresAt) {
  if (!expiresAt) return null;
  const now       = Date.now();
  const remaining = expiresAt - now;
  if (remaining <= 0) return null;              /* already expired, handled elsewhere */

  const days    = Math.floor(remaining / 86400000);
  const hours   = Math.floor((remaining % 86400000) / 3600000);

  let label;
  if (days > 1)       label = `⏰ This quiz expires in ${days} days — take it now!`;
  else if (days === 1) label = `⏰ Only 1 day left on this quiz!`;
  else if (hours > 1) label = `⏰ Only ${hours} hours left — don't miss it!`;
  else                 label = `⏰ This quiz expires very soon!`;

  const banner = document.createElement('div');
  banner.className = 'expiry-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent = label;
  return banner;
}

/* ══════════════════════════════════════════════
   9. RESULT SCREEN (Tier + Leaderboard)
   ①  Score card PNG button added after tier card
   ②  Full-screen "Create Your Own" nudge before LB
   ③  Competitive WA share message with score
══════════════════════════════════════════════ */
function displayResultBoard(quizID, isFriend = false, friendScore = null, friendMax = null) {
  const container = document.getElementById('result-board-container');
  if (!container) return;

  container.style.display       = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems    = 'center';
  container.style.gap           = '12px';

  /* ── Friend: tier card + score card download button ── */
  if (isFriend && friendScore !== null && friendMax !== null) {
    const tier = getTier(friendScore, friendMax);
    const pct  = friendMax ? Math.round((friendScore / friendMax) * 100) : 0;

    const tierCard = document.createElement('div');
    tierCard.className = 'result-screen';
    tierCard.innerHTML = `
      <span class="result-tier-icon">${tier.icon}</span>
      <div class="result-tier-label">${tier.label}</div>
      <div class="result-tier-sub">${tier.sub}</div>
      <div class="result-score-circle" role="img" aria-label="${friendScore} out of ${friendMax}">
        <span class="result-score-num">${friendScore}</span>
        <span class="result-score-denom">/ ${friendMax}</span>
      </div>
      <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;">${pct}% correct</div>
    `;
    container.appendChild(tierCard);
    AudioEngine.success();

    /* ① Score card button — rendered after we know creatorName from Firebase */
    /* We attach a data attribute and wire it up inside the Firebase fetch below */
    tierCard.dataset.friendScore = friendScore;
    tierCard.dataset.friendMax   = friendMax;
    tierCard.dataset.tierLabel   = tier.label;
    tierCard.dataset.tierIcon    = tier.icon;
  }

  /* ─────────────────────────────────────
     Leaderboard card (skeleton while loading)
  ───────────────────────────────────── */
  const lbCard   = document.createElement('div');
  lbCard.className = 'quiz-history-card';
  lbCard.style.cssText = 'width:95%; max-width:450px;';

  const lbHeader = document.createElement('div');
  lbHeader.className = 'quiz-history-header';
  lbHeader.innerHTML = `
    <div>
      <div class="quiz-history-name">Leaderboard</div>
      <div class="quiz-history-meta" id="lb-meta">Loading results…</div>
    </div>
  `;
  lbCard.appendChild(lbHeader);

  const lbBody = document.createElement('div');
  lbBody.innerHTML = `
    <div style="padding:1.25rem; text-align:center;">
      <div class="skeleton" style="height:16px; width:60%; margin:0 auto 10px;"></div>
      <div class="skeleton" style="height:16px; width:80%; margin:0 auto 10px;"></div>
      <div class="skeleton" style="height:16px; width:70%; margin:0 auto;"></div>
    </div>
  `;
  lbCard.appendChild(lbBody);
  container.appendChild(lbCard);

  /* ─────────────────────────────────────
     Firebase fetch
  ───────────────────────────────────── */
  database.ref(`quizzes/${quizID}`).once('value').then(snap => {
    const quizData = snap.val();
    if (!quizData) return;

    const maxScore  = quizData.maxScore || TOTAL_QUESTIONS;
    const responses = quizData.responses ? Object.entries(quizData.responses) : [];
    const isCreator = !window.friendQuizID;
    const quizLink  = `${window.location.origin}${window.location.pathname}?id=${quizID}`;

    /* Fill leaderboard meta */
    const meta = lbCard.querySelector('#lb-meta');
    if (meta) meta.textContent = `${responses.length} response${responses.length !== 1 ? 's' : ''}`;

    const sorted = responses.sort(([, a], [, b]) =>
      b.score !== a.score ? b.score - a.score : a.timestamp - b.timestamp
    );

    if (sorted.length === 0) {
      lbBody.innerHTML = `
        <div style="padding:1.5rem; text-align:center; font-size:0.88rem; color:var(--text-muted);">
          Nobody has taken this quiz yet.<br>Share it and see who knows you best! 🎯
        </div>
      `;
    } else {
      const rowsHTML = sorted.map(([key, r], i) => {
        const rank    = i + 1;
        const denom   = r.possiblePoints !== undefined ? r.possiblePoints : maxScore;
        const pct     = denom ? Math.round((r.score / denom) * 100) : 0;
        const tier    = getTier(r.score, denom);
        const rankCls  = rank <= 3 ? ` rank-row-${rank}` : '';
        const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const deleteBtn = isCreator ? `
          <td style="text-align:right; padding-right:0.75rem;">
            <button class="delete-btn del-resp-btn"
              data-qid="${quizID}" data-key="${key}"
              title="Remove result" aria-label="Remove result for ${escapeHTML(r.friendName)}">
              <i class="fa-regular fa-circle-xmark"></i>
            </button>
          </td>
        ` : '<td></td>';

        const viewBtn = r.details ? `
          <button class="view-answers-btn" data-key="${key}"
            title="View ${escapeHTML(r.friendName)}'s answers"
            aria-label="View ${escapeHTML(r.friendName)}'s answers">
            <i class="fa-solid fa-eye"></i>
          </button>
        ` : '';

        return `
          <tr class="${rankCls}">
            <td class="rank-cell ${rank <= 3 ? 'rank-' + rank : ''}">${rankIcon}</td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div style="font-weight:600; font-size:0.88rem;">${escapeHTML(r.friendName)}</div>
                ${viewBtn}
              </div>
              <span class="tier-badge ${tier.cls}">${tier.icon} ${tier.label}</span>
            </td>
            <td>
              <div class="score-bar-wrap">
                <div class="score-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                  <div class="score-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="score-text">${r.score}/${denom}</span>
              </div>
            </td>
            ${deleteBtn}
          </tr>
        `;
      }).join('');

      lbBody.innerHTML = `
        <div class="result-table-container" style="border-top:1px solid var(--border);">
          <table class="leaderboard-table" aria-label="Quiz leaderboard">
            <thead>
              <tr><th>#</th><th>Friend</th><th>Score</th><th></th></tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      `;

      lbBody.querySelectorAll('.view-answers-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const entry = sorted.find(([key]) => key === btn.dataset.key);
          if (entry) openAnswerDetailSheet(entry[1]);
        });
      });

      lbBody.querySelectorAll('.del-resp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!confirm('Remove this result permanently?')) return;
          btn.disabled = true;
          database.ref(`quizzes/${btn.dataset.qid}/responses/${btn.dataset.key}`).remove()
            .then(() => {
              const row = btn.closest('tr');
              if (row) {
                row.style.opacity    = '0';
                row.style.transition = 'opacity 0.25s';
                setTimeout(() => row.remove(), 250);
              }
              showToast('Result removed.', '');
            })
            .catch(() => { showToast('Error removing result.', 'error'); btn.disabled = false; });
        });
      });
    }

    /* ── Creator share button ── */
    if (isCreator) {
      const shareRow = document.createElement('div');
      shareRow.style.cssText = 'padding:1rem 1.25rem; display:flex; gap:10px; border-top:1px solid var(--border);';
      shareRow.innerHTML = `
        <button class="btn btn-primary" id="lb-share-btn"
          style="max-width:none; flex:1; padding:0.85rem 1rem; font-size:0.9rem;">
          <i class="fa-solid fa-share-nodes"></i>&nbsp;Challenge More Friends
        </button>
      `;
      lbCard.appendChild(shareRow);
      shareRow.querySelector('#lb-share-btn').addEventListener('click', () => {
        openShareSheet(quizLink, quizData.name);
      });
    }

    /* ────────────────────────────────────────────────────
       FRIEND-ONLY SECTION
       Order: ① Score card button → ② CTA nudge → ③ Reactions
    ──────────────────────────────────────────────────── */
    if (isFriend) {
      /* ①  Wire score card button now that we have creatorName */
      const tierCard = container.querySelector('.result-screen');
      if (tierCard) {
        const fs = parseInt(tierCard.dataset.friendScore, 10);
        const fm = parseInt(tierCard.dataset.friendMax,   10);
        const tl = tierCard.dataset.tierLabel;
        const ti = tierCard.dataset.tierIcon;

        const scoreCardBtn = document.createElement('button');
        scoreCardBtn.className   = 'btn btn-outline scorecard-btn';
        scoreCardBtn.style.cssText =
          'margin-top:0.5rem; gap:8px; display:flex; align-items:center; justify-content:center;';
        scoreCardBtn.innerHTML =
          '<i class="fa-solid fa-camera"></i>&nbsp;Share as Image';
        tierCard.appendChild(scoreCardBtn);

        scoreCardBtn.addEventListener('click', async () => {
          const original = scoreCardBtn.innerHTML;
          scoreCardBtn.disabled = true;
          scoreCardBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>&nbsp;Generating…';
          try {
            const canvas = await generateScoreCard({
              friendName:  window.friendName || 'Friend',
              creatorName: quizData.name || 'Creator',
              score:       fs,
              max:         fm,
              tierLabel:   tl,
              tierIcon:    ti,
              quizLink,
            });
            openImageShareSheet(canvas, window.friendName || 'Friend', quizData.name || 'Creator', quizLink);
          } catch (err) {
            console.error('Buddyz: score card generation failed', err);
            showToast('Could not generate the image. Please try again.', 'error');
          } finally {
            scoreCardBtn.disabled = false;
            scoreCardBtn.innerHTML = original;
          }
        });

        /* Also add competitive share button on tier card */
        const compShareBtn = document.createElement('button');
        compShareBtn.className = 'btn btn-primary scorecard-share-btn';
        compShareBtn.style.cssText = 'margin-top:0.5rem;';
        compShareBtn.innerHTML =
          '<i class="fa-brands fa-whatsapp"></i>&nbsp;Challenge Your Friends';
        tierCard.appendChild(compShareBtn);
        compShareBtn.addEventListener('click', () => {
          openShareSheet(quizLink, quizData.name, fs, fm);
        });
      }

      /* ② "Create Your Own" full-screen conversion nudge */
      const nudgeCard = document.createElement('div');
      nudgeCard.className = 'create-nudge-card';
      nudgeCard.innerHTML = `
        <div class="nudge-emoji">🎯</div>
        <h3 class="nudge-headline">
          ${escapeHTML(quizData.name)} just found out who their real friends are.
        </h3>
        <p class="nudge-sub">Now it's YOUR turn.</p>
        <a href="index.html" class="btn btn-primary nudge-cta" style="text-decoration:none;">
          Create My Quiz — It's Free ✏️
        </a>
      `;
      /* Insert BEFORE the leaderboard card */
      container.insertBefore(nudgeCard, lbCard);

      /* ③ Reaction feed */
      const reactionFeed    = buildReactionFeed(quizID, friendScore, maxScore, quizData.name);
      reactionFeed.style.cssText = 'width:95%; max-width:450px;';
      container.appendChild(reactionFeed);

      /* Back-to-home button */
      const homeBtn = document.createElement('div');
      homeBtn.style.cssText = 'width:95%; max-width:450px; display:flex; flex-direction:column; align-items:center; gap:10px;';
      homeBtn.innerHTML = `
        <a href="index.html" class="btn btn-outline" style="text-decoration:none;">
          Back to Home
        </a>
      `;
      container.appendChild(homeBtn);
    }

  }).catch(err => {
    console.error('Buddyz: error loading result board', err);
    lbBody.innerHTML = `
      <div style="padding:1.25rem; color:var(--text-muted); font-size:0.88rem; text-align:center;">
        Couldn't load results. Check your connection.
      </div>
    `;
  });
}

/* ══════════════════════════════════════════════
   10. KEYBOARD NAVIGATION
══════════════════════════════════════════════ */
document.addEventListener('keydown', (event) => {
  const quizContainer = document.getElementById('quiz-container');
  if (!quizContainer || quizContainer.style.display === 'none') return;

  const key = event.key.toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(key)) {
    const idx     = key.charCodeAt(0) - 65;
    const options = document.querySelectorAll('.quiz-option');
    if (options[idx]) {
      event.preventDefault();
      options.forEach(el => el.classList.remove('selected'));
      options[idx].classList.add('selected');
      AudioEngine.select();
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const nextBtn   = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    if (nextBtn   && nextBtn.style.display   !== 'none') nextBtn.click();
    else if (submitBtn && submitBtn.style.display !== 'none') submitBtn.click();
  }
});

/* ══════════════════════════════════════════════
   ⑤  LIVE GLOBAL QUIZ COUNTER
   Reads meta/totalQuizzes from Firebase and
   updates the stat chip in the hero section.
   Safe no-op when the stat chip isn't on the page.
══════════════════════════════════════════════ */
function initLiveQuizCounter() {
  const counterEl = document.getElementById('stat-quizzes-count');
  if (!counterEl || typeof database === 'undefined') return;

  database.ref('meta/totalQuizzes').on('value', snap => {
    const val = snap.val();
    if (val && typeof val === 'number') {
      /* Animate count up from 0 */
      const target   = val;
      const duration = 1000;
      const start    = performance.now();
      const current  = parseInt(counterEl.textContent.replace(/,/g, ''), 10) || 0;

      function tick(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3); /* ease-out cubic */
        const display  = Math.round(current + (target - current) * eased);
        counterEl.textContent = display.toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }, () => { /* ignore read errors silently */ });
}

/* ══════════════════════════════════════════════
   ⑥  PWA SERVICE WORKER + PUSH SUBSCRIPTIONS
   Registers sw.js at site root, subscribes the
   browser to Web Push, and stores the subscription
   under /pushSubscriptions/{quizId} for every quiz
   the visitor has created — this is what the
   Cloud Function (functions/index.js) reads from
   to send "X just scored on your quiz!" pushes.
══════════════════════════════════════════════ */

/* Public VAPID key (matches the private key configured on
   the Cloud Function via `firebase functions:config:set`). */
const VAPID_PUBLIC_KEY = 'BOATWaAmUMYfaVgywIcMxF3U6WgluDumUKYEnObJv-s4bDuApCjc57OmwkKAy37Irza6pSZKtkp4oYntBxANFrM';

/* Convert a URL-safe base64 VAPID key into the Uint8Array
   format required by pushManager.subscribe(). */
function urlBase64ToUint8Array(base64String) {
  const padding      = '='.repeat((4 - base64String.length % 4) % 4);
  const base64       = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData      = window.atob(base64);
  const outputArray  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/* Read the map of quiz IDs this browser has created. */
function getCreatedQuizIDs() {
  try {
    const c = JSON.parse(localStorage.getItem('createdQuizzes')) || {};
    return Object.keys(c);
  } catch { return []; }
}

/* Get an existing PushSubscription, or create a new one. */
async function getOrCreatePushSubscription(swReg) {
  let subscription = await swReg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  return subscription;
}

/* Write a subscription JSON blob to /pushSubscriptions/{quizId}
   for every quiz ID supplied. Failures on individual writes are
   swallowed (best-effort) so one bad quizId doesn't block the rest. */
function savePushSubscriptionForQuizzes(subscriptionJSON, quizIDs) {
  if (!quizIDs || quizIDs.length === 0) return Promise.resolve();
  const writes = quizIDs.map(quizID =>
    database.ref(`pushSubscriptions/${quizID}`)
      .set({ ...subscriptionJSON, updatedAt: Date.now() })
      .catch(err => console.warn('[Buddyz PWA] Could not save subscription for', quizID, err))
  );
  return Promise.all(writes);
}

/* Full subscribe-and-persist flow. Returns true on success. */
async function registerPushSubscription(swReg) {
  try {
    const subscription = await getOrCreatePushSubscription(swReg);
    const subscriptionJSON = subscription.toJSON();

    /* Cache locally so future page loads / new quizzes can re-sync
       without re-prompting the browser. */
    localStorage.setItem('pushSubscription', JSON.stringify(subscriptionJSON));

    const quizIDs = getCreatedQuizIDs();
    await savePushSubscriptionForQuizzes(subscriptionJSON, quizIDs);
    return true;
  } catch (err) {
    console.warn('[Buddyz PWA] Push subscription failed:', err);
    return false;
  }
}

/* Called right after a new quiz is created. If the visitor already
   granted notification permission, silently attach the existing
   push subscription to the freshly-created quiz so the creator
   gets notified for it too — no extra prompt needed. */
async function syncPushForNewQuiz(quizID) {
  if (Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;
  try {
    const swReg = await navigator.serviceWorker.ready;
    const subscription = await getOrCreatePushSubscription(swReg);
    await savePushSubscriptionForQuizzes(subscription.toJSON(), [quizID]);
  } catch (err) {
    console.warn('[Buddyz PWA] Could not sync push for new quiz:', err);
  }
}

function initPWA() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('[Buddyz PWA] Service worker registered:', reg.scope);

    /* Only manage push permission on index.html for creators */
    const isIndexPage = window.location.pathname.endsWith('index.html') ||
                        window.location.pathname.endsWith('/');
    if (!isIndexPage) return;

    const createdQuizIDs = getCreatedQuizIDs();
    if (createdQuizIDs.length === 0) return; /* not a creator yet */

    if (Notification.permission === 'granted') {
      /* Already granted in a previous session — make sure every
         created quiz (including any made before permission was
         granted) has the subscription attached. */
      registerPushSubscription(reg);
      return;
    }

    /* Only prompt if not already granted/denied */
    if (Notification.permission === 'default' && !localStorage.getItem('pushNudgeDismissed')) {
      /* Defer push prompt so it doesn't fire on page load */
      setTimeout(() => {
        showPushNudge(reg);
      }, 8000);
    }
  }).catch(err => {
    console.warn('[Buddyz PWA] Service worker registration failed:', err);
  });
}

/* Subtle push permission nudge bar */
function showPushNudge(swReg) {
  if (document.getElementById('push-nudge')) return;
  const bar = document.createElement('div');
  bar.id        = 'push-nudge';
  bar.className = 'push-nudge-bar';
  bar.setAttribute('role', 'complementary');
  bar.innerHTML = `
    <span class="push-nudge-text">
      🔔 Get notified when friends take your quiz
    </span>
    <div class="push-nudge-actions">
      <button id="push-allow-btn" class="btn-ghost push-allow">Allow</button>
      <button id="push-dismiss-btn" class="push-dismiss" aria-label="Dismiss">✕</button>
    </div>
  `;
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.classList.add('push-nudge-visible'));

  bar.querySelector('#push-dismiss-btn').addEventListener('click', () => {
    bar.classList.remove('push-nudge-visible');
    setTimeout(() => bar.remove(), 300);
    localStorage.setItem('pushNudgeDismissed', '1');
  });

  bar.querySelector('#push-allow-btn').addEventListener('click', async () => {
    const allowBtn = bar.querySelector('#push-allow-btn');
    allowBtn.textContent = 'Enabling…';
    allowBtn.disabled = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const ok = await registerPushSubscription(swReg);
        if (ok) {
          showToast('🔔 Notifications enabled! We\'ll ping you when friends play.', 'success');
        } else {
          showToast('Notifications enabled, but we couldn\'t finish setup. Try reloading the page.', 'error');
        }
      } else {
        showToast('Notifications blocked — you can enable them in browser settings.', '');
      }
    } catch (err) {
      console.warn('[Buddyz PWA] Push permission/subscription error:', err);
      showToast('Could not enable notifications. Please try again.', 'error');
    } finally {
      bar.classList.remove('push-nudge-visible');
      setTimeout(() => bar.remove(), 300);
    }
  });
}

/* ══════════════════════════════════════════════
   11. MAIN QUIZ LOGIC
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Element references ── */
  const startBtn            = document.getElementById('start-quiz');
  const quizContainer       = document.getElementById('quiz-container');
  const nameContainer       = document.getElementById('name-container');
  const shareContainer      = document.getElementById('share-container');
  const friendNameContainer = document.getElementById('friend-name-container');
  const nextBtn             = document.getElementById('next-btn');
  const submitBtn           = document.getElementById('submit-btn');
  const quizLinkInput       = document.getElementById('quiz-link');

  /* ── State ── */
  let quizQuestions = [];
  let userAnswers   = [];
  let currentIndex  = 0;
  let creatorName   = '';

  /* ── Progress bar ── */
  function updateProgress(current, total) {
    const bar     = document.getElementById('quiz-progress-fill');
    const counter = document.getElementById('quiz-counter');
    if (bar)     bar.style.width = `${Math.round((current / total) * 100)}%`;
    if (counter) counter.textContent = `${current} / ${total}`;
  }

  /* ── Get selected answer ── */
  function getSelectedAnswer() {
    const sel = document.querySelector('.quiz-option.selected');
    return sel ? sel.dataset.value : null;
  }

  /* ── Render question ── */
  function renderQuestion(questions, index, total) {
    const q          = questions[index];
    const qContainer = document.getElementById('question-container');
    if (!qContainer || !q) return;

    const colorSlug = q.color || randomColorSlug();
    q.color = colorSlug; /* persist so re-renders (Next/Back) keep the same color */

    const hints = ['A', 'B', 'C', 'D'];
    qContainer.innerHTML = `
      <div class="question-card qcolor-${colorSlug}" id="question-card">
        <div class="qcolor-picker" role="group" aria-label="Choose a color for this question">
          ${QUESTION_COLORS.map(c => `
            <button type="button"
              class="qcolor-swatch qcolor-${c}${c === colorSlug ? ' qcolor-active' : ''}"
              data-color="${c}"
              aria-label="${c} color"
              aria-pressed="${c === colorSlug}">
            </button>
          `).join('')}
        </div>
        <button class="btn-edit-question" id="edit-question-btn" aria-label="Edit this question" title="Edit question or options">
          ✏️ Edit
        </button>
        <h3>${injectName(q.question, creatorName)}</h3>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `
            <div class="quiz-option" data-value="${escapeHTML(opt)}" role="radio" aria-checked="false" tabindex="0">
              <span class="keyboard-hint" aria-hidden="true">${hints[i]}</span>
              <span class="option-label">${escapeHTML(injectName(opt, creatorName))}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const card = qContainer.querySelector('#question-card');

    /* Color picker — creator-only feature, changes this question's card color */
    qContainer.querySelectorAll('.qcolor-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const newColor = swatch.dataset.color;
        q.color = newColor;
        card.className = `question-card qcolor-${newColor}`;
        qContainer.querySelectorAll('.qcolor-swatch').forEach(s => {
          s.classList.toggle('qcolor-active', s.dataset.color === newColor);
          s.setAttribute('aria-pressed', s.dataset.color === newColor ? 'true' : 'false');
        });
        AudioEngine.select();
      });
    });

    /* Edit button — toggles inline edit mode directly on the card */
    const editBtn = qContainer.querySelector('#edit-question-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        enterInlineEditMode(q, creatorName, qContainer, () => {
          renderQuestion(questions, index, total);
        });
      });
    }

    qContainer.querySelectorAll('.quiz-option').forEach(el => {
      el.addEventListener('click', () => {
        qContainer.querySelectorAll('.quiz-option').forEach(o => {
          o.classList.remove('selected');
          o.setAttribute('aria-checked', 'false');
        });
        el.classList.add('selected');
        el.setAttribute('aria-checked', 'true');
        AudioEngine.select();
      });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
      });
    });

    updateProgress(index + 1, total);
    const isLast = index >= total - 1;
    if (nextBtn)   nextBtn.style.display   = isLast ? 'none'  : 'block';
    if (submitBtn) {
      submitBtn.style.display = isLast ? 'block' : 'none';
      if (!window.friendQuizID && isLast) submitBtn.textContent = 'Create My Quiz ✨';
    }

    /* Inject or update Skip button (creator only — not in friend flow) */
    const actionRow = document.getElementById('quiz-action-row');
    let skipBtn = document.getElementById('skip-btn');
    if (actionRow && !window.friendQuizID) {
      if (!skipBtn) {
        skipBtn = document.createElement('button');
        skipBtn.id        = 'skip-btn';
        skipBtn.className = 'btn-skip';
        skipBtn.innerHTML = 'Skip →';
        skipBtn.setAttribute('aria-label', 'Skip this question');
        actionRow.appendChild(skipBtn);
        skipBtn.addEventListener('click', handleSkip);
      }
      /* Hide skip on last question — they must answer or Submit */
      skipBtn.style.display = isLast ? 'none' : 'inline-flex';
    }
  }

  /* ── Handle Skip (creator only) ── */
  function handleSkip() {
    if (window.friendQuizID) return;
    /* Select first option and move on so the question auto completes */
    const firstOption = quizQuestions[currentIndex].options[0];
    userAnswers.push({
      question: quizQuestions[currentIndex].question,
      answer:   firstOption,
      color:    quizQuestions[currentIndex].color,
    });
    currentIndex++;
    AudioEngine.advance();
    renderQuestion(quizQuestions, currentIndex, TOTAL_QUESTIONS);
    showToast('Question skipped — auto-selected first option 👍', '');
  }

  /* ── Inline Edit Mode (creator only) ──
     Replaces the display content of the card with input fields
     so the creator can edit the question text and options
     directly "right in the quiz". */
  function enterInlineEditMode(q, name, qContainer, onSave) {
    const card = qContainer.querySelector('#question-card');
    if (!card) return;

    const letters = ['A', 'B', 'C', 'D'];
    /* Strip the {{CREATOR}} replacement for editing */
    const rawQuestion = q.question.replace(new RegExp(escapeHTML(name), 'g'), '{{CREATOR}}');

    card.innerHTML = `
      <div class="edit-modal-title" style="color:#fff; margin-bottom:1rem;">✏️ Edit Mode</div>

      <div class="edit-field-group">
        <label class="edit-field-label" style="color:rgba(255,255,255,0.8);">Question</label>
        <textarea
          class="edit-textarea"
          id="inline-edit-q"
          rows="3"
          maxlength="200"
          style="background:rgba(255,255,255,0.9); border:none;"
        >${escapeHTML(rawQuestion)}</textarea>
      </div>

      <div class="edit-field-group">
        <label class="edit-field-label" style="color:rgba(255,255,255,0.8);">Options</label>
        ${q.options.map((opt, i) => `
          <div class="edit-option-row">
            <span class="edit-option-letter">${letters[i]}</span>
            <input
              type="text"
              class="edit-option-input"
              id="inline-edit-opt-${i}"
              value="${escapeHTML(opt)}"
              maxlength="120"
              style="background:rgba(255,255,255,0.9); border:none;"
            />
          </div>
        `).join('')}
      </div>

      <div class="edit-modal-actions">
        <button class="btn btn-outline" id="inline-edit-cancel" style="background:rgba(255,255,255,0.2); border-color:rgba(255,255,255,0.4); color:#fff;">Cancel</button>
        <button class="btn btn-primary" id="inline-edit-save" style="background:#fff; color:var(--text-primary); box-shadow:none;">Save Changes</button>
      </div>
    `;

    const ta = card.querySelector('#inline-edit-q');
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    card.querySelector('#inline-edit-cancel').addEventListener('click', () => {
      onSave(); /* Just re-renders to exit edit mode */
    });

    card.querySelector('#inline-edit-save').addEventListener('click', () => {
      const newQ = ta.value.trim();
      if (!newQ) { showToast('Question can\'t be empty.', 'error'); return; }

      const newOpts = [0, 1, 2, 3].map(i => card.querySelector(`#inline-edit-opt-${i}`).value.trim());
      if (newOpts.some(o => !o)) { showToast('All options required.', 'error'); return; }

      q.question = newQ;
      q.options  = newOpts;
      AudioEngine.success();
      showToast('Updated ✅', 'success');
      onSave();
    });
  }

  /* ─────────────────────────────────────
     CREATOR FLOW
  ───────────────────────────────────── */
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('user-name');
      creatorName = nameInput ? nameInput.value.trim() : '';
      if (!creatorName) {
        AudioEngine.error();
        showToast('Please enter your name to start.', 'error');
        if (nameInput) nameInput.focus();
        return;
      }

      quizQuestions = pickRandomQuestions(BASE_QUESTIONS, TOTAL_QUESTIONS);
      quizQuestions = injectNameIntoQuestions(quizQuestions, creatorName);
      userAnswers   = [];
      currentIndex  = 0;

      if (nameContainer) nameContainer.style.display = 'none';
      if (quizContainer) {
        quizContainer.style.display = 'flex';
        const heading = quizContainer.querySelector('.quiz-heading');
        if (heading) heading.textContent = 'Answer These Questions';
        quizContainer.scrollIntoView({ behavior: 'smooth' });
      }

      renderQuestion(quizQuestions, currentIndex, TOTAL_QUESTIONS);
    });
  }

  /* Next button (creator) */
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (window.friendQuizID) return;

      const answer = getSelectedAnswer();
      if (!answer) {
        AudioEngine.error();
        showToast('Pick an answer before moving on.', 'error');
        return;
      }

      userAnswers.push({
        question: quizQuestions[currentIndex].question,
        answer,
        color:    quizQuestions[currentIndex].color,
      });
      currentIndex++;
      AudioEngine.advance();
      renderQuestion(quizQuestions, currentIndex, TOTAL_QUESTIONS);
    });
  }

  /* Submit button — CREATOR only */
  if (submitBtn && !window.location.search.includes('id=')) {
    submitBtn.addEventListener('click', () => {
      const answer = getSelectedAnswer();
      if (!answer) {
        AudioEngine.error();
        showToast('Pick an answer to submit.', 'error');
        return;
      }
      userAnswers.push({
        question: quizQuestions[currentIndex].question,
        answer,
        color:    quizQuestions[currentIndex].color,
      });

      const creatorQuizID = generateQuizID();

      /* ④  Include expiresAt: 7 days from now. */
      const payload = {
        name:      creatorName,
        answers:   userAnswers,
        maxScore:  userAnswers.length,
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      };

      submitBtn.disabled    = true;
      submitBtn.textContent = 'Saving…';

      database.ref('quizzes/' + creatorQuizID).set(payload)
        .then(() => {
          saveCreatedQuiz(creatorQuizID);

          /* ⑤  Increment global counter */
          database.ref('meta/totalQuizzes').transaction(cur => (cur || 0) + 1).catch(() => {});

          /* ⑥  If push was already granted in a previous session,
                 attach the existing subscription to this new quiz too */
          syncPushForNewQuiz(creatorQuizID);

          /* Hide skip button when quiz is done */
          const sb = document.getElementById('skip-btn');
          if (sb) sb.style.display = 'none';

          const link = `${window.location.origin}${window.location.pathname}?id=${creatorQuizID}`;
          if (quizLinkInput) quizLinkInput.value = link;
          if (quizContainer)  quizContainer.style.display  = 'none';
          if (shareContainer) {
            shareContainer.style.display = 'flex';
            setTimeout(() => openShareSheet(link, creatorName), 400);
          }
        })
        .catch(err => {
          console.error('Buddyz: save error', err);
          showToast('Could not save quiz. Check your connection.', 'error');
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Submit';
        });
    });
  }

  /* Share button on share-container */
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      openShareSheet(quizLinkInput ? quizLinkInput.value : '', creatorName);
    });
  }

  /* ─────────────────────────────────────
     FRIEND FLOW (URL ?id=...)
  ───────────────────────────────────── */
  const urlParams = new URLSearchParams(window.location.search);
  const quizID    = urlParams.get('id');

  if (quizID) {
    saveQuiz(quizID);
    window.friendQuizID = quizID;

    /* Prevent retakes: if User B has already taken this quiz, go to results */
    const storedResult = localStorage.getItem('taken_' + quizID);
    if (storedResult) {
      if (nameContainer) nameContainer.style.display = 'none';
      if (friendNameContainer) friendNameContainer.style.display = 'none';
      const marketingSection = document.getElementById('marketing-section');
      const dashboardSection = document.getElementById('creator-dashboard-section');
      if (marketingSection) marketingSection.style.display = 'none';
      if (dashboardSection) dashboardSection.style.display = 'none';

      let fs = null, fm = null;
      if (storedResult !== 'true') {
        try {
          const parsed = JSON.parse(storedResult);
          fs = parsed.score;
          fm = parsed.max;
          window.friendName = parsed.name;
        } catch(e) {}
      }
      displayResultBoard(quizID, true, fs, fm);
      return;
    }

    if (nameContainer)       nameContainer.style.display       = 'none';
    if (friendNameContainer) friendNameContainer.style.display = 'flex';

    /* index.html and bffchallenge.html are now one page. A friend
       opening a shared link should land straight on the quiz —
       hide the homepage pitch and the creator-only dashboard/FAQ. */
    const marketingSection = document.getElementById('marketing-section');
    const dashboardSection = document.getElementById('creator-dashboard-section');
    if (marketingSection) marketingSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'none';

    database.ref('quizzes/' + quizID).once('value').then(snap => {
      const quizData = snap.val();

      if (!quizData) {
        showToast('Quiz not found — the link may be expired.', 'error');
        if (friendNameContainer) {
          friendNameContainer.innerHTML = `
            <h3>Quiz Not Found</h3>
            <p>This quiz link has expired or doesn't exist.</p>
            <a href="index.html" class="btn btn-primary" style="text-decoration:none;">Back to Home</a>
          `;
        }
        return;
      }

      /* ④  Expiry check — hard block if expired */
      if (quizData.expiresAt && Date.now() > quizData.expiresAt) {
        if (friendNameContainer) {
          friendNameContainer.innerHTML = `
            <div style="font-size:2rem; margin-bottom:0.5rem;">⏰</div>
            <h3>Quiz Expired</h3>
            <p>This quiz is no longer active — it expired after 7 days.</p>
            <a href="index.html" class="btn btn-primary" style="text-decoration:none; margin-top:0.5rem;">
              Create Your Own Quiz
            </a>
          `;
        }
        return;
      }

      creatorName = quizData.name || 'Your Friend';
      window.correctAnswers = quizData.answers.map(q => q.answer);

      /* Update headings */
      const heading = document.getElementById('quiz-heading');
      if (heading) heading.textContent = `Guess ${escapeHTML(creatorName)}'s Answers!`;

      const fHeading = friendNameContainer ? friendNameContainer.querySelector('h3') : null;
      if (fHeading) fHeading.textContent = `${escapeHTML(creatorName)} challenged you!`;

      /* ④  Inject expiry banner into friend name container */
      if (friendNameContainer && quizData.expiresAt) {
        const banner = buildExpiryBanner(quizData.expiresAt);
        if (banner) friendNameContainer.prepend(banner);
      }

      /* Build friend question set from saved answers */
      const nonSkipped      = quizData.answers.filter(q => q.answer !== '__SKIPPED__');
      const friendQuestions = nonSkipped.map(q => {
        const original = BASE_QUESTIONS.find(bq =>
          bq.question === q.question ||
          injectName(bq.question, quizData.name) === q.question
        );
        const opts = original
          ? [...original.options].sort(() => Math.random() - 0.5)
          : q.options || [];
        return {
          question:      injectName(q.question, creatorName),
          options:       opts.map(o => injectName(o, creatorName)),
          correctAnswer: q.answer,
          color:         q.color || randomColorSlug(),
        };
      });

      const totalFriendQ = friendQuestions.length;
      let friendIndex     = 0;
      let speedStreak      = 0;       /* ⓓ tiny addictive feature — see below */
      let questionStartedAt = Date.now();
      userAnswers          = [];

      /* Start friend quiz */
      const startFriendBtn = document.getElementById('start-friend-quiz');
      if (startFriendBtn) {
        startFriendBtn.addEventListener('click', () => {
          const friendNameInput   = document.getElementById('friend-name');
          window.friendName       = friendNameInput ? friendNameInput.value.trim() : '';
          if (!window.friendName) {
            AudioEngine.error();
            showToast('Enter your name to start.', 'error');
            if (friendNameInput) friendNameInput.focus();
            return;
          }

          if (friendNameContainer) friendNameContainer.style.display = 'none';
          if (quizContainer) {
            quizContainer.style.display = 'flex';
            const h = quizContainer.querySelector('.quiz-heading');
            if (h) h.textContent = `Guess ${escapeHTML(creatorName)}'s Answers!`;
          }

          renderFriendQuestion();
        });
      }

      function renderFriendQuestion() {
        if (friendIndex >= totalFriendQ) {
          if (nextBtn)   nextBtn.style.display   = 'none';
          if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.textContent   = 'See My Score';
          }
          return;
        }

        const q   = friendQuestions[friendIndex];
        const qC  = document.getElementById('question-container');
        if (!qC || !q) return;

        questionStartedAt = Date.now(); /* ⓓ speed streak timer starts fresh each question */

        const colorSlug = q.color || randomColorSlug();
        const hints = ['A', 'B', 'C', 'D'];
        qC.innerHTML = `
          <div class="question-card qcolor-${colorSlug}">
            ${speedStreak > 1 ? `<div class="speed-streak-badge" id="speed-streak-badge">🔥 ${speedStreak} fast streak</div>` : ''}
            <h3>${q.question}</h3>
            <div class="quiz-options">
              ${q.options.map((opt, i) => `
                <div class="quiz-option" data-value="${escapeHTML(opt)}" role="radio" aria-checked="false" tabindex="0">
                  <span class="keyboard-hint" aria-hidden="true">${hints[i]}</span>
                  <span class="option-label">${escapeHTML(opt)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        qC.querySelectorAll('.quiz-option').forEach(el => {
          el.addEventListener('click', () => {
            qC.querySelectorAll('.quiz-option').forEach(o => {
              o.classList.remove('selected');
              o.setAttribute('aria-checked', 'false');
            });
            el.classList.add('selected');
            el.setAttribute('aria-checked', 'true');
            AudioEngine.select();
          });
          el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
          });
        });

        updateProgress(friendIndex + 1, totalFriendQ);
        const isLast = friendIndex >= totalFriendQ - 1;
        if (nextBtn)   nextBtn.style.display   = isLast ? 'none'  : 'block';
        if (submitBtn) submitBtn.style.display = isLast ? 'block' : 'none';
        if (submitBtn && isLast) submitBtn.textContent = 'See My Score';
      }

      if (nextBtn) {
        nextBtn.onclick = () => {
          if (!window.friendQuizID) return;
          const answer = getSelectedAnswer();
          if (!answer) {
            AudioEngine.error();
            showToast('Pick an answer to continue.', 'error');
            return;
          }
          userAnswers.push({ question: friendQuestions[friendIndex].question, answer });

          /* ⓓ Tiny addictive feature: "speed streak" — answering within
             4 seconds keeps a little 🔥 streak going. Purely about pace,
             never reveals correctness, so it can't spoil the final score. */
          const answeredFast = (Date.now() - questionStartedAt) < 4000;
          speedStreak = answeredFast ? speedStreak + 1 : 0;
          if (speedStreak === 3 || speedStreak === 5 || speedStreak === 10) {
            AudioEngine.success();
          }

          friendIndex++;
          AudioEngine.advance();
          renderFriendQuestion();
        };
      }

      function submitFriendQuiz() {
        const answer = getSelectedAnswer();
        if (answer) userAnswers.push({ question: friendQuestions[friendIndex]?.question, answer });

        let score = 0;
        const details = userAnswers.map((ua, i) => {
          const correctAnswer = nonSkipped[i] ? nonSkipped[i].answer : null;
          const isCorrect = !!correctAnswer && ua.answer === correctAnswer;
          if (isCorrect) score++;
          return {
            question:      ua.question || '',
            friendAnswer:  ua.answer    || '',
            correctAnswer: correctAnswer || '',
            color:         (nonSkipped[i] && nonSkipped[i].color) || 'sunset',
            isCorrect,
          };
        });

        const possiblePoints = nonSkipped.length;
        const responsePayload = {
          friendName:    window.friendName,
          score,
          possiblePoints,
          timestamp:     Date.now(),
          details,        /* per-question breakdown — powers the "View" button */
        };

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

        database.ref(`quizzes/${quizID}/responses`).push(responsePayload)
          .then(() => {
            localStorage.setItem('taken_' + quizID, JSON.stringify({
              score: score,
              max: possiblePoints,
              name: window.friendName
            }));
            if (quizContainer) quizContainer.style.display = 'none';
            displayResultBoard(quizID, true, score, possiblePoints);
          })
          .catch(err => {
            console.error('Buddyz: submit error', err);
            showToast('Error submitting. Please try again.', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'See My Score'; }
          });
      }

      if (submitBtn) {
        submitBtn.addEventListener('click', submitFriendQuiz);
      }

    }).catch(err => {
      console.error('Buddyz: load error', err);
      showToast('Failed to load quiz. Check your connection.', 'error');
    });
  }

  /* ─────────────────────────────────────
     LOCAL STORAGE HELPERS
  ───────────────────────────────────── */
  function getQuizzes(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }
  function saveQuiz(id) {
    const s = getQuizzes('savedQuizzes');
    s[id] = true;
    localStorage.setItem('savedQuizzes', JSON.stringify(s));
  }
  function saveCreatedQuiz(id) {
    const c = getQuizzes('createdQuizzes');
    c[id] = { createdAt: Date.now() };
    localStorage.setItem('createdQuizzes', JSON.stringify(c));
  }

  /* ─────────────────────────────────────
     GENERATE QUIZ ID
  ───────────────────────────────────── */
  function generateQuizID(len = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  /* ── Init new features ── */
  initLiveQuizCounter();
  if (!document.getElementById('push-nudge') &&
      !localStorage.getItem('pushNudgeDismissed')) {
    initPWA();
  }

});

/* ══════════════════════════════════════════════
   12. GLOBAL: sharePage() — legacy compat
══════════════════════════════════════════════ */
function sharePage() {
  const input = document.getElementById('quiz-link');
  if (!input) return;
  openShareSheet(input.value, '');
}
