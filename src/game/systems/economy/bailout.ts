import {createStoryEntry} from "../../text/storyText";
import {getBailoutStoryText} from "../../text/bailoutText";
import type {ActionResult, GameData, StoryEntry} from "../../core/types";

export const BAILOUT_TUNING = {
  povertyThreshold: 10,
  daysBelowThreshold: 3,
  initialOfferAmount: 100,
  offerIncreasePerDecline: 10,
  reofferMoneyStep: 10
} as const;

export function createInitialBailoutState() {
  return {
    bailoutAccepted: false,
    bailoutOfferAmount: BAILOUT_TUNING.initialOfferAmount,
    bailoutUnlocked: true,
    bailoutPeakMoneySinceDecline: 0,
    bailoutDaysBelowThreshold: 0,
    pendingBailoutOffer: null as number | null
  };
}

export function updateBailoutTracking(gameData: GameData): void {
  const bailout = gameData.player;
  if (bailout.bailoutAccepted || bailout.pendingBailoutOffer !== null) {
    return;
  }

  if (bailout.money >= BAILOUT_TUNING.povertyThreshold) {
    bailout.bailoutDaysBelowThreshold = 0;
  } else {
    bailout.bailoutDaysBelowThreshold += 1;
  }

  bailout.bailoutPeakMoneySinceDecline = Math.max(bailout.bailoutPeakMoneySinceDecline, bailout.money);
  if (bailout.bailoutPeakMoneySinceDecline >= bailout.bailoutOfferAmount + BAILOUT_TUNING.reofferMoneyStep) {
    bailout.bailoutUnlocked = true;
  }
}

export function tryTriggerBailoutOffer(gameData: GameData): boolean {
  const bailout = gameData.player;
  if (bailout.bailoutAccepted || bailout.pendingBailoutOffer !== null) {
    return false;
  }

  if (bailout.money >= BAILOUT_TUNING.povertyThreshold) {
    return false;
  }

  if (bailout.bailoutDaysBelowThreshold < BAILOUT_TUNING.daysBelowThreshold) {
    return false;
  }

  if (!bailout.bailoutUnlocked) {
    return false;
  }

  bailout.pendingBailoutOffer = bailout.bailoutOfferAmount;
  return true;
}

export function acceptBailoutOffer(gameData: GameData, nextDayEntries: StoryEntry[] = []): ActionResult {
  const amount = gameData.player.pendingBailoutOffer;
  if (amount === null) {
    return {ok: false, type: "error", message: "当前没有待处理的资助。"};
  }

  const anchorName = getAnchorAdventurerName(gameData);
  gameData.player.money += amount;
  gameData.player.bailoutAccepted = true;
  gameData.player.pendingBailoutOffer = null;

  const storyEntry = createStoryEntry("bailout_accepted", {
    day: gameData.day,
    adventurerName: anchorName,
    amount
  });
  gameData.dayLog = [storyEntry, ...gameData.dayLog];
  nextDayEntries.unshift(storyEntry);

  return {
    ok: true,
    type: "success",
    message: `${anchorName} 把 ${amount} 钱交给了你。`
  };
}

export function declineBailoutOffer(gameData: GameData): ActionResult {
  const amount = gameData.player.pendingBailoutOffer;
  if (amount === null) {
    return {ok: false, type: "error", message: "当前没有待处理的资助。"};
  }

  gameData.player.pendingBailoutOffer = null;
  gameData.player.bailoutOfferAmount += BAILOUT_TUNING.offerIncreasePerDecline;
  gameData.player.bailoutUnlocked = false;
  gameData.player.bailoutPeakMoneySinceDecline = gameData.player.money;
  gameData.player.bailoutDaysBelowThreshold = 0;

  const anchorName = getAnchorAdventurerName(gameData);
  return {
    ok: true,
    type: "info",
    message: `${anchorName} 收回了钱袋，没有多说什么。`
  };
}

export function getAnchorAdventurerName(gameData: GameData): string {
  const anchor = gameData.adventurers.find((adventurer) => adventurer.templateId === "anchor-a");
  return anchor?.name ?? "艾诺";
}

export function getPendingBailoutOffer(gameData: GameData): number | null {
  return gameData.player.pendingBailoutOffer;
}

export function getBailoutDialogCopy(gameData: GameData): {title: string; story: string; amount: number} {
  const amount = gameData.player.pendingBailoutOffer ?? gameData.player.bailoutOfferAmount;
  const anchorName = getAnchorAdventurerName(gameData);
  return {
    title: `${anchorName} 的资助`,
    story: getBailoutStoryText(anchorName, amount),
    amount
  };
}
