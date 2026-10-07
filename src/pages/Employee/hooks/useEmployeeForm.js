import { useState } from 'react';
import { EMPTY_EMPLOYEE_FORM } from '../utils/employeeForm.constants';
import { normalizeEmployee } from '../utils/employeeForm.utils';

export default function useEmployeeForm(employee, restoreDraft, markDraftChanged, clearFieldErrors) {
  const [form, setForm] = useState(() => restoreDraft(normalizeEmployee(employee)));

  const updateForm = (updater) => {
    setForm((current) => (typeof updater === 'function' ? updater(current) : updater));
    markDraftChanged();
  };

  const handleFieldChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? (event.target.checked ? 1 : 0) : event.target.value;
    updateForm((current) => ({ ...current, [field]: value }));
    clearFieldErrors(field);
  };

  const handleSelectChange = (field) => (value) => {
    updateForm((current) => ({ ...current, [field]: value }));
    clearFieldErrors(field);
  };

  const setSubmittedEmployee = (savedEmployee) => {
    setForm((current) => ({
      ...current,
      id: savedEmployee.id,
      employee_code: savedEmployee.employee_code ?? current.employee_code,
    }));
  };

  const resetForm = () => setForm({ ...EMPTY_EMPLOYEE_FORM });

  return { form, setForm, updateForm, handleFieldChange, handleSelectChange, setSubmittedEmployee, resetForm };
}
