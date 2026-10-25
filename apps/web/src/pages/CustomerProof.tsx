import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { t } from '@lms/i18n';
import { FormError } from '../components/FormError';
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
  removeProof,
  saveProof,
  type IdType,
  type ProofImage,
} from '../lib/data';
import { normalizeIdNumber, validateIdNumber } from '../lib/validate';
import { errorMessage } from '../lib/session';
import { usePortfolio } from '../lib/usePortfolio';

type Errors = {
  type?: string;
  number?: string;
};

export function CustomerProof() {
  usePortfolio();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  // Set when opened from an application review, so saving goes straight back to it.
  const [params] = useSearchParams();
  const returnTo = params.get('return');
  const customer = customerById(id);
  // ?type=PAN opens that proof for editing; otherwise the form adds a new one.
  const opened = customer?.proofs.find((proof) => proof.type === params.get('type'));

  const [type, setType] = useState<IdType | ''>(opened?.type ?? '');
  const [number, setNumber] = useState(opened?.number ?? '');
  const [front, setFront] = useState<ProofImage | undefined>(opened?.front);
  const [back, setBack] = useState<ProofImage | undefined>(opened?.back);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<IdType>();
  const [saveError, setSaveError] = useState<string>();

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

  const onFile = customer.proofs.find((proof) => proof.type === type);

  function onTypeChange(next: IdType | '') {
    if (next === type) return;
    setType(next);
    // Picking a type already on file loads it for editing. Otherwise the typed
    // number belongs to the old ID — its shape almost never survives the
    // switch, so clear it rather than flag it as invalid.
    const existing = customer?.proofs.find((proof) => proof.type === next);
    setNumber(existing?.number ?? '');
    setFront(existing?.front);
    setBack(existing?.back);
    setErrors((e) => ({ ...e, type: undefined, number: undefined }));
  }

  async function onRemove(proofType: IdType, proofNumber: string) {
    if (!customer) return;
    const question = t('customers.proof.removeConfirm', {
      idType: idTypeLabel(proofType),
      number: maskIdNumber(proofNumber),
      name: customer.name,
    });
    if (!window.confirm(question)) return;
    setRemoving(proofType);
    setSaveError(undefined);
    try {
      await removeProof(id, proofType);
      if (proofType === type) onTypeChange('');
    } catch (error) {
      setSaveError(errorMessage(error));
    }
    setRemoving(undefined);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {
      type: type ? undefined : t('customers.proof.errors.typeRequired'),
      number: validateIdNumber(type, number),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    if (!type) return;
    setSubmitting(true);
    setSaveError(undefined);
    try {
      await saveProof(id, { type, number: normalizeIdNumber(number), front, back });
    } catch (error) {
      setSaveError(errorMessage(error));
      setSubmitting(false);
      return;
    }
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

      <Card title={t('customers.proof.onFileTitle')} subtitle={customer.proofs.length ? undefined : t('customers.proof.none')}>
        {customer.proofs.length ? (
          <ul className="list">
            {customer.proofs.map((proof) => (
              <li key={proof.type} className="list__row">
                <span className="list__avatar" aria-hidden>
                  <IdIcon size={16} />
                </span>
                <span className="list__main">
                  <b>{idTypeLabel(proof.type)}</b>
                  <span className="list__meta">{maskIdNumber(proof.number)}</span>
                </span>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  aria-pressed={proof.type === type}
                  onClick={() => onTypeChange(proof.type)}
                >
                  {t('customers.proof.edit')}
                </button>
                <button
                  type="button"
                  className="linkbtn linkbtn--danger"
                  disabled={removing !== undefined}
                  onClick={() => onRemove(proof.type, proof.number)}
                >
                  {t('customers.proof.remove')}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <form onSubmit={onSubmit} noValidate>
        <Card
          title={onFile ? t('customers.proof.editTitle', { idType: idTypeLabel(onFile.type) }) : t('customers.proof.addTitle')}
          subtitle={onFile ? t('customers.proof.replaces', { idType: idTypeLabel(onFile.type) }) : undefined}
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
              onChange={setFront}
            />

            {selected && !selected.twoSided ? (
              <p className="field__hint">{t('customers.proof.noBack', { idType: selected.label })}</p>
            ) : (
              <ImageField
                label={t('customers.proof.back')}
                hint={t('customers.proof.backHint')}
                value={back}
                onChange={setBack}
              />
            )}
          </div>
        </Card>

        <FormError message={saveError} />
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
