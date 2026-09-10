"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOSUA = /iphone|ipad|ipod/i.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIOSUA || isIPadOS;
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2v13" />
      <path d="m8 6 4-4 4 4" />
      <rect x="4" y="10" width="16" height="11" rx="2" />
    </svg>
  );
}

function InstructionsOverlay({
  title,
  steps,
  onClose,
}: {
  title: string;
  steps: string[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 px-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xs text-center text-white">
        <ShareIcon />
        <p className="mt-4 text-sm font-black uppercase tracking-[0.2em]">
          {title}
        </p>
        <ol className="mt-5 space-y-3 text-left text-sm leading-6 text-white/80">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="font-black text-white">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={onClose}
          className="mt-8 w-full rounded-full border border-white/30 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition active:scale-95"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function InstallAppScreen() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showFallbackInstructions, setShowFallbackInstructions] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only environment detection
    setIsIOS(detectIOS());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleDownload = useCallback(async () => {
    const deferredPrompt = deferredPromptRef.current;

    if (deferredPrompt) {
      deferredPromptRef.current = null;
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      return;
    }

    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    setShowFallbackInstructions(true);
  }, [isIOS]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black px-6">
      <Image
        src="/logo-white.png"
        alt="INVICTUS ONE"
        width={512}
        height={512}
        priority
        className="h-auto w-28 select-none sm:w-32"
      />
      <button
        onClick={handleDownload}
        className="mt-10 w-full max-w-xs rounded-full bg-white px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition-transform duration-150 active:scale-95"
      >
        Download App
      </button>

      {showIOSInstructions && (
        <InstructionsOverlay
          title="Add to Home Screen"
          steps={[
            "Tap the Share icon in Safari's toolbar.",
            "Scroll down and tap \u201CAdd to Home Screen\u201D.",
            "Tap \u201CAdd\u201D to confirm.",
          ]}
          onClose={() => setShowIOSInstructions(false)}
        />
      )}

      {showFallbackInstructions && (
        <InstructionsOverlay
          title="Install This App"
          steps={[
            "Open your browser's menu.",
            "Select \u201CInstall app\u201D or \u201CAdd to Home Screen\u201D.",
            "Confirm to add INVICTUS ONE to your device.",
          ]}
          onClose={() => setShowFallbackInstructions(false)}
        />
      )}
    </div>
  );
}
