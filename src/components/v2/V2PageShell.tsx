import React from 'react';

interface V2PageShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const V2PageShell: React.FC<V2PageShellProps> = ({
  eyebrow,
  title,
  description,
  actions,
  children
}) => (
  <main id="main-content" className="flex-1 py-6 sm:py-8">
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 text-balance sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </section>
      {children}
    </div>
  </main>
);

export default V2PageShell;
