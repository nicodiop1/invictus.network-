import { PhantomWallet } from '@/components/phantom-wallet'

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-8">
        <span className="font-display text-base font-bold uppercase tracking-[0.35em]">
          Invictus
        </span>
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Solana
        </span>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.45em] text-primary">
          Unconquered
        </p>
        <h1 className="text-balance font-display text-6xl font-black uppercase leading-[0.95] tracking-tight md:text-8xl">
          Invictus
        </h1>
        <p className="mt-8 max-w-md text-pretty leading-relaxed text-muted-foreground">
          Connect your Phantom wallet to join the network. Non-custodial —
          your keys never leave Phantom.
        </p>

        <div className="mt-12">
          <PhantomWallet />
        </div>
      </section>

      <footer className="mx-auto w-full max-w-3xl px-6 py-8">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Built on Solana · Powered by Phantom
        </p>
      </footer>
    </main>
  )
}
