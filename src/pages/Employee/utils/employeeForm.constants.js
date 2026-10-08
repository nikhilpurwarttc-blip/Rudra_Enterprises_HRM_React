export const EMPTY_EMPLOYEE_FORM = {
  employee_code: '',
  name: '',
  dob: '',
  joining_date: '',
  plant_id: '',
  department_id: '',
  designation_id: '',
  shift_id: '',
  charge_ids: [],
  mobile_number: '',
  email: '',
  address: '',
  gender: '',
  marital_status: '',
  status: 1,
  image: null,
};

export const EMPLOYEE_DRAFT_PREFIX = 'hrm.employee-draft.';

export const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
export const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'Aadhaar', label: 'Aadhaar Card' },
  { value: 'PAN', label: 'PAN Card' },
  { value: 'Passport', label: 'Passport' },
  { value: 'Voter ID', label: 'Voter ID' },
  { value: 'Driving Licence', label: 'Driving Licence' },
  { value: 'Other', label: 'Other' },
];

export const EMPLOYEE_STEPS = [
  { id: 'details', label: 'Employee Details', statusLabel: 'Employee record' },
  { id: 'kyc', label: 'KYC / Documents', statusLabel: 'Documents submitted' },
  { id: 'accounts', label: 'Bank Accounts', statusLabel: 'Accounts submitted' },
  { id: 'salary', label: 'Salary', statusLabel: 'Salary history submitted' },
];

export const DETAIL_SECTIONS = [
  { id: 'personal', fields: ['name', 'dob', 'gender', 'marital_status'] },
  { id: 'employment', fields: ['joining_date', 'plant_id', 'department_id', 'designation_id', 'shift_id'] },
  { id: 'contact', fields: ['mobile_number', 'email', 'address'] },
  { id: 'extras', fields: ['charge_ids', 'image'] },
];
