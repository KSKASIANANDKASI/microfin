import type { Shape } from '../../types';
import type { playground as en } from '../en/playground';

/** Loan calculator — a scratchpad for pricing, nothing is saved (web + mobile). */
export const playground: Shape<typeof en> = {
  subtitle:
    'கடன் விதிமுறைகளை மாற்றிப் பார்த்து, தவணைத் தொகையையும் கையில் வழங்கப்படும் தொகையையும் அறியவும். எதுவும் சேமிக்கப்படாது.',
  terms: 'கடன் விதிமுறைகள்',
  result: 'முடிவு',
  emiNote: { one: '{count} மாதத்திற்கு', other: '{count} மாதங்களுக்கு' },
  finalInstallment: 'கடைசித் தவணை {amount}',
  netNotePost: 'கடன் தொகையிலிருந்து கட்டணம் கழித்து',
  netNotePre: 'கடன் தொகையிலிருந்து வட்டியும் கட்டணமும் கழித்து',
  negative: 'வட்டியும் கட்டணமும் கடன் தொகையை விட அதிகம் — வழங்க எதுவும் மீதமில்லை.',
  reset: 'மீட்டமை',
};
