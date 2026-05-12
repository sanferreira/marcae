export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-[var(--color-ink)] grid place-items-center">
        <span className="text-[var(--color-gold)] font-display font-bold text-[18px] leading-none">M</span>
      </div>
      <span className="font-display font-bold text-[18px] tracking-tight text-[var(--color-ink)]">
        Marcaê
      </span>
    </div>
  );
}
