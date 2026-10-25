import { t } from '@lms/i18n';
import { useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';
import { CameraIcon, ImageIcon, TrashIcon } from './icons';
import type { ProofImage } from '../lib/data';

type Props = {
  label: string;
  hint?: string;
  value?: ProofImage;
  error?: string;
  onChange: (next?: ProofImage) => void;
};

/**
 * The API's per-photo limit. A larger upload is cut off mid-send, which the
 * phone reports as an unreachable server, so a photo that could not be shrunk
 * is refused here instead.
 */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Photos are shrunk to this long edge before upload. An ID card stays legible
 * well below it, and the file drops to a few hundred KB — light enough for the
 * patchy connections officers work on, and far under the API's limit.
 */
const LONG_EDGE = 1600;
const JPEG_QUALITY = 0.7;

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // Full quality here: the photo is compressed once, when it is shrunk.
  quality: 1,
  allowsEditing: true,
};

/**
 * Captures one page of an ID card, from the camera or the gallery. Officers
 * usually shoot it on the spot; the gallery covers a scan sent ahead.
 */
export function ImageField({ label, hint, value, error, onChange }: Props) {
  const [pickError, setPickError] = useState<string>();

  async function fromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPickError(t('common.upload.cameraDenied'));
      return;
    }
    await take(await ImagePicker.launchCameraAsync(OPTIONS));
  }

  async function fromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickError(t('common.upload.galleryDenied'));
      return;
    }
    await take(await ImagePicker.launchImageLibraryAsync(OPTIONS));
  }

  async function take(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const name = asset.fileName ?? `${label.toLowerCase().replace(/\s+/g, '-')}.jpg`;

    try {
      const uri = await shrink(asset);
      setPickError(undefined);
      // Re-encoded as JPEG, so the name says so — the upload picks its type from it.
      onChange({ uri, name: name.replace(/\.[^.]*$/, '') + '.jpg' });
      return;
    } catch {
      // Could not re-encode it (an odd format, low memory): send the original if it fits.
    }

    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
      setPickError(t('common.upload.tooLarge', { size: formatBytes(asset.fileSize) }));
      return;
    }
    setPickError(undefined);
    onChange({ uri: asset.uri, name, size: asset.fileSize });
  }

  const message = error ?? pickError;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      {value ? (
        <View style={styles.preview}>
          <Image source={{ uri: value.uri, headers: value.headers }} style={styles.thumb} accessibilityLabel={t('common.field.preview', { label })} />
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {value.name}
            </Text>
            <Text style={styles.meta}>{value.size ? formatBytes(value.size) : t('common.upload.captured')}</Text>
          </View>
          <Pressable onPress={fromCamera} accessibilityRole="button" accessibilityLabel={t('common.field.retakeLabel', { label })}>
            <Text style={styles.action}>{t('common.actions.retake')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPickError(undefined);
              onChange(undefined);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('common.field.removeLabel', { label })}
            hitSlop={8}
          >
            <TrashIcon />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.pick, !!message && styles.pickInvalid]}>
          <PickButton icon={<CameraIcon />} label={t('common.actions.takePhoto')} onPress={fromCamera} />
          <PickButton icon={<ImageIcon />} label={t('common.actions.gallery')} onPress={fromGallery} />
        </View>
      )}

      {message ? (
        <Text style={styles.error}>{message}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function PickButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pickBtn, pressed && styles.pickBtnPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {icon}
      <Text style={styles.pickBtnText}>{label}</Text>
    </Pressable>
  );
}

/** Scales the photo down to `LONG_EDGE` (never up) and saves it as a JPEG; resolves to its file uri. */
async function shrink(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > LONG_EDGE) {
    context.resize(asset.width >= asset.height ? { width: LONG_EDGE } : { height: LONG_EDGE });
  }
  try {
    const image = await context.renderAsync();
    try {
      return (await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG })).uri;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: {
    ...textStyle('label', fontFamily.bodySemibold),
    color: colors.text,
    marginBottom: space[2],
  },
  pick: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[3],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  pickInvalid: { borderColor: colors.danger },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  pickBtnPressed: { backgroundColor: palette.navy050 },
  pickBtnText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  // A licence is landscape and a passport page portrait — a fixed box with a
  // cropped fit keeps the row height steady either way.
  thumb: { width: 64, height: 44, borderRadius: radius.sm, backgroundColor: colors.bg },
  name: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  action: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  error: { ...textStyle('caption'), color: colors.danger, marginTop: space[2] },
  hint: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },
});
