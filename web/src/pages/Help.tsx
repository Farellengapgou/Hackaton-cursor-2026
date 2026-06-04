import { useState } from 'react';
import { useI18n } from '../i18n';
import GlassPanel from '../components/shared/GlassPanel';

export default function Help() {
  const { t } = useI18n();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const faqKeys = ['import', 'risk', 'anomalies'] as const;
  const guideSteps = ['step1', 'step2', 'step3', 'step4'] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setSubject('');
    setMessage('');
  };

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-themed-fg">{t('help.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('help.subtitle')}</p>
      </div>

      <GlassPanel className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-themed-fg">{t('help.faqTitle')}</h3>
        <div className="space-y-4">
          {faqKeys.map((key) => (
            <details key={key} className="group rounded-lg border border-themed p-4">
              <summary className="cursor-pointer text-sm font-medium text-themed-fg">
                {t(`help.faq.${key}.q`)}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t(`help.faq.${key}.a`)}</p>
            </details>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-themed-fg">{t('help.guideTitle')}</h3>
        <ol className="space-y-3">
          {guideSteps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-themed-fg/85">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-xs font-bold text-primary">
                {i + 1}
              </span>
              {t(`help.guide.${step}`)}
            </li>
          ))}
        </ol>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-themed-fg">{t('help.supportTitle')}</h3>
        {sent ? (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {t('help.support.success')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-muted">
                {t('help.support.subject')}
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-muted">
                {t('help.support.message')}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              {t('help.support.submit')}
            </button>
          </form>
        )}
      </GlassPanel>
    </div>
  );
}
