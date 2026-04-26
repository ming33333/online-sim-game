import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CirclePlay, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { CharacterPortrait, type CharacterGender, type PortraitPresetId } from './CharacterPortrait';
import { StatScaleTooltip } from './StatScaleTooltip';

type IntroWelcomeTyping = {
  displayed: string;
  typingDone: boolean;
  showCaret: boolean;
};

type IntroCharacterPreset = {
  id: string;
  name: string;
  description: string;
  startingMoney: number;
  beauty: number;
  smarts: number;
  fitness: number;
  social: number;
};

export function IntroMenu({
  introMenuVisible,
  introRevealStarted,
  introMenuBg,
  introEnterEase,
  introExitEase,
  introFadeDurationSec,
  introFadeDelaySec,
  onExitComplete,
  selectedCharacter,
  characterGender,
  setCharacterGender,
  characterPresets,
  getCharacterPortraitUrl,
  fmtStatOutOfTen,
  setSelectedCharacter,
  characterFirstName,
  characterLastName,
  characterNameMax,
  setCharacterFirstName,
  setCharacterLastName,
  nameMaxHintFirst,
  nameMaxHintLast,
  setNameMaxHintFirst,
  setNameMaxHintLast,
  nameKeyExtendsPastMax,
  onStartLifeJourney,
  introWelcomeLineStarted,
  introWelcomeTyping,
  onRevealIntroWelcomeFull,
  onBeginIntroWelcomeLineTyping,
  onEnterMenu,
  characterDisplayName,
}: {
  introMenuVisible: boolean;
  introRevealStarted: boolean;
  introMenuBg: string;
  introEnterEase: readonly [number, number, number, number];
  introExitEase: readonly [number, number, number, number];
  introFadeDurationSec: number;
  introFadeDelaySec: number;
  onExitComplete: () => void;
  selectedCharacter: IntroCharacterPreset | null;
  characterGender: CharacterGender;
  setCharacterGender: (g: CharacterGender) => void;
  characterPresets: IntroCharacterPreset[];
  getCharacterPortraitUrl: (
    presetId: PortraitPresetId,
    gender: CharacterGender,
    facing?: 'south' | 'south-east'
  ) => string;
  fmtStatOutOfTen: (n: number) => string;
  setSelectedCharacter: (p: IntroCharacterPreset) => void;
  characterFirstName: string;
  characterLastName: string;
  characterNameMax: number;
  setCharacterFirstName: (v: string) => void;
  setCharacterLastName: (v: string) => void;
  nameMaxHintFirst: boolean;
  nameMaxHintLast: boolean;
  setNameMaxHintFirst: (v: boolean) => void;
  setNameMaxHintLast: (v: boolean) => void;
  nameKeyExtendsPastMax: (e: React.KeyboardEvent, len: number) => boolean;
  onStartLifeJourney: () => void;
  introWelcomeLineStarted: boolean;
  introWelcomeTyping: IntroWelcomeTyping;
  onRevealIntroWelcomeFull: () => void;
  onBeginIntroWelcomeLineTyping: () => void;
  onEnterMenu: () => void;
  characterDisplayName: string;
}) {
  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      {introMenuVisible && (
        <motion.div
          key="intro-menu"
          className="relative min-h-screen flex items-center justify-center p-4"
          role="presentation"
          exit={{ opacity: 0, transition: { duration: 1.05, ease: introExitEase } }}
        >
          {/* Merlion + tint always visible behind Play overlay and menu card */}
          <div className="absolute inset-0" aria-hidden>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${introMenuBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/35 via-slate-900/25 to-slate-900/45" />
          </div>

          <motion.div
            className={`relative z-10 w-full flex justify-center max-w-4xl ${!introRevealStarted ? 'pointer-events-none' : ''}`}
            initial={{ opacity: 0, y: 32 }}
            animate={introRevealStarted ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
            exit={{ opacity: 0, y: 18, transition: { duration: 0.9, ease: introExitEase } }}
            transition={{
              duration: introFadeDurationSec,
              delay: introRevealStarted ? introFadeDelaySec : 0,
              ease: introEnterEase,
            }}
          >
            <Card className="max-w-4xl w-full rounded-none border-4 border-[#1a2332] bg-[#d8e0eb] text-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,0.88)] font-pixel-ui text-xl leading-snug">
              <CardHeader className="text-center border-b-4 border-[#1a2332] bg-[linear-gradient(180deg,#b9c6d8_0%,#a8b6cc_100%)] px-4 py-5 sm:px-6">
                <div className="flex justify-center mb-3" aria-hidden>
                  <span className="font-pixel-title text-2xl sm:text-3xl text-sky-300 drop-shadow-[1px_1px_0_#0f172a] leading-none select-none">
                    ★
                  </span>
                </div>
              </CardHeader>
              <CardContent className={`gap-6 items-start pb-6 ${selectedCharacter ? 'grid md:grid-cols-2' : ''}`}>
                <div className="space-y-4 min-w-0 w-full max-w-xl mx-auto md:max-w-none">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-none border-[3px] border-[#1a2332] bg-[#eef2f8] p-0 shadow-[3px_3px_0_0_rgba(30,41,59,0.65)]">
                        <Button
                          type="button"
                          variant={characterGender === 'girl' ? 'default' : 'ghost'}
                          size="sm"
                          className={`h-8 px-3 text-lg rounded-none border-0 font-pixel-ui ${
                            characterGender === 'girl' ? '' : 'text-slate-800 hover:bg-slate-300/70'
                          }`}
                          onClick={() => setCharacterGender('girl')}
                        >
                          Girl
                        </Button>
                        <Button
                          type="button"
                          variant={characterGender === 'boy' ? 'default' : 'ghost'}
                          size="sm"
                          className={`h-8 px-3 text-lg rounded-none border-0 border-l-[3px] border-[#1a2332] font-pixel-ui ${
                            characterGender === 'boy' ? '' : 'text-slate-800 hover:bg-slate-300/70'
                          }`}
                          onClick={() => setCharacterGender('boy')}
                        >
                          Boy
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {characterPresets.map((preset) => {
                        const thumb =
                          preset.id === 'privileged' || preset.id === 'middle' || preset.id === 'struggling'
                            ? getCharacterPortraitUrl(
                                preset.id as PortraitPresetId,
                                characterGender,
                                preset.id === 'struggling' ? 'south-east' : 'south'
                              )
                            : null;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedCharacter(preset)}
                            className={`flex gap-3 items-start text-left rounded-none border-[3px] p-3 text-lg transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 ${
                              selectedCharacter?.id === preset.id
                                ? 'border-sky-800 bg-sky-100/95 shadow-[4px_4px_0_0_#075985] ring-0'
                                : 'border-[#1a2332] bg-[#eef2f8] shadow-[4px_4px_0_0_rgba(30,41,59,0.6)] hover:bg-slate-50'
                            }`}
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                width={80}
                                height={80}
                                loading="lazy"
                                decoding="async"
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-none object-contain object-center flex-shrink-0 border-2 border-slate-500/60 shadow-none [image-rendering:pixelated]"
                                aria-hidden
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="font-pixel-title text-[0.65rem] sm:text-xs mb-1 text-slate-900">{preset.name}</div>
                              <div className="text-slate-700 text-base mb-1">{preset.description}</div>
                              <div className="text-slate-800 text-base space-y-1">
                                <div>Money: ${preset.startingMoney.toLocaleString()}</div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[0.95rem] sm:text-base leading-snug">
                                  <StatScaleTooltip stat="beauty" side="bottom">
                                    <div className="cursor-help">Beauty: {fmtStatOutOfTen(preset.beauty)}</div>
                                  </StatScaleTooltip>
                                  <StatScaleTooltip stat="smarts" side="bottom">
                                    <div className="cursor-help">Smarts: {fmtStatOutOfTen(preset.smarts)}</div>
                                  </StatScaleTooltip>
                                  <StatScaleTooltip stat="fitness" side="bottom">
                                    <div className="cursor-help">Fitness: {fmtStatOutOfTen(preset.fitness)}</div>
                                  </StatScaleTooltip>
                                  <StatScaleTooltip stat="social" side="bottom">
                                    <div className="cursor-help">Social: {fmtStatOutOfTen(preset.social)}</div>
                                  </StatScaleTooltip>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedCharacter && (
                    <motion.div
                      className="space-y-4 pt-3 border-t-[3px] border-slate-400"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="first-name"
                            className="font-pixel-title text-[0.65rem] sm:text-xs mb-2 block text-slate-900 uppercase tracking-wide"
                          >
                            First name
                          </label>
                          <input
                            id="first-name"
                            type="text"
                            value={characterFirstName}
                            maxLength={characterNameMax}
                            onChange={(e) => {
                              const v = e.target.value.slice(0, characterNameMax);
                              setCharacterFirstName(v);
                              if (v.length < characterNameMax) setNameMaxHintFirst(false);
                            }}
                            onKeyDown={(e) => {
                              if (nameKeyExtendsPastMax(e, characterFirstName.length)) setNameMaxHintFirst(true);
                            }}
                            placeholder="First name"
                            autoComplete="given-name"
                            className="w-full px-3 py-2 rounded-none border-[3px] border-[#1a2332] bg-[#f4f7fc] font-pixel-ui text-xl sm:text-2xl focus:outline-none focus:ring-0 focus:border-sky-600 placeholder:text-slate-400"
                          />
                          {nameMaxHintFirst && (
                            <p className="text-[10px] text-amber-700 mt-1 font-pixel-ui motion-safe:animate-pulse">
                              Max {characterNameMax} characters
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor="last-name"
                            className="font-pixel-title text-[0.65rem] sm:text-xs mb-2 block text-slate-900 uppercase tracking-wide"
                          >
                            Last name
                          </label>
                          <input
                            id="last-name"
                            type="text"
                            value={characterLastName}
                            maxLength={characterNameMax}
                            onChange={(e) => {
                              const v = e.target.value.slice(0, characterNameMax);
                              setCharacterLastName(v);
                              if (v.length < characterNameMax) setNameMaxHintLast(false);
                            }}
                            onKeyDown={(e) => {
                              if (nameKeyExtendsPastMax(e, characterLastName.length)) setNameMaxHintLast(true);
                            }}
                            placeholder="Last name"
                            autoComplete="family-name"
                            className="w-full px-3 py-2 rounded-none border-[3px] border-[#1a2332] bg-[#f4f7fc] font-pixel-ui text-xl sm:text-2xl focus:outline-none focus:ring-0 focus:border-sky-600 placeholder:text-slate-400"
                          />
                          {nameMaxHintLast && (
                            <p className="text-[10px] text-amber-700 mt-1 font-pixel-ui motion-safe:animate-pulse">
                              Max {characterNameMax} characters
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={onStartLifeJourney}
                        disabled={!characterFirstName.trim() || !characterLastName.trim()}
                        className="w-full rounded-none border-[3px] border-[#1a2332] bg-gradient-to-r from-slate-700 via-sky-700 to-cyan-600 hover:from-slate-800 hover:via-sky-800 hover:to-cyan-700 font-pixel-title text-[0.65rem] sm:text-xs py-6 text-white shadow-[5px_5px_0_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_0_#0f172a] disabled:opacity-50"
                        size="lg"
                      >
                        Start Your Life Journey
                      </Button>
                    </motion.div>
                  )}
                </div>

                {selectedCharacter && (
                  <motion.div
                    className="md:sticky md:top-4 rounded-none border-[3px] border-[#1a2332] bg-[linear-gradient(145deg,#c5d0e0_0%,#b4c2d6_100%)] p-3 shadow-[4px_4px_0_0_rgba(30,41,59,0.65)]"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
                  >
                    <p className="text-center font-pixel-title text-[0.55rem] sm:text-[0.65rem] text-slate-900 uppercase tracking-wide mb-2">
                      Character view
                    </p>
                    <CharacterPortrait
                      variant="intro"
                      presetId={selectedCharacter?.id ?? null}
                      gender={characterGender}
                      name={characterDisplayName || 'Your sim'}
                      subtitle={selectedCharacter?.name ?? undefined}
                    />
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {!introRevealStarted && (
            <div
              className={`absolute inset-0 z-[60] flex flex-col items-center justify-center gap-6 px-6 bg-black select-none ${
                introWelcomeLineStarted ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={introWelcomeLineStarted ? onRevealIntroWelcomeFull : undefined}
              role={introWelcomeLineStarted ? 'button' : undefined}
              aria-label={introWelcomeLineStarted ? 'Tap to show full welcome text' : undefined}
            >
              {introWelcomeLineStarted ? (
                <p
                  className="font-pixel-ui text-slate-100 text-center text-2xl sm:text-3xl max-w-xl leading-snug min-h-[4.5rem]"
                  aria-live="polite"
                >
                  {introWelcomeTyping.displayed}
                  {introWelcomeTyping.showCaret ? (
                    <span
                      className="inline-block w-[3px] h-[1.1em] ml-1 [vertical-align:-0.12em] bg-slate-200 motion-safe:animate-pulse"
                      aria-hidden
                    />
                  ) : null}
                </p>
              ) : null}

              {!introWelcomeLineStarted ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-16 min-w-[12rem] rounded-none border-[3px] border-[#1a2332] font-pixel-title text-xs sm:text-sm text-white shadow-[6px_6px_0_0_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-600 via-sky-600 to-cyan-500 hover:from-slate-700 hover:via-sky-700 hover:to-cyan-600 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[4px_4px_0_0_rgba(15,23,42,0.55)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBeginIntroWelcomeLineTyping();
                  }}
                >
                  <CirclePlay className="size-6 mr-2 shrink-0" aria-hidden />
                  Play
                </Button>
              ) : introWelcomeTyping.typingDone ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-16 min-w-[12rem] rounded-none border-[3px] border-[#1a2332] font-pixel-title text-xs sm:text-sm text-white shadow-[6px_6px_0_0_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-700 via-emerald-700 to-teal-600 hover:from-slate-800 hover:via-emerald-800 hover:to-teal-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[4px_4px_0_0_rgba(15,23,42,0.55)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnterMenu();
                  }}
                >
                  <ArrowRight className="size-6 mr-2 shrink-0" aria-hidden />
                  Enter
                </Button>
              ) : null}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

