/** Field-level validation messages. */
export const validation = {
  required: '{label} is required.',
  emailRequired: 'Email is required.',
  emailInvalid: 'Enter a valid email address.',
  phoneRequired: 'Mobile number is required.',
  phoneInvalid: 'Enter a valid 10-digit mobile number.',
  passwordRequired: 'Password is required.',
  passwordShort: 'Use at least 8 characters.',
  idRequired: 'Identity number is required.',
  idFormat: {
    AADHAAR: 'Aadhaar is 12 digits and cannot start with 0 or 1.',
    PAN: 'PAN looks like ABCDE1234F.',
    VOTER_ID: 'Voter ID (EPIC) is 3 letters then 7 digits.',
    DRIVING_LICENSE: 'Driving licence is a state code, RTO code and 11 digits — KL07 20110001234.',
    PASSPORT: 'Passport number is a letter followed by 7 digits.',
  },
};
