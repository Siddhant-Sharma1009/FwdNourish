export default function AuthIllustration() {
  return (
    <div className="relative mt-7 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative">
        {/* Flow */}
        <div className="flex items-center gap-2">
          <FlowCard
            icon="🏪"
            title="Business"
            subtitle="Surplus food"
          />

          <Arrow />

          <FlowCard
            icon="🤖"
            title="AI"
            subtitle="Risk & demand"
          />

          <Arrow />

          <FlowCard
            icon="🤝"
            title="NGO"
            subtitle="Smart matching"
          />

          <Arrow />

          <FlowCard
            icon="❤️"
            title="Community"
            subtitle="Food reaches people"
          />
        </div>

        {/* Message */}
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-base">
            ♻
          </div>

          <p className="text-xs leading-5 text-slate-400">
            Identify surplus before it becomes waste and redirect it to
            organizations that need it.
          </p>
        </div>
      </div>
    </div>
  );
}

function FlowCard({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 text-center">
      <div className="text-xl">
        {icon}
      </div>

      <p className="mt-2 truncate text-xs font-bold text-white">
        {title}
      </p>

      <p className="mt-1 truncate text-[10px] leading-4 text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="shrink-0 text-sm font-semibold text-emerald-500">
      →
    </div>
  );
}