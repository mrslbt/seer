/**
 * Oracle Response Generator
 *
 * Transforms scoring verdicts into elaborate, mystical oracle prose.
 * The Seer speaks in poetic but clear language -- never vague,
 * always direct. Like counsel from someone who has seen everything.
 */

import type { Verdict, QuestionCategory } from '../types/astrology';

interface OracleTemplate {
  opening: string;
  guidance: string;
}

const TEMPLATES: Record<Verdict, Record<QuestionCategory, OracleTemplate[]>> = {
  HARD_YES: {
    love: [
      { opening: "The stars burn bright for you.", guidance: "Venus opens the gate. Walk through without hesitation. What your heart knows, the cosmos confirms." },
      { opening: "The heavens smile upon this bond.", guidance: "Love is not asking permission today. It is arriving. Receive it fully." },
      { opening: "A rare alignment graces your heart.", guidance: "The universe conspires in your favor. Trust the pull you feel. It is real, and it is earned." },
      { opening: "The cosmic tides surge toward union.", guidance: "What you feel is not wishful thinking. It is the stars themselves bending toward you. Act on it." },
      { opening: "The heart-line of your chart blazes gold.", guidance: "This is the kind of day poets write about. Do not let caution steal what the cosmos are handing you." },
    ],
    career: [
      { opening: "The cosmos have cleared your path.", guidance: "Move boldly. Saturn lifts its weight and opportunity stands where doubt once was." },
      { opening: "Your ambition finds its moment.", guidance: "The stars demand action, not contemplation. What you build now carries the force of destiny." },
      { opening: "Cosmic winds fill your sails.", guidance: "This is the rare day where effort and fortune converge. Strike while the iron glows." },
      { opening: "The throne waits.", guidance: "Everything you have prepared for aligns today. Step forward. Hesitation here would be the only mistake." },
      { opening: "The architects of fate have drawn your blueprint.", guidance: "What you propose will take root. The cosmic soil is rich. Plant now and do not look back." },
    ],
    money: [
      { opening: "Fortune turns its gaze toward you.", guidance: "The cosmic ledger favors your move. Abundance flows where courage meets preparation." },
      { opening: "Jupiter bestows its full blessing upon your ventures.", guidance: "The financial currents run strong and clear. Trust your judgment. The numbers align." },
      { opening: "The celestial treasury opens.", guidance: "Prosperity is not luck today. It is alignment. Act with confidence, and act decisively." },
      { opening: "Gold runs through the veins of your chart.", guidance: "The stars rarely speak this clearly about material gain. Honor their generosity with bold action." },
    ],
    communication: [
      { opening: "Mercury lends you its silver tongue.", guidance: "Your words will land exactly where they need to. Speak your truth. The stars carry it." },
      { opening: "The cosmos amplify your voice.", guidance: "What you say today echoes further than usual. Use this power wisely and speak without fear." },
      { opening: "Every syllable you utter finds its mark.", guidance: "Communication channels are wide open. Say the thing you have been holding back. It will be understood." },
    ],
    conflict: [
      { opening: "Strength flows through your chart today.", guidance: "You have the cosmic advantage. Stand firm. The universe reinforces your position." },
      { opening: "Mars empowers your resolve.", guidance: "Confrontation finds you ready. Face what must be faced. Victory favors the bold today." },
      { opening: "The warrior stars stand behind you.", guidance: "You will not just survive this conflict. You will define its outcome. Act with conviction." },
    ],
    timing: [
      { opening: "The moment is ripe.", guidance: "Every celestial clock points to now. Hesitation is the only enemy. The timing is flawless." },
      { opening: "The stars have waited for this day.", guidance: "What was once premature now arrives perfectly. Act. The window is wide open and will not stay." },
      { opening: "All the cosmic gears click into place.", guidance: "You could not have planned a better moment. The universe itself has scheduled this for you." },
    ],
    health: [
      { opening: "Vitality surges through your chart.", guidance: "Your body and the cosmos are in harmony. Push forward. You have the energy to spare." },
      { opening: "The celestial physician approves.", guidance: "Strength, clarity, and resilience are yours today. The stars support whatever physical endeavor calls you." },
      { opening: "Your life force burns at its peak.", guidance: "This is a day for action, for movement, for reclaiming your body. Trust its capabilities. They are vast today." },
    ],
    social: [
      { opening: "The stars weave connections around you.", guidance: "Social energy is abundant. Every meeting, every conversation carries potential. Lean in." },
      { opening: "Venus and Jupiter illuminate your social sphere.", guidance: "You are magnetic today. People are drawn to your energy. Use it." },
      { opening: "The cosmic web hums with connection.", guidance: "Someone you meet today -- or someone you already know -- holds a key. Pay attention." },
    ],
    decisions: [
      { opening: "Clarity descends from the heavens.", guidance: "Your mind is sharp and the cosmos agree with your instinct. Decide without doubt." },
      { opening: "The cosmic compass points true.", guidance: "Every sign confirms the path forward. Trust yourself. The universe trusts you today." },
      { opening: "The oracle has rarely spoken with such certainty.", guidance: "You already know the answer. The stars simply confirm what your deeper self has decided. Go." },
    ],
    creativity: [
      { opening: "The muse descends with celestial fire.", guidance: "Neptune and Venus flood your chart with inspiration. Create without restraint. This is your moment." },
      { opening: "Divine creative energy pours through you.", guidance: "The stars do not whisper today. They sing. Follow the melody wherever it leads." },
      { opening: "The entire cosmos is your canvas.", guidance: "Whatever you create today carries something genuine. Channel it. Let the work be alive." },
    ],
    spiritual: [
      { opening: "The veil between worlds thins.", guidance: "Profound insight awaits you. The cosmos align to reveal what was hidden. Open your inner eye." },
      { opening: "A sacred alignment blesses your seeking.", guidance: "The universe answers those who listen deeply. Trust the visions and intuitions that come." },
      { opening: "The innermost door stands open.", guidance: "This is a rare day for truth. What you discover about yourself now will reshape everything that follows." },
    ],
  },

  SOFT_YES: {
    love: [
      { opening: "The stars lean in your favor, gently.", guidance: "Proceed with an open heart, but not a blind one. The path is good. Walk it with awareness." },
      { opening: "A warm current stirs in your chart.", guidance: "Love grows in the direction you are facing. Nurture it, but do not force the bloom." },
      { opening: "The cosmic winds carry tenderness your way.", guidance: "There is ground here worth standing on. Be present. Let things unfold at their own pace." },
      { opening: "Venus casts a soft light on your path.", guidance: "This is not a lightning bolt. It is a slow dawn. Beautiful, real, and worth your patience." },
    ],
    career: [
      { opening: "The cosmic winds carry encouragement.", guidance: "Opportunity approaches, though not without effort. Take the step. The ground is steady enough." },
      { opening: "A favorable current runs through your work.", guidance: "Progress is available to those who show up. The stars support your labor, though not your laziness." },
      { opening: "Saturn nods with cautious approval.", guidance: "Your direction is sound. Do not expect fanfare, but expect results. Stay the course." },
      { opening: "The professional sky clears, gradually.", guidance: "Things are moving in your favor. Not fast, not dramatic, but decisively. Consistency is your ally." },
    ],
    money: [
      { opening: "The financial stars show cautious promise.", guidance: "Gain is possible, but measure your steps. Fortune favors the prepared, not the reckless." },
      { opening: "A gentle prosperity stirs in your chart.", guidance: "The flow is positive. Move with it, not against it. Steady hands yield steady returns." },
      { opening: "The cosmic purse loosens its strings.", guidance: "Opportunity exists, but it rewards diligence over daring. Take calculated steps." },
    ],
    communication: [
      { opening: "Your voice carries weight today.", guidance: "The message will be received, though timing matters. Choose your moment with care." },
      { opening: "Mercury lends a helpful hand.", guidance: "Speak with intention. Your words have more impact than usual, but only if well-placed." },
    ],
    conflict: [
      { opening: "The cosmos offer you an edge, but a thin one.", guidance: "Proceed, but choose your battles wisely. Strength comes from precision, not force." },
      { opening: "You have the advantage, but barely.", guidance: "Press it gently. Overconfidence here costs more than restraint." },
    ],
    timing: [
      { opening: "The timing is favorable, if imperfect.", guidance: "Do not wait for the perfect moment. This one is good enough. Move before it passes." },
      { opening: "The stars say soon, if not quite now.", guidance: "A small delay may sharpen the outcome. But do not delay too long. The window narrows." },
    ],
    health: [
      { opening: "Your vitality holds steady.", guidance: "Energy is available. Use it wisely. The body responds well when you lead with intention." },
      { opening: "The stars support your physical efforts.", guidance: "You are not at your peak, but you are strong enough. Move with purpose." },
    ],
    social: [
      { opening: "Social currents run in your direction.", guidance: "Connections await, though they require your presence. Show up. The rest follows." },
      { opening: "The stars favor gathering today.", guidance: "Others will be receptive to you. Do not overthink it. Be genuine and the rest handles itself." },
    ],
    decisions: [
      { opening: "The cosmos tilt toward your instinct.", guidance: "Your gut feeling has merit. Trust it, but verify with reason before you leap." },
      { opening: "The stars lean toward yes, with caveats.", guidance: "The direction is right. Adjust the details. The big picture is sound." },
    ],
    creativity: [
      { opening: "Creative energy stirs beneath the surface.", guidance: "Inspiration is near. Reach for it. The muse rewards those who begin, not those who wait." },
      { opening: "A quiet flame of creativity burns.", guidance: "It will not rage today, but it will sustain you. Work steadily. Quality over spectacle." },
    ],
    spiritual: [
      { opening: "A quiet opening appears in the cosmos.", guidance: "Insight comes to those who sit still long enough. The answer is forming. Give it space." },
      { opening: "The inner light flickers with promise.", guidance: "Depth awaits, but you must go gently. Do not demand revelation. Invite it." },
    ],
  },

  NEUTRAL: {
    love: [
      { opening: "The stars neither pull nor push.", guidance: "The waters of love are still today. Neither inviting nor forbidding. Let clarity come before commitment." },
      { opening: "The cosmos hold their counsel on matters of the heart.", guidance: "This is a day for observation, not action. Watch. Wait. The signs will sharpen." },
      { opening: "Venus stands in quiet contemplation.", guidance: "Neither blessing nor warning today. Love exists in a holding pattern. Tend to it without forcing outcomes." },
    ],
    career: [
      { opening: "The professional cosmos stand in balance.", guidance: "Neither green light nor red. Amber. Prepare, but do not force the gate." },
      { opening: "The stars offer no clear directive for your work.", guidance: "This is not a verdict against you. It is a pause. Use it to gather strength and refine your aim." },
      { opening: "The cosmic workplace is unremarkable today.", guidance: "Nothing will break. Nothing will soar. Keep building. The breakthrough is not today, but your effort still counts." },
    ],
    money: [
      { opening: "The financial stars are quiet.", guidance: "Neither abundance nor loss is written today. Guard what you have and wait for clearer signs." },
      { opening: "The cosmic balance sheet is flat.", guidance: "Today is for preservation, not speculation. What you hold is safe. What you chase is uncertain." },
    ],
    communication: [
      { opening: "Mercury wanders a middle path.", guidance: "Words carry their usual weight. No more, no less. Speak carefully and expect measured responses." },
    ],
    conflict: [
      { opening: "The cosmic battlefield is still.", guidance: "Neither victory nor defeat is assured. If you can avoid the fight, do. If you cannot, prepare well." },
    ],
    timing: [
      { opening: "The cosmic clock ticks, but reveals nothing.", guidance: "The timing is neither ripe nor rotten. If pressed, you may act, but better days exist. Patience costs nothing." },
    ],
    health: [
      { opening: "Your energy holds a steady middle ground.", guidance: "Neither surge nor slump. Listen to your body. It will tell you what it needs." },
    ],
    social: [
      { opening: "Social energies are unremarkable today.", guidance: "Company is neither blessed nor cursed. Go if you wish, stay if you prefer. The stars do not mind." },
    ],
    decisions: [
      { opening: "The cosmos offer no decisive counsel.", guidance: "The signs are mixed. If this decision can wait, let it. If it cannot, trust your reason over your emotion." },
      { opening: "The oracle sees both sides with equal clarity.", guidance: "This is a genuine coin toss in the heavens. Neither path is wrong. Neither is clearly right. Choose, and commit." },
    ],
    creativity: [
      { opening: "The muse is neither present nor absent.", guidance: "Creativity flows at its normal pace. Do not force brilliance. Work steadily and let it come." },
    ],
    spiritual: [
      { opening: "The veil remains as it is.", guidance: "No great revelation awaits today, but no door is closed either. Practice your rituals and trust the process." },
    ],
  },

  SOFT_NO: {
    love: [
      { opening: "The stars urge you to pause.", guidance: "The heart wants what it wants, but the cosmos counsel patience. What feels urgent may be premature." },
      { opening: "A shadow drifts across your romantic chart.", guidance: "This is not a permanent no, but today is not the day. Let things settle before you reach." },
      { opening: "Venus withholds her blessing for now.", guidance: "Love is not denied. It is delayed. The difference matters. Do not act from desperation." },
      { opening: "The heart-line dims, but does not darken.", guidance: "What you seek still exists. But today you are reaching from the wrong angle. Step back and reassess." },
    ],
    career: [
      { opening: "The professional winds blow against you, gently.", guidance: "Resistance is building. This is not failure. It is the cosmos asking you to reconsider your approach." },
      { opening: "Saturn rests its hand lightly on your plans.", guidance: "Ambition is noble, but timing matters. Patience now prevents regret later." },
      { opening: "The road narrows ahead.", guidance: "Not every day is for advancing. Today is for fortifying. Shore up what you have before chasing what you do not." },
    ],
    money: [
      { opening: "The financial cosmos whisper caution.", guidance: "This is not the tide to swim against. Hold your resources close. Patience will reveal a clearer shore." },
      { opening: "The stars see risk where you see reward.", guidance: "Your optimism outpaces the cosmic reality. Scale down. Protect what you have. Tomorrow brings better odds." },
    ],
    communication: [
      { opening: "The signal from Mercury weakens.", guidance: "Words may land wrong today. If it can wait, let it. Silence protects what speech might damage." },
      { opening: "What you want to say and what will be heard are different today.", guidance: "The gap between intent and impact is wider than usual. Exercise restraint." },
    ],
    conflict: [
      { opening: "The stars do not favor this fight.", guidance: "Strength is knowing when not to engage. Today, retreat is wisdom, not weakness." },
    ],
    timing: [
      { opening: "The cosmic clock suggests delay.", guidance: "What feels like a missed opportunity is actually protection. Better timing awaits. Be patient." },
    ],
    health: [
      { opening: "Your energy reserves run lower than usual.", guidance: "The body asks for rest, not exertion. Honor its request. Pushing through may cost more than it gains." },
    ],
    social: [
      { opening: "Social energies are complicated today.", guidance: "Gatherings may drain rather than energize. Choose solitude if it calls. The world will still be there." },
    ],
    decisions: [
      { opening: "The compass needle trembles.", guidance: "Doubt is not your enemy today. It is your guardian. If you are unsure, that uncertainty is the message." },
      { opening: "The stars see what you cannot yet.", guidance: "Something you are not accounting for changes the equation. Do not decide until that something reveals itself." },
    ],
    creativity: [
      { opening: "The muse turns away, briefly.", guidance: "Creative force is diminished. Do not judge your output today. Rest and return when the well refills." },
    ],
    spiritual: [
      { opening: "The inner world feels distant.", guidance: "Connection comes and goes. If meditation feels hollow, release the expectation. Presence alone is enough." },
    ],
  },

  HARD_NO: {
    love: [
      { opening: "The stars stand firmly against this.", guidance: "What the heart craves, the cosmos deny. For now. This is protection, not punishment. Trust the no." },
      { opening: "Venus turns her face away.", guidance: "Love does not flow in this direction today. Do not force what the universe resists. It will only break." },
      { opening: "The heart-line of your chart falls dark.", guidance: "This is a clear signal. Not cruel, but absolute. What you want here, the cosmos will not give. Accept it and protect yourself." },
      { opening: "The stars have seen the outcome. They say no.", guidance: "Do not argue with the heavens today. They see further than you. What feels like loss is actually rescue." },
    ],
    career: [
      { opening: "The cosmos erect a wall before you.", guidance: "This path is blocked, and for good reason. What seems like an obstacle is redirection. Heed it." },
      { opening: "The weight of Saturn falls heavy on your ambitions.", guidance: "Stop. This is not your moment. What collapses now was never meant to stand. Build again, differently." },
      { opening: "The professional sky darkens.", guidance: "Forcing this will cost you more than retreating. The stars are not subtle today. This door is shut." },
      { opening: "Your chart speaks with unusual severity.", guidance: "Do not invest more energy here. The return will not come. Redirect everything toward what actually grows." },
    ],
    money: [
      { opening: "The financial heavens flash a warning.", guidance: "Every cosmic signal screams caution. Protect what you have. This is not the day for risk. Not even small ones." },
      { opening: "Jupiter withholds its abundance deliberately.", guidance: "The well is dry in this direction. Do not dig deeper. Find a different source entirely." },
      { opening: "The stars see loss where you see opportunity.", guidance: "Your read on this is wrong. The cosmos are certain. Step away from this financial decision. Now." },
    ],
    communication: [
      { opening: "Mercury opposes your intent.", guidance: "Every word risks misunderstanding. Swallow what you want to say. Tomorrow your voice serves you better." },
      { opening: "The cosmos seal your lips for your own protection.", guidance: "What you are about to say will do damage you cannot undo. Wait. The right moment for this message is not now." },
    ],
    conflict: [
      { opening: "The cosmos warn against battle.", guidance: "You will not win this fight today. Walk away. The universe does not grant you armor for this one." },
      { opening: "Mars stands against you.", guidance: "Every advantage you think you have is an illusion. Disengage. Live to fight when the stars are with you." },
    ],
    timing: [
      { opening: "The stars say: not now.", guidance: "This is the wrong moment, full stop. What feels urgent is a trap. Wait. The right time will announce itself." },
      { opening: "The cosmic clock reads zero.", guidance: "There is no version of this timing that works. Every hour today adds cost. Delay completely." },
    ],
    health: [
      { opening: "Your cosmic vitality hits a low.", guidance: "The body and stars agree: rest. Do not push. Recovery is not weakness, it is survival." },
      { opening: "The stars insist on stillness.", guidance: "Exertion today does not build. It depletes. Listen to the heaviness. It is real." },
    ],
    social: [
      { opening: "The social cosmos close their doors.", guidance: "Isolation serves you better today. The energy around you is hostile to connection. Protect your peace." },
    ],
    decisions: [
      { opening: "The cosmos speak with rare clarity: no.", guidance: "This is not uncertainty. It is a definitive warning. Do not proceed. What you are considering will cost more than you think." },
      { opening: "The oracle refuses to soften this.", guidance: "You already sense the danger. The stars confirm it. Walk away. Completely. Do not negotiate with a closed door." },
    ],
    creativity: [
      { opening: "The muse has departed.", guidance: "Creative wells are bone dry. Do not force it. You will only produce regret. Wait for the waters to return." },
    ],
    spiritual: [
      { opening: "The inner world is turbulent.", guidance: "Seeking clarity now will only deepen confusion. Ground yourself in the physical. Spirit will return when the storm passes." },
    ],
  },

  UNCLEAR: {
    love: [{ opening: "The cosmos cannot read what you have not defined.", guidance: "Sharpen your question. The stars respond to clarity, not confusion. Ask again with a specific heart." }],
    career: [{ opening: "Your question dissolves in the cosmic noise.", guidance: "Ask with more precision. The stars are willing, but they need something concrete to work with." }],
    money: [{ opening: "The financial oracle requires a clearer question.", guidance: "What exactly do you seek? The cosmos cannot answer what has not truly been asked." }],
    communication: [{ opening: "The signal is too weak.", guidance: "Refine your question and return. The oracle listens, but needs more substance to speak." }],
    conflict: [{ opening: "The cosmos sense confusion in your asking.", guidance: "Clarify your intent. The stars will answer, but only when the question is real." }],
    timing: [{ opening: "Time itself seems uncertain in your asking.", guidance: "Be specific. The cosmic clock answers precise questions, not vague ones." }],
    health: [{ opening: "The question is unclear to the stars.", guidance: "Ask again with intention. The oracle requires focus to serve you." }],
    social: [{ opening: "Social matters blur in the cosmic lens.", guidance: "What specifically do you wish to know? The oracle awaits a clearer question." }],
    decisions: [{ opening: "The decision you describe is shapeless.", guidance: "Give the cosmos something concrete. They will answer, but not riddles." }],
    creativity: [{ opening: "The creative question lacks form.", guidance: "Even the muse needs a starting point. Ask again with more clarity." }],
    spiritual: [{ opening: "The spiritual realm reflects your own confusion.", guidance: "Still your mind. Then ask again. Clarity must begin with you." }],
  },
};

/**
 * Generate an oracle response from a verdict and category.
 * Returns 2-3 sentences of mystical guidance.
 */
export function generateOracleResponse(
  verdict: Verdict,
  category: QuestionCategory
): string {
  const categoryTemplates = TEMPLATES[verdict]?.[category];

  if (!categoryTemplates || categoryTemplates.length === 0) {
    const fallback = TEMPLATES[verdict]?.decisions;
    if (fallback && fallback.length > 0) {
      const t = fallback[Math.floor(Math.random() * fallback.length)];
      return `${t.opening} ${t.guidance}`;
    }
    return "The cosmos are silent. Ask again when the stars speak.";
  }

  const template = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  return `${template.opening} ${template.guidance}`;
}

/**
 * Get the verdict color for the seer theme.
 */
export function getSeerVerdictColor(verdict: Verdict): string {
  const colors: Record<Verdict, string> = {
    HARD_YES: "#C9A84C",
    SOFT_YES: "#D4BE7A",
    NEUTRAL: "#8A8A8A",
    SOFT_NO: "#A67458",
    HARD_NO: "#8B4A4A",
    UNCLEAR: "#7A6F8A",
  };
  return colors[verdict];
}
