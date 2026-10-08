export const toEmployeeRequestBody = (body, method = 'POST') => {
  if (!body?.image || typeof File === 'undefined' || !(body.image instanceof File)) return body;

  const formData = new FormData();
  if (method !== 'POST') formData.append('_method', method);
  Object.entries(body).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (key === 'charge_ids' && Array.isArray(value)) {
      value.forEach((chargeId) => formData.append('charge_ids[]', chargeId));
      return;
    }
    formData.append(key, value);
  });
  return formData;
};
