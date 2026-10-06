import type { ReactNode } from "react";

/* =========================================================
   Redistribution flow + globe
========================================================= */

export default function AuthIllustration() {
  return (
    <div className="mt-6 min-w-0 xl:mt-8">
      {/* FLOW */}
      <div className="flex items-start">
        <FlowItem icon={<BusinessIcon />} title="Businesses" subtitle="Surplus food" />
        <Connector />
        <FlowItem icon={<AIIcon />} title="AI Matching" subtitle="Predict & recommend" highlight />
        <Connector flip />
        <FlowItem icon={<NGOIcon />} title="NGOs" subtitle="Receive & redistribute" />
        <Connector />
        <FlowItem icon={<CommunityIcon />} title="Community" subtitle="Food reaches people" />
      </div>

      {/* GLOBE */}
      <Globe />
    </div>
  );
}

/* ---------------- Flow item ---------------- */

function FlowItem({
  icon,
  title,
  subtitle,
  highlight = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex w-[92px] shrink-0 flex-col items-center xl:w-[108px]">
      <div
        className={`relative flex h-[68px] w-[68px] items-center justify-center rounded-[22px] border xl:h-[80px] xl:w-[80px] ${
          highlight
            ? "border-emerald-300/40 bg-gradient-to-br from-emerald-400/40 to-emerald-600/20 text-emerald-200 shadow-[0_0_40px_rgba(52,211,153,0.35)]"
            : "border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.03] text-emerald-300 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        }`}
      >
        <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="h-8 w-8 xl:h-9 xl:w-9">{icon}</div>
      </div>

      <div className="-mt-2.5 rounded-xl border border-white/10 bg-[#012a26]/90 px-2.5 py-1.5 text-center shadow-lg backdrop-blur">
        <p className="whitespace-nowrap text-[11px] font-bold leading-tight text-white xl:text-xs">
          {title}
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[9px] leading-tight text-emerald-100/55 xl:text-[10px]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/* ---------------- Dashed connector with leaf ---------------- */

function Connector({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className={`mt-6 h-8 min-w-0 flex-1 xl:mt-7 ${flip ? "-scale-y-100" : ""}`}
      fill="none"
    >
      <path
        d="M2 26 C 30 2, 60 40, 98 12"
        stroke="rgba(110,231,183,0.7)"
        strokeWidth="1.4"
        strokeDasharray="3 4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <g transform="translate(44 6) rotate(-25)">
        <path d="M0 8 C 0 0, 8 -2, 14 -1 C 14 6, 8 10, 0 8Z" fill="#4ade80" />
      </g>
    </svg>
  );
}

/* ---------------- Globe ---------------- */

function Globe() {
  const pins: { x: number; y: number }[] = [
    { x: 95, y: 98 },
    { x: 235, y: 76 },
    { x: 380, y: 56 },
    { x: 505, y: 70 },
  ];

  return (
    <div className="relative mt-4 min-w-0 xl:mt-6">
      <svg viewBox="0 0 600 170" className="block h-auto w-full" fill="none">
        <defs>
          <radialGradient id="globeFill" cx="50%" cy="100%" r="90%">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#065f46" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id="globeRim" x1="0" x2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <clipPath id="globeClip">
            <ellipse cx="300" cy="420" rx="420" ry="360" />
          </clipPath>
          <filter id="pinGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* body */}
        <ellipse cx="300" cy="420" rx="420" ry="360" fill="url(#globeFill)" />

        {/* grid */}
        <g clipPath="url(#globeClip)" stroke="#6ee7b7" strokeOpacity="0.14" strokeWidth="1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <ellipse key={`m${i}`} cx="300" cy="420" rx={60 + i * 62} ry="360" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={`p${i}`} cx="300" cy="420" rx="420" ry={90 + i * 70} />
          ))}
        </g>

        {/* rim light */}
        <path
          d="M 0 172 A 420 360 0 0 1 600 172"
          stroke="url(#globeRim)"
          strokeWidth="2"
          fill="none"
          transform="translate(0 -8)"
        />

        {/* routes */}
        <path
          d="M95 98 Q 165 40 235 76 T 380 56 T 505 70"
          stroke="#6ee7b7"
          strokeOpacity="0.7"
          strokeWidth="1.3"
          strokeDasharray="3 5"
          strokeLinecap="round"
        />

        {/* pins */}
        {pins.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <circle r="14" fill="#34d399" opacity="0.55" filter="url(#pinGlow)" />
            <path
              d="M0 -18 C -9 -18 -13 -11 -13 -6 C -13 3 0 14 0 14 C 0 14 13 3 13 -6 C 13 -11 9 -18 0 -18Z"
              fill="#052e2b"
              stroke="#6ee7b7"
              strokeWidth="1.5"
            />
            <path
              d="M-5 -2 C -5 -9 2 -11 6 -10 C 6 -4 2 0 -5 -2Z"
              fill="#86efac"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

/* =========================================================
   ICONS (filled duotone, sized by parent)
========================================================= */

const iconProps = {
  viewBox: "0 0 24 24",
  className: "h-full w-full",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BusinessIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 21h18" />
      <path d="M4 10l1.5-5h13L20 10" />
      <path d="M4 10c0 1.4 1 2 2 2s2-.6 2-2c0 1.4 1 2 2 2s2-.6 2-2c0 1.4 1 2 2 2s2-.6 2-2c0 1.4 1 2 2 2s2-.6 2-2" />
      <path d="M5 12v9M19 12v9" />
      <path d="M9 21v-5h6v5" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" fillOpacity="0.15" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
      <path d="M9.5 15l2.5-6 2.5 6M10.4 13h3.2" />
    </svg>
  );
}

function NGOIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M12 17s-3.2-1.9-3.2-4.3a1.8 1.8 0 0 1 3.2-1.1 1.8 1.8 0 0 1 3.2 1.1C15.2 15.1 12 17 12 17Z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="7.5" r="3" fill="currentColor" fillOpacity="0.2" />
      <circle cx="5.5" cy="10" r="2.2" />
      <circle cx="18.5" cy="10" r="2.2" />
      <path d="M6.5 20c.4-3.8 2.6-6 5.5-6s5.1 2.2 5.5 6" />
      <path d="M1.8 18c.3-2.5 1.6-4 3.7-4M22.2 18c-.3-2.5-1.6-4-3.7-4" />
    </svg>
  );
}