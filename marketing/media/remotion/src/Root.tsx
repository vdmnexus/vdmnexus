import React from "react";
import { Composition } from "remotion";
import { LogoIntro } from "./compositions/LogoIntro.js";
import {
  WeeklyShipsReel,
  WeeklyShipsReelProps,
} from "./compositions/WeeklyShipsReel.js";
import ships from "./ships.json" with { type: "json" };

const FPS = 30;
const SECONDS_PER_CARD = 2;
const TITLE_SECONDS = 1.5;
const OUTRO_SECONDS = 1.5;

const LOGO_INTRO_SECONDS = 1.8;
const LOGO_INTRO_FRAMES = Math.round(FPS * LOGO_INTRO_SECONDS);

const cards = (ships as WeeklyShipsReelProps["ships"]) ?? [];
const reelDurationInFrames = Math.max(
  FPS * 1,
  LOGO_INTRO_FRAMES +
    Math.round(
      FPS * (TITLE_SECONDS + cards.length * SECONDS_PER_CARD + OUTRO_SECONDS),
    ),
);

export const Root: React.FC = () => (
  <>
    <Composition
      id="LogoIntro"
      component={LogoIntro}
      durationInFrames={LOGO_INTRO_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        durationSeconds: LOGO_INTRO_SECONDS,
        logoSize: 460,
        showTagline: true,
      }}
    />
    <Composition
      id="LogoIntroSquare"
      component={LogoIntro}
      durationInFrames={LOGO_INTRO_FRAMES}
      fps={FPS}
      width={1080}
      height={1080}
      defaultProps={{
        durationSeconds: LOGO_INTRO_SECONDS,
        logoSize: 520,
        showTagline: true,
      }}
    />
    <Composition
      id="WeeklyShipsReel"
      component={WeeklyShipsReel}
      durationInFrames={reelDurationInFrames}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        ships: cards,
        headline: "This week at VDM Nexus",
        footer: "vdmnexus.com",
        logoIntroSeconds: LOGO_INTRO_SECONDS,
      }}
    />
  </>
);
