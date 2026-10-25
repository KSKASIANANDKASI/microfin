import type { LatLng } from '../lib/data';

/** react-native-maps has no web build; the browser preview takes GPS and typed coordinates only. */
export function PinMap(_props: { value?: LatLng; onPick: (p: LatLng) => void }) {
  return null;
}
