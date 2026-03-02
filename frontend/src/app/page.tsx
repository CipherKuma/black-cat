"use client";
export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative flex min-h-[80vh] flex-col items-start justify-center px-6 py-20">
        <div className="mx-auto w-full max-w-7xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-emerald-400">CRE-Verified Private Trading</p>
          <h1 className="mb-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            Copy the best.<br /><span className="text-zinc-500">Stay invisible.</span>
          </h1>
          <p className="mb-8 max-w-xl text-lg text-zinc-400">Expert traders post encrypted signals. CRE verifies performance in a TEE. Subscribe to auto-copy top masters.</p>
        </div>
      </section>
    </div>
  );
}
