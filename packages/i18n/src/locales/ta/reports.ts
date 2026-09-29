import type { Shape } from '../../types';
import type { reports as en } from '../en/reports';

/** Tamil copy for the reports screens (web + mobile). */
export const reports: Shape<typeof en> = {
  subtitle: 'உங்கள் கிளையின் எந்தப் பதிவேட்டையும் ஏற்றுமதி செய்யவும் அல்லது திட்டமிடவும்',
  dateRange: 'தேதி வரம்பு',
  ranges: {
    today: 'இன்று',
    last7: 'கடந்த 7 நாட்கள்',
    last30: 'கடந்த 30 நாட்கள்',
    monthToDate: 'இம்மாதம் இதுவரை',
  },
  preview: 'முன்னோட்டம்',
  export: 'ஏற்றுமதி',
};
