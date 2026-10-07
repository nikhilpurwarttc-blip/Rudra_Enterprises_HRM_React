import { EMPTY_EMPLOYEE_FORM } from './employeeForm.constants';

export const normalizeEmployee = (employee) => ({
  ...EMPTY_EMPLOYEE_FORM,
  ...(employee ?? {}),
  employee_code: String(employee?.employee_code ?? ''),
  name: String(employee?.name ?? ''),
  dob: String(employee?.dob ?? '').slice(0, 10),
  joining_date: String(employee?.joining_date ?? '').slice(0, 10),
  plant_id: employee?.plant_id ?? '',
  department_id: employee?.department_id ?? '',
  designation_id: employee?.designation_id ?? '',
  shift_id: employee?.shift_id ?? '',
  charge_ids: (employee?.charges ?? []).map((charge) => String(charge.id)),
  mobile_number: String(employee?.mobile_number ?? ''),
  email: String(employee?.email ?? ''),
  address: String(employee?.address ?? ''),
  gender: String(employee?.gender ?? ''),
  marital_status: String(employee?.marital_status ?? ''),
  image: null,
  status: employee?.status == null ? 1 : Number(employee.status),
});

export const createEmployeePayload = (form, employeeId) => ({
  id: employeeId ?? form.id,
  name: String(form.name ?? '').trim(),
  dob: form.dob || null,
  joining_date: form.joining_date || null,
  plant_id: form.plant_id || null,
  department_id: form.department_id || null,
  designation_id: form.designation_id || null,
  shift_id: form.shift_id || null,
  charge_ids: form.charge_ids.map(Number),
  mobile_number: String(form.mobile_number ?? '').trim() || null,
  email: String(form.email ?? '').trim() || null,
  address: String(form.address ?? '').trim() || null,
  gender: form.gender || null,
  marital_status: form.marital_status || null,
  status: form.status,
  image: form.image,
});

export const buildSelectOptions = (items, getLabel) => items.map((item) => ({
  value: String(item.id),
  label: getLabel(item),
}));

export const displayDate = (value) =>
  value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : '\u2014';
