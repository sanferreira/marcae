import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  LineChart,
  MessageCircle,
  Plus,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import Logo from "../components/Logo";
import PhoneMockup from "../components/PhoneMockup";

const APP_WEB_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_APP_WEB_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8081";
  }

  return "";
})();

function appHref(path: string): string {
  return APP_WEB_BASE_URL ? `${APP_WEB_BASE_URL}${path}` : path;
}

const LOGIN_HREF = appHref("/login");
const REGISTER_SHOP_HREF = appHref("/register-shop");
const LEGAL_HREF = appHref("/legal");
const SUPPORT_HREF = import.meta.env.VITE_SUPPORT_URL?.trim() || "#faq";

const NAV = [
  { label: "Recursos", href: "#recursos" },
  { label: "Ramos", href: "#ramos" },
  { label: "Para quem é", href: "#papeis" },
  { label: "Preço", href: "#preco" },
  { label: "Dúvidas", href: "#faq" },
];

const NICHES = [
  {
    title: "Barbearia",
    body: "Cadeira, barbeiro e combo corte + barba separados.",
    rows: [
      { k: "Cadeira 2", v: "Caio" },
      { k: "Corte + barba", v: "R$ 80" },
      { k: "Duração", v: "50 min" },
    ],
  },
  {
    title: "Salão",
    body: "Coloração, química e retoque com tempo de pausa entre etapas.",
    rows: [
      { k: "Marina", v: "VIP · 6 visitas" },
      { k: "Coloração", v: "loiro 8.0 + matiz" },
      { k: "Próxima", v: "sex 14h · 2h" },
    ],
  },
  {
    title: "Estética",
    body: "Anamnese, pacotes vendidos pela equipe e ficha por sessão.",
    rows: [
      { k: "Fototipo", v: "III · Fitzpatrick" },
      { k: "Pacote", v: "axilas · 6/10" },
      { k: "Próxima", v: "qua 15h" },
    ],
  },
  {
    title: "Cílios",
    body: "Estilo, mapping, manutenção quinzenal e observações por atendimento.",
    rows: [
      { k: "Estilo", v: "volume russo D" },
      { k: "Manutenção", v: "a cada 18 dias" },
      { k: "Próxima", v: "ter 10h" },
    ],
  },
  {
    title: "Sobrancelha",
    body: "Design, henna, formato e ficha personalizada do cliente.",
    rows: [
      { k: "Design", v: "fio a fio" },
      { k: "Henna", v: "castanho médio" },
      { k: "Próxima", v: "qui 16h" },
    ],
  },
  {
    title: "Unha",
    body: "Esmaltação, gel, fibra e controle de manutenção.",
    rows: [
      { k: "Pacote", v: "gel mão + pé" },
      { k: "Manutenção", v: "21 dias" },
      { k: "Próxima", v: "sex 11h" },
    ],
  },
  {
    title: "Tatuagem",
    body: "Referência, região do corpo e orçamento por sessão.",
    rows: [
      { k: "Referência", v: "fine line" },
      { k: "Antebraço", v: "2 sessões" },
      { k: "Sessão", v: "R$ 650" },
    ],
  },
  {
    title: "Massagem",
    body: "Tipo, duração e ficha com pontos de tensão do cliente.",
    rows: [
      { k: "Modalidade", v: "relaxante" },
      { k: "Duração", v: "60 min" },
      { k: "Próxima", v: "sáb 09h" },
    ],
  },
];

const MARQUEE_ITEMS = [
  "Agenda inteligente",
  "Programa de fidelidade",
  "Gestão financeira",
  "Cadastro de clientes",
  "Comissões da equipe",
  "Notificações de agenda",
  "Catálogo de serviços",
  "Relatórios em tempo real",
];

const STATS = [
  { value: "3", label: "experiências: cliente, funcionário e admin" },
  { value: "20", label: "profissionais no plano Super" },
  { value: "48h", label: "regra para reagendar ou cancelar" },
  { value: "7 dias", label: "trial liberado" },
];

const FEATURES = [
  {
    icon: Calendar,
    title: "Agenda que se preenche sozinha",
    body: "Seus clientes agendam direto pelo app, escolhem profissional e horário. Adeus DM no Instagram.",
  },
  {
    icon: Star,
    title: "Fidelidade que volta sempre",
    body: "Pontos a cada atendimento e benefício configurável. O cliente vê o progresso no app.",
  },
  {
    icon: DollarSign,
    title: "Caixa, comissões e lucro",
    body: "Entradas, saídas e o que cada profissional faturou — fechamento do dia em um toque.",
  },
  {
    icon: Users,
    title: "Ficha completa do cliente",
    body: "Histórico, preferências, aniversário e quanto ele já gastou. Você lembra de tudo.",
  },
  {
    icon: Sparkles,
    title: "Catálogo de serviços vivo",
    body: "Crie serviços, pacotes, produtos e categorias. Ative, pause e ajuste preços quando precisar.",
  },
  {
    icon: LineChart,
    title: "Painel com o que importa",
    body: "Faturamento, top serviços, ocupação por profissional. Você decide com dado, não no achismo.",
  },
];

const ROLES = [
  {
    tag: "Cliente",
    title: "Marca o horário em 30 segundos",
    bullets: [
      "Escolhe serviço, profissional e horário",
      "Confirma presença e acompanha regras de reagendamento",
      "Acompanha pontos de fidelidade",
      "Vê o histórico de cada atendimento",
    ],
    accent: "from-[#ECE6D5] to-[#F5F1E8]",
  },
  {
    tag: "Funcionário",
    title: "Agenda do dia, comissões e clientes",
    bullets: [
      "Vê os horários do dia já organizados",
      "Marca atendimento como feito num toque",
      "Acompanha comissão em tempo real",
      "Registra observações e ficha da sessão",
    ],
    accent: "from-[#3F4F24] to-[#556B2F]",
    dark: true,
  },
  {
    tag: "Admin / Dono",
    title: "Controle total da operação",
    bullets: [
      "Painel com KPIs do faturamento e ocupação",
      "Cadastra equipe, serviços e clientes",
      "Fecha o caixa por dia, semana ou mês",
      "Acompanha lucro por forma de pagamento",
    ],
    accent: "from-[#ECE6D5] to-[#F5F1E8]",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Crie seu estabelecimento",
    body: "Cadastre nome, endereço e horário em 2 minutos. Seu negócio ganha um perfil só seu.",
  },
  {
    n: "02",
    title: "Adicione equipe e serviços",
    body: "Cadastre profissionais com comissão e monte o catálogo de serviços com preço e duração.",
  },
  {
    n: "03",
    title: "Compartilhe o link",
    body: "Mande o link de cadastro com o ID do estabelecimento. Clientes entram, criam conta e já conseguem agendar.",
  },
];

const FAQ = [
  {
    q: "Como funciona o pagamento?",
    a: "Você cria a conta e acessa o painel por 7 dias grátis. Antes do fim do trial, escolhe o plano e finaliza a assinatura com checkout seguro pela Stripe.",
  },
  {
    q: "Como meus clientes acessam?",
    a: "Você compartilha um link único do seu estabelecimento. O cliente abre, faz cadastro em segundos e já consegue agendar. Não precisa baixar nada complicado.",
  },
  {
    q: "Funciona em quantos celulares?",
    a: "O acesso funciona pelo navegador em celular e computador. Os logins de equipe dependem do plano: Base com 1 funcionário, Médio com 6 e Super com 20.",
  },
  {
    q: "E se eu já tenho clientes cadastrados em outro sistema?",
    a: "Você pode cadastrar manualmente, importar CSV de clientes e exportar os dados do estabelecimento quando precisar.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem fidelidade, sem multa. Cancela em um clique e seus dados ficam disponíveis para exportar.",
  },
  {
    q: "O programa de fidelidade é configurável?",
    a: "Sim. Você define quantos pontos cada serviço dá e qual benefício será exibido. O cliente acompanha o progresso no app.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <Nav />
      <Marquee />
      <main id="main">
        <Hero />
        <Stats />
        <Features />
        <Niches />
        <Roles />
        <HowItWorks />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-cream)]/85 border-b border-[var(--color-line-soft)]">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[14px] text-[var(--color-ink)]/75 hover:text-[var(--color-ink)] font-medium transition-colors">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <a href={LOGIN_HREF} className="text-[14px] font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold-deep)]">
            Entrar
          </a>
          <a href={REGISTER_SHOP_HREF} className="btn-primary text-sm" style={{ padding: "10px 18px" }}>
            Começar grátis
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2"
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <div className="space-y-1.5">
            <span className="block w-6 h-0.5 bg-[var(--color-ink)]" />
            <span className="block w-6 h-0.5 bg-[var(--color-ink)]" />
          </div>
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="md:hidden border-t border-[var(--color-line-soft)] bg-[var(--color-cream)] px-5 py-4 space-y-3">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block text-[15px] font-medium text-[var(--color-ink)]">
              {n.label}
            </a>
          ))}
          <a href={REGISTER_SHOP_HREF} onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
            Começar grátis <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </header>
  );
}

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="border-b border-[var(--color-line-soft)] bg-[var(--color-cream-dark)]/40 overflow-hidden">
      <div className="marquee-track flex whitespace-nowrap py-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 px-6 text-[13px] text-[var(--color-ink)]/70 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-gold-deep)]" />
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16 md:pb-28 grid md:grid-cols-[1.1fr_1fr] gap-12 md:gap-8 items-center">
        <div>
          <div className="chip mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] pulse-dot" />
            7 dias grátis para configurar tudo
          </div>
          <h1 className="font-display font-bold text-[44px] md:text-[68px] leading-[0.95] tracking-tight text-[var(--color-ink)]">
            Sua agenda,
            <br />
            <span className="relative inline-block">
              no automático.
              <svg viewBox="0 0 320 18" className="absolute left-0 -bottom-2 w-full" preserveAspectRatio="none">
                <path d="M2,12 C 80,2 240,2 318,12" stroke="var(--color-gold)" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-7 text-[17px] md:text-[19px] text-[var(--color-muted)] leading-relaxed max-w-[520px]">
            Agenda, clientes, financeiro e fidelidade no mesmo app. Pra barbearia, salão, estética, cílios, sobrancelha, unha, tatuagem, massagem — qualquer profissional que marca hora. O Marcaê cuida da bagunça pra você cuidar do cliente.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={REGISTER_SHOP_HREF} className="btn-primary">
              Cadastrar meu estabelecimento
              <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#como-funciona" className="btn-secondary">
              Ver como funciona
            </a>
          </div>
          <div className="mt-8 flex items-center gap-5">
            <div className="flex -space-x-2">
              {["#556B2F", "#C49A4A", "#3F4F24", "#A07A30"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--color-cream)]" style={{ background: c }} />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-[var(--color-gold)]" fill="currentColor" />
                ))}
              </div>
              <div className="text-[12px] text-[var(--color-muted)]">Trial liberado para configurar antes de assinar</div>
            </div>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <PhoneMockup />
        </div>
      </div>

      {/* subtle gold gradient bg blob */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(85,107,47,.18), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(196,154,74,.20), transparent 70%)" }} />
    </section>
  );
}

function Stats() {
  return (
    <section className="border-y border-[var(--color-line)] bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="font-display font-bold text-[36px] md:text-[44px] leading-none text-[var(--color-ink)]">
              {s.value}
            </div>
            <div className="mt-2 text-[13px] md:text-[14px] text-[var(--color-muted)] leading-snug">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="recursos" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mb-12 md:mb-16">
          <span className="section-eyebrow">Tudo num app só</span>
          <h2 className="font-display font-bold text-[36px] md:text-[52px] leading-[1] text-[var(--color-ink)]">
            Pare de juntar planilha, caderno e WhatsApp.
          </h2>
          <p className="mt-5 text-[17px] text-[var(--color-muted)] leading-relaxed">
            Tudo que o seu estabelecimento precisa, no lugar que faz sentido. Sem plugin, sem integração esquisita.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-soft p-7 hover:border-[var(--color-gold)] transition-colors">
                <div className="w-11 h-11 rounded-xl bg-[var(--color-gold-soft)]/40 grid place-items-center mb-5">
                  <Icon className="w-5 h-5 text-[var(--color-gold-deep)]" strokeWidth={2} />
                </div>
                <h3 className="font-display font-semibold text-[20px] text-[var(--color-ink)] mb-2">
                  {f.title}
                </h3>
                <p className="text-[14.5px] text-[var(--color-muted)] leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Niches() {
  return (
    <section id="ramos" className="py-20 md:py-28 bg-[var(--color-cream-dark)]/50">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mb-12 md:mb-16">
          <span className="section-eyebrow">Feito pro seu ramo</span>
          <h2 className="font-display font-bold text-[36px] md:text-[52px] leading-[1] text-[var(--color-ink)]">
            Cada ramo tem suas manias. O Marcaê respeita.
          </h2>
          <p className="mt-5 text-[17px] text-[var(--color-muted)] leading-relaxed">
            O núcleo é o mesmo — a ficha do cliente e os campos de cada atendimento se ajustam ao que você atende.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {NICHES.map((n) => (
            <div
              key={n.title}
              className="card-soft p-6 flex flex-col hover:border-[var(--color-olive)] transition-colors"
            >
              <h3 className="font-display font-bold text-[20px] text-[var(--color-ink)] mb-2">
                {n.title}
              </h3>
              <p className="text-[13.5px] text-[var(--color-muted)] leading-relaxed mb-5">
                {n.body}
              </p>
              <div className="mt-auto rounded-2xl bg-[var(--color-cream)] border border-[var(--color-line-soft)] p-4 space-y-2">
                {n.rows.map((r, i) => (
                  <div
                    key={r.k}
                    className={`flex items-baseline justify-between gap-3 ${i > 0 ? "pt-2 border-t border-[var(--color-line-soft)]" : ""}`}
                  >
                    <span className="text-[11.5px] uppercase tracking-wider text-[var(--color-muted)] font-medium">
                      {r.k}
                    </span>
                    <span className="text-[13px] text-[var(--color-ink)] font-semibold text-right">
                      {r.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-[14px] text-[var(--color-muted)]">
          Não viu seu ramo aqui? <a href={REGISTER_SHOP_HREF} className="text-[var(--color-olive)] font-semibold hover:underline">Comece no trial mesmo assim</a> — o Marcaê funciona pra qualquer profissional que marca hora.
        </p>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section id="papeis" className="py-20 md:py-28 bg-[var(--color-cream-dark)]/50">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mb-12 md:mb-16">
          <span className="section-eyebrow">Para quem é</span>
          <h2 className="font-display font-bold text-[36px] md:text-[52px] leading-[1] text-[var(--color-ink)]">
            Três experiências, um sistema só.
          </h2>
          <p className="mt-5 text-[17px] text-[var(--color-muted)] leading-relaxed">
            Cliente, funcionário e dono — cada um vê o que precisa, do jeito que precisa.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {ROLES.map((r) => (
            <div
              key={r.tag}
              className={`rounded-3xl p-7 border ${r.dark ? "border-[#1a1a1a] text-white" : "border-[var(--color-line)] text-[var(--color-ink)]"} bg-gradient-to-br ${r.accent} flex flex-col`}
            >
              <div className={`inline-block self-start text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-6 ${r.dark ? "bg-[var(--color-gold)] text-[var(--color-ink)]" : "bg-[var(--color-ink)] text-[var(--color-gold)]"}`}>
                {r.tag}
              </div>
              <h3 className="font-display font-bold text-[26px] leading-tight mb-5">
                {r.title}
              </h3>
              <ul className="space-y-3 mt-auto">
                {r.bullets.map((b) => (
                  <li key={b} className={`flex items-start gap-2.5 text-[14.5px] ${r.dark ? "text-white/85" : "text-[var(--color-ink)]/80"}`}>
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${r.dark ? "text-[var(--color-gold)]" : "text-[var(--color-gold-deep)]"}`} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mb-12 md:mb-16">
          <span className="section-eyebrow">Como funciona</span>
          <h2 className="font-display font-bold text-[36px] md:text-[52px] leading-[1] text-[var(--color-ink)]">
            Em poucos minutos seu estabelecimento está no ar.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="card-soft p-7 relative overflow-hidden">
              <div className="font-display font-bold text-[64px] leading-none text-[var(--color-gold)]/25 absolute top-4 right-5">
                {s.n}
              </div>
              <div className="relative">
                <h3 className="font-display font-semibold text-[22px] text-[var(--color-ink)] mb-3 mt-2">
                  {s.title}
                </h3>
                <p className="text-[14.5px] text-[var(--color-muted)] leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mini feature row */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Smartphone, label: "Funciona no celular do cliente" },
            { icon: ShieldCheck, label: "Dados protegidos por padrão" },
            { icon: Zap, label: "Atualizações automáticas" },
            { icon: MessageCircle, label: "Suporte humano via WhatsApp" },
          ].map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.label} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--color-line)] bg-white">
                <Icon className="w-4 h-4 text-[var(--color-gold-deep)]" />
                <span className="text-[13px] text-[var(--color-ink)] font-medium">{it.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const PRICING_PLANS = [
  {
    key: "base",
    badge: "Plano base",
    name: "Base",
    price: "59,90",
    summary: "Para começar com agenda, clientes, financeiro e uma equipe enxuta.",
    highlight: false,
    features: [
      "Agenda online e painel administrativo",
      "Até 2 profissionais na agenda",
      "1 login de funcionário",
      "Clientes e serviços sem limite",
      "Financeiro essencial",
      "Fidelidade configurável",
      "Suporte por WhatsApp",
    ],
  },
  {
    key: "medio",
    badge: "Mais escolhido",
    name: "Medio",
    price: "89,90",
    summary: "Para equipes que precisam acompanhar comissões, notificações e resultado.",
    highlight: true,
    features: [
      "Tudo do plano Base",
      "Até 6 profissionais",
      "6 logins de funcionários",
      "Comissões por profissional",
      "Notificações push da agenda",
      "Relatórios de faturamento",
      "Prioridade no suporte",
    ],
  },
  {
    key: "super",
    badge: "Completo",
    name: "Super",
    price: "129,90",
    summary: "Para operações que querem acompanhamento mais próximo e prioridade.",
    highlight: false,
    features: [
      "Tudo do plano Medio",
      "Até 20 profissionais",
      "20 logins de funcionários",
      "Onboarding assistido",
      "Revisão de operação e agenda",
      "Prioridade máxima no suporte",
      "Insights avançados de operação",
      "Acima de 20? Fale com suporte",
    ],
  },
] as const;

function Pricing() {
  return (
    <section id="preco" className="py-20 md:py-28 bg-[var(--color-cream-dark)]/50">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="section-eyebrow">Preço justo</span>
          <h2 className="font-display font-bold text-[36px] md:text-[52px] leading-[1] text-[var(--color-ink)]">
            Planos para cada fase do seu negócio.
          </h2>
          <p className="mt-5 text-[17px] text-[var(--color-muted)] leading-relaxed">
            Comece no Base por R$59,90 e suba quando precisar de mais acompanhamento, relatórios e prioridade.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-3xl p-7 md:p-8 border ${
                plan.highlight
                  ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-2xl"
                  : "bg-white text-[var(--color-ink)] border-[var(--color-line)]"
              }`}
              style={plan.highlight ? { boxShadow: "0 40px 80px -30px rgba(12,12,12,.4)" } : undefined}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wider mb-4 ${plan.highlight ? "text-[var(--color-gold)]" : "text-[var(--color-gold-deep)]"}`}>
                {plan.badge}
              </div>
              <h3 className="font-display font-bold text-[30px] leading-none">{plan.name}</h3>
              <p className={`mt-3 text-[14.5px] leading-relaxed min-h-[66px] ${plan.highlight ? "text-white/70" : "text-[var(--color-muted)]"}`}>
                {plan.summary}
              </p>

              <div className="flex items-baseline gap-1 my-7">
                <span className={`text-[21px] font-medium ${plan.highlight ? "text-white/60" : "text-[var(--color-muted)]"}`}>R$</span>
                <span className="font-display font-bold text-[58px] leading-none">{plan.price}</span>
                <span className={`text-[15px] ml-1 ${plan.highlight ? "text-white/60" : "text-[var(--color-muted)]"}`}>/mês</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((it) => (
                  <li key={it} className={`flex items-start gap-3 text-[14px] ${plan.highlight ? "text-white/90" : "text-[var(--color-ink)]"}`}>
                    <CheckCircle2 className="w-4 h-4 mt-1 shrink-0 text-[var(--color-gold)]" />
                    {it}
                  </li>
                ))}
              </ul>

              <a href={REGISTER_SHOP_HREF} className="block w-full text-center btn-primary justify-center">
                Começar no trial
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-[var(--color-muted)]">
          <CreditCard className="w-3.5 h-3.5" />
          7 dias grátis, checkout seguro pela Stripe e cancelamento pelo portal
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <div className="text-center mb-12 md:mb-16">
          <span className="section-eyebrow">Perguntas frequentes</span>
          <h2 className="font-display font-bold text-[36px] md:text-[52px] leading-[1] text-[var(--color-ink)]">
            Tudo que você quer saber.
          </h2>
        </div>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const id = q.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 32);
  const btnId = `faq-btn-${id}`;
  const panelId = `faq-panel-${id}`;
  return (
    <div className="card-soft overflow-hidden">
      <button
        id={btnId}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="font-display font-semibold text-[17px] text-[var(--color-ink)]">{q}</span>
        <span className={`transition-transform shrink-0 ${open ? "rotate-45" : ""}`} aria-hidden="true">
          <Plus className="w-5 h-5 text-[var(--color-gold-deep)]" strokeWidth={2.5} />
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={btnId}
          className="px-6 pb-5 -mt-1 text-[15px] text-[var(--color-muted)] leading-relaxed"
        >
          {a}
        </div>
      )}
    </div>
  );
}

function FinalCta() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="rounded-[32px] bg-[var(--color-ink)] text-white p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(196,154,74,.28), transparent 70%)" }} />
          <div className="absolute -bottom-32 -left-24 w-[340px] h-[340px] rounded-full" style={{ background: "radial-gradient(circle, rgba(85,107,47,.22), transparent 70%)" }} />
          <div className="relative">
            <Settings2 className="w-8 h-8 text-[var(--color-gold)] mx-auto mb-6" />
            <h2 className="font-display font-bold text-[36px] md:text-[56px] leading-[1] tracking-tight">
              Seu negócio merece
              <br />
              <span className="text-[var(--color-gold)]">um sistema de verdade.</span>
            </h2>
            <p className="mt-6 text-[17px] text-white/70 max-w-xl mx-auto">
              Comece agora com 7 dias grátis, sem instalar nada. Seu estabelecimento fica pronto para receber agendamentos.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={REGISTER_SHOP_HREF} className="btn-primary">
                Cadastrar meu estabelecimento
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#faq" className="text-[14px] font-semibold text-white/80 hover:text-white px-4 py-3">
                Tirar dúvidas
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
        <div>
          <Logo />
          <p className="mt-4 text-[13.5px] text-[var(--color-muted)] max-w-xs leading-relaxed">
            O sistema completo pra quem marca hora: agenda, clientes, financeiro e fidelidade num app só.
          </p>
        </div>
        <FooterCol
          title="Produto"
          items={[
            { label: "Recursos", href: "#recursos" },
            { label: "Para quem é", href: "#papeis" },
            { label: "Preço", href: "#preco" },
            { label: "Como funciona", href: "#como-funciona" },
          ]}
        />
        <FooterCol
          title="Suporte"
          items={[
            { label: "Dúvidas frequentes", href: "#faq" },
            { label: "Falar com suporte", href: SUPPORT_HREF },
            { label: "Entrar no sistema", href: LOGIN_HREF },
            { label: "Criar estabelecimento", href: REGISTER_SHOP_HREF },
          ]}
        />
        <FooterCol
          title="Legal"
          items={[
            { label: "Termos de uso", href: LEGAL_HREF },
            { label: "Política de privacidade", href: LEGAL_HREF },
            { label: "LGPD", href: LEGAL_HREF },
          ]}
        />
      </div>
      <div className="border-t border-[var(--color-line-soft)]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-[var(--color-muted)]">
          <div>© {new Date().getFullYear()} Marcaê. Todos os direitos reservados.</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] pulse-dot" />
            Todos os sistemas operacionais
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="font-display font-semibold text-[14px] text-[var(--color-ink)] mb-4">{title}</div>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.label}>
            <a href={it.href} className="text-[13.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors">
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
