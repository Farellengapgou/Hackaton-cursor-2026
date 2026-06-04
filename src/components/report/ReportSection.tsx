import type { ReactNode } from 'react';

interface ReportSectionProps {
  title: string;
  children: ReactNode;
}

export default function ReportSection({ title, children }: ReportSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 border-b border-primary/30 pb-2 text-sm font-bold uppercase tracking-widest text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}
