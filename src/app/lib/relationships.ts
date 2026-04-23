/**
 * NPC social links — chat counts unlock warmer dialogue, friendship, then dating.
 */

export const NPC_IDS = [
  'school-avery',
  'school-morgan',
  'school-devon',
  'school-elia',
  'park-jordan',
  'neighbor-sam',
  'gym-lucia',
] as const;
export type NpcId = (typeof NPC_IDS)[number];

/** Classmates available in the lounge when campus is open. */
export const SCHOOL_LOUNGE_NPC_IDS: NpcId[] = [
  'school-avery',
  'school-morgan',
  'school-devon',
  'school-elia',
];

export type DialogueTier = 'stranger' | 'warm' | 'friend' | 'close';

/** Interaction counts for dialogue tier / relationship stage (Talk +1 each time). */
export const TIER_AT = { warm: 5, friend: 20, close: 50 } as const;

export function dialogueTierForCount(interactionCount: number): DialogueTier {
  if (interactionCount >= TIER_AT.close) return 'close';
  if (interactionCount >= TIER_AT.friend) return 'friend';
  if (interactionCount >= TIER_AT.warm) return 'warm';
  return 'stranger';
}

/** Label shown in skills overlay and UI. */
export function relationshipStageLabel(
  interactionCount: number,
  isDatingThisNpc: boolean
): string {
  if (isDatingThisNpc) return 'Dating';
  if (interactionCount >= TIER_AT.close) return 'Close — can ask out';
  if (interactionCount >= TIER_AT.friend) return 'Friend';
  if (interactionCount >= TIER_AT.warm) return 'Acquaintance';
  if (interactionCount > 0) return 'Stranger';
  return 'Not met';
}

export const TALK_SOCIAL_HOURS = 0.5;
export const TALK_SOCIAL_SKILL = 0.02;
export const TALK_HAPPINESS = 2;

/** In-game day id for capping relationship gains (year * 512 + dayOfYear). */
export function gameDayKey(year: number, dayOfYear: number): number {
  return year * 512 + dayOfYear;
}

export const NPC_PROFILES: {
  id: NpcId;
  name: string;
  role: string;
  where: string;
}[] = [
  {
    id: 'school-avery',
    name: 'Avery Kim',
    role: 'Classmate',
    where: 'Campus (school)',
  },
  {
    id: 'school-morgan',
    name: 'Morgan Patel',
    role: 'Classmate',
    where: 'Campus (school)',
  },
  {
    id: 'school-devon',
    name: 'Devon Okonkwo',
    role: 'Classmate',
    where: 'Campus (school)',
  },
  {
    id: 'school-elia',
    name: 'Elia Vasquez',
    role: 'Classmate',
    where: 'Campus (school)',
  },
  {
    id: 'park-jordan',
    name: 'Jordan Lee',
    role: 'Regular at the park',
    where: 'Centerlight Park',
  },
  {
    id: 'neighbor-sam',
    name: 'Sam Rivera',
    role: 'Neighbor',
    where: 'Your building',
  },
  {
    id: 'gym-lucia',
    name: 'Lucia Chen',
    role: 'Gym regular',
    where: 'Gym lounge',
  },
];

const DIALOGUES: Record<NpcId, Record<DialogueTier, string[]>> = {
  'school-avery': {
    stranger: [
      '“Uh, hey. I think we’re in the same lecture block.”',
      '“Sorry—do you know where room B is?”',
      '“Hi. I’m Avery. We’ve probably passed in the hall.”',
    ],
    warm: [
      '“Oh, it’s you! Did you get the notes from last week?”',
      '“Want to compare answers for the problem set?”',
      '“I saved you a seat… if you want it.”',
    ],
    friend: [
      '“Finally—campus is less boring when you’re around.”',
      '“I was gonna grab coffee after. Come with?”',
      '“You get it. Half this degree is just surviving group projects.”',
    ],
    close: [
      '“Every time I see you I forget what I was stressed about.”',
      '“I was hoping I’d run into you today.”',
      '“Walk you to the bus? …Or we could just keep talking.”',
    ],
  },
  'school-morgan': {
    stranger: [
      '“Library’s packed—mind if I share the outlet?”',
      '“We’re in the same seminar, right? I’m Morgan.”',
      '“If the vending machine eats your dollar, it wasn’t personal.”',
    ],
    warm: [
      '“You actually did the reading. Respect.”',
      '“Want my flashcards? I color-code when I panic.”',
      '“Same corner of the lounge again—tradition?”',
    ],
    friend: [
      '“Group project season is a war crime. Team us?”',
      '“I’ll save you a seat at the good table.”',
      '“You’re the reason I don’t mute the group chat.”',
    ],
    close: [
      '“I pretend I came for coffee but I came for you.”',
      '“Text me when you’re on campus. Any excuse works.”',
      '“Study break = us. Non-negotiable.”',
    ],
  },
  'school-devon': {
    stranger: [
      '“You look lost—STEM building’s that way.”',
      '“Devon. I run the unofficial tutoring Discord.”',
      '“If you hear drumming in the quad, that’s the marching club.”',
    ],
    warm: [
      '“You fixed that bug in lab? Teach me your ways.”',
      '“Energy drink diplomacy: I owe you one.”',
      '“Walk with you to the bus loop?”',
    ],
    friend: [
      '“Hackathon team of two? Say yes.”',
      '“You make deadlines feel almost humane.”',
      '“I’ll debug your life if you bring snacks.”',
    ],
    close: [
      '“I cleared my evening. No reason. Okay—you’re the reason.”',
      '“Every notification I hope it’s you.”',
      '“Stay after class? I’ve got a playlist with your name on it.”',
    ],
  },
  'school-elia': {
    stranger: [
      '“First time in this building? The café line peaks at ten.”',
      '“I’m Elia—I sketch people when I should be taking notes.”',
      '“If you need a pen, I’ve got seven. Don’t ask.”',
    ],
    warm: [
      '“Your answer in discussion was sharp.”',
      '“I drew you tiny in the margin. Compliment.”',
      '“Same time tomorrow? I’ll bring the good highlighters.”',
    ],
    friend: [
      '“Art show opening Friday—you’re my plus-one.”',
      '“You get my jokes. That’s dangerously rare.”',
      '“Campus feels smaller when you’re here.”',
    ],
    close: [
      '“I’d trade a whole sketchbook for another hour with you.”',
      '“Say you’ll sit with me. I’ll save the window seat.”',
      '“You’re my favorite plot twist this semester.”',
    ],
  },
  'park-jordan': {
    stranger: [
      '“Nice day for the path—mind if I pass?”',
      '“Do you come here often? First time for me this week.”',
      '“The ducks are bold today.”',
    ],
    warm: [
      '“Hey! Same bench as last time, almost.”',
      '“If you’re doing another lap, I’ll match your pace.”',
      '“Centerlight’s loud—this strip of green saves me.”',
    ],
    friend: [
      '“Park day = automatic mood fix. Especially if you’re here.”',
      '“I brought an extra water. Take it.”',
      '“Race you to the fountain? Loser buys iced tea.”',
    ],
    close: [
      '“I find excuses to be here when I think you might show up.”',
      '“Sit with me? No agenda. Just… you.”',
      '“This place feels like ours now.”',
    ],
  },
  'neighbor-sam': {
    stranger: [
      '“Elevator’s slow again, huh?”',
      '“Oh—you’re the one in the unit down the hall.”',
      '“Trash night already? Time flies.”',
    ],
    warm: [
      '“If you smell garlic, that’s me stress-cooking. Sorry in advance.”',
      '“Need a wrench? I’ve got a junk drawer that qualifies as a hardware store.”',
      '“Package mix-up again—yours might be on my mat.”',
    ],
    friend: [
      '“Come knock if the Wi‑Fi dies. We can split a pizza and blame the landlord.”',
      '“You’re the only reason I don’t pretend I didn’t see anyone in the hallway.”',
      '“Borrow anything from my kitchen. Seriously.”',
    ],
    close: [
      '“I leave my door cracked sometimes… in case you walk by.”',
      '“Movie on my couch tonight? I’ll save the good blanket.”',
      '“Home feels less like a box when you’re next door.”',
    ],
  },
  'gym-lucia': {
    stranger: [
      '“Hey—new face. You looking for the lockers?”',
      '“Budget Gym, yeah? First time here?”',
      '“I’m Lucia. If you need a walkthrough, I’m weirdly good at directions.”',
    ],
    warm: [
      '“You found the lounge too? That’s the best place to chill after a workout.”',
      '“If your form feels off, ask—better safe than sorry.”',
      '“You’re doing okay. I can tell. Keep going.”',
    ],
    friend: [
      '“Come with me next time—we’ll trade music and check in between sets.”',
      '“You have that ‘I can do this’ energy. I like it.”',
      '“Want a quick plan for a beginner routine?”',
    ],
    close: [
      '“Whenever you show up, I feel like the gym is ours for an hour.”',
      '“We should grab water together after—no rushing, just… you.”',
      '“You’re the reason I come here even when I don’t feel like it.”',
    ],
  },
};

export function pickTalkDialogue(npcId: NpcId, countAfterThisTalk: number): string {
  const tier = dialogueTierForCount(countAfterThisTalk);
  const pool = DIALOGUES[npcId][tier];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

export function emptyNpcInteractions(): Record<NpcId, number> {
  return {
    'school-avery': 0,
    'school-morgan': 0,
    'school-devon': 0,
    'school-elia': 0,
    'park-jordan': 0,
    'neighbor-sam': 0,
    'gym-lucia': 0,
  };
}

/** Last gameDayKey when this NPC's relationship count was increased; −1 = never. */
export function emptyNpcRelationshipLastBumpDay(): Record<NpcId, number> {
  return {
    'school-avery': -1,
    'school-morgan': -1,
    'school-devon': -1,
    'school-elia': -1,
    'park-jordan': -1,
    'neighbor-sam': -1,
    'gym-lucia': -1,
  };
}

export function npcById(id: NpcId) {
  return NPC_PROFILES.find((p) => p.id === id);
}
