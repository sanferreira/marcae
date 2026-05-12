import { Calendar, Check, Sparkles, Star } from "lucide-react";

export default function PhoneMockup() {
  return (
    <div className="relative w-[280px] md:w-[320px]">
      {/* Phone frame */}
      <div className="relative rounded-[44px] bg-[var(--color-ink)] p-3 shadow-2xl" style={{ boxShadow: "0 50px 100px -30px rgba(12,12,12,.5)" }}>
        <div className="rounded-[34px] bg-white overflow-hidden">
          {/* Status bar */}
          <div className="h-7 bg-[var(--color-ink)] grid place-items-center">
            <div className="w-20 h-5 bg-[var(--color-ink)] rounded-full" />
          </div>

          {/* App content */}
          <div className="p-5 bg-[var(--color-cream)] min-h-[520px]">
            {/* App header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">Hoje</div>
                <div className="font-display font-bold text-[20px] text-[var(--color-ink)]">Agenda</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[var(--color-gold)] grid place-items-center">
                <span className="text-[var(--color-ink)] font-bold text-[12px]">M</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="rounded-2xl bg-white border border-[var(--color-line)] p-3">
                <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">Hoje</div>
                <div className="font-display font-bold text-[22px] text-[var(--color-ink)]">12</div>
                <div className="text-[10px] text-[var(--color-muted)]">agendamentos</div>
              </div>
              <div className="rounded-2xl bg-[var(--color-ink)] text-white p-3">
                <div className="text-[10px] text-[var(--color-gold)] uppercase tracking-wider">Receita</div>
                <div className="font-display font-bold text-[22px]">R$ 840</div>
                <div className="text-[10px] text-white/60">+24% vs ontem</div>
              </div>
            </div>

            {/* Appointments */}
            <div className="space-y-2">
              {[
                { time: "10:00", name: "Carlos M.", svc: "Atendimento completo", done: true },
                { time: "11:30", name: "Luiza T.", svc: "Sessão premium", done: false },
                { time: "14:00", name: "Pedro S.", svc: "Combo essencial", done: false },
              ].map((a) => (
                <div key={a.time} className="rounded-2xl bg-white border border-[var(--color-line)] p-3 flex items-center gap-3">
                  <div className="text-center">
                    <div className="font-display font-bold text-[13px] text-[var(--color-ink)]">{a.time}</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[12px] text-[var(--color-ink)]">{a.name}</div>
                    <div className="text-[10.5px] text-[var(--color-muted)] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[var(--color-gold)]" />
                      {a.svc}
                    </div>
                  </div>
                  <div className={`w-7 h-7 rounded-full grid place-items-center ${a.done ? "bg-[var(--color-gold)]" : "bg-[var(--color-cream-dark)]"}`}>
                    {a.done ? (
                      <Check className="w-3.5 h-3.5 text-[var(--color-ink)]" strokeWidth={3} />
                    ) : (
                      <Calendar className="w-3.5 h-3.5 text-[var(--color-muted)]" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Loyalty */}
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-[var(--color-gold)]/20 to-[var(--color-gold-soft)]/30 border border-[var(--color-gold)]/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-3.5 h-3.5 text-[var(--color-gold-deep)]" fill="currentColor" />
                <div className="font-display font-semibold text-[12px] text-[var(--color-ink)]">Programa de fidelidade</div>
              </div>
              <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                <div className="h-full w-[68%] bg-[var(--color-gold)]" />
              </div>
              <div className="text-[10px] text-[var(--color-muted)] mt-1">8 de 12 pontos · prêmio próximo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating chip */}
      <div className="absolute -left-6 top-32 bg-white rounded-2xl shadow-xl border border-[var(--color-line)] px-3 py-2 flex items-center gap-2 hidden md:flex">
        <div className="w-2 h-2 rounded-full bg-[#22c55e] pulse-dot" />
        <span className="text-[11px] font-semibold text-[var(--color-ink)]">3 novos agendamentos</span>
      </div>
    </div>
  );
}
