import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { t } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ImageField } from '../components/ImageField';
import { TextField } from '../components/TextField';
import { ArrowLeftIcon, ChevronDownIcon, IdIcon } from '../components/icons';
import {
  ID_TYPES,
  customerById,
  idTypeById,
  idTypeLabel,
  lineById,
  maskIdNumber,
  saveProof,
  type IdType,
  type ProofImage,
} from '../lib/data';
import { normalizeIdNumber, validateIdNumber } from '../lib/validate';

type Errors = {
  type?: string;
  number?: string;
  front?: string;
  back?: string;
};

export function CustomerProof() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  // Set when opened from an application review, so saving goes straight back to it.
  const [params] = useSearchParams();
  const returnTo = params.get('return');
  const customer = customerById(id);

  const [type, setType] = useState<IdType | ''>(customer?.proof?.type ?? '');
  const [number, setNumber] = useState(customer?.proof?.number ?? '');
  const [front, setFront] = useState<ProofImage | undefined>(customer?.proof?.front);
  const [back, setBack] = useState<ProofImage | undefined>(customer?.proof?.back);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!customer) {
    return (
      <>
        <div className="pagehead">
          <Link className="backlink" to="/customers">
            <ArrowLeftIcon size={14} /> {t('customers.list.title')}
          </Link>
          <h1 className="pagehead__title">{t('common.screens.identityProof')}</h1>
        </div>
        <Card>
          <p className="empty">{t('customers.view.notFound')}</p>
        </Card>
      </>
    );
  }

  const selected = idTypeById(type);
  // Aadhaar is digits and spaces; every other ID mixes letters and digits.
  const numeric = type === 'AADHAAR';

  function onTypeChange(next: IdType | '') {
    setType(next);
    // The number that was typed belongs to the old ID — its shape almost never
    // survives the switch, so clear it rather than flag it as invalid.
    if (next !== type) setNumber('');
    setErrors((e) => ({ ...e, type: undefined, number: undefined }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const twoSided = selected?.twoSided ?? false;
    const next: Errors = {
      type: type ? undefined : t('customers.proof.errors.typeRequired'),
      number: validateIdNumber(type, number),
      front: front ? undefined : t('customers.proof.errors.frontRequired'),
      back: !twoSided || back ? undefined : t('customers.proof.errors.backRequired'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    // UI-only for now. The real call uploads both images, then PUTs
    // { idType, idNumber } to /customers/:id/kyc.
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (type) saveProof(id, { type, number: normalizeIdNumber(number), front, back });
    setSubmitting(false);
    navigate(returnTo?.startsWith('/approvals/') ? returnTo : '/customers');
  }

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to="/customers">
          <ArrowLeftIcon size={14} /> {t('customers.list.title')}
        </Link>
        <h1 className="pagehead__title">{t('common.screens.identityProof')}</h1>
        <p className="pagehead__sub">
          {customer.name} · {customer.phone} · {lineById(customer.lineId)?.name}
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card
          title={t('common.screens.identityProof')}
          subtitle={
            customer.proof
              ? t('customers.proof.onFile', {
                  idType: idTypeLabel(customer.proof.type),
                  number: maskIdNumber(customer.proof.number),
                })
              : t('customers.proof.none')
          }
        >
          <div className="stack">
            <div className="grid-2 grid-2--tight">
              <div className="field">
                <label htmlFor="idtype">{t('customers.proof.idType')}</label>
                <div className={`select select--block${errors.type ? ' select--invalid' : ''}`}>
                  <select
                    id="idtype"
                    value={type}
                    onChange={(e) => onTypeChange(e.target.value as IdType | '')}
                    aria-invalid={errors.type ? true : undefined}
                  >
                    <option value="">{t('customers.proof.selectIdType')}</option>
                    {ID_TYPES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
                {errors.type ? (
                  <span className="field__error" role="alert">
                    {errors.type}
                  </span>
                ) : (
                  <span className="field__hint">{t('customers.proof.idTypeHint')}</span>
                )}
              </div>

              <TextField
                label={t('customers.proof.idNumber')}
                placeholder={selected?.placeholder ?? t('customers.proof.chooseTypeFirst')}
                lead={<IdIcon size={18} />}
                inputMode={numeric ? 'numeric' : 'text'}
                autoComplete="off"
                spellCheck={false}
                maxLength={24}
                value={number}
                error={errors.number}
                hint={
                  number && !errors.number
                    ? t('customers.proof.storedAs', { number: normalizeIdNumber(number) })
                    : t('customers.proof.spacesFine')
                }
                onChange={(e) =>
                  setNumber(
                    numeric
                      ? e.target.value.replace(/[^\d\s]/g, '')
                      : e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '').toUpperCase(),
                  )
                }
              />
            </div>
          </div>
        </Card>

        <Card title={t('customers.proof.images')} subtitle={t('customers.proof.imagesHint')}>
          <div className="stack">
            <ImageField
              label={t('customers.proof.front')}
              hint={t('customers.proof.frontHint')}
              value={front}
              error={errors.front}
              onChange={setFront}
            />

            {selected && !selected.twoSided ? (
              <p className="field__hint">{t('customers.proof.noBack', { idType: selected.label })}</p>
            ) : (
              <ImageField
                label={t('customers.proof.back')}
                hint={t('customers.proof.backHint')}
                value={back}
                error={errors.back}
                onChange={setBack}
              />
            )}
          </div>
        </Card>

        <div className="formactions">
          <Link className="btn btn--sm btn--ghost" to="/customers">
            {t('common.actions.cancel')}
          </Link>
          <Button type="submit" loading={submitting}>
            {t('customers.proof.save')}
          </Button>
        </div>
      </form>
    </>
  );
}
