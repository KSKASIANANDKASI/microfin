import type { Shape } from '../../types';
import type { validation as en } from '../en/validation';

/** Field-level validation messages. */
export const validation: Shape<typeof en> = {
  required: '{label} தேவை.',
  emailRequired: 'மின்னஞ்சல் தேவை.',
  emailInvalid: 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.',
  phoneRequired: 'கைபேசி எண் தேவை.',
  phoneInvalid: 'சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்.',
  passwordRequired: 'கடவுச்சொல் தேவை.',
  passwordShort: 'குறைந்தது 8 எழுத்துகளைப் பயன்படுத்தவும்.',
  idRequired: 'அடையாள எண் தேவை.',
  idFormat: {
    AADHAAR: 'ஆதார் எண் 12 இலக்கங்கள்; 0 அல்லது 1-இல் தொடங்கக் கூடாது.',
    PAN: 'PAN இவ்வாறு இருக்கும்: ABCDE1234F.',
    VOTER_ID: 'வாக்காளர் அடையாள எண் (EPIC): 3 எழுத்துகள், பின்னர் 7 இலக்கங்கள்.',
    DRIVING_LICENSE:
      'ஓட்டுநர் உரிமம்: மாநிலக் குறியீடு, RTO குறியீடு மற்றும் 11 இலக்கங்கள் — KL07 20110001234.',
    PASSPORT: 'கடவுச்சீட்டு எண்: ஒரு எழுத்து, பின்னர் 7 இலக்கங்கள்.',
  },
};
