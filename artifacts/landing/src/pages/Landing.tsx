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
  Scissors,
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

const NAV = [
  { label: "Recursos", href: "#recursos" },
  { label: "Para quem é", href: "#papeis" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Preço", href: "#preco" },
  { label: "Dúvidas", href: "#faq" },
];

const MARQUEE_ITEMS = [
  "Agenda inteligente",
  "Programa de fidelidade",
  "Gestão financeira",
  "Cadastro de clientes",
  "Comissões da equipe",
  "Notificações automáticas",
  "Catálogo de serviços",
  "Relatórios em tempo real",
];

const STATS = [
  { value: "+340", label: "barbearias usam todo dia" },
  { value: "98%", label: "agendamentos sem ligação" },
  { value: "2,4x", label: "mais retenção de clientes" },
  { value: "7 dias", label: "grátis, sem cartão" },
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
    body: "Pontos a cada corte, brindes automáticos. O cliente vê o progresso e marca o próximo.",
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
    icon: Scissors,
    title: "Catálogo de serviços vivo",
    body: "Crie combos, ative ou pause serviços, ajuste preços. Tudo aparece no app na hora.",
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
      "Recebe lembretes e confirma na hora",
      "Acompanha pontos de fidelidade",
      "Vê o histórico de cada corte",
    ],
    accent: "from-[#F1ECE3] to-[#FAF7F2]",
  },
  {
    tag: "Funcionário",
    title: "Agenda do dia, comissões e clientes",
    bullets: [
      "Vê os horários do dia já organizados",
      "Marca atendimento como feito num toque",
      "Acompanha comissão em tempo real",
      "Acessa histórico do cliente antes do corte",
    ],
    accent: "from-[#0C0C0C] to-[#1A1A1A]",
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
    accent: "from-[#F1ECE3] to-[#FAF7F2]",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Crie sua barbearia",
    body: "Cadastre nome, endereço e horário em 2 minutos. Sua barbearia ganha um perfil só seu.",
  },
  {
    n: "02",
    title: "Adicione equipe e serviços",
    body: "Cadastre profissionais com comissão e monte o catálogo de serviços com preço e duração.",
  },
  {
    n: "03",
    title: "Compartilhe o link",
    body: "Mande o link da sua barbearia no Instagram, WhatsApp e Google. Os agendamentos começam a chegar.",
  },
];

const FAQ = [
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. Você tem 7 dias grátis para usar tudo, sem cadastrar cartão. Se gostar, ativa o plano. Se não, é só não fazer nada.",
  },
  {
    q: "Como meus clientes acessam?",
    a: "Você compartilha um link único da sua barbearia. O cliente abre, faz cadastro em segundos e já consegue agendar. Não precisa baixar nada complicado.",
  },
  {
    q: "Funciona em quantos celulares?",
    a: "Quantos quiserem. Cada profissional tem o próprio login, e você (admin) acompanha tudo do seu lado. Sem limite de funcionários.",
  },
  {
    q: "E se eu já tenho clientes cadastrados em outro sistema?",
    a: "Você pode cadastrar manualmente ou importar uma lista. Nossa equipe te ajuda na migração — sem custo.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem fidelidade, sem multa. Cancela em um clique e seus dados ficam disponíveis para exportar.",
  },
  {
    q: "O programa de fidelidade é configurável?",
    a: "Sim. Você define quantos pontos cada serviço dá e qual o prêmio. O cliente vê o progresso no app e o sistema avisa quando ele bate a meta.",
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
          <a href="/login" className="text-[14px] font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold-deep)]">
            Entrar
          </a>
          <a href="/register-shop" className="btn-primary text-sm" style={{ padding: "10px 18px" }}>
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
          <a href="/register-shop" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
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
            7 dias grátis · sem cartão
          </div>
          <h1 className="font-display font-bold text-[44px] md:text-[68px] leading-[0.95] tracking-tight text-[var(--color-ink)]">
            Sua barbearia,
            <br />
            <span className="relative inline-block">
              no automático.
              <svg viewBox="0 0 320 18" className="absolute left-0 -bottom-2 w-full" preserveAspectRatio="none">
                <path d="M2,12 C 80,2 240,2 318,12" stroke="var(--color-gold)" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-7 text-[17px] md:text-[19px] text-[var(--color-muted)] leading-relaxed max-w-[520px]">
            Agenda, clientes, financeiro e fidelidade no mesmo app. O BarberPro cuida da bagunça pra você cuidar do que importa: cortar cabelo.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/register-shop" className="btn-primary">
              Cadastrar minha barbearia · 7 dias grátis
              <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#como-funciona" className="btn-secondary">
              Ver como funciona
            </a>
          </div>
          <div className="mt-8 flex items-center gap-5">
            <div className="flex -space-x-2">
              {["#C9A96E", "#0C0C0C", "#A8884E", "#1A1A1A"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--color-cream)]" style={{ background: c }} />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-[var(--color-gold)]" fill="currentColor" />
                ))}
              </div>
              <div className="text-[12px] text-[var(--color-muted)]">+340 barbearias usam o BarberPro</div>
            </div>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <PhoneMockup />
        </div>
      </div>

      {/* subtle gold gradient bg blob */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(201,169,110,.18), transparent 70%)" }} />
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
            Tudo que sua barbearia precisa, no lugar que faz sentido. Sem plugin, sem integração esquisita.
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
            Em 5 minutos sua barbearia está no ar.
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

function Pricing() {
  return (
    <section id="preco" className="py-20 md:py-28 bg-[var(--color-cream-dark)]/50">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="section-eyebrow">Preço justo</span>
          <h2 className="font-display font-bold text-[36px] md:text-[52px] leading-[1] text-[var(--color-ink)]">
            Um plano. Tudo incluso.
          </h2>
          <p className="mt-5 text-[17px] text-[var(--color-muted)] leading-relaxed">
            Sem pegadinha, sem cobrar por funcionário, sem limite de agendamentos.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="relative rounded-3xl bg-[var(--color-ink)] text-white p-8 md:p-10 shadow-2xl" style={{ boxShadow: "0 40px 80px -30px rgba(12,12,12,.4)" }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-gold)] text-[var(--color-ink)] text-[11px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
              Plano único
            </div>

            <div className="text-center mb-8">
              <div className="font-display font-semibold text-[15px] text-[var(--color-gold)] uppercase tracking-wider mb-3">
                BarberPro Completo
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[28px] font-medium text-white/60">R$</span>
                <span className="font-display font-bold text-[80px] leading-none">59</span>
                <span className="text-[16px] text-white/60 ml-1">/mês</span>
              </div>
              <div className="mt-3 text-[13px] text-white/60">
                7 dias grátis · cancele quando quiser
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Agenda ilimitada por profissional",
                "Cadastro ilimitado de clientes",
                "Programa de fidelidade configurável",
                "Gestão financeira e comissões",
                "Catálogo de serviços ilimitado",
                "Acesso de cliente, funcionário e admin",
                "Suporte por WhatsApp",
                "Atualizações inclusas",
              ].map((it) => (
                <li key={it} className="flex items-start gap-3 text-[14.5px] text-white/90">
                  <CheckCircle2 className="w-4 h-4 mt-1 shrink-0 text-[var(--color-gold)]" />
                  {it}
                </li>
              ))}
            </ul>

            <a href="/register-shop" className="block w-full text-center btn-primary justify-center">
              Começar agora
              <ArrowRight className="w-4 h-4" />
            </a>
            <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-white/50">
              <CreditCard className="w-3.5 h-3.5" />
              Sem precisar de cartão para testar
            </div>
          </div>
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
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(201,169,110,.25), transparent 70%)" }} />
          <div className="relative">
            <Settings2 className="w-8 h-8 text-[var(--color-gold)] mx-auto mb-6" />
            <h2 className="font-display font-bold text-[36px] md:text-[56px] leading-[1] tracking-tight">
              Sua barbearia merece
              <br />
              <span className="text-[var(--color-gold)]">um sistema de verdade.</span>
            </h2>
            <p className="mt-6 text-[17px] text-white/70 max-w-xl mx-auto">
              Comece agora, sem cartão, sem instalar nada. Em 5 minutos sua barbearia está pronta para receber agendamentos.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="/register-shop" className="btn-primary">
                Cadastrar minha barbearia
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
            O sistema completo da sua barbearia: agenda, clientes, financeiro e fidelidade num app só.
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
            { label: "Central de ajuda", href: "#" },
            { label: "WhatsApp", href: "#" },
            { label: "Contato", href: "#" },
            { label: "Status", href: "#" },
          ]}
        />
        <FooterCol
          title="Legal"
          items={[
            { label: "Termos de uso", href: "#" },
            { label: "Política de privacidade", href: "#" },
            { label: "LGPD", href: "#" },
          ]}
        />
      </div>
      <div className="border-t border-[var(--color-line-soft)]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-[var(--color-muted)]">
          <div>© {new Date().getFullYear()} BarberPro. Todos os direitos reservados.</div>
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

