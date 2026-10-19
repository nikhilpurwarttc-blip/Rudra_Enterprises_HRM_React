import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Printer, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import GlassCard from '../../components/GlassCard';
import { Feedback, LoadingState } from '../../components/Feedback';
import InputField from '../../components/InputField';
import { useLazyGetEmployeesQuery } from '../../store/api';
import useRefreshOnFocus from '../../hooks/useRefreshOnFocus';
import usePermission from '../../hooks/usePermission';
import EmployeeBarcode from './components/EmployeeBarcode';
import { createEmployeeBarcodePng, createEmployeeBarcodeSvg } from './utils/employeeBarcode.utils';

const unwrap = (response) => Array.isArray(response) ? response : response?.data ?? [];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));
const safeFilename = (value) => Array.from(String(value ?? 'employee'), (character) =>
  character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character,
).join('').trim() || 'employee';
const loadAccessibleEmployees = async (fetchEmployees) => {
  const employees = [];
  let page = 1;
  while (true) {
    const response = await fetchEmployees({ page, per_page: 100 }, false).unwrap();
    employees.push(...unwrap(response));
    const lastPage = Math.max(1, Number(response?.meta?.last_page ?? page));
    if (page >= lastPage) break;
    page += 1;
  }
  return employees;
};

const EmployeeBarcodes = () => {
  const navigate = useNavigate();
  const { canView } = usePermission('/employees/barcodes');
  const [fetchEmployees] = useLazyGetEmployeesQuery({ refetchOnFocus: false });
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadEmployees = useCallback(async (isCurrent = () => true, { silent = false } = {}) => {
    try {
      const allEmployees = await loadAccessibleEmployees(fetchEmployees);
      if (isCurrent()) {
        setEmployees(allEmployees);
        if (!silent) setSelectedIds(new Set());
        setError('');
      }
    } catch {
      if (isCurrent()) setError('Unable to load employee barcodes. Please try again.');
    } finally {
      if (isCurrent() && !silent) setLoading(false);
    }
  }, [fetchEmployees]);

  useEffect(() => {
    let isCurrent = true;
    const initialLoad = window.setTimeout(() => loadEmployees(() => isCurrent), 0);
    return () => {
      isCurrent = false;
      window.clearTimeout(initialLoad);
    };
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      [employee.name, employee.employee_code]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(query)),
    );
  }, [employees, search]);
  const selectedEmployees = useMemo(
    () => employees.filter((employee) => selectedIds.has(String(employee.id))),
    [employees, selectedIds],
  );

  const toggleSelected = (employeeId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(String(employeeId))) next.delete(String(employeeId));
      else next.add(String(employeeId));
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = filteredEmployees.length > 0
        && filteredEmployees.every((employee) => next.has(String(employee.id)));
      filteredEmployees.forEach((employee) => {
        if (allSelected) next.delete(String(employee.id));
        else next.add(String(employee.id));
      });
      return next;
    });
  };

  const refreshEmployees = useCallback(({ silent = false } = {}) => {
    if (silent) {
      loadEmployees(() => isMounted.current, { silent: true });
      return;
    }
    setLoading(true);
    setError('');
    loadEmployees();
  }, [loadEmployees]);
  useRefreshOnFocus(refreshEmployees, canView);

  const downloadBarcode = async (employee) => {
    setActionError('');
    try {
      const png = await createEmployeeBarcodePng(employee.employee_code, { width: 3, height: 80, margin: 10 });
      if (!png) {
        setActionError(`${employee.name} has no employee code to encode.`);
        return;
      }
      const objectUrl = URL.createObjectURL(png);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${safeFilename(employee.employee_code)}-${safeFilename(employee.name)}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setActionError(`Unable to generate a barcode for ${employee.name}.`);
    }
  };

  const printBarcodes = () => {
    setActionError('');
    if (!selectedEmployees.length) {
      setActionError('Select at least one employee to print.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setActionError('Allow pop-ups for this site to print barcodes.');
      return;
    }

    try {
      const cards = selectedEmployees.map((employee) => {
        const svg = createEmployeeBarcodeSvg(employee.employee_code, { width: 3, height: 80, margin: 10 });
        if (!svg) return '';
        const barcode = new XMLSerializer().serializeToString(svg);
        return `<article class="barcode-card">${barcode}<h2>${escapeHtml(employee.name)}</h2><p>${escapeHtml(employee.employee_code)}</p></article>`;
      }).join('');

      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
        <style>
          * { box-sizing: border-box; }
          body { color: #111; font-family: Arial, sans-serif; margin: 16mm; }
          main { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12mm 8mm; }
          .barcode-card { break-inside: avoid; text-align: center; border: 1px solid #bbb; padding: 8mm 4mm; }
          svg { display: block; height: auto; margin: 0 auto; max-width: 100%; }
          h2 { font-size: 14pt; margin: 5mm 0 1mm; }
          p { font-size: 11pt; margin: 0; }
          @media print { body { margin: 0; } }
        </style></head><body><main>${cards}</main></body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onafterprint = () => printWindow.close();
      window.setTimeout(() => printWindow.print(), 250);
    } catch {
      printWindow.close();
      setActionError('Unable to prepare the selected barcodes for printing.');
    }
  };

  if (!canView) return <Feedback type="error" title="Access denied" message="You do not have permission to view employee barcodes." />;
  if (loading && employees.length === 0) return <LoadingState message="Loading employee barcodes..." className="min-h-[60vh]" />;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button type="button" variant="ghost" onClick={() => navigate('/employees')} className="mb-2 flex items-center gap-2">
              <ArrowLeft size={16} /> Employees
            </Button>
            {/* <h1 className="text-2xl font-semibold text-(--color-text)">Employee Barcodes</h1> */}
            {/* <p className="mt-1 text-sm text-(--color-text-muted)">Only employees available to your account are shown. Each CODE128 barcode encodes the employee code.</p> */}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={refreshEmployees} disabled={loading} className="flex items-center gap-2">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button type="button" onClick={printBarcodes} disabled={selectedIds.size === 0} className="flex items-center gap-2">
              <Printer size={16} /> Print selected ({selectedIds.size})
            </Button>
          </div>
        </div>

        {/* <GlassCard className="space-y-4 p-4 sm:p-5"> */}
        <div className="flex flex-wrap items-center gap-3">
          <InputField
            className="min-w-56 flex-1"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by employee name or code"
            leftIcon={<Search size={16} />}
            aria-label="Search employees for barcodes"
          />
          <Button type="button" variant="ghost" onClick={toggleAllVisible} disabled={filteredEmployees.length === 0}>
            {filteredEmployees.length > 0 && filteredEmployees.every((employee) => selectedIds.has(String(employee.id)))
              ? 'Clear visible selection'
              : 'Select visible'}
          </Button>
          <span className="text-sm text-(--color-text-muted)">
            {filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'}
          </span>
        </div>

        {error && <Feedback type="error" title="Unable to load barcodes" message={error} action={<Button type="button" onClick={refreshEmployees}>Try again</Button>} />}
        {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
        {!error && filteredEmployees.length === 0 && (
          <p className="py-10 text-center text-sm text-(--color-text-muted)">
            {employees.length ? 'No employees match your search.' : 'No accessible employees found.'}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <article key={employee.id} className="flex min-w-0 flex-col items-center gap-3 rounded-lg border border-(--color-border) p-4">
              <div className="flex w-full h-auto items-center justify-between gap-4">
                <label className="flex w-full items-center justify-between gap-3 text-sm font-medium text-(--color-text)">
                  <span className="truncate">{employee.name}</span>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(String(employee.id))}
                    onChange={() => toggleSelected(employee.id)}
                    aria-label={`Select ${employee.name} barcode`}
                    className="h-4 w-4 shrink-0 accent-(--color-accent)"
                  />
                </label>
                <button type="button" onClick={() => downloadBarcode(employee)} className="h-auto rounded-full hover:scale-120 font-medium text-(--color-text-muted)">
                  <Download size={16} />
                </button>
              </div>

              {employee.employee_code ? (
                <>
                  <EmployeeBarcode
                    employeeCode={employee.employee_code}
                    employeeName={employee.name}
                    height={48}
                    width={3}
                    margin={2}
                    showMetadata={false}
                  />
                </>
              ) : (
                <p className="py-6 text-sm text-(--color-text-muted)">No employee code available.</p>
              )}
            </article>
          ))}
        </div>
        {/* </GlassCard> */}
      </div>
    </div>
  );
};

export default EmployeeBarcodes;
