const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmployeeForm = (form) => {
  const errors = {};
  if (!String(form.name ?? '').trim()) errors.name = 'Full name is required.';
  if (!String(form.joining_date ?? '').trim()) errors.joining_date = 'Joining date is required.';
  if (!String(form.plant_id ?? '').trim()) errors.plant_id = 'Plant is required.';
  if (!String(form.department_id ?? '').trim()) errors.department_id = 'Department is required.';
  if (!String(form.designation_id ?? '').trim()) errors.designation_id = 'Designation is required.';
  if (!String(form.shift_id ?? '').trim()) errors.shift_id = 'Shift is required.';

  const mobileNumber = String(form.mobile_number ?? '');
  if (!mobileNumber) {
    errors.mobile_number = 'Mobile number is required.';
  } else if (!/^\d{10}$/.test(mobileNumber)) {
    errors.mobile_number = 'Enter a 10-digit mobile number.';
  }
  if (String(form.email ?? '').trim() && !EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (form.dob && new Date(form.dob) > new Date()) {
    errors.dob = 'Date of birth cannot be in the future.';
  }
  if (form.joining_date && form.dob && new Date(form.joining_date) < new Date(form.dob)) {
    errors.joining_date = 'Joining date must be after date of birth.';
  }
  return errors;
};

export const validateDocumentDraft = (draft) => {
  const errors = {};
  const documentType = String(draft.document_type ?? '');
  const documentNumber = String(draft.document_number ?? '').trim().toUpperCase();
  const normalizedNumber = documentNumber.replace(/[\s-]/g, '');

  if (!documentType) errors.document_type = 'Document type is required.';
  if (!documentNumber) {
    errors.document_number = 'Document number is required.';
  } else if (documentType === 'Aadhaar' && !/^\d{12}$/.test(normalizedNumber)) {
    errors.document_number = 'Aadhaar number must contain exactly 12 digits.';
  } else if (documentType === 'PAN' && !/^[A-Z]{5}\d{4}[A-Z]$/.test(normalizedNumber)) {
    errors.document_number = 'Enter a valid 10-character PAN number.';
  } else if (documentType === 'Passport' && !/^[A-Z]\d{7}$/.test(normalizedNumber)) {
    errors.document_number = 'Passport number must be 1 letter followed by 7 digits.';
  } else if (documentType === 'Voter ID' && !/^[A-Z]{3}\d{7}$/.test(normalizedNumber)) {
    errors.document_number = 'Voter ID must be 3 letters followed by 7 digits.';
  } else if (
    documentType === 'Driving Licence'
    && !/^[A-Z0-9]{15,16}$/.test(normalizedNumber)
  ) {
    errors.document_number = 'Driving licence number must contain 15 or 16 letters and digits.';
  }
  if (!draft.document_file) errors.document_file = 'Document file is required.';

  return errors;
};

export const validateAccountDraft = (draft) => {
  const errors = {};
  if (!String(draft.bank_name ?? '').trim()) errors.bank_name = 'Bank name is required.';
  if (!String(draft.account_holder_name ?? '').trim()) {
    errors.account_holder_name = 'Account holder name is required.';
  }
  const accountNumber = String(draft.account_number ?? '');
  if (!accountNumber) {
    errors.account_number = 'Account number is required.';
  } else if (!/^\d{9,18}$/.test(accountNumber)) {
    errors.account_number = 'Account number must contain 9 to 18 digits.';
  }

  const ifscCode = String(draft.ifsc_code ?? '').trim().toUpperCase();
  if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    errors.ifsc_code = 'IFSC code must be 11 characters (for example, ABCD0123456).';
  }
  return errors;
};

export const clearFieldError = (field, setClientErrors) => {
  setClientErrors((current) => ({ ...current, [field]: undefined }));
};

export const getFirstErrorSection = (errors, sections) =>
  sections.find((section) => section.fields.some((field) => errors[field]));

// Kept for backward compatibility with any consumer using the hook form
export default function useEmployeeValidation() {
  return { validateEmployeeForm, clearFieldError, getFirstErrorSection };
}
