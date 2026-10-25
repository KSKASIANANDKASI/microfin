import { t } from '@lms/i18n';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CameraIcon, UploadIcon } from './icons';
import { fetchObjectUrl, type ProofImage } from '../lib/data';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic';

type Props = {
  label: string;
  hint?: string;
  value?: ProofImage;
  error?: string;
  onChange: (next?: ProofImage) => void;
};

/**
 * The `src` for a proof photo. A fresh pick is already a `blob:` URL; one
 * stored by the API needs the Authorization header, which `<img>` cannot send,
 * so it is fetched and shown through an object URL of its own.
 */
function useProofSrc(image?: ProofImage): string | undefined {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    if (!image?.stored) return;
    let url: string | undefined;
    let live = true;
    fetchObjectUrl(image.uri)
      .then((next) => {
        url = next;
        if (live) setSrc(next);
        else URL.revokeObjectURL(next);
      })
      .catch(() => {
        // the thumbnail just stays blank; the file is still on record
      });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [image?.uri, image?.stored]);
  return image?.stored ? src : image?.uri;
}

/**
 * Captures one page of an ID card. Officers work on a phone, so the camera is
 * offered first; the file picker is there for desk work and re-uploads.
 */
export function ImageField({ label, hint, value, error, onChange }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string>();
  // Called on every render, photo or not — hooks can't sit behind the `value ?` below.
  const src = useProofSrc(value);

  // The preview URL only lives as long as the page does — release the previous
  // one whenever it is replaced, and the last one on unmount.
  useEffect(() => {
    const uri = value?.uri;
    return () => {
      if (uri?.startsWith('blob:')) URL.revokeObjectURL(uri);
    };
  }, [value?.uri]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after a remove.
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError(t('common.upload.notImage'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(t('common.upload.tooLarge', { size: formatBytes(file.size) }));
      return;
    }

    setFileError(undefined);
    onChange({ uri: URL.createObjectURL(file), name: file.name, size: file.size });
  }

  function remove() {
    setFileError(undefined);
    onChange(undefined);
  }

  const message = error ?? fileError;

  return (
    <div className="field">
      <label>{label}</label>

      {value ? (
        <div className="upload">
          <img className="upload__thumb" src={src} alt={t('common.field.preview', { label })} />
          <span className="upload__body">
            <b>{value.name}</b>
            <span className="upload__meta">{value.size ? formatBytes(value.size) : t('common.upload.uploaded')}</span>
          </span>
          <span className="upload__actions">
            <button type="button" className="linkbtn" onClick={() => fileRef.current?.click()}>
              {t('common.actions.replace')}
            </button>
            <button type="button" className="linkbtn linkbtn--danger" onClick={remove}>
              {t('common.actions.remove')}
            </button>
          </span>
        </div>
      ) : (
        <div className={`upload__pick${message ? ' upload__pick--invalid' : ''}`}>
          <button type="button" className="btn btn--ghost" onClick={() => cameraRef.current?.click()}>
            <CameraIcon /> {t('common.actions.takePhoto')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            <UploadIcon /> {t('common.actions.chooseFile')}
          </button>
        </div>
      )}

      {/* `capture` opens the rear camera on a phone and is ignored on desktop,
          so the two inputs have to stay separate. */}
      <input ref={cameraRef} type="file" accept={ACCEPT} capture="environment" onChange={pick} hidden />
      <input ref={fileRef} type="file" accept={ACCEPT} onChange={pick} hidden />

      {message ? (
        <span className="field__error" role="alert">
          {message}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
