import type { ReactNode } from 'react';

type Props = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  /** Draws the brand navy→gold strip across the top edge of the card. */
  accent?: boolean;
  /** Lifts and outlines the card under the pointer — used on the dashboard. */
  hoverable?: boolean;
};

export function Card({ title, subtitle, action, children, padded = true, accent = false, hoverable = false }: Props) {
  const className = ['card', accent && 'card--accent', hoverable && 'card--hover'].filter(Boolean).join(' ');
  return (
    <section className={className}>
      {title ? (
        <header className="card__head">
          <div>
            <h2 className="card__title">{title}</h2>
            {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={padded ? 'card__body' : undefined}>{children}</div>
    </section>
  );
}
