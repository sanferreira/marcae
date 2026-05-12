import { Calendar, Check, Scissors, Star } from "lucide-react";

export default function PhoneMockup() {
  return (
    <div className="relative">
      {/* Floating chip top-right */}
      <div className="absolute -right-6 top-10 z-20 hidden md:block float-y">
        <div className="card-soft px-4 py-3 shadow-xl flex items-center gap-3" style={{ boxShadow: "0 20px 40px -20px rgba(12,12,12,.18)" }}>
          <div className="w-9 h-9 rounded-full bg-[var(--color-gold-soft)] grid place-items-center">
            <Check className="w-4 h-4 text-[var(--color-gold-deep)]" strokeWidth={3} />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-muted)] font-medium">Agendamento confirmado</div>
            <div className="text-[13px] font-semibold">Corte + Barba · 14h30</div>
          </div>
        </div>
      </div>

      {/* Floating chip bottom-left */}
      <div className="absolute -left-8 bottom-16 z-20 hidden md:block float-y" style={{ animationDelay: "1.2s" }}>
        <div className="card-soft px-4 py-3 shadow-xl flex items-center gap-3" style={{ boxShadow: "0 20px 40px -20px rgba(12,12,12,.18)" }}>
          <div className="w-9 h-9 rounded-full bg-[var(--color-ink)] grid place-items-center">
            <Star className="w-4 h-4 text-[var(--color-gold)]" fill="currentColor" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-muted)] font-medium">+10 pontos de fidelidade</div>
            <div className="text-[13px] font-semibold">João ganhou um brinde</div>
          </div>
        </div>
      </div>

      {/* Phone frame */}
      <div className="relative mx-auto w-[300px] md:w-[340px] aspect-[9/19.5] rounded-[44px] bg-[var(--color-ink)] p-3 shadow-2xl" style={{ boxShadow: "0 40px 80px -30px rgba(12,12,12,.35), 0 0 0 1px rgba(12,12,12,.05)" }}>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[var(--color-ink)] rounded-b-2xl z-10" />
        <div className="w-full h-full rounded-[36px] overflow-hidden bg-[#0C0C0C] relative">
          {/* App content */}
          <div className="px-5 pt-12 pb-5 text-white h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] text-white/50">Olá,</div>
                <div className="text-[15px] font-semibold">João</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/10 grid place-items-center">
                <span className="text-[13px] font-semibold text-[var(--color-gold)]">J</span>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-deep)] p-4 mb-4 text-[var(--color-ink)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide">Programa Fidelidade</span>
                <Star className="w-4 h-4" fill="currentColor" />
              </div>
              <div className="text-[22px] font-bold font-display leading-none mb-1">8 / 10 cortes</div>
              <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
                <div className="h-full bg-[var(--color-ink)] rounded-full" style={{ width: "80%" }} />
              </div>
              <div className="text-[10.5px] mt-2 opacity-80">2 cortes para o seu próximo brinde</div>
            </div>

            <div className="text-[12px] font-semibold text-white/60 uppercase tracking-wide mb-2">Próximo agendamento</div>
            <div className="rounded-2xl border border-white/10 p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-gold)]/15 grid place-items-center">
                  <Scissors className="w-4 h-4 text-[var(--color-gold)]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold">Corte + Barba</div>
                  <div className="text-[11px] text-white/50">com Carlos</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/70">
                <Calendar className="w-3 h-3" />
                <span>Sex, 16 de mai · 14h30</span>
              </div>
            </div>

            <div className="text-[12px] font-semibold text-white/60 uppercase tracking-wide mb-2">Serviços</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Corte", price: "R$ 45" },
                { name: "Barba", price: "R$ 30" },
                { name: "Combo", price: "R$ 65" },
                { name: "Sobrancelha", price: "R$ 15" },
              ].map((s) => (
                <div key={s.name} className="rounded-xl border border-white/10 p-2.5">
                  <div className="text-[12px] font-semibold">{s.name}</div>
                  <div className="text-[11px] text-[var(--color-gold)]">{s.price}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4">
              <button className="w-full rounded-xl bg-[var(--color-gold)] text-[var(--color-ink)] py-3 text-[13px] font-semibold">
                Agendar novo horário
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
