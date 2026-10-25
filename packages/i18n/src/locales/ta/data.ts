import type { Shape } from '../../types';
import type { data as en } from '../en/data';

/**
 * Copy carried by the placeholder portfolio in `lib/data.ts`. Goes away with
 * the sample data once the API serves real records.
 */
export const data: Shape<typeof en> = {
  user: {
    role: 'கிளை மேலாளர்',
    branch: 'சென்னை — அண்ணா நகர்',
    roles: {
      ADMIN: 'நிர்வாகி',
      MANAGER: 'கிளை மேலாளர்',
      LOAN_OFFICER: 'கடன் அலுவலர்',
    },
  },
  kpis: {
    outstanding: 'மொத்த நிலுவைத் தொகை',
    collected: 'இன்றைய வசூல்',
    overdue: 'தாமதத் தொகை',
    loans: 'செயலில் உள்ள கடன்கள்',
    vsLastMonth: 'கடந்த மாதத்துடன் ஒப்பிட',
    vsYesterday: 'நேற்றுடன் ஒப்பிட',
    vsLastWeek: 'கடந்த வாரத்துடன் ஒப்பிட',
  },
  arrears: {
    current: 'நடப்பு',
    overdue1to30: '1–30 நாள் தாமதம்',
    overdue30plus: '30+ நாள் தாமதம்',
  },
  notifications: {
    approvals: { title: 'ஒப்புதலுக்குக் காத்திருக்கும் விண்ணப்பங்கள்', body: 'மேலாளரின் முடிவுக்காக {count} காத்திருக்கின்றன.' },
    arrears: { title: 'நிலுவை எச்சரிக்கை', body: '{count} கணக்குகள் 30 நாட்களுக்கு மேல் தாமதம், நிலுவை {amount}.' },
    sheet: { title: 'இன்றைய வசூல் பட்டியல்', body: '{total} தவணைகளில் {collected} வசூலிக்கப்பட்டன.' },
  },
  reports: {
    r1: {
      name: 'போர்ட்ஃபோலியோ சுருக்கம்',
      desc: 'தயாரிப்பு மற்றும் லைன் வாரியாக நிலுவை, வழங்கப்பட்ட மற்றும் முடிந்த கடன்கள்.',
    },
    r2: {
      name: 'வசூல் பதிவேடு',
      desc: 'எந்தத் தேதி வரம்பிற்கும், லைன் அல்லது அலுவலர் வாரியாக தவணை அளவிலான ரசீதுகள்.',
    },
    r3: {
      name: 'தாமத வயது பகுப்பாய்வு',
      desc: 'லைன் மற்றும் அலுவலர் வாரியாக 30 / 60 / 90 நாள் பிரிவுகள்.',
    },
    r4: {
      name: 'கடன் வழங்கல் பதிவேடு',
      desc: 'ஒவ்வொரு அனுமதியும் வழங்கலும், அங்கீகாரத் தடத்துடன்.',
    },
    r5: {
      name: 'லைன் செயல்திறன்',
      desc: 'ஒவ்வொரு லைன் மற்றும் அலுவலருக்கான வசூல் திறன் மற்றும் நிலுவை.',
    },
    r6: {
      name: 'தினசரி கணக்கேடு',
      desc: 'ஒவ்வொரு கிளை நாளுக்கும் வரவு, செலவு மற்றும் இறுதி இருப்பு.',
    },
  },
};
