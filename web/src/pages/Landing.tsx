import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageToggle from '../components/shared/LanguageToggle';
import { useI18n } from '../i18n';

const NAV_IDS = ['about', 'features', 'trust'] as const;

type LogoVariant = 'nav' | 'footer' | 'inline';

function Logo({
  variant = 'inline',
  className = '',
  alt,
}: {
  variant?: LogoVariant;
  className?: string;
  alt: string;
}) {
  const variantClass: Record<LogoVariant, string> = {
    nav: 'h-8 w-auto max-h-9 max-w-[min(38vw,150px)] sm:h-9 sm:max-w-[170px]',
    footer: 'h-auto w-full max-w-[160px] opacity-90',
    inline: className,
  };

  return (
    <img
      src="/finaudit-logo.png"
      alt={alt}
      className={`block object-contain object-center ${
        variant === 'inline' ? className : `${variantClass[variant]} ${className}`.trim()
      }`}
      decoding="async"
    />
  );
}

export default function Landing() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  const navItems = NAV_IDS.map((id) => ({
    id,
    label: t(`landing.nav.${id}`),
  }));

  const aboutBullets = [
    t('landing.about.bullet1'),
    t('landing.about.bullet2'),
    t('landing.about.bullet3'),
    t('landing.about.bullet4'),
  ];

  const featureCards = [
    { title: t('landing.features.card1Title'), desc: t('landing.features.card1Desc') },
    { title: t('landing.features.card2Title'), desc: t('landing.features.card2Desc') },
    { title: t('landing.features.card3Title'), desc: t('landing.features.card3Desc') },
    { title: t('landing.features.card4Title'), desc: t('landing.features.card4Desc') },
  ];

  const audienceItems = [
    t('landing.audience.item1'),
    t('landing.audience.item2'),
    t('landing.audience.item3'),
    t('landing.audience.item4'),
    t('landing.audience.item5'),
  ];

  const trustCards = [
    { title: t('landing.trust.card1Title'), desc: t('landing.trust.card1Desc') },
    { title: t('landing.trust.card2Title'), desc: t('landing.trust.card2Desc') },
    { title: t('landing.trust.card3Title'), desc: t('landing.trust.card3Desc') },
    { title: t('landing.trust.card4Title'), desc: t('landing.trust.card4Desc') },
  ];

  const langToggleClass = scrolled
    ? 'rounded-lg border border-[#0F2027]/20 bg-white px-3 py-2 font-mono text-xs font-semibold uppercase text-[#0F2027] transition hover:border-[#1D9E75] hover:text-[#1D9E75]'
    : 'rounded-lg border border-white/40 bg-white/10 px-3 py-2 font-mono text-xs font-semibold uppercase text-white backdrop-blur-sm transition hover:bg-white/20';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen scroll-smooth bg-white text-[#0F2027]">
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-[#0F2027]/10 bg-white/95 shadow-sm backdrop-blur-md'
            : 'bg-[#0F2027]/90 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center py-1">
            <Logo variant="nav" alt={t('landing.logoAlt')} />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`text-base font-medium transition ${
                  scrolled ? 'text-[#0F2027]/80 hover:text-[#1D9E75]' : 'text-white/90 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            ))}
            <LanguageToggle className={langToggleClass} />
            <Link
              to="/login"
              className={`rounded-lg px-5 py-2.5 text-base font-semibold transition ${
                scrolled
                  ? 'bg-[#1D9E75] text-white hover:bg-[#168a65]'
                  : 'bg-white text-[#0F2027] hover:bg-white/90'
              }`}
            >
              {t('auth.login')}
            </Link>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle className={langToggleClass} />
            <Link
              to="/login"
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                scrolled ? 'bg-[#1D9E75] text-white' : 'bg-white text-[#0F2027]'
              }`}
            >
              {t('auth.login')}
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20">
        <img
          src="/hero-accounting.png"
          alt={t('landing.hero.imageAlt')}
          className="animate-hero-fade absolute inset-0 h-full w-full object-cover object-[center_25%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(0, 31, 63, 0.88) 0%, rgba(15, 32, 39, 0.92) 50%, rgba(0, 120, 120, 0.35) 100%)',
          }}
        />

        <div className="animate-hero-content relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#5ee0c0] sm:text-base">
            {t('landing.hero.tagline')}
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {t('landing.hero.title')}
            <span className="block text-[#1D9E75]">{t('landing.hero.titleAccent')}</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl md:text-2xl">
            {t('landing.hero.subtitle')}
          </p>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:gap-5">
            <Link
              to="/login"
              className="inline-flex min-w-[220px] items-center justify-center rounded-lg bg-[#1D9E75] px-10 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-[#168a65] hover:shadow-xl"
            >
              {t('landing.hero.ctaPrimary')}
            </Link>
            <a
              href="#about"
              className="inline-flex min-w-[220px] items-center justify-center rounded-lg border-2 border-white/40 bg-white/10 px-10 py-4 text-lg font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              {t('landing.hero.ctaSecondary')}
            </a>
          </div>
        </div>

        <a
          href="#about"
          className="absolute bottom-10 z-10 text-white/60 transition hover:text-white"
          aria-label={t('landing.hero.scroll')}
        >
          <svg className="mx-auto h-8 w-8 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </section>

      <section id="about" className="border-t border-[#0F2027]/10 bg-[#F7F7F2] px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[#1D9E75]">{t('landing.about.label')}</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0F2027] sm:text-4xl md:text-5xl">
            {t('landing.about.title')}
          </h2>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-[#0F2027]/80 sm:text-xl">
            {t('landing.about.body')}
          </p>
          <ul className="mx-auto mt-12 grid max-w-2xl gap-4 text-left sm:grid-cols-2 sm:gap-6">
            {aboutBullets.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-lg border border-[#0F2027]/10 bg-white px-5 py-4 text-base font-medium text-[#0F2027] sm:text-lg"
              >
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="features" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-[#1D9E75]">
            {t('landing.features.label')}
          </p>
          <h2 className="mt-4 text-center text-3xl font-bold sm:text-4xl md:text-5xl">
            {t('landing.features.title')}
          </h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map(({ title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-[#0F2027]/10 bg-white p-8 shadow-sm transition hover:border-[#1D9E75]/50 hover:shadow-md"
              >
                <span className="inline-block h-1.5 w-12 rounded-full bg-[#1D9E75]" />
                <h3 className="mt-5 text-xl font-bold text-[#0F2027]">{title}</h3>
                <p className="mt-3 text-base leading-relaxed text-[#0F2027]/70">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#0F2027]/10 bg-white px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">{t('landing.audience.title')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-[#0F2027]/70">
            {t('landing.audience.subtitle')}
          </p>
          <ul className="mt-12 space-y-0 divide-y divide-[#0F2027]/10 rounded-xl border border-[#0F2027]/10 bg-[#F7F7F2]">
            {audienceItems.map((label) => (
              <li
                key={label}
                className="flex items-center gap-4 px-6 py-5 text-lg font-medium text-[#0F2027] sm:text-xl"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/15 text-sm font-bold text-[#1D9E75]">
                  ✓
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="trust" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl rounded-2xl bg-[#0F2027] p-10 text-white sm:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">{t('landing.trust.title')}</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/75 sm:text-xl">{t('landing.trust.subtitle')}</p>
          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            {trustCards.map(({ title, desc }) => (
              <div key={title} className="border-l-4 border-[#1D9E75] pl-6">
                <p className="text-xl font-bold">{title}</p>
                <p className="mt-2 text-base leading-relaxed text-white/70 sm:text-lg">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#0F2027]/10 bg-[#F7F7F2] px-6 py-20 sm:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Logo variant="footer" alt={t('landing.logoAlt')} />
          <h2 className="mt-8 text-3xl font-bold sm:text-4xl md:text-5xl">{t('landing.cta.title')}</h2>
          <p className="mt-4 text-lg text-[#0F2027]/70 sm:text-xl">{t('landing.cta.subtitle')}</p>
          <div className="mt-10 flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-[#1D9E75] px-10 py-4 text-lg font-semibold text-white transition hover:bg-[#168a65]"
            >
              {t('landing.cta.dashboard')}
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg border-2 border-[#0F2027]/20 bg-white px-10 py-4 text-lg font-semibold text-[#0F2027] transition hover:border-[#1D9E75]"
            >
              {t('landing.cta.login')}
            </Link>
          </div>
        </div>
        <footer className="mx-auto mt-16 max-w-6xl border-t border-[#0F2027]/10 pt-10 text-center text-base text-[#0F2027]/55">
          <p>{t('landing.cta.footer', { year: new Date().getFullYear() })}</p>
        </footer>
      </section>
    </div>
  );
}
