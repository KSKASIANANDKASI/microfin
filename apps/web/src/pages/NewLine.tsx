import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon } from '../components/icons';
import {
  FREQUENCIES,
  MONTH_DAYS,
  OFFICERS,
  WEEKDAYS,
  monthDayLabel,
  officerLabel,
  weekdayLabel,
  type Frequency,
} from '../lib/data';

type Errors = { name?: string; schedule?: string };

export function NewLine() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [schedule, setSchedule] = useState('');
  const [officer, setOfficer] = useState(OFFICERS[OFFICERS.length - 1]!);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const selected = FREQUENCIES.find((f) => f.id === frequency)!;
  const needsSchedule = selected.schedule !== 'none';
  const byWeekday = selected.schedule === 'weekday';
  const options = byWeekday ? WEEKDAYS : MONTH_DAYS;
  const optionLabel = byWeekday ? weekdayLabel : monthDayLabel;

  function pickFrequency(next: Frequency) {
    setFrequency(next);
    setSchedule(''); // the previous answer means nothing under a new frequency
    setErrors((e) => ({ ...e, schedule: undefined }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {
      name: name.trim() ? undefined : t('validation.required', { label: t('lines.form.name') }),
      schedule:
        needsSchedule && !schedule
          ? byWeekday
            ? t('lines.form.dayRequired')
            : t('lines.form.dateRequired')
          : undefined,
    };
    setErrors(next);
    if (next.name || next.schedule) return;

    setSubmitting(true);
    // UI-only for now: POST /lines goes here.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSubmitting(false);
    navigate('/lines');
  }

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to="/lines">
          <ArrowLeftIcon size={14} /> {t('common.nav.lines')}
        </Link>
        <h1 className="pagehead__title">{t('common.screens.newLine')}</h1>
        <p className="pagehead__sub">{t('lines.form.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <div className="stack">
            <TextField
              label={t('lines.form.name')}
              placeholder="Line 08 · Ambattur"
              value={name}
              error={errors.name}
              hint={t('lines.form.nameHint')}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <fieldset className="fieldset">
              <legend>{t('lines.form.frequency')}</legend>
              <div className="freqgrid" role="radiogroup" aria-label={t('lines.form.frequency')}>
                {FREQUENCIES.map((option) => (
                  <label
                    key={option.id}
                    className={`freqcard${frequency === option.id ? ' freqcard--on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      value={option.id}
                      checked={frequency === option.id}
                      onChange={() => pickFrequency(option.id)}
                    />
                    <span className="freqcard__body">
                      <span className="freqcard__label">
                        {option.label}
                        {frequency === option.id ? <CheckIcon size={15} /> : null}
                      </span>
                      <span className="freqcard__hint">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {needsSchedule ? (
              <div className="field">
                <label htmlFor="schedule">
                  {byWeekday ? t('lines.form.day') : t('lines.form.date')}
                </label>
                <div className={`select select--block${errors.schedule ? ' select--invalid' : ''}`}>
                  <select
                    id="schedule"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    aria-invalid={errors.schedule ? true : undefined}
                  >
                    <option value="">
                      {byWeekday ? t('lines.form.dayPlaceholder') : t('lines.form.datePlaceholder')}
                    </option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {optionLabel(option)}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
                {errors.schedule ? (
                  <span className="field__error" role="alert">
                    {errors.schedule}
                  </span>
                ) : (
                  <span className="field__hint">
                    {byWeekday
                      ? t('lines.form.dayHint')
                      : t('lines.form.dateHint', { lastDay: t('common.lastDayOfMonth') })}
                  </span>
                )}
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="officer">{t('lines.form.officer')}</label>
              <div className="select select--block">
                <select id="officer" value={officer} onChange={(e) => setOfficer(e.target.value)}>
                  {OFFICERS.map((option) => (
                    <option key={option} value={option}>
                      {officerLabel(option)}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon />
              </div>
              <span className="field__hint">{t('lines.form.officerHint')}</span>
            </div>
          </div>
        </Card>

        <div className="formactions">
          <Link className="btn btn--sm btn--ghost" to="/lines">
            {t('common.actions.cancel')}
          </Link>
          <Button type="submit" loading={submitting}>
            {t('lines.form.create')}
          </Button>
        </div>
      </form>
    </>
  );
}
