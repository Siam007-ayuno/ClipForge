import Link from "next/link";
import {
  Scissors,
  Sparkles,
  Zap,
  Globe2,
  Video,
  ShieldCheck,
  ArrowRight,
  UploadCloud,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-rose-600/20 via-amber-500/10 to-violet-600/20 blur-[120px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16 sm:pt-28 sm:pb-24 max-w-6xl text-center">
        {/* Compliance Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-1.5 text-xs font-medium text-rose-400 mb-8 backdrop-blur-md">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Legally Compliant Rights Verification Built-In</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Turn Long Videos into Viral{" "}
          <span className="bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400 bg-clip-text text-transparent">
            Short-Form Clips
          </span>{" "}
          in Minutes.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          ClipForge automatically finds the best moments from your podcasts, streams, and lectures. 
          Smart 9:16 reframing, animated word-level captions, and virality scoring powered by AI.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-rose-600/25 hover:opacity-95 transition-all transform hover:-translate-y-0.5"
          >
            <Sparkles className="h-5 w-5" />
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-8 py-4 text-base font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all"
          >
            View Projects Dashboard
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-zinc-400">
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-rose-500" /> Up to 2GB Chunked Uploads
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-rose-500" /> YouTube & Direct URLs
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-rose-500" /> Bengali & English Audio Support
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-rose-500" /> MediaPipe Face Centering
          </span>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm hover:border-zinc-700 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 mb-5">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Resumable Chunked Ingestion</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Upload long high-bitrate videos up to 2GB reliably in chunks, or paste YouTube links through our pluggable ingestion provider.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm hover:border-zinc-700 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mb-5">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Virality Scoring</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Whisper extracts word timestamps with auto-language detection (Bengali & English), while Claude/Gemini scores hook strength, completeness, and emotion.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm hover:border-zinc-700 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 mb-5">
              <Scissors className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Auto Reframe & Captions</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              MediaPipe face tracking centers the speaker in 9:16 vertical ratio with burned-in animated karaoke subtitles ready for TikTok, Shorts, and Reels.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
