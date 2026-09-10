"use client";

import Image from "next/image";
import { ActionsPanel } from "./components/actions/actions-panel";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-8 md:pt-12">
      <section className="rounded-[2rem] border border-[#d4af5d]/25 bg-[#0a0a0a]/80 px-6 py-10 shadow-[0_0_40px_rgba(212,175,93,0.08)] md:px-10 md:py-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-full border border-[#d4af5d]/50 bg-[#101010] md:h-18 md:w-18">
              <Image
                src="/logo.png"
                alt="Invictus One logo"
                fill
                sizes="72px"
                priority
                className="object-cover"
              />
            </div>
            <p className="display-font text-[10px] font-light tracking-[0.44em] text-[#d9b563] uppercase">
              Invictus One
            </p>
          </div>
          <h1 className="mt-6 text-5xl font-thin tracking-[0.12em] text-[#f5f1e6] uppercase md:text-7xl">
            THE FUTURE IS ONE
          </h1>
          <p className="mt-6 max-w-2xl text-sm font-light tracking-[0.24em] text-[#e7d6a8] uppercase md:text-base">
            ONE NETWORK. ONE CURRENCY. OPEN TO EVERYONE.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="display-font rounded-full border border-[#d4af5d] bg-[#d4af5d] px-6 py-3 text-[10px] font-medium tracking-[0.26em] text-[#100d09] uppercase transition hover:bg-[#e9c96b]">
              BUY ONE
            </button>
            <button className="display-font rounded-full border border-[#d4af5d]/70 bg-transparent px-6 py-3 text-[10px] font-medium tracking-[0.26em] text-[#f3d68a] uppercase transition hover:border-[#e9c96b] hover:text-[#f9e7b0]">
              CHART
            </button>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <ActionsPanel />
      </div>
    </main>
  );
}
