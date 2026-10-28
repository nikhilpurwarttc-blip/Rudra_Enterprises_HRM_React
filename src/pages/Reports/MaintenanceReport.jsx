import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import AccessDenied from '../../components/AccessDenied';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import { Feedback, InlineError, LoadingState } from '../../components/Feedback';
import FilterModal from '../../components/FilterModal';
import PageTable from '../../components/PageTable';
import Pagination from '../../components/Pagination';
import usePermission from '../../hooks/usePermission';
import {
  useGetMaintenanceRecordsQuery,
  useGetPlantsQuery,
  useGetPlantShutdownsQuery,
  useLazyExportMaintenanceRecordsQuery,
} from '../../store/api';
import GlassCard from '../../components/GlassCard';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const PAGE_SIZE = 15;

const unwrapList = (response) => Array.isArray(response?.data) ? response.data : [];
const getErrorMessage = (error) => error?.data?.message ?? error?.error ?? 'Unable to load this report. Please try again.';
const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);
const formatNumber = (value) => new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

const getCurrentDateRange = () => {
  const today = new Date();
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return {
    fromDate: format(new Date(today.getFullYear(), today.getMonth(), 1)),
    toDate: format(today),
  };
};

const StatusBadge = ({ label, status }) => {
  const colors = {
    Completed: 'green',
    Approved: 'green',
    Pending: 'yellow',
    Rejected: 'red',
  };
  return <Badge color={colors[label] ?? 'gray'}>{label || `Status ${status}`}</Badge>;
};

const MaintenanceReport = () => {
  const { canView, can: canReport } = usePermission('/reports/maintenance');
  const { can: canModule } = usePermission();
  const canViewMaintenance = canReport('view')
    || canModule('maintenance', 'view')
    || canModule('maintenance-records', 'view');
  const canViewPowercuts = canModule('plant-shutdowns', 'view');
  const canExportMaintenance = canReport('export')
    || canModule('maintenance', 'export')
    || canModule('maintenance-records', 'export');
  const canViewPlants = canModule('plants', 'view');

  const activeReport = canViewMaintenance ? 'maintenance' : 'powercut';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const [plantIds, setPlantIds] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [defaultDateRange] = useState(getCurrentDateRange);
  const [{ fromDate, toDate }, setDateRange] = useState(defaultDateRange);
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const visibleActiveReport = activeReport === 'powercut' && !canViewPowercuts
    ? 'maintenance'
    : activeReport;

  const plantsQuery = useGetPlantsQuery({ per_page: 100 }, { skip: !canViewPlants });
  const plants = unwrapList(plantsQuery.data);
  const plantOptions = useMemo(() => [
    ...plants.map((plant) => ({ value: String(plant.id), label: plant.name })),
  ], [plants]);

  const maintenanceParams = useMemo(() => ({
    page,
    per_page: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(plantIds.length ? { 'plant_ids[]': plantIds } : {}),
    ...(status !== '' ? { status } : {}),
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  }), [page, debouncedSearch, plantIds, status, fromDate, toDate]);
  const powercutParams = useMemo(() => ({
    page,
    per_page: PAGE_SIZE,
    ...(plantIds.length ? { 'plant_ids[]': plantIds } : {}),
    ...(status !== '' ? { status } : {}),
    ...(fromDate ? { start_date: fromDate } : {}),
    ...(toDate ? { end_date: toDate } : {}),
  }), [page, plantIds, status, fromDate, toDate]);

  const maintenanceQuery = useGetMaintenanceRecordsQuery(maintenanceParams, {
    skip: !canViewMaintenance || visibleActiveReport !== 'maintenance',
  });
  const powercutQuery = useGetPlantShutdownsQuery(powercutParams, {
    skip: !canViewPowercuts || visibleActiveReport !== 'powercut',
  });
  const [exportMaintenance] = useLazyExportMaintenanceRecordsQuery();

  if (!canView) {
    return <AccessDenied pageName="maintenance and powercut reports" routePath="/reports/maintenance" />;
  }

  const isMaintenance = visibleActiveReport === 'maintenance';
  const selectedQuery = isMaintenance ? maintenanceQuery : powercutQuery;
  const rows = unwrapList(selectedQuery.data);
  const meta = selectedQuery.data?.meta;
  const lastPage = Number(meta?.last_page ?? 1);
  const total = Number(meta?.total ?? rows.length);
  const maintenanceRecords = isMaintenance ? rows : [];
  const completedMaintenanceCount = maintenanceRecords.filter((record) => Number(record.status) === 1).length;
  const maintenanceAmount = maintenanceRecords.reduce((totalAmount, record) => totalAmount + Number(record.amount || 0), 0);

  const statusOptions = isMaintenance
    ? [
      { value: '', label: 'All statuses' },
      { value: '0', label: 'Pending' },
      { value: '1', label: 'Completed' },
    ]
    : [
      { value: '', label: 'All statuses' },
      { value: '1', label: 'Pending approval' },
      { value: '2', label: 'Approved' },
      { value: '3', label: 'Rejected' },
    ];
  const handleExport = async () => {
    setExportError('');
    setExporting(true);
    try {
      const blob = await exportMaintenance({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(plantIds.length ? { 'plant_ids[]': plantIds } : {}),
        ...(status !== '' ? { status } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
      }).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Maintenance_Report_${fromDate || 'all'}_${toDate || 'all'}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const responseBlob = error?.data instanceof Blob ? error.data : null;
      if (responseBlob) {
        try {
          const errorBody = JSON.parse(await responseBlob.text());
          setExportError(errorBody.message ?? 'The CSV export failed. Please try again.');
        } catch {
          setExportError('The CSV export failed. Please try again.');
        }
      } else {
        setExportError(getErrorMessage(error));
      }
    } finally {
      setExporting(false);
    }
  };

  const maintenanceColumns = [
    {
      key: 'maintenance_date',
      label: 'Date',
      className: 'min-w-32',
      tdClass: 'min-w-32',
    },
    {
      key: 'plant.name',
      label: 'Plant',
      className: 'min-w-44',
      tdClass: 'min-w-44',
      sortable: false,
      render: (record) => <span>{record.plant?.name ?? '—'}<span className="block text-xs text-(--color-text-muted)">{record.plant?.plant_code ?? ''}</span></span>,
    },
    {
      key: 'employee.name',
      label: 'Employee',
      className: 'min-w-48',
      tdClass: 'min-w-48',
      sortable: false,
      render: (record) => <span>{record.employee?.name ?? '—'}<span className="block text-xs text-(--color-text-muted)">{record.employee?.employee_code ?? ''}</span></span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      className: 'min-w-32',
      tdClass: 'min-w-32 text-right',
      render: (record) => formatCurrency(record.amount),
    },
    {
      key: 'status_label',
      label: 'Status',
      className: 'min-w-32',
      tdClass: 'min-w-32',
      sortable: false,
      render: (record) => <StatusBadge label={record.status_label} status={record.status} />,
    },
    {
      key: 'remarks',
      label: 'Remarks',
      className: 'min-w-56',
      tdClass: 'min-w-56',
      render: (record) => record.remarks || '—',
    },
  ];

  const powercutColumns = [
    {
      key: 'shutdown_start_date',
      label: 'Period',
      className: 'min-w-44',
      tdClass: 'min-w-44',
      sortable: false,
      render: (shutdown) => (
        <span>
          {shutdown.shutdown_start_date}
          <span className="block text-xs text-(--color-text-muted)">to {shutdown.shutdown_end_date}</span>
        </span>
      ),
    },
    {
      key: 'plant.name',
      label: 'Plant',
      className: 'min-w-44',
      tdClass: 'min-w-44',
      sortable: false,
      render: (shutdown) => <span>{shutdown.plant?.name ?? '—'}<span className="block text-xs text-(--color-text-muted)">{shutdown.plant?.plant_code ?? ''}</span></span>,
    },
    {
      key: 'shutdown_type',
      label: 'Type',
      className: 'min-w-36',
      tdClass: 'min-w-36',
      render: (shutdown) => shutdown.shutdown_type || 'Powercut',
    },
    {
      key: 'guaranteed_hours',
      label: 'Guaranteed hours',
      className: 'min-w-36',
      tdClass: 'min-w-36 text-right',
      render: (shutdown) => `${formatNumber(shutdown.guaranteed_hours)} hrs/day`,
    },
    {
      key: 'status',
      label: 'Approval',
      className: 'min-w-32',
      tdClass: 'min-w-32',
      sortable: false,
      render: (shutdown) => {
        const label = { 1: 'Pending', 2: 'Approved', 3: 'Rejected' }[Number(shutdown.status)] ?? 'Unknown';
        return <StatusBadge label={label} status={shutdown.status} />;
      },
    },
    {
      key: 'reason',
      label: 'Reason',
      className: 'min-w-56',
      tdClass: 'min-w-56',
      render: (shutdown) => shutdown.reason || shutdown.remarks || '—',
    },
  ];

  if (!canViewMaintenance && !canViewPowercuts) {
    return (
      <AccessDenied
        pageName="maintenance and powercut report data"
        routePath="/reports/maintenance"
      />
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-(--color-text)">Maintenance &amp; Powercut Report</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Review maintenance activity and approved plant shutdown periods.</p>
        </div>

      </header> */}

      <div className="flex justify-end gap-2">
        <FilterModal
          title={isMaintenance ? 'Filter maintenance report' : 'Filter powercut report'}
          values={{
            ...(isMaintenance ? { search } : {}),
            plantIds,
            status,
            fromDate,
            toDate,
          }}
          onApply={(nextFilters) => {
            if (isMaintenance) setSearch(nextFilters.search ?? '');
            setPlantIds(nextFilters.plantIds ?? plantIds);
            setStatus(nextFilters.status ?? '');
            setDateRange({
              fromDate: nextFilters.fromDate ?? '',
              toDate: nextFilters.toDate ?? '',
            });
            setPage(1);
          }}
          fields={[
            ...(isMaintenance ? [{
              key: 'search',
              label: 'Search',
              placeholder: 'Plant, employee, remarks',
            }] : []),
            ...(canViewPlants ? [{
              key: 'plantIds',
              label: 'Plants',
              type: 'multiselect',
              options: plantOptions,
              placeholder: 'All plants',
              isLoading: plantsQuery.isLoading,
            }] : []),
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: statusOptions,
              placeholder: 'All statuses',
              showSearch: false,
            },
            {
              key: 'fromDate',
              label: 'From',
              type: 'date',
              max: (draft) => draft.toDate || undefined,
            },
            {
              key: 'toDate',
              label: 'To',
              type: 'date',
              min: (draft) => draft.fromDate || undefined,
            },
          ]}
        />
        {isMaintenance && canExportMaintenance && (
          <Button
            type="button"
            onClick={handleExport}
            disabled={exporting || selectedQuery.isFetching}
            className="flex items-center gap-2"
          >
            <Download size={16} /> {exporting ? 'Preparing CSV…' : 'Export CSV'}
          </Button>
        )}
      </div>

      {exportError && <InlineError message={exportError} />}
      {plantsQuery.isError && canViewPlants && (
        <p role="status" className="text-xs text-(--color-text-muted)">Plant filter options could not be loaded; your report remains scoped by your assigned plant access.</p>
      )}

      {isMaintenance && canViewMaintenance && maintenanceQuery.isError ? (
        <Feedback type="error" title="Unable to load maintenance report" message={getErrorMessage(maintenanceQuery.error)} />
      ) : !isMaintenance && canViewPowercuts && powercutQuery.isError ? (
        <Feedback type="error" title="Unable to load powercut report" message={getErrorMessage(powercutQuery.error)} />
      ) : selectedQuery.isLoading && rows.length === 0 ? (
        <LoadingState message="Loading report…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <GlassCard className="rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
              <p className="text-xs text-(--color-text-muted)">{isMaintenance ? 'Matching maintenance records' : 'Matching shutdown periods'}</p>
              <p className="mt-1 text-lg font-semibold text-(--color-text)">{formatNumber(total)}</p>
            </GlassCard>
            {isMaintenance &&
              <GlassCard className="rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
                <p className="text-xs text-(--color-text-muted)">Completed on this page</p>
                <p className="mt-1 text-lg font-semibold text-(--color-text)">{formatNumber(completedMaintenanceCount)}</p>
              </GlassCard>
            }
            {isMaintenance &&
              <GlassCard className="rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
                <p className="text-xs text-(--color-text-muted)">Maintenance amount on this page</p>
                <p className="mt-1 text-lg font-semibold text-(--color-text)">{formatCurrency(maintenanceAmount)}</p>
              </GlassCard>
            }
            {!isMaintenance &&
              <GlassCard className="rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
                <p className="text-xs text-(--color-text-muted)">Approved shutdown periods on this page</p>
                <p className="mt-1 text-lg font-semibold text-(--color-text)">{formatNumber(rows.filter((shutdown) => Number(shutdown.status) === 2).length)}</p>
              </GlassCard>
            }
          </div>

          {/* <div className="overflow-x-auto"> */}
          <PageTable
            // className={`max-h-[65vh] ${isMaintenance ? 'min-w-[1050px]' : 'min-w-[1000px]'}`}
            columns={isMaintenance ? maintenanceColumns : powercutColumns}
            rows={rows}
            total={total}
            label={isMaintenance ? 'maintenance records' : 'shutdown periods'}
            emptyText={isMaintenance ? 'No maintenance records match these filters.' : 'No shutdown periods match these filters.'}
            isLoading={selectedQuery.isLoading}
          />
          {/* </div> */}
          <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default MaintenanceReport;
