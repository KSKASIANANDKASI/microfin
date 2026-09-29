import type { Shape } from '../../types';
import type { dashboard as en } from '../en/dashboard';

/** Tamil copy for the dashboard screens (web + mobile). */
export const dashboard: Shape<typeof en> = {
  greeting: 'காலை வணக்கம், {name}',
  collections: {
    title: 'வசூல் — கடந்த 7 நாட்கள்',
    subtitle: 'தினசரி இலக்கு {amount}',
  },
  arrears: {
    title: 'கால வாரியான நிலுவை',
    subtitle: 'தாமதமான அசல், கால வரம்புகளின்படி ஒப்பீடு',
    current: {
      one: '{amount} நடப்பில் — {count} கணக்கில், போர்ட்ஃபோலியோவின் {percent}%.',
      other: '{amount} நடப்பில் — {count} கணக்குகளில், போர்ட்ஃபோலியோவின் {percent}%.',
    },
    accounts: {
      one: '{count} கணக்கு',
      other: '{count} கணக்குகள்',
    },
  },
  lines: {
    title: 'இன்றைய லைன் வாரியான வசூல்',
    subtitle: 'ஒவ்வொரு லைனிலும் செலுத்த வேண்டிய தொகைக்கு எதிரான வசூல்',
    manage: 'லைன்களை நிர்வகி',
  },
  sheet: {
    title: 'இன்றைய வசூல் பட்டியல்',
    subtitle: '{total} இல் {collected} வசூலானது',
    open: 'வசூலைத் திற',
    opensLoan: 'கடனைத் திறக்கும்',
  },
  chart: {
    chart: 'வரைபடம்',
    table: 'அட்டவணை',
    viewToggle: 'வரைபடம் அல்லது அட்டவணைக் காட்சி',
    caption: 'நாள் வாரியான வசூல், கடந்த 7 நாட்கள்',
    day: 'நாள்',
    collected: 'வசூல்',
    vsTarget: 'இலக்குடன்',
    summary: 'கடந்த ஏழு நாட்களின் வசூல். அதிகபட்சம் {day} அன்று {amount}.',
    target: 'இலக்கு {amount}',
    aboveTarget: 'இலக்கை விட {amount} அதிகம்',
    belowTarget: 'இலக்கை விட {amount} குறைவு',
    readoutIdle: 'தினசரி இலக்கு {amount} · விவரத்திற்கு பட்டையைத் தொடவும்',
    readoutAbove: '{day} — {amount} (இலக்கை விட {diff} அதிகம்)',
    readoutBelow: '{day} — {amount} (இலக்கை விட {diff} குறைவு)',
  },
};
