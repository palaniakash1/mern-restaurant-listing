import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Label,
  Modal,
  Select,
  Spinner,
  Table
} from 'flowbite-react';
import { HiOutlineEye } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiGet } from '../utils/api';
import { hasPermission } from '../utils/permissions';

const AUDIT_LIMIT = 20;

const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'auth', label: 'Authentication' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'menu', label: 'Menus' },
  { value: 'category', label: 'Categories' },
  { value: 'user', label: 'Users' },
  { value: 'review', label: 'Reviews' }
];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'BULK_UPDATE', label: 'Bulk Update' },
  { value: 'STATUS_CHANGE', label: 'Status Change' },
  { value: 'RESTORE', label: 'Restore' },
  { value: 'REASSIGN', label: 'Reassign' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'REFRESH', label: 'Refresh' }
];

const ENTITY_COLORS = {
  auth: 'bg-slate-100 text-slate-700',
  restaurant: 'bg-rose-100 text-rose-700',
  menu: 'bg-emerald-100 text-emerald-700',
  category: 'bg-amber-100 text-amber-700',
  user: 'bg-violet-100 text-violet-700',
  review: 'bg-sky-100 text-sky-700'
};

const ACTION_COLORS = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'failure',
  BULK_UPDATE: 'purple',
  STATUS_CHANGE: 'warning',
  RESTORE: 'success',
  REASSIGN: 'purple',
  LOGIN: 'success',
  LOGIN_FAILED: 'failure',
  LOGOUT: 'gray',
  REFRESH: 'info'
};

const formatDateTime = (value) => {
  if (!value) return 'Unknown';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

const stringifyChange = (value) => {
  if (!value) return null;
  return JSON.stringify(value, null, 2);
};

const buildSummaryCards = (logs = []) => {
  const actionChanges = logs.filter((log) =>
    [
      'CREATE',
      'UPDATE',
      'DELETE',
      'BULK_UPDATE',
      'STATUS_CHANGE',
      'RESTORE',
      'REASSIGN'
    ].includes(log.action)
  ).length;

  return {
    records: logs.length,
    authEvents: logs.filter((log) =>
      ['LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'REFRESH'].includes(log.action)
    ).length,
    operationalChanges: actionChanges,
    uniqueActors: new Set(
      logs.map((log) => log.actorId?._id || log.actorId).filter(Boolean)
    ).size
  };
};

function ScopeNotice({ role }) {
  return (
    <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-5 text-white shadow-inner">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">
        Visibility scope
      </p>
      <p className="mt-3 text-sm leading-7 text-white/95">
        {role === 'superAdmin'
          ? 'You can inspect platform-wide audit activity across authentication, users, restaurants, menus, categories, and reviews.'
          : 'You can inspect only restaurant-related audit activity within your admin scope, plus your own actions. Actor-level filtering is intentionally restricted by the backend for admins.'}
      </p>
    </div>
  );
}

function ChangePreview({ label, value }) {
  const content = stringifyChange(value);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[#23411f]">{label}</p>
      <div className="max-h-[320px] overflow-auto rounded-[1.25rem] border border-[#e6eccf] bg-[#fbfcf7] p-4">
        {content ? (
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-700">
            {content}
          </pre>
        ) : (
          <p className="text-sm text-gray-400">No data captured.</p>
        )}
      </div>
    </div>
  );
}

export default function DashAuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countLoading, setCountLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [entityCounts, setEntityCounts] = useState({ all: 0 });

  const { showToast } = useToast();

  const canReadAuditLogs = hasPermission(user, 'audit', 'read');

  const loadAuditLogs = useCallback(async () => {
    if (!canReadAuditLogs) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(AUDIT_LIMIT)
      });

      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);

      const response = await apiGet(`/api/auditlogs?${params.toString()}`);
      setLogs(response.data || []);
      setTotalPages(Math.max(1, response.totalPages || 1));
      setTotalLogs(response.total || 0);
    } catch (loadError) {
      showToast(loadError.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [action, canReadAuditLogs, entityType, page]);

  const loadEntityCounts = useCallback(async () => {
    if (!canReadAuditLogs) {
      setCountLoading(false);
      return;
    }

    try {
      setCountLoading(true);

      const buildCountUrl = (nextEntityType) => {
        const params = new URLSearchParams({
          page: '1',
          limit: '1'
        });

        if (action) params.set('action', action);
        if (nextEntityType) params.set('entityType', nextEntityType);

        return `/api/auditlogs?${params.toString()}`;
      };

      const responses = await Promise.all([
        apiGet(buildCountUrl('')),
        ...ENTITY_OPTIONS.filter((option) => option.value).map((option) =>
          apiGet(buildCountUrl(option.value))
        )
      ]);

      const [allResponse, ...entityResponses] = responses;
      const nextCounts = { all: allResponse.total || 0 };

      ENTITY_OPTIONS.filter((option) => option.value).forEach((option, index) => {
        nextCounts[option.value] = entityResponses[index]?.total || 0;
      });

      setEntityCounts(nextCounts);
    } catch {
      setEntityCounts({ all: 0 });
    } finally {
      setCountLoading(false);
    }
  }, [action, canReadAuditLogs]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    loadEntityCounts();
  }, [loadEntityCounts]);

  useEffect(() => {
    setPage(1);
  }, [entityType, action]);

  const summary = useMemo(() => buildSummaryCards(logs), [logs]);

  if (!canReadAuditLogs) {
    return (
      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <p className="text-sm text-gray-600">
          Your current role does not have access to audit log monitoring.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                Audit intelligence
              </p>
              <h2 className="text-2xl font-bold text-[#23411f] sm:text-3xl">
                Compliance and activity trail
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-gray-600">
                Review critical changes, moderation events, and authentication
                activity with role-aware visibility that follows the backend
                audit policy.
              </p>
            </div>
            <ScopeNotice role={user?.role} />
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Page records</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">
              {summary.records}
            </p>
          </Card>
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Auth events</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">
              {summary.authEvents}
            </p>
          </Card>
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Operational changes</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">
              {summary.operationalChanges}
            </p>
          </Card>
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Unique actors</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">
              {summary.uniqueActors}
            </p>
          </Card>
        </div>

        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#23411f]">
                Audit log table
              </h3>
              <p className="text-sm text-gray-500">
                Inspect recent actions with entity and event filters tailored to
                your allowed scope.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="space-y-1">
                <Label htmlFor="entityType">Entity</Label>
                <Select
                  id="entityType"
                  value={entityType}
                  onChange={(event) => setEntityType(event.target.value)}
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                >
                  {ENTITY_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="action">Action</Label>
                <Select
                  id="action"
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                >
                  {ACTION_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              {
                key: 'all',
                label: `All (${entityCounts.all || 0})`,
                onClick: () => setEntityType(''),
                active: entityType === ''
              },
              ...ENTITY_OPTIONS.filter((option) => option.value).map(
                (option) => ({
                  key: option.value,
                  label: `${option.label} (${entityCounts[option.value] || 0})`,
                  onClick: () => setEntityType(option.value),
                  active: entityType === option.value
                })
              )
            ].map((filter) => (
              <Button
                key={filter.key}
                size="xs"
                className={
                  filter.active
                    ? '!bg-[#23411f] !text-white'
                    : '!bg-[#f5faeb] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white'
                }
                onClick={filter.onClick}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {(loading || countLoading) && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f7faef] px-4 py-3 text-sm text-[#4e5e20]">
              <Spinner size="sm" />
              Loading audit logs...
            </div>
          )}

          {!loading && !countLoading && logs.length === 0 && (
            <div className="mt-4 rounded-[1.5rem] border border-dashed !border-[#dce6c1] bg-[#fbfcf7] p-8 text-center text-sm text-gray-500">
              No audit entries matched the current filters.
            </div>
          )}

          {!loading && !countLoading && logs.length > 0 && (
            <>
              <div className="mt-5 hidden overflow-x-auto md:block">
                <Table hoverable>
                  <Table.Head>
                    <Table.HeadCell>Time</Table.HeadCell>
                    <Table.HeadCell>Actor</Table.HeadCell>
                    <Table.HeadCell>Action</Table.HeadCell>
                    <Table.HeadCell>Entity</Table.HeadCell>
                    <Table.HeadCell>IP</Table.HeadCell>
                    <Table.HeadCell>Changes</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {logs.map((log) => (
                      <Table.Row key={log._id}>
                        <Table.Cell>
                          <div className="text-sm font-medium text-[#23411f]">
                            {formatDateTime(log.createdAt)}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div>
                            <p className="font-semibold text-[#23411f]">
                              {log.actorId?.userName || 'System / anonymous'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {log.actorId?.role || log.actorRole}
                            </p>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge color={ACTION_COLORS[log.action] || 'gray'}>
                            {log.action}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="space-y-2">
                            <Badge
                              className={`w-fit border-0 ${ENTITY_COLORS[log.entityType] || 'bg-slate-100 text-slate-700'}`}
                            >
                              {log.entityType}
                            </Badge>
                            <p className="max-w-[180px] truncate text-xs text-gray-500">
                              {log.entityId || 'No entity id'}
                            </p>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-sm text-gray-600">
                          {log.ipAddress || 'Unavailable'}
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                            onClick={() => setSelectedLog(log)}
                          >
                            <HiOutlineEye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>

              <div className="mt-5 space-y-3 md:hidden">
                {logs.map((log) => (
                  <div
                    key={log._id}
                    className="rounded-[1.5rem] border border-[#e6eccf] bg-[#fbfcf7] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#23411f]">
                          {log.actorId?.userName || 'System / anonymous'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>
                      <Badge color={ACTION_COLORS[log.action] || 'gray'}>
                        {log.action}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge
                        className={`border-0 ${ENTITY_COLORS[log.entityType] || 'bg-slate-100 text-slate-700'}`}
                      >
                        {log.entityType}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {log.ipAddress || 'Unavailable'}
                      </span>
                    </div>
                    <Button
                      size="xs"
                      className="mt-4 !bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                      onClick={() => setSelectedLog(log)}
                    >
                      <HiOutlineEye className="mr-1 h-4 w-4" />
                      View details
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">
                  Page {page} of {Math.max(1, totalPages)} • {totalLogs} total
                  records
                </span>
                <div className="flex gap-2">
                  <Button
                    color="light"
                    size="xs"
                    disabled={page === 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    color="light"
                    size="xs"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        show={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        size="5xl"
        dismissible={true}
      >
        <Modal.Header>Audit log detail</Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.25rem] border border-[#e6eccf] bg-[#fbfcf7] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Actor
                  </p>
                  <p className="mt-2 font-semibold text-[#23411f]">
                    {selectedLog.actorId?.userName || 'System / anonymous'}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[#e6eccf] bg-[#fbfcf7] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Action
                  </p>
                  <p className="mt-2 font-semibold text-[#23411f]">
                    {selectedLog.action}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[#e6eccf] bg-[#fbfcf7] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Entity
                  </p>
                  <p className="mt-2 font-semibold text-[#23411f]">
                    {selectedLog.entityType}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[#e6eccf] bg-[#fbfcf7] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Occurred
                  </p>
                  <p className="mt-2 font-semibold text-[#23411f]">
                    {formatDateTime(selectedLog.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <ChangePreview label="Before" value={selectedLog.before} />
                <ChangePreview label="After" value={selectedLog.after} />
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
