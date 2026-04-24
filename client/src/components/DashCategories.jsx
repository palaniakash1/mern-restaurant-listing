import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
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
import {
  HiOutlineArrowPath,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi2';
import { apiDelete, apiGet, apiPatch, apiPost } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { hasPermission } from '../utils/permissions';
import DeleteConfirmModal from './DeleteConfirmModal';
import ImageUploadCropper from './ImageUploadCropper';
import ImageFrameLoader from './ImageFrameLoader';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const buildCategoryForm = () => ({
  name: '',
  restaurantId: '',
  isGeneric: false,
  order: 0,
  image: ''
});

const getCategoryImageFromRecord = (category) => {
  const image = category?.image;
  if (typeof image === 'string') {
    return image;
  }
  if (image && typeof image === 'object') {
    return image.url || image.secure_url || image.secureUrl || '';
  }
  return category?.imageUrl || category?.thumbnailUrl || '';
};

const CategoryImageUpload = ({ value, progress, uploading, onSelect }) => {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#23411f]">Category image</p>
        <p className="text-xs text-gray-500">
          Upload a category icon with preview.
        </p>
      </div>

      <ImageUploadCropper
        aspectRatio={1}
        modalTitle="Crop category image"
        onCropComplete={onSelect}
        onError={() => {}}
        trigger={({ open }) => (
          <button
            type="button"
            onClick={open}
            className="relative block aspect-square w-full max-w-[260px] overflow-hidden rounded-[1.5rem] border !border-[#dce6c1] bg-[#f7faef] text-left"
          >
            {value ? (
              <img
                src={value}
                alt="Category image"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                Image preview will appear here
              </div>
            )}
            {uploading && (
              <ImageFrameLoader
                progress={progress}
                label="Uploading image"
                className="rounded-[1.5rem]"
              />
            )}
          </button>
        )}
      />

      <ImageUploadCropper
        aspectRatio={1}
        modalTitle="Crop category image"
        onCropComplete={onSelect}
        onError={() => {}}
        trigger={({ open }) => (
          <button
            type="button"
            onClick={open}
            className="inline-flex w-full max-w-[260px] justify-center rounded-xl border border-[#d8dfc0] bg-white px-3 py-2 text-sm font-semibold text-[#23411f] shadow-sm hover:bg-[#f7faef]"
          >
            Choose image
          </button>
        )}
      />
    </div>
  );
};

export default function DashCategories() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [formData, setFormData] = useState(buildCategoryForm());
  const [editingCategory, setEditingCategory] = useState(null);
  const [editImageProgress, setEditImageProgress] = useState(0);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkedMenus, setLinkedMenus] = useState([]);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);

  const { showToast } = useToast();

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
      const [categoryData, restaurantData] = await Promise.all([
        apiGet(listEndpoint),
        loadRestaurants()
      ]);
      const normalizedCategories = (categoryData.data || []).map((category) => ({
        ...category,
        image: getCategoryImageFromRecord(category)
      }));
      setCategories(normalizedCategories);
      setRestaurants(restaurantData);
      setFormData((current) => ({
        ...current,
        restaurantId: current.restaurantId || restaurantData[0]?._id || ''
      }));
    } catch (loadError) {
      showToast(loadError.message, 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listEndpoint, loadRestaurants]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      await apiPost('/api/categories', {
        name: formData.name,
        order: Number(formData.order) || 0,
        isGeneric: Boolean(formData.isGeneric),
        restaurantId: formData.isGeneric ? undefined : formData.restaurantId,
        image: formData.image || undefined
      });
      showToast('Category created successfully.', 'success');
      setFormData(buildCategoryForm());
      setShowCreateModal(false);
      await loadCategories();
    } catch (createError) {
      showToast(createError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditImageSelect = async (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please choose a valid image file.', 'error');
      return;
    }
    setEditImageUploading(true);
    setEditImageProgress(8);
    try {
      const uploaded = await uploadToCloudinary({
        file,
        folder: 'categories',
        resourceType: 'image',
        publicIdPrefix: 'category',
        onProgress: (progress) => setEditImageProgress(progress)
      });
      setEditImageProgress(100);
      setEditingCategory((current) => ({
        ...current,
        image: uploaded.url
      }));
    } catch (uploadError) {
      showToast(uploadError.message, 'error');
    } finally {
      setEditImageUploading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory?._id) return;

    try {
      setSubmitting(true);
      const payload = {
        name: editingCategory.name,
        order: Number(editingCategory.order) || 0,
        image: editingCategory.image || undefined
      };
      const response = await apiPatch(`/api/categories/${editingCategory._id}`, {
        ...payload
      });
      const updatedCategory = response?.data
        ? {
            ...response.data,
            image: getCategoryImageFromRecord(response.data)
          }
        : null;

      if (updatedCategory) {
        setCategories((current) =>
          current.map((category) =>
            category._id === updatedCategory._id ? updatedCategory : category
          )
        );
      }
      showToast('Category updated successfully.', 'success');
      setEditingCategory(null);
      await loadCategories();
    } catch (updateError) {
      showToast(updateError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = (categoryId) => {
    setCategoryToDelete(categoryId);
    setShowDeleteModal(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await apiDelete(`/api/categories/${categoryToDelete}/hard`);
      showToast('Category deleted successfully.', 'success');
      await loadCategories();
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      setLinkedMenus([]);
    } catch (deleteError) {
      // Check if error contains linked menus
      const errorData = deleteError.data;
      console.log('Delete error:', deleteError);
      console.log('Error data:', errorData);

      if (errorData?.linkedMenus && errorData.linkedMenus.length > 0) {
        setLinkedMenus(errorData.linkedMenus);
        setShowDeleteModal(false);
        setShowUnassignModal(true);
      } else {
        showToast(deleteError.message, 'error');
      }
    }
  };

  const handleUnassignMenus = async () => {
    try {
      // Unassign category from all linked menus by setting categoryId to null
      const promises = linkedMenus.map((menu) =>
        apiPatch(`/api/menus/${menu.id}`, { categoryId: null })
      );
      await Promise.all(promises);
      showToast(
        'Category unassigned from all menus. You can now delete the category.',
        'success'
      );
      setShowUnassignModal(false);
      setLinkedMenus([]);
      await loadCategories();
    } catch (unassignError) {
      showToast(unassignError.message, 'error');
    }
  };

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [search, setSearch] = useState('');

  const categoryIdFromUrl = searchParams.get('categoryId');

  useEffect(() => {
    if (categoryIdFromUrl) {
      const category = categories.find((c) => c._id === categoryIdFromUrl);
      if (category) {
        if (category.status === 'draft') {
          setSelectedFilter('inactive');
        } else if (category.isGeneric) {
          setSelectedFilter('generic');
        } else {
          setSelectedFilter('restaurant');
        }
      }
    }
  }, [categoryIdFromUrl, categories]);

  const getRestaurantName = useCallback(
    (restaurantId) => {
      if (!restaurantId) return '-';
      const restaurant = restaurants.find((r) => r._id === restaurantId);
      return restaurant?.name || restaurantId;
    },
    [restaurants]
  );

  const handleImageSelect = async (file) => {
    setFormData((current) => ({
      ...current,
      image: URL.createObjectURL(file)
    }));
    setImageUploading(true);
    setImageProgress(10);

    try {
      const uploaded = await uploadToCloudinary({
        file,
        folder: 'categories',
        resourceType: 'image',
        publicIdPrefix: 'category-image',
        onProgress: (progress) => setImageProgress(progress)
      });
      setImageProgress(100);
      setFormData((current) => ({
        ...current,
        image: uploaded.url
      }));
    } catch (uploadError) {
      showToast(uploadError.message || 'Failed to upload image', 'error');
    } finally {
      setImageUploading(false);
    }
  };

  const handleStatusChange = async (categoryId, currentStatus) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await apiPatch(`/api/categories/${categoryId}/status`, {
        status: newStatus
      });
      showToast(`Category marked as ${newStatus}.`, 'success');
      await loadCategories();
    } catch (statusError) {
      showToast(statusError.message, 'error');
    }
  };

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    switch (selectedFilter) {
      case 'generic':
        return categories.filter((c) => {
          const searchMatch = q
            ? [c.name, getRestaurantName(c.restaurantId)]
                .filter(Boolean)
                .some((v) => v.toLowerCase().includes(q))
            : true;
          return c.isGeneric && c.status === 'published' && searchMatch;
        });
      case 'restaurant':
        return categories.filter((c) => {
          const searchMatch = q
            ? [c.name, getRestaurantName(c.restaurantId)]
                .filter(Boolean)
                .some((v) => v.toLowerCase().includes(q))
            : true;
          return !c.isGeneric && c.status === 'published' && searchMatch;
        });
      case 'inactive':
        return categories.filter((c) => {
          const searchMatch = q
            ? [c.name, getRestaurantName(c.restaurantId)]
                .filter(Boolean)
                .some((v) => v.toLowerCase().includes(q))
            : true;
          return c.status !== 'published' && searchMatch;
        });
      default:
        return categories.filter((c) => {
          const searchMatch = q
            ? [c.name, getRestaurantName(c.restaurantId)]
                .filter(Boolean)
                .some((v) => v.toLowerCase().includes(q))
            : true;
          return searchMatch;
        });
    }
  }, [categories, getRestaurantName, search, selectedFilter]);

  const filterCounts = useMemo(
    () => ({
      all: categories.length,
      generic: categories.filter((c) => c.isGeneric && c.status === 'published')
        .length,
      restaurant: categories.filter(
        (c) => !c.isGeneric && c.status === 'published'
      ).length,
      inactive: categories.filter((c) => c.status !== 'published').length
    }),
    [categories]
  );

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
      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
              Category command center
            </p>
            <h2 className="text-2xl font-bold text-[#23411f] sm:text-3xl">
              Generic and restaurant categories
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-gray-600">
              Use the live backend category endpoints for platform-wide generic
              categories or restaurant-specific category trees.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#b62828_0%,#8fa31e_100%)] p-5 text-white shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">
              Operational view
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/12 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  Total
                </p>
                <p className="mt-2 text-3xl font-bold">{categories.length}</p>
              </div>
              <div className="rounded-2xl bg-white/12 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  Published
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {filterCounts.generic + filterCounts.restaurant}
                </p>
              </div>
              <div className="rounded-2xl bg-white/12 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  Inactive
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {filterCounts.inactive}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <p className="text-sm text-gray-500">Generic categories</p>
          <p className="mt-2 text-3xl font-bold text-[#23411f]">
            {filterCounts.generic}
          </p>
        </Card>
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <p className="text-sm text-gray-500">Restaurant scoped</p>
          <p className="mt-2 text-3xl font-bold text-[#23411f]">
            {filterCounts.restaurant}
          </p>
        </Card>
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Quick actions</p>
            {canCreateCategory && (
              <Button
                className="!bg-[#8fa31e] hover:!bg-[#78871c]"
                onClick={() => setShowCreateModal(true)}
              >
                <HiOutlinePlus className="mr-2 h-4 w-4" />
                Add category
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#23411f]">
              Category inventory
            </h3>
            <p className="text-sm text-gray-500">
              Active categories available in your permission scope.
            </p>
          </div>
          {loading && <Spinner size="sm" />}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'all', label: `All (${filterCounts.all})` },
            { key: 'generic', label: `Generic (${filterCounts.generic})` },
            {
              key: 'restaurant',
              label: `Restaurant (${filterCounts.restaurant})`
            },
            { key: 'inactive', label: `Inactive (${filterCounts.inactive})` }
          ].map((filter) => (
            <Button
              key={filter.key}
              size="xs"
              className={
                selectedFilter === filter.key
                  ? '!bg-[#23411f] !text-white'
                  : '!bg-[#f5faeb] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white'
              }
              onClick={() => setSelectedFilter(filter.key)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr,1fr,1fr,1fr,auto]">
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or restaurant"
          />
          <Select
            value={selectedFilter}
            onChange={(event) => setSelectedFilter(event.target.value)}
          >
            <option value="all">All filters</option>
            <option value="generic">Generic</option>
            <option value="restaurant">Restaurant</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div></div>
          <div></div>
          <Button
            className="w-full xl:w-auto !bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
            onClick={() => {
              setSearch('');
              setSelectedFilter('all');
            }}
          >
            <HiOutlineArrowPath className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="hidden overflow-x-auto md:block">
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell>Image</Table.HeadCell>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Scope</Table.HeadCell>
                <Table.HeadCell>Restaurant</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
                <Table.HeadCell>Order</Table.HeadCell>
              <Table.HeadCell>Actions</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
              {filteredCategories.map((category) => {
                return (
                  <Table.Row key={category._id}>
                    <Table.Cell>
                      {category.image ? (
                        <div className="block aspect-square w-12 overflow-hidden rounded-lg border border-[#d8dfc0] bg-[#f7faef]">
                          <img
                            src={category.image}
                            alt={category.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}
                    </Table.Cell>
                    <Table.Cell className="font-medium text-[#23411f]">
                      {category.name}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={category.isGeneric ? 'failure' : 'success'}>
                        {category.isGeneric ? 'Generic' : 'Restaurant'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {category.isGeneric
                        ? 'Platform'
                        : getRestaurantName(category.restaurantId)}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={
                          category.status === 'published'
                            ? 'success'
                            : 'warning'
                        }
                      >
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
                              order: category.order ?? 0,
                              image: category.image || ''
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
                            className={
                              category.status === 'published'
                                ? '!bg-[#f59e0b] hover:!bg-[#d97706] !text-white'
                                : '!bg-[#22c55e] hover:!bg-[#16a34a] !text-white'
                            }
                            onClick={() =>
                              handleStatusChange(category._id, category.status)
                            }
                          >
                            {category.status === 'published'
                              ? 'Draft'
                              : 'Publish'}
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
                );
              })}
            </Table.Body>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {filteredCategories.map((category) => (
            <div
              key={category._id}
              className="rounded-2xl border border-[#ebf0d7] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#23411f]">
                    {category.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {category.isGeneric
                      ? 'Platform'
                      : getRestaurantName(category.restaurantId)}
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

      <Modal
        show={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        dismissible={true}
        size="3xl"
      >
        <Modal.Header>Update category workspace</Modal.Header>
        <Modal.Body>
          <form
            id="editCategoryForm"
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateCategory();
            }}
          >
            <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
              <div className="space-y-6">
                <CategoryImageUpload
                  value={editingCategory?.image || ''}
                  progress={editImageProgress}
                  uploading={editImageUploading}
                  onSelect={handleEditImageSelect}
                />
              </div>

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
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                      className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                    />
                  </div>
                  {user?.role === 'superAdmin' && (
                    <div className="space-y-2">
                      <Label htmlFor="editCategoryScope">Scope</Label>
                      <Select
                        id="editCategoryScope"
                        value={
                          editingCategory?.isGeneric ? 'generic' : 'restaurant'
                        }
                        onChange={(event) =>
                          setEditingCategory((current) => ({
                            ...current,
                            isGeneric: event.target.value === 'generic'
                          }))
                        }
                        className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                      >
                        <option value="restaurant">Restaurant specific</option>
                        <option value="generic">
                          Generic platform category
                        </option>
                      </Select>
                    </div>
                  )}
                </div>

                {!editingCategory?.isGeneric && restaurants.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="editCategoryRestaurant">Restaurant</Label>
                    <Select
                      id="editCategoryRestaurant"
                      value={
                        editingCategory?.restaurantId?._id ||
                        editingCategory?.restaurantId ||
                        ''
                      }
                      onChange={(event) =>
                        setEditingCategory((current) => ({
                          ...current,
                          restaurantId: event.target.value
                        }))
                      }
                      className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
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
              </div>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            form="editCategoryForm"
            type="submit"
            className="!bg-[#8fa31e] hover:!bg-[#78871c]"
            isProcessing={submitting}
          >
            Save Changes
          </Button>
          <Button
            className="!bg-[#B42627] hover:!bg-[#910712]"
            onClick={() => setEditingCategory(null)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Yes, Delete Category"
        dismissible={true}
      />

      <Modal
        show={showUnassignModal}
        onClose={() => setShowUnassignModal(false)}
        dismissible={true}
      >
        <Modal.Header>Linked Menus Found</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This category is linked to the following menus. You must unassign
              the category from these menus before deleting.
            </p>
            <div className="space-y-2">
              {linkedMenus.map((menu) => (
                <div
                  key={menu.id}
                  className="flex items-center justify-between rounded-lg border border-[#e6eccf] bg-[#fbfcf7] p-3"
                >
                  <div>
                    <p className="font-medium text-[#23411f]">
                      {menu.name || 'Unnamed Menu'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Status: {menu.status || 'draft'} •{' '}
                      {menu.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <Badge color={menu.isActive ? 'success' : 'failure'}>
                    {menu.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="!bg-[#B42627] hover:!bg-[#910712]"
            onClick={handleUnassignMenus}
          >
            Unassign from All Menus
          </Button>
          <Button
            className="!bg-[#B42627] hover:!bg-[#910712]"
            onClick={() => setShowUnassignModal(false)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        dismissible={true}
        size="3xl"
      >
        <Modal.Header>Create category workspace</Modal.Header>
        <Modal.Body>
          <form
            id="createCategoryForm"
            className="space-y-6"
            onSubmit={handleCreateCategory}
          >
            <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
              <div className="space-y-6">
                <CategoryImageUpload
                  value={formData.image}
                  progress={imageProgress}
                  uploading={imageUploading}
                  onSelect={handleImageSelect}
                />
              </div>

              <div className="space-y-4">
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
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
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
                      className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
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
                        className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                      >
                        <option value="restaurant">Restaurant specific</option>
                        <option value="generic">
                          Generic platform category
                        </option>
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
                      className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
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
              </div>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            form="createCategoryForm"
            type="submit"
            className="!bg-[#8fa31e] hover:!bg-[#78871c]"
            isProcessing={submitting}
          >
            Create Category
          </Button>
          <Button
            className="!bg-[#B42627] hover:!bg-[#910712]"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
