import type { Shape } from '../../types';
import type { settings as en } from '../en/settings';

/** Settings screen (web + mobile). */
export const settings: Shape<typeof en> = {
  title: 'அமைப்புகள்',
  subtitle: 'உங்கள் கணக்கு, விருப்பங்கள் மற்றும் பாதுகாப்பை நிர்வகிக்கவும்',
  groups: {
    account: 'கணக்கு',
    collectionSetup: 'வசூல் அமைப்பு',
    preferences: 'விருப்பங்கள்',
    security: 'பாதுகாப்பு',
  },
  rows: {
    name: 'பெயர்',
    role: 'பதவி',
    branch: 'கிளை',
    lines: 'லைன்கள்',
    linesValue: { one: '{count} லைன் அமைக்கப்பட்டுள்ளது', other: '{count} லைன்கள் அமைக்கப்பட்டுள்ளன' },
    customers: 'வாடிக்கையாளர்கள்',
    customersValue: {
      one: '{count} வாடிக்கையாளர் பதிவில் உள்ளார்',
      other: '{count} வாடிக்கையாளர்கள் பதிவில் உள்ளனர்',
    },
    language: 'மொழி',
    languageHint: 'இந்தச் சாதனத்தின் அனைத்துத் திரைகளுக்கும் பொருந்தும்',
    currency: 'நாணயம்',
    currencyValue: '₹ இந்திய ரூபாய்',
    cutoff: 'நாள் இறுதி நேரம்',
    cutoffValue: 'மாலை 6:30',
    password: 'கடவுச்சொல்',
    passwordValue: '41 நாட்களுக்கு முன் மாற்றப்பட்டது',
    twoFactor: 'இரு-படி சரிபார்ப்பு',
    twoFactorValue: '•••• 3210 எண்ணுக்கு SMS',
    sessions: 'செயலில் உள்ள அமர்வுகள்',
    sessionsValue: '2 சாதனங்கள்',
  },
};
