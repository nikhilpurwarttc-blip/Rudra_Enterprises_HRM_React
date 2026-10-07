const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;

export const validateEmployeeForm = (form) => {
  const errors = {};
  if (!String(form.name ?? '').trim()) errors.name = 'Full name is required.';
  if (form.mobile_number && !PHONE_PATTERN.test(form.mobile_number)) {
    errors.mobile_number = 'Enter a valid mobile number.';
  }
  if (form.email && !EMAIL_PATTERN.test(form.email)) {
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

export const clearFieldError = (field, setClientErrors) => {
  setClientErrors((current) => ({ ...current, [field]: undefined }));
};

export const getFirstErrorSection = (errors, sections) =>
  sections.find((section) => section.fields.some((field) => errors[field]));

// Kept for backward compatibility with any consumer using the hook form
export default function useEmployeeValidation() {
  return { validateEmployeeForm, clearFieldError, getFirstErrorSection };
}
