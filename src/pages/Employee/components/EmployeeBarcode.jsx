import { useEffect, useRef } from 'react';
import { renderEmployeeBarcode } from '../utils/employeeBarcode.utils';

const EmployeeBarcode = ({
  employeeCode,
  employeeName,
  className = '',
  width = 0,
  height = 80,
  margin = 10,
  showMetadata = true,
}) => {
  const barcodeRef = useRef(null);
  const code = String(employeeCode ?? '').trim();

  useEffect(() => {
    if (!barcodeRef.current || !code) return;

    renderEmployeeBarcode(barcodeRef.current, code, { width, height, margin });
  }, [code, width, height, margin]);

  if (!code) return null;

  return (
    <figure className={`w-fit max-w-full rounded-lg border border-(--color-border) bg-white p-1 text-center ${className}`}>
      {/* {showMetadata && <figcaption className="mb-2 text-xs font-medium text-gray-600">Employee barcode</figcaption>} */}
      <svg
        ref={barcodeRef}
        role="img"
        aria-label={`Barcode for ${employeeName}: ${code}`}
        className="mx-auto h-auto max-w-full"
      />
      {showMetadata && (
        <>
          <p className="mt-1 text-sm font-semibold text-gray-900">{employeeName}</p>
          <p className="text-xs text-gray-600">{code}</p>
        </>
      )}
    </figure>
  );
};

export default EmployeeBarcode;
