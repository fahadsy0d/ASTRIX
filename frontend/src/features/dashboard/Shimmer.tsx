export const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`relative overflow-hidden rounded-xl bg-slate-800/60 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);
