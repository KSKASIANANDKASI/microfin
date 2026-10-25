import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { t } from '@lms/i18n';
import { FormError } from '../components/FormError';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GeoField, type Geo } from '../components/GeoField';
import { ArrowLeftIcon } from '../components/icons';
import { customerById, lineById, saveGeo } from '../lib/data';
import { errorMessage } from '../lib/session';
import { usePortfolio } from '../lib/usePortfolio';

/** Pin, move or clear an existing customer's doorstep. */
export function CustomerLocation() {
  usePortfolio();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const customer = customerById(id);

  const [geo, setGeo] = useState<Geo | undefined>(
    customer?.geo ? { lat: customer.geo.lat, lng: customer.geo.lng, accuracy: customer.geo.accuracy } : undefined,
  );
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  if (!customer) {
    return (
      <>
        <div className="pagehead">
          <Link className="backlink" to="/customers">
            <ArrowLeftIcon size={14} /> {t('customers.list.title')}
          </Link>
          <h1 className="pagehead__title">{t('common.screens.doorstepPin')}</h1>
        </div>
        <Card>
          <p className="empty">{t('customers.view.notFound')}</p>
        </Card>
      </>
    );
  }

  const back = `/customers/${customer.id}`;
  const saved = customer.geo;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (invalid) {
      setError(t('common.geo.invalid'));
      return;
    }

    // An untouched pin keeps its original capture time.
    const unchanged = geo && saved ? geo.lat === saved.lat && geo.lng === saved.lng : !geo && !saved;
    if (unchanged) {
      navigate(back);
      return;
    }

    setSubmitting(true);
    setSaveError(undefined);
    try {
      await saveGeo(id, geo);
    } catch (error) {
      setSaveError(errorMessage(error));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    navigate(back);
  }

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to={back}>
          <ArrowLeftIcon size={14} /> {customer.name}
        </Link>
        <h1 className="pagehead__title">{t('common.screens.doorstepPin')}</h1>
        <p className="pagehead__sub">
          {customer.name} · {customer.phone} · {lineById(customer.lineId)?.name}
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card title={t('customers.view.address')} subtitle={customer.address}>
          <GeoField
            value={geo}
            error={error}
            savedNote={
              saved
                ? saved.accuracy
                  ? t('customers.view.accuracyAt', { metres: saved.accuracy, time: saved.capturedAt })
                  : saved.capturedAt
                : undefined
            }
            onChange={(next, bad) => {
              setGeo(next);
              setInvalid(bad);
              setError(undefined);
            }}
          />
        </Card>

        <FormError message={saveError} />
        <div className="formactions">
          <Link className="btn btn--sm btn--ghost" to={back}>
            {t('common.actions.cancel')}
          </Link>
          <Button type="submit" loading={submitting}>
            {geo || !saved ? t('customers.location.save') : t('customers.location.remove')}
          </Button>
        </div>
      </form>
    </>
  );
}
