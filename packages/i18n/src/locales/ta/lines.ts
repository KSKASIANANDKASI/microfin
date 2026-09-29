import type { Shape } from '../../types';
import type { lines as en } from '../en/lines';

/** Tamil copy for the lines screens (web + mobile). */
export const lines: Shape<typeof en> = {
  count: { one: '{count} லைன்', other: '{count} லைன்கள்' },
  accounts: { one: '{count} கணக்கு', other: '{count} கணக்குகள்' },
  dueToday: 'இன்று செலுத்த வேண்டியது {amount}',
  schedule: {
    weekly: 'ஒவ்வொரு {day}',
    monthly: 'மாதம் {day} ஆம் தேதி',
    lastDay: 'மாதக் கடைசி நாள்',
  },
  form: {
    subtitle: 'வழித்தடத்துக்குப் பெயரிட்டு, வசூல் முறையை அமைக்கவும்',
    name: 'லைன் பெயர்',
    nameHint: 'வசூல் தாள்களிலும் ரசீதுகளிலும் காட்டப்படும்.',
    frequency: 'வசூல் முறை',
    day: 'வசூல் நாள்',
    date: 'வசூல் தேதி',
    dayPlaceholder: 'நாளைத் தேர்வுசெய்யவும்',
    datePlaceholder: 'தேதியைத் தேர்வுசெய்யவும்',
    dayRequired: 'வசூல் நாளைத் தேர்வுசெய்யவும்.',
    dateRequired: 'வசூல் தேதியைத் தேர்வுசெய்யவும்.',
    dayHint: 'இந்த லைனின் ஒவ்வொரு தவணையும் இந்த நாளில் செலுத்த வேண்டும்.',
    dateHint: 'எல்லா மாதத்துக்கும் பொருந்த 1–28 தேதிகள் மட்டும்; மாத இறுதிக்கு "{lastDay}" தேர்வுசெய்யவும்.',
    officer: 'கள அலுவலர்',
    officerPlaceholder: 'அலுவலரைத் தேர்வுசெய்யவும்',
    officerHint: 'இந்த லைனை எப்போது வேண்டுமானாலும் வேறு அலுவலருக்கு மாற்றலாம்.',
    create: 'லைனை உருவாக்கு',
  },
  card: {
    summary: {
      one: 'இன்று {due} இல் {collected} வசூலானது — {count} லைனில் {pct}%.',
      other: 'இன்று {due} இல் {collected} வசூலானது — {count} லைன்களில் {pct}%.',
    },
    barTitle: '{line}: {pct}% வசூலானது',
    pctCollected: '{pct}% வசூலானது',
    followUp: 'பின்தொடர வேண்டும்',
  },
};
