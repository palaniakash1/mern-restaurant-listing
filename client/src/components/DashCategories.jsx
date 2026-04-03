import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Label,
  Modal,
  Select,
  Spinner,
  Table,
  TextInput
} from 'flowbite-react';
import { HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';
import { apiDelete, apiGet, apiPatch, apiPost } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

const emptyForm = {
  name: '',
  restaurantId: '',
  isGeneric: false,
  order: 0
};

export default function DashCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canReadAllCategories = hasPermission(user, 'category', 'readAll');
  const canReadOwnCategories = hasPermission(user, 'category', 'readMine');
  const canCreateCategory = hasPermission(user, 'category', 'create');
  const canUpdateCategory = hasPermission(user, 'category', 'update');
  const canDeleteCategory = hasPermission(user, 'category', 'delete');
  const canUpdateStatus = hasPermission(user, 'category', 'updateStatus');

  const listEndpoint = useMemo(() => {
    if (canReadAllCategories) {
      return '/api/categories/all?page=1&limit=100';
    }

    if (canReadOwnCategories) {
      return '/api/categories/my?page=1&limit=100';
    }

    return null;
  }, [canReadAllCategories, canReadOwnCategories]);

  const loadRestaurants = useCallback(async () => {
    if (user?.role === 'superAdmin') {
      const data = await apiGet('/api/restaurants/all?page=1&limit=100');
      return data.data || [];
    }

    if (user?.role === 'admin') {
      const data = await apiGet('/api/restaurants/me/all?page=1&limit=100');
      return data.data || [];
    }

    return [];
  }, [user?.role]);

  const loadCategories = useCallback(async () => {
    if (!listEndpoint) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [categoryData, restaurantData] = await Promise.all([
        apiGet(listEndpoint),
        loadRestaurants()
      ]);
      setCategories(categoryData.data || []);
      setRestaurants(restaurantData);
      setFormData((current) => ({
        ...current,
        restaurantId: current.restaurantId || restaurantData[0]?._id || ''
      }));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [listEndpoint, loadRestaurants]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await apiPost('/api/categories', {
        name: formData.name,
        order: Number(formData.order) || 0,
        isGeneric: Boolean(formData.isGeneric),
        restaurantId: formData.isGeneric ? undefined : formData.restaurantId
      });
      setSuccess('Category created successfully.');
      setFormData((current) => ({
        ...emptyForm,
        restaurantId: current.restaurantId
      }));
      await loadCategories();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory?._id) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await apiPatch(`/api/categories/${editingCategory._id}`, {
        name: editingCategory.name,
        order: Number(editingCategory.order) || 0
      });
      setSuccess('Category updated successfully.');
      setEditingCategory(null);
      await loadCategories();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const confirmed = window.confirm('Delete this category?');
    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);
      await apiDelete(`/api/categories/${categoryId}`);
      setSuccess('Category deleted successfully.');
      await loadCategories();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleStatusChange = async (categoryId, status) => {
    try {
      setError(null);
      setSuccess(null);
      await apiPatch(`/api/categories/${categoryId}/status`, { status });
      setSuccess(`Category marked as ${status}.`);
      await loadCategories();
    } catch (statusError) {
      setError(statusError.message);
    }
  };

  if (!listEndpoint) {
    return (
      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <p className="text-sm text-gray-600">
          Your current role does not have category management access.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {error && <Alert color="failure">{error}</Alert>}
      {success && <Alert color="success">{success}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b62828]">
              Category management
            </p>
            <h2 className="text-2xl font-bold text-[#23411f]">
              Generic and restaurant categories
            </h2>
            <p className="text-sm text-gray-500">
              Use the live backend category endpoints for platform-wide generic
              categories or restaurant-specific category trees.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f5faeb] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7e9128]">
                Total categories
              </p>
              <p className="mt-2 text-3xl font-bold text-[#23411f]">
                {categories.length}
              </p>
            </div>
            <div className="rounded-2xl bg-[#fff4f4] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#b62828]">
                Generic
              </p>
              <p className="mt-2 text-3xl font-bold text-[#5c1111]">
                {categories.filter((category) => category.isGeneric).length}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8f7f1] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7a7a6b]">
                Restaurant scoped
              </p>
              <p className="mt-2 text-3xl font-bold text-[#23411f]">
                {categories.filter((category) => !category.isGeneric).length}
              </p>
            </div>
          </div>
        </Card>

        {canCreateCategory && (
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[#23411f]">Create category</h3>
              <p className="text-sm text-gray-500">
                Add new categories using the backend contract.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleCreateCategory}>
              <div className="space-y-2">
                <Label htmlFor="categoryName">Name</Label>
                <TextInput
                  id="categoryName"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="categoryOrder">Order</Label>
                  <TextInput
                    id="categoryOrder"
                    type="number"
                    min={0}
                    value={formData.order}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        order: event.target.value
                      }))
                    }
                  />
                </div>
                {user?.role === 'superAdmin' && (
                  <div className="space-y-2">
                    <Label htmlFor="categoryScope">Scope</Label>
                    <Select
                      id="categoryScope"
                      value={formData.isGeneric ? 'generic' : 'restaurant'}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          isGeneric: event.target.value === 'generic'
                        }))
                      }
                    >
                      <option value="restaurant">Restaurant specific</option>
                      <option value="generic">Generic platform category</option>
                    </Select>
                  </div>
                )}
              </div>

              {!formData.isGeneric && restaurants.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="categoryRestaurant">Restaurant</Label>
                  <Select
                    id="categoryRestaurant"
                    value={formData.restaurantId}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        restaurantId: event.target.value
                      }))
                    }
                    required
                  >
                    <option value="">Select restaurant</option>
                    {restaurants.map((restaurant) => (
                      <option key={restaurant._id} value={restaurant._id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <Button
                type="submit"
                className="!bg-[#8fa31e] hover:!bg-[#78871c]"
                isProcessing={submitting}
              >
                Create category
              </Button>
            </form>
          </Card>
        )}
      </div>

      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#23411f]">Category inventory</h3>
            <p className="text-sm text-gray-500">
              Active categories available in your permission scope.
            </p>
          </div>
          {loading && <Spinner size="sm" />}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table hoverable>
            <Table.Head>
              <Table.HeadCell>Name</Table.HeadCell>
              <Table.HeadCell>Scope</Table.HeadCell>
              <Table.HeadCell>Restaurant</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
              <Table.HeadCell>Order</Table.HeadCell>
              <Table.HeadCell>Actions</Table.HeadCell>
            </Table.Head>
            <Table.Body className="divide-y">
              {categories.map((category) => (
                <Table.Row key={category._id}>
                  <Table.Cell className="font-medium text-[#23411f]">
                    {category.name}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={category.isGeneric ? 'failure' : 'success'}>
                      {category.isGeneric ? 'Generic' : 'Restaurant'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {category.restaurantId?.name || category.restaurantId || '-'}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={category.status === 'published' ? 'success' : 'warning'}>
                      {category.status || 'draft'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{category.order ?? 0}</Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-2">
                      {canUpdateCategory && (
                        <Button
                          size="xs"
                          className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                          onClick={() =>
                            setEditingCategory({
                              _id: category._id,
                              name: category.name,
                              order: category.order ?? 0
                            })
                          }
                        >
                          <HiOutlinePencilSquare className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {canUpdateStatus && (
                        <Button
                          size="xs"
                          color="success"
                          onClick={() => handleStatusChange(category._id, 'published')}
                        >
                          Publish
                        </Button>
                      )}
                      {canDeleteCategory && (
                        <Button
                          color="failure"
                          size="xs"
                          onClick={() => handleDeleteCategory(category._id)}
                        >
                          <HiOutlineTrash className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {categories.map((category) => (
            <div key={category._id} className="rounded-2xl border border-[#ebf0d7] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#23411f]">{category.name}</p>
                  <p className="text-xs text-gray-500">
                    {category.restaurantId?.name || category.restaurantId || 'Platform'}
                  </p>
                </div>
                <Badge color={category.isGeneric ? 'failure' : 'success'}>
                  {category.isGeneric ? 'Generic' : 'Scoped'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal show={Boolean(editingCategory)} onClose={() => setEditingCategory(null)}>
        <Modal.Header>Edit category</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editCategoryName">Name</Label>
              <TextInput
                id="editCategoryName"
                value={editingCategory?.name || ''}
                onChange={(event) =>
                  setEditingCategory((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategoryOrder">Order</Label>
              <TextInput
                id="editCategoryOrder"
                type="number"
                min={0}
                value={editingCategory?.order ?? 0}
                onChange={(event) =>
                  setEditingCategory((current) => ({
                    ...current,
                    order: event.target.value
                  }))
                }
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="!bg-[#8fa31e] hover:!bg-[#78871c]"
            onClick={handleUpdateCategory}
            isProcessing={submitting}
          >
            Save
          </Button>
          <Button color="gray" onClick={() => setEditingCategory(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
