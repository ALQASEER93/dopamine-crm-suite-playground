import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import {
  createProduct,
  deactivateProduct,
  exportProducts,
  importProducts,
  listProducts,
  productKeys,
  updateProduct,
} from '../api/endpoints/products';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const DEFAULT_FORM = {
  code: '',
  name: '',
  line: '',
  pack: '',
  cost: '',
  selling_price: '',
  bonus_rules: '',
  is_active: true,
};

const formatCurrency = value => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return number.toFixed(2);
};

const computeMargin = (cost, price) => {
  const costNum = Number(cost);
  const priceNum = Number(price);
  if (Number.isNaN(costNum) || Number.isNaN(priceNum) || priceNum === 0) {
    return null;
  }
  const diff = priceNum - costNum;
  const pct = (diff / priceNum) * 100;
  return { diff, pct };
};

const ProductForm = ({ initialValues, onSubmit, onCancel, submitting, error }) => {
  const [form, setForm] = useState(initialValues || DEFAULT_FORM);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    onSubmit({
      code: form.code.trim(),
      name: form.name.trim(),
      line: form.line || null,
      pack: form.pack || null,
      cost: form.cost === '' ? null : Number(form.cost),
      selling_price: form.selling_price === '' ? null : Number(form.selling_price),
      bonus_rules: form.bonus_rules || null,
      is_active: form.is_active,
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__label">
        الكود
        <input type="text" value={form.code} onChange={e => updateField('code', e.target.value)} required />
      </label>
      <label className="form__label">
        اسم المنتج
        <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} required />
      </label>
      <label className="form__label">
        الخط العلاجي
        <input type="text" value={form.line} onChange={e => updateField('line', e.target.value)} />
      </label>
      <label className="form__label">
        العبوة
        <input type="text" value={form.pack} onChange={e => updateField('pack', e.target.value)} />
      </label>
      <label className="form__label">
        التكلفة
        <input
          type="number"
          step="0.01"
          value={form.cost}
          onChange={e => updateField('cost', e.target.value)}
        />
      </label>
      <label className="form__label">
        سعر البيع
        <input
          type="number"
          step="0.01"
          value={form.selling_price}
          onChange={e => updateField('selling_price', e.target.value)}
        />
      </label>
      <label className="form__label">
        قواعد البونص
        <textarea value={form.bonus_rules} onChange={e => updateField('bonus_rules', e.target.value)} rows={3} />
      </label>
      <label className="form__label">
        الحالة
        <select
          value={form.is_active ? 'active' : 'inactive'}
          onChange={e => updateField('is_active', e.target.value === 'active')}
        >
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
      </label>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '8px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? '...جارٍ الحفظ' : 'حفظ'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          إلغاء
        </button>
      </div>
    </form>
  );
};

const ProductsPage = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const roleSlug = user?.role?.slug;
  const canManage = roleSlug === 'admin' || roleSlug === 'sales_manager';

  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [formInitial, setFormInitial] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importing, setImporting] = useState(false);

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search,
      line: lineFilter,
      is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    }),
    [activeFilter, lineFilter, page, pageSize, search],
  );

  const productsQuery = useQuery({
    queryKey: productKeys.list(queryParams),
    queryFn: () => listProducts(queryParams),
    enabled: !!token,
    keepPreviousData: true,
    select: data => {
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination || data?.meta;
      const total = pagination?.total ?? rows.length;
      return { rows, total };
    },
  });

  const createMutation = useMutation({
    mutationFn: payload => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      closeForm();
      pushToast({ type: 'success', title: 'تم الحفظ', message: 'تم إنشاء المنتج بنجاح.' });
    },
    onError: error => setFormError(error.message || 'تعذر حفظ المنتج.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      closeForm();
      pushToast({ type: 'success', title: 'تم التحديث', message: 'تم تحديث المنتج بنجاح.' });
    },
    onError: error => setFormError(error.message || 'تعذر تحديث المنتج.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: id => deactivateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      setDeleteTarget(null);
      pushToast({ type: 'success', title: 'تم التعطيل', message: 'تم تعطيل المنتج.' });
    },
    onError: error => {
      setDeleteTarget(null);
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تعطيل المنتج.' });
    },
  });

  const closeForm = () => {
    setFormMode(null);
    setFormInitial(DEFAULT_FORM);
    setFormError(null);
  };

  const openCreate = () => {
    setFormMode('create');
    setFormInitial(DEFAULT_FORM);
    setFormError(null);
  };

  const openEdit = product => {
    setFormMode('edit');
    setFormInitial({
      code: product.code || '',
      name: product.name || '',
      line: product.line || '',
      pack: product.pack || '',
      cost: product.cost ?? '',
      selling_price: product.selling_price ?? '',
      bonus_rules: product.bonus_rules || '',
      is_active: product.is_active !== false,
    });
    setFormError(null);
  };

  const handleSubmit = payload => {
    setFormError(null);
    if (formMode === 'edit' && selected) {
      updateMutation.mutate({ id: selected.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleExport = async () => {
    try {
      const { blob, response } = await exportProducts(queryParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `products-${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      pushToast({ type: 'success', title: 'تم التصدير', message: 'تم تنزيل ملف المنتجات.' });
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تصدير المنتجات.' });
    }
  };

  const handleImport = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importProducts(file);
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      pushToast({ type: 'success', title: 'تم الاستيراد', message: 'تم استيراد المنتجات بنجاح.' });
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر استيراد المنتجات.' });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const products = productsQuery.data?.rows || [];
  const total = productsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = [
    { key: 'code', header: 'الكود', sortable: true },
    { key: 'name', header: 'المنتج', sortable: true },
    { key: 'line', header: 'الخط', render: row => row.line || '-' },
    {
      key: 'pricing',
      header: 'التسعير',
      render: row => (
        <div>
          <div>تكلفة: {formatCurrency(row.cost)}</div>
          <div>بيع: {formatCurrency(row.selling_price)}</div>
        </div>
      ),
    },
    {
      key: 'margin',
      header: 'الهامش',
      render: row => {
        const margin = computeMargin(row.cost, row.selling_price);
        if (!margin) return '-';
        return `${formatCurrency(margin.diff)} (${margin.pct.toFixed(1)}%)`;
      },
    },
    {
      key: 'status',
      header: 'الحالة',
      render: row => (
        <span className="badge">{row.is_active === false ? 'غير نشط' : 'نشط'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'إجراءات',
      render: row => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected(row)}>
            عرض
          </button>
          {canManage && (
            <button type="button" className="btn btn-secondary" onClick={() => openEdit(row)}>
              تعديل
            </button>
          )}
          {canManage && row.is_active !== false && (
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(row)}>
              تعطيل
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">المنتجات</h1>
          <p className="page-subtitle">إدارة كتالوج المنتجات والتسعير وهوامش الربح.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            تصدير CSV
          </button>
          {canManage && (
            <>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                {importing ? 'جارٍ الاستيراد...' : 'استيراد CSV'}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                  disabled={importing}
                />
              </label>
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                منتج جديد
              </button>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={products}
        loading={productsQuery.isLoading}
        emptyMessage="لا توجد منتجات مطابقة."
        quickSearch={{
          value: search,
          placeholder: 'ابحث بالاسم أو الكود',
          onChange: value => {
            setSearch(value);
            setPage(1);
          },
        }}
        filters={
          <>
            <select
              className="input"
              value={lineFilter}
              onChange={event => {
                setLineFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">كل الخطوط</option>
              {Array.from(new Set(products.map(p => p.line).filter(Boolean))).map(line => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={activeFilter}
              onChange={event => {
                setActiveFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </>
        }
        footer={
          <>
            <span>
              صفحة {page} من {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>الصفوف</span>
              <select
                value={pageSize}
                onChange={event => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                السابق
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                التالي
              </button>
            </div>
          </>
        }
      />

      <DetailDrawer title={selected?.name || ''} isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <div className="detail-grid">
            <p>
              <strong>الكود:</strong> {selected.code}
            </p>
            <p>
              <strong>الخط:</strong> {selected.line || '-'}
            </p>
            <p>
              <strong>العبوة:</strong> {selected.pack || '-'}
            </p>
            <p>
              <strong>التكلفة:</strong> {formatCurrency(selected.cost)}
            </p>
            <p>
              <strong>سعر البيع:</strong> {formatCurrency(selected.selling_price)}
            </p>
            <p>
              <strong>الحالة:</strong> {selected.is_active === false ? 'غير نشط' : 'نشط'}
            </p>
            {selected.bonus_rules && (
              <p>
                <strong>البونص:</strong> {selected.bonus_rules}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {canManage && (
                <button type="button" className="btn btn-primary" onClick={() => openEdit(selected)}>
                  تعديل
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                إغلاق
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer title={formMode === 'edit' ? 'تعديل منتج' : 'منتج جديد'} isOpen={Boolean(formMode)} onClose={closeForm}>
        {formMode && (
          <ProductForm
            initialValues={formInitial}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            submitting={createMutation.isPending || updateMutation.isPending}
            error={formError}
          />
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد تعطيل المنتج"
        description="سيتم تعطيل المنتج ومنعه من الظهور في القوائم النشطة."
        confirmText="تعطيل"
        cancelText="إلغاء"
        onConfirm={() => deactivateMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deactivateMutation.isPending}
      />
    </div>
  );
};

export default ProductsPage;
