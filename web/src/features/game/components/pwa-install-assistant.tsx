"use client";

import { Download, Share2, Smartphone } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import { gameCopy } from "../game-copy";
import type { GameSnapshot } from "../types";
import { usePwaInstall } from "./pwa-install-provider";
import styles from "./pwa-install-assistant.module.css";

export function PwaInstallAssistant({
  blocked,
  locale,
}: {
  blocked: boolean;
  locale: GameSnapshot["locale"];
}) {
  const {
    capability,
    dismissAutomaticOffer,
    handleInstructionsOpenChange,
    instructionsOpen,
    isAutomaticOfferReady,
    requestInstall,
    returnFocusTargetRef,
  } = usePwaInstall();
  const automaticActionRef = useRef<HTMLButtonElement>(null);
  const copy = gameCopy[locale].pwaInstall;
  const isIosInstructions = capability === "ios-instructions";
  const showAutomaticCard =
    isAutomaticOfferReady && !blocked && !instructionsOpen;

  return (
    <>
      {showAutomaticCard ? (
        <aside
          aria-labelledby="pwa-install-card-title"
          className={styles.cardLayer}
          data-pwa-install-card
          data-map-control="true"
        >
          <div
            className={`flex items-start gap-3 rounded-2xl border border-primary/25 bg-background/94 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl ${styles.card}`}
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Smartphone aria-hidden="true" className="size-5" />
            </div>
            <div className={styles.cardCopy}>
              <h2
                className="text-sm font-semibold leading-tight text-white"
                id="pwa-install-card-title"
              >
                {isIosInstructions ? copy.iosCardTitle : copy.cardTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {copy.description}
              </p>
              <div className={`mt-2 ${styles.cardActions}`}>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => {
                    void requestInstall(automaticActionRef.current);
                  }}
                  ref={automaticActionRef}
                  type="button"
                >
                  {isIosInstructions ? (
                    <Share2 aria-hidden="true" className="size-4" />
                  ) : (
                    <Download aria-hidden="true" className="size-4" />
                  )}
                  <span>
                    {isIosInstructions
                      ? copy.installationSteps
                      : copy.installApp}
                  </span>
                </button>
                <button
                  className="min-h-11 rounded-xl px-3 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50"
                  onClick={dismissAutomaticOffer}
                  type="button"
                >
                  {copy.later}
                </button>
              </div>
            </div>
          </div>
        </aside>
      ) : null}

      <Dialog
        onOpenChange={handleInstructionsOpenChange}
        open={instructionsOpen}
      >
        <DialogContent
          className={`z-[61] gap-0 overflow-hidden rounded-b-none rounded-t-3xl border border-b-0 border-white/10 bg-background/98 p-0 shadow-[0_-24px_70px_rgba(0,0,0,0.6)] outline-none backdrop-blur-xl ${styles.helpSheet}`}
          data-pwa-install-instructions
          layout="custom"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusTargetRef.current?.focus();
          }}
          overlayClassName="game-modal-backdrop z-[60] bg-background/75 backdrop-blur-sm motion-reduce:animate-none"
          showCloseButton={false}
        >
          <div className="px-4 pb-4 pt-2">
            <div
              aria-hidden="true"
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25"
            />
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Share2 aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold leading-tight text-white">
                  {copy.helpTitle}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {copy.helpDescription}
                </DialogDescription>
              </div>
            </div>

            <ol className="mt-4 space-y-2">
              {copy.iosSteps.map((step, index) => (
                <li
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-card/45 px-3 py-2 text-sm text-white"
                  key={step}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 font-mono text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <DialogClose asChild>
              <Button
                className="mt-4 min-h-11 w-full rounded-xl"
                type="button"
              >
                {copy.gotIt}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
