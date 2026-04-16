import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Label,
  Modal,
  Select,
  Spinner,
  Table,
  TextInput,
  Textarea
} from 'flowbite-react';
import {
  HiOutlineArrowPath,
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineFolder
} from 'react-icons/hi2';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import DeleteConfirmModal from './DeleteConfirmModal';
import ImageUploadCropper from './ImageUploadCropper';
import ImageFrameLoader from './ImageFrameLoader';
import { useToast } from '../context/ToastContext';

const emptyMenuForm = {
  restaurantId: '',
  categoryId: ''
};

const emptyItemForm = {
  name: '',
  description: '',
  price: '',
  image: '',
  isAvailable: true,
  isMeal: false,
  dietary: {
    vegetarian: false,
    vegan: false
  },
  ingredients: [],
  allergens: [],
  nutrition: {
    calories: { value: 0, level: 'green' },
    fat: { value: 0, level: 'green' },
    saturates: { value: 0, level: 'green' },
    sugar: { value: 0, level: 'green' },
    salt: { value: 0, level: 'green' }
  },
  upsells: []
};

export default function DashMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [, setRestaurantsLoading] = useState(true);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(
    user?.role === 'superAdmin' ? 'all' : user?.restaurantId || ''
  );
  const [menus, setMenus] = useState([]);
  const [allMenusCount, setAllMenusCount] = useState(0);
  const [menuForm, setMenuForm] = useState(emptyMenuForm);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, _setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [imageProgress, setImageProgress] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [trashedMenus, setTrashedMenus] = useState([]);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [menuForItemDelete, setMenuForItemDelete] = useState(null);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();

  const PAGE_SIZE = 12;

  const canCreateMenu = hasPermission(user, 'menu', 'create');
  const canAddItem = hasPermission(user, 'menu', 'addItem');
  const canToggleAvailability = hasPermission(
    user,
    'menu',
    'toggleAvailability'
  );
  const canDeleteMenu = hasPermission(user, 'menu', 'delete');

  const selectedRestaurant = useMemo(
    () =>
      restaurants.find((restaurant) => restaurant._id === selectedRestaurantId),
    [restaurants, selectedRestaurantId]
  );

  const showAllRestaurants = selectedRestaurantId === 'all';

  const loadRestaurants = useCallback(async () => {
    if (user?.role === 'superAdmin') {
      const data = await apiGet('/api/restaurants/all?page=1&limit=100');
      return data.data || [];
    }

    if (user?.role === 'admin') {
      const data = await apiGet('/api/restaurants/me/all?page=1&limit=100');
      return data.data || [];
    }

    if (user?.restaurantId) {
      const restaurant = await apiGet(
        `/api/restaurants/id/${user.restaurantId}`
      );
      return restaurant.data ? [restaurant.data] : [];
    }

    return [];
  }, [user?.restaurantId, user?.role]);

  const loadCategories = useCallback(
    async (restaurantId) => {
      if (!restaurantId) return [];

      if (user?.role === 'superAdmin') {
        const data = await apiGet(
          `/api/categories/all?page=1&limit=100&restaurantId=${restaurantId}`
        );
        return (data.data || []).filter(
          (category) =>
            category.isGeneric ||
            category.restaurantId?._id === restaurantId ||
            category.restaurantId === restaurantId
        );
      }

      if (hasPermission(user, 'category', 'readMine')) {
        const data = await apiGet('/api/categories/my?page=1&limit=100');
        return data.data || [];
      }

      const generic = await apiGet(
        `/api/categories?restaurantId=${restaurantId}&page=1&limit=100`
      );
      return generic.data || [];
    },
    [user]
  );

  const loadMenus = useCallback(async (restaurantId, page = 1) => {
    if (!restaurantId) {
      setMenus([]);
      setAllMenusCount(0);
      setTotalPages(1);
      return;
    }

    try {
      let data;
      if (restaurantId === 'all') {
        data = await apiGet(`/api/menus/all?page=${page}&limit=${PAGE_SIZE}`);
        setAllMenusCount(data.total || 0);
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE)));
      } else {
        data = await apiGet(
          `/api/menus/restaurant/${restaurantId}/all?page=${page}&limit=${PAGE_SIZE}`
        );
        setAllMenusCount(data.total || 0);
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE)));
      }
      setMenus(data.data || []);
    } catch (err) {
      console.error('Error loading menus:', err);
      setMenus([]);
      setAllMenusCount(0);
      setTotalPages(1);
    }
  }, []);

  const loadTrashedMenus = useCallback(async (restaurantId) => {
    if (!restaurantId || restaurantId === 'all') {
      setTrashedMenus([]);
      return;
    }

    try {
      const data = await apiGet(
        `/api/menus/deleted?page=1&limit=100&restaurantId=${restaurantId}`
      );
      setTrashedMenus(data.data || []);
    } catch {
      setTrashedMenus([]);
    }
  }, []);

  const setPage = useCallback(
    (page) => {
      setCurrentPage(page);
      if (selectedRestaurantId) {
        loadMenus(selectedRestaurantId, page);
      }
    },
    [selectedRestaurantId, loadMenus]
  );

  const handleStatusFilterChange = useCallback(
    (filter) => {
      setStatusFilter(filter);
      setCurrentPage(1);
      if (selectedRestaurantId) {
        loadMenus(selectedRestaurantId, 1);
      }
    },
    [selectedRestaurantId, loadMenus]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (editingItem) {
      setItemForm({
        _id: editingItem._id,
        name: editingItem.name || '',
        description: editingItem.description || '',
        price: editingItem.price?.toString() || '',
        image: editingItem.image || '',
        isAvailable: editingItem.isAvailable ?? true,
        isMeal: editingItem.isMeal ?? false,
        dietary: editingItem.dietary || { vegetarian: false, vegan: false },
        ingredients: editingItem.ingredients || [],
        allergens: editingItem.allergens || [],
        nutrition: editingItem.nutrition || {
          calories: { value: 0, level: 'green' },
          fat: { value: 0, level: 'green' },
          saturates: { value: 0, level: 'green' },
          sugar: { value: 0, level: 'green' },
          salt: { value: 0, level: 'green' }
        },
        upsells: editingItem.upsells || []
      });
    }
  }, [editingItem]);

  useEffect(() => {
    const loadInitialData = async () => {
      setRestaurantsLoading(true);
      try {
        const loadedRestaurants = await loadRestaurants();
        setRestaurants(loadedRestaurants);

        if (user?.restaurantId && loadedRestaurants.length > 0) {
          const categoriesData = await loadCategories(user.restaurantId);
          setCategories(categoriesData);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setRestaurantsLoading(false);
        _setLoading(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.restaurantId, user?.role]);

  useEffect(() => {
    if (selectedRestaurantId && selectedRestaurantId !== 'all') {
      loadCategories(selectedRestaurantId)
        .then(setCategories)
        .catch(() => setCategories([]));
    } else if (selectedRestaurantId === 'all') {
      setCategories([]);
    }
  }, [selectedRestaurantId, loadCategories]);

  useEffect(() => {
    if (selectedRestaurantId) {
      loadMenus(selectedRestaurantId, currentPage);
    }
  }, [selectedRestaurantId, currentPage, loadMenus]);

  const handleCreateMenu = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      await apiPost('/api/menus', {
        restaurantId: menuForm.restaurantId,
        categoryId: menuForm.categoryId
      });
      showToast('Menu created successfully.', 'success');
      await loadMenus(selectedRestaurantId);
    } catch (createError) {
      showToast(createError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMenuItem = async () => {
    if (!activeMenu?._id) return;

    try {
      setSubmitting(true);
      await apiPost(`/api/menus/${activeMenu._id}/items`, {
        items: [
          {
            name: itemForm.name,
            description: itemForm.description,
            image: itemForm.image,
            price: Number(itemForm.price),
            isAvailable: itemForm.isAvailable,
            isMeal: itemForm.isMeal,
            dietary: itemForm.dietary,
            ingredients: itemForm.ingredients,
            allergens: itemForm.allergens,
            nutrition: itemForm.nutrition,
            upsells: itemForm.upsells
          }
        ]
      });
      showToast('Menu item added successfully.', 'success');
      setActiveMenu(null);
      setItemForm(emptyItemForm);
      await loadMenus(selectedRestaurantId);
    } catch (itemError) {
      showToast(itemError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (menuId, itemId, isAvailable) => {
    try {
      await apiPatch(`/api/menus/${menuId}/items/${itemId}/availability`, {
        isAvailable: !isAvailable
      });
      showToast('Menu item availability updated.', 'success');
      await loadMenus(selectedRestaurantId);
    } catch (toggleError) {
      showToast(toggleError.message, 'error');
    }
  };

  const toggleMenuExpand = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handlePublishMenu = async (menuId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      await apiPatch(`/api/menus/${menuId}/status`, { status: newStatus });
      showToast(
        `Menu ${newStatus === 'published' ? 'published' : 'unpublished'} successfully.`,
        'success'
      );
      await loadMenus(selectedRestaurantId);
    } catch (publishError) {
      let errorMsg = publishError.data?.message || publishError.message;
      if (errorMsg.includes('Restaurant must be published')) {
        errorMsg =
          'Cannot publish menu: The restaurant must be published first.';
      } else if (errorMsg.includes('Category must be published')) {
        errorMsg = 'Cannot publish menu: The category must be published first.';
      } else if (errorMsg.includes('active item')) {
        errorMsg = 'Cannot publish menu: Add at least one menu item.';
      }
      showToast(errorMsg, 'error');
    }
  };

  const handleRestoreMenu = async (menuId) => {
    try {
      await apiPatch(`/api/menus/${menuId}/restore`);
      showToast('Menu restored successfully.', 'success');
      await loadMenus(selectedRestaurantId);
      await loadTrashedMenus(selectedRestaurantId);
    } catch (restoreError) {
      showToast(restoreError.message, 'error');
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!menuForItemDelete || !itemToDelete) return;

    try {
      await apiDelete(`/api/menus/${menuForItemDelete}/items/${itemToDelete}`);
      showToast('Menu item deleted successfully.', 'success');
      setShowDeleteItemModal(false);
      setItemToDelete(null);
      setMenuForItemDelete(null);
      await loadMenus(selectedRestaurantId);
    } catch (deleteError) {
      showToast(deleteError.message, 'error');
    }
  };

  const handleDeleteMenu = (menuId) => {
    setMenuToDelete(menuId);
    setShowDeleteModal(true);
  };

  const confirmDeleteMenu = async () => {
    if (!menuToDelete) return;

    try {
      await apiDelete(`/api/menus/${menuToDelete}`);
      showToast('Menu deleted successfully.', 'success');
      await loadMenus(selectedRestaurantId);
      await loadTrashedMenus(selectedRestaurantId);
    } catch (deleteError) {
      showToast(deleteError.message, 'error');
    } finally {
      setShowDeleteModal(false);
      setMenuToDelete(null);
    }
  };

  const filteredMenus = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menus.filter((menu) => {
      const searchMatch = q
        ? [menu.categoryId?.name, menu.categoryId]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        : true;
      const status = menu.status || 'draft';
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'published' && status === 'published') ||
        (statusFilter === 'draft' && status === 'draft');
      return searchMatch && statusMatch;
    });
  }, [menus, search, statusFilter]);

  const menuCounts = useMemo(
    () => ({
      all: allMenusCount,
      published: filteredMenus.filter(
        (m) => (m.status || 'draft') === 'published'
      ).length,
      draft: filteredMenus.filter((m) => (m.status || 'draft') === 'draft')
        .length
    }),
    [filteredMenus, allMenusCount]
  );

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please choose a valid image file.', 'error');
      return;
    }
    setImageUploading(true);
    setImageProgress(8);
    try {
      const uploaded = await uploadToCloudinary({
        file,
        folder: 'menus/items',
        resourceType: 'image',
        publicIdPrefix: 'menu-item',
        onProgress: (progress) => setImageProgress(progress)
      });
      setImageProgress(100);
      setItemForm((current) => ({
        ...current,
        image: uploaded.url
      }));
    } catch (uploadError) {
      showToast(uploadError.message, 'error');
    } finally {
      setImageUploading(false);
    }
  };

  const handleUpdateMenuItem = async () => {
    if (
      !editingItem?.menuId ||
      (editingItem?._id === undefined && editingItem?.itemIndex === undefined)
    ) {
      return;
    }

    const itemIdentifier = editingItem._id || `index:${editingItem.itemIndex}`;

    try {
      setSubmitting(true);
      await apiPut(`/api/menus/${editingItem.menuId}/items/${itemIdentifier}`, {
        name: itemForm.name,
        description: itemForm.description,
        price: Number(itemForm.price),
        image: itemForm.image || undefined,
        isAvailable: itemForm.isAvailable,
        isMeal: itemForm.isMeal,
        dietary: itemForm.dietary,
        ingredients: itemForm.ingredients,
        allergens: itemForm.allergens,
        nutrition: itemForm.nutrition,
        upsells: itemForm.upsells
      });
      showToast('Menu item updated successfully.', 'success');
      setEditingItem(null);
      setItemForm(emptyItemForm);
      await loadMenus(selectedRestaurantId);
    } catch (updateError) {
      showToast(updateError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b62828]">
              Menu operations
            </p>
            <h2 className="text-2xl font-bold text-[#23411f]">
              Menus and menu items
            </h2>
            <p className="text-sm text-gray-500">
              Store managers can manage items, while admins and super admins can
              create menus tied to restaurant categories.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="menuRestaurant">Restaurant</Label>
            <Select
              id="menuRestaurant"
              value={selectedRestaurantId}
              onChange={(event) => setSelectedRestaurantId(event.target.value)}
              disabled={restaurants.length === 0}
              className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
            >
              {user?.role === 'superAdmin' && (
                <option value="all">All Restaurants</option>
              )}
              {restaurants.map((restaurant) => (
                <option key={restaurant._id} value={restaurant._id}>
                  {restaurant.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f5faeb] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7e9128]">
                Menus
              </p>
              <p className="mt-2 text-3xl font-bold text-[#23411f]">
                {showAllRestaurants ? allMenusCount : menus.length}
              </p>
              {showAllRestaurants && (
                <p className="text-xs text-gray-500 mt-1">Total in database</p>
              )}
            </div>
            <div className="rounded-2xl bg-[#fff4f4] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#b62828]">
                Restaurant
              </p>
              <p className="mt-2 text-sm font-semibold text-[#5c1111]">
                {showAllRestaurants
                  ? 'All Restaurants'
                  : selectedRestaurant?.name || 'Not selected'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8f7f1] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7a7a6b]">
                Categories
              </p>
              <p className="mt-2 text-3xl font-bold text-[#23411f]">
                {showAllRestaurants ? '-' : categories.length}
              </p>
            </div>
          </div>
        </Card>

        {canCreateMenu && (
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[#23411f]">
                Create menu
              </h3>
              <p className="text-sm text-gray-500">
                Create one menu per restaurant category.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleCreateMenu}>
              <div className="space-y-2">
                <Label htmlFor="menuCategory">Category</Label>
                <Select
                  id="menuCategory"
                  value={menuForm.categoryId}
                  onChange={(event) =>
                    setMenuForm((current) => ({
                      ...current,
                      categoryId: event.target.value
                    }))
                  }
                  required
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="submit"
                className="!bg-[#8fa31e] hover:!bg-[#78871c]"
                isProcessing={submitting}
                disabled={!menuForm.restaurantId || !menuForm.categoryId}
              >
                Create menu
              </Button>
            </form>
          </Card>
        )}
      </div>

      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#23411f]">
              Active menus
            </h3>
            <p className="text-sm text-gray-500">
              Manage menu items and availability for the selected restaurant.
            </p>
          </div>
          {loading && <Spinner size="sm" />}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            {
              key: 'all',
              label: `All (${menuCounts.all})`,
              onClick: () => handleStatusFilterChange('all'),
              active: statusFilter === 'all'
            },
            {
              key: 'published',
              label: `Published (${menuCounts.published})`,
              onClick: () => handleStatusFilterChange('published'),
              active: statusFilter === 'published'
            },
            {
              key: 'draft',
              label: `Draft (${menuCounts.draft})`,
              onClick: () => handleStatusFilterChange('draft'),
              active: statusFilter === 'draft'
            },
            {
              key: 'trashed',
              label: `Trashed (${trashedMenus.length})`,
              onClick: () => handleStatusFilterChange('trashed'),
              active: statusFilter === 'trashed'
            }
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

        {statusFilter !== 'trashed' && (
          <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr,1fr,1fr,1fr,auto]">
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by menu or category"
            />
            <Select
              value={statusFilter}
              onChange={(event) => handleStatusFilterChange(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
            <div></div>
            <div></div>
            <Button
              className="w-full xl:w-auto !bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
              onClick={() => {
                setSearch('');
                handleStatusFilterChange('all');
              }}
            >
              <HiOutlineArrowPath className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        )}

        {statusFilter === 'trashed' ? (
          <div className="mt-4 overflow-x-auto">
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell key="menu">Menu</Table.HeadCell>
                <Table.HeadCell key="category">Category</Table.HeadCell>
                <Table.HeadCell key="items">Items</Table.HeadCell>
                <Table.HeadCell key="actions">Actions</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
                {trashedMenus.map((menu) => (
                  <Table.Row key={menu._id}>
                    <Table.Cell>
                      <p className="font-medium text-[#23411f]">
                        {menu.categoryId?.name || 'Menu'}
                      </p>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color="failure">Deleted</Badge>
                    </Table.Cell>
                    <Table.Cell>{menu.items?.length || 0}</Table.Cell>
                    <Table.Cell>
                      <Button
                        size="xs"
                        className="!bg-[#8fa31e] hover:!bg-[#78871c] !text-white"
                        onClick={() => handleRestoreMenu(menu._id)}
                      >
                        <HiOutlineArrowPath className="mr-1 h-4 w-4" />
                        Restore
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            {trashedMenus.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No trashed menus.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMenus.map((menu) => {
              const isExpanded = expandedMenus[menu._id];
              return (
                <div
                  key={menu._id}
                  className="rounded-[1.75rem] border border-[#e7edd2] bg-[#fbfcf7] overflow-hidden"
                >
                  <div
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 cursor-pointer hover:bg-[#f0f5e6] transition-colors"
                    onClick={() => toggleMenuExpand(menu._id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''} text-[#23411f]`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-semibold text-[#23411f]">
                            {menu.categoryId?.name || 'Menu'}
                          </h4>
                          <Badge
                            color={
                              menu.status === 'published'
                                ? 'success'
                                : 'warning'
                            }
                          >
                            {menu.status || 'draft'}
                          </Badge>
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                              menu.categoryId?.status === 'published'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : menu.categoryId?.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/dashboard?tab=categories&categoryId=${menu.categoryId?._id}`
                              );
                            }}
                          >
                            <HiOutlineFolder className="h-3 w-3" />
                            {menu.categoryId?.name || 'N/A'}
                          </button>
                          {showAllRestaurants && menu.restaurantId && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-xs font-medium text-[#1a56db]">
                              {typeof menu.restaurantId === 'object'
                                ? menu.restaurantId.name
                                : restaurants.find(
                                    (r) => r._id === menu.restaurantId
                                  )?.name || 'Restaurant'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {menu.items?.filter((i) => i.isActive !== false)
                            .length || 0}{' '}
                          menu items
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="xs"
                        className={
                          menu.status === 'published'
                            ? '!bg-[#f59e0b] hover:!bg-[#d97706] !text-white'
                            : '!bg-[#23411f] hover:!bg-[#1a2f16] !text-white'
                        }
                        onClick={() => handlePublishMenu(menu._id, menu.status)}
                      >
                        {menu.status === 'published' ? 'Unpublish' : 'Publish'}
                      </Button>
                      {canAddItem && (
                        <Button
                          size="xs"
                          className="!bg-[#8fa31e] hover:!bg-[#78871c]"
                          onClick={() => {
                            setItemForm(emptyItemForm);
                            setActiveMenu(menu);
                          }}
                        >
                          <HiOutlinePlusCircle className="mr-1 h-4 w-4" />
                          Add item
                        </Button>
                      )}
                      {canDeleteMenu && (
                        <Button
                          color="failure"
                          size="xs"
                          onClick={() => handleDeleteMenu(menu._id)}
                        >
                          <HiOutlineTrash className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[#e7edd2] bg-white">
                      <div className="mt-4 hidden overflow-x-auto md:block p-4 sm:p-5 pt-0">
                        {menu.items &&
                        menu.items.filter((i) => i.isActive !== false).length >
                          0 ? (
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="py-3 px-2 font-medium text-gray-600">
                                  Image
                                </th>
                                <th className="py-3 px-2 font-medium text-gray-600">
                                  Item
                                </th>
                                <th className="py-3 px-2 font-medium text-gray-600">
                                  Price
                                </th>
                                <th className="py-3 px-2 font-medium text-gray-600">
                                  Status
                                </th>
                                <th className="py-3 px-2 font-medium text-gray-600">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {(menu.items || [])
                                .filter((i) => i.isActive !== false)
                                .map((item, idx) => (
                                  <tr
                                    key={item._id || `item-${idx}`}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="py-3 px-2">
                                      <div className="flex aspect-square w-12 items-center justify-center rounded-lg border border-dashed border-[#d8dfc0] bg-[#f7faef] overflow-hidden">
                                        {item.image ? (
                                          <img
                                            src={item.image}
                                            alt={item.name}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-xs text-gray-400">
                                            +
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-2">
                                      <p className="font-medium text-[#23411f]">
                                        {item.name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {item.description || 'No description'}
                                      </p>
                                    </td>
                                    <td className="py-3 px-2">
                                      £{Number(item.price || 0).toFixed(2)}
                                    </td>
                                    <td className="py-3 px-2">
                                      <Badge
                                        color={
                                          item.isAvailable
                                            ? 'success'
                                            : 'failure'
                                        }
                                      >
                                        {item.isAvailable
                                          ? 'Available'
                                          : 'Unavailable'}
                                      </Badge>
                                    </td>
                                    <td className="py-3 px-2">
                                      <div className="flex flex-wrap gap-2">
                                        {canToggleAvailability && (
                                          <Button
                                            size="xs"
                                            className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                                            onClick={() =>
                                              handleToggleAvailability(
                                                menu._id,
                                                item._id,
                                                item.isAvailable
                                              )
                                            }
                                          >
                                            {item.isAvailable
                                              ? 'Unavailable'
                                              : 'Available'}
                                          </Button>
                                        )}
                                        <Button
                                          size="xs"
                                          className="!bg-[#f59e0b] hover:!bg-[#d97706] !text-white"
                                          onClick={() => {
                                            const allItems = menu.items.filter(
                                              (i) => i.isActive !== false
                                            );
                                            const itemIndex =
                                              allItems.findIndex(
                                                (i) => i.name === item.name
                                              );
                                            setEditingItem({
                                              ...item,
                                              menuId: menu._id,
                                              itemIndex
                                            });
                                          }}
                                        >
                                          <HiOutlinePencilSquare className="mr-1 h-4 w-4" />
                                          Edit
                                        </Button>
                                        <Button
                                          size="xs"
                                          color="failure"
                                          onClick={() => {
                                            setMenuForItemDelete(menu._id);
                                            setItemToDelete(item._id);
                                            setShowDeleteItemModal(true);
                                          }}
                                        >
                                          <HiOutlineTrash className="mr-1 h-4 w-4" />
                                          Delete
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            No items in this menu. Click "Add item" to add menu
                            items.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {statusFilter !== 'trashed' && totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
                    {Math.min(currentPage * PAGE_SIZE, allMenusCount)} of{' '}
                    {allMenusCount} menus
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                    size="xs"
                    disabled={currentPage === 1}
                    onClick={() => setPage(1)}
                  >
                    First
                  </Button>
                  <Button
                    className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                    size="xs"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        size="xs"
                        className={
                          currentPage === pageNum
                            ? '!bg-[#23411f] !text-white'
                            : '!bg-[#f5faeb] !text-[#23411f] border border-[#d8dfc0]'
                        }
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Button
                    className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                    size="xs"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                  <Button
                    className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                    size="xs"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}

            {filteredMenus.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No menus found.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ADD MENU ITEM MODAL */}
      <Modal
        show={Boolean(activeMenu)}
        dismissible={true}
        onClose={() => {
          setActiveMenu(null);
          setItemForm(emptyItemForm);
        }}
        size="7xl"
      >
        <Modal.Header>Add menu item</Modal.Header>
        <Modal.Body>
          <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#23411f]">
                  Item image
                </p>
                <p className="text-xs text-gray-500">
                  Upload an image for this menu item.
                </p>
              </div>

              <ImageUploadCropper
                aspectRatio={1}
                modalTitle="Crop menu item image"
                onCropComplete={handleImageUpload}
                onError={() => {}}
                trigger={({ open }) => (
                  <button
                    type="button"
                    onClick={open}
                    className="relative block aspect-square w-full max-w-[260px] overflow-hidden rounded-[1.5rem] border !border-[#dce6c1] bg-[#f7faef] text-left my-2"
                  >
                    {itemForm.image ? (
                      <img
                        src={itemForm.image}
                        alt="Menu item"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Image preview will appear here
                      </div>
                    )}
                    {imageUploading && (
                      <ImageFrameLoader
                        progress={imageProgress}
                        label="Uploading image"
                        className="rounded-[1.5rem]"
                      />
                    )}
                  </button>
                )}
              />

              <ImageUploadCropper
                aspectRatio={1}
                modalTitle="Crop menu item image"
                onCropComplete={handleImageUpload}
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

              <div className="space-y-3 pt-4">
                <p className="text-sm font-semibold text-[#23411f]">
                  Ingredients
                </p>
                <p className="text-xs text-gray-500">
                  Add ingredients for this item.
                </p>
                <div className="flex gap-2">
                  <TextInput
                    id="newIngredient"
                    placeholder="Ingredient name"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target;
                        if (input.value.trim()) {
                          setItemForm((current) => ({
                            ...current,
                            ingredients: [
                              ...current.ingredients,
                              {
                                name: input.value.trim(),
                                removable: true,
                                strict: false,
                                allergens: []
                              }
                            ]
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {itemForm.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 rounded-full border border-[#d8dfc0] bg-white px-3 py-1 text-sm"
                    >
                      <span>{ing.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setItemForm((current) => ({
                            ...current,
                            ingredients: current.ingredients.filter(
                              (_, i) => i !== idx
                            )
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  <Label>Allergens</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'gluten',
                      'egg',
                      'fish',
                      'crustaceans',
                      'molluscs',
                      'milk',
                      'peanut',
                      'tree_nuts',
                      'sesame',
                      'soya',
                      'celery',
                      'mustard',
                      'sulphites',
                      'lupin'
                    ].map((allergen) => (
                      <label
                        key={allergen}
                        className="flex items-center gap-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={itemForm.allergens.includes(allergen)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setItemForm((current) => ({
                              ...current,
                              allergens: checked
                                ? [...current.allergens, allergen]
                                : current.allergens.filter(
                                    (a) => a !== allergen
                                  )
                            }));
                          }}
                          className="rounded border-gray-300"
                        />
                        {allergen.replace('_', ' ')}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <p className="text-sm font-semibold text-[#23411f]">Upsells</p>
                <p className="text-xs text-gray-500">
                  Add optional extras with prices.
                </p>
                <div className="flex gap-2">
                  <TextInput
                    id="upsellLabel"
                    placeholder="Extra name"
                    className="flex-1"
                  />
                  <TextInput
                    id="upsellPrice"
                    type="number"
                    placeholder="Price"
                    className="w-24"
                    min={0}
                    step="0.01"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const labelInput = document.getElementById('upsellLabel');
                      const priceInput = document.getElementById('upsellPrice');
                      if (labelInput?.value.trim() && priceInput?.value) {
                        setItemForm((current) => ({
                          ...current,
                          upsells: [
                            ...current.upsells,
                            {
                              label: labelInput.value.trim(),
                              price: Number(priceInput.value)
                            }
                          ]
                        }));
                        labelInput.value = '';
                        priceInput.value = '';
                      }
                    }}
                    className="!bg-[#8fa31e]"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {itemForm.upsells.map((upsell, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded border border-[#d8dfc0] px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">{upsell.label}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          +£{upsell.price.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setItemForm((current) => ({
                            ...current,
                            upsells: current.upsells.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addItemName">Name</Label>
                <TextInput
                  id="addItemName"
                  value={itemForm.name}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  required
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addItemDescription">Description</Label>
                <Textarea
                  id="addItemDescription"
                  rows={3}
                  value={itemForm.description}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="addItemPrice">Price</Label>
                  <TextInput
                    id="addItemPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={itemForm.price}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        price: event.target.value
                      }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addItemAvailability">Availability</Label>
                  <Select
                    id="addItemAvailability"
                    value={itemForm.isAvailable ? 'available' : 'unavailable'}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        isAvailable: event.target.value === 'available'
                      }))
                    }
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Dietary Options</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={itemForm.dietary.vegetarian}
                      onChange={(e) =>
                        setItemForm((current) => ({
                          ...current,
                          dietary: {
                            ...current.dietary,
                            vegetarian: e.target.checked
                          }
                        }))
                      }
                      className="rounded border-gray-300 text-[#8fa31e] focus:ring-[#8fa31e]"
                    />
                    <span className="text-sm">Vegetarian</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={itemForm.dietary.vegan}
                      onChange={(e) =>
                        setItemForm((current) => ({
                          ...current,
                          dietary: {
                            ...current.dietary,
                            vegan: e.target.checked
                          }
                        }))
                      }
                      className="rounded border-gray-300 text-[#8fa31e] focus:ring-[#8fa31e]"
                    />
                    <span className="text-sm">Vegan</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={itemForm.isMeal}
                    onChange={(e) =>
                      setItemForm((current) => ({
                        ...current,
                        isMeal: e.target.checked
                      }))
                    }
                    className="rounded border-gray-300 text-[#8fa31e] focus:ring-[#8fa31e]"
                  />
                  <span>Is a meal (combo/meal deal)</span>
                </Label>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Nutrition Information</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {['calories', 'fat', 'saturates', 'sugar', 'salt'].map(
                    (nutrient) => (
                      <div key={nutrient} className="flex items-center gap-2">
                        <span className="w-20 capitalize text-gray-600">
                          {nutrient}
                        </span>
                        <TextInput
                          type="number"
                          min={0}
                          value={itemForm.nutrition[nutrient]?.value || 0}
                          onChange={(e) =>
                            setItemForm((current) => ({
                              ...current,
                              nutrition: {
                                ...current.nutrition,
                                [nutrient]: {
                                  ...current.nutrition[nutrient],
                                  value: Number(e.target.value)
                                }
                              }
                            }))
                          }
                          className="w-20"
                        />
                        <Select
                          value={itemForm.nutrition[nutrient]?.level || 'green'}
                          onChange={(e) =>
                            setItemForm((current) => ({
                              ...current,
                              nutrition: {
                                ...current.nutrition,
                                [nutrient]: {
                                  ...current.nutrition[nutrient],
                                  level: e.target.value
                                }
                              }
                            }))
                          }
                          className="w-24"
                        >
                          <option value="green">Green</option>
                          <option value="amber">Amber</option>
                          <option value="red">Red</option>
                        </Select>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="!bg-[#8fa31e] hover:!bg-[#78871c]"
            onClick={handleAddMenuItem}
            isProcessing={submitting}
            disabled={!itemForm.name || !itemForm.price}
          >
            Add item
          </Button>
          <Button
            className="!bg-[#B42627] hover:!bg-[#910712]"
            onClick={() => {
              setActiveMenu(null);
              setItemForm(emptyItemForm);
            }}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* EDIT MENU ITEM MODAL */}
      <Modal
        show={Boolean(editingItem)}
        dismissible={true}
        onClose={() => {
          setEditingItem(null);
        }}
        size="7xl"
      >
        <Modal.Header>Update menu item</Modal.Header>
        <Modal.Body>
          <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#23411f]">
                  Item image
                </p>
                <p className="text-xs text-gray-500">
                  Update the image for this menu item.
                </p>
              </div>

              <ImageUploadCropper
                aspectRatio={1}
                modalTitle="Crop menu item image"
                onCropComplete={handleImageUpload}
                onError={() => {}}
                trigger={({ open }) => (
                  <button
                    type="button"
                    onClick={open}
                    className="relative block aspect-square w-full max-w-[260px] overflow-hidden rounded-[1.5rem] border !border-[#dce6c1] bg-[#f7faef] text-left my-2"
                  >
                    {itemForm.image ? (
                      <img
                        src={itemForm.image}
                        alt="Menu item"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Image preview will appear here
                      </div>
                    )}
                    {imageUploading && (
                      <ImageFrameLoader
                        progress={imageProgress}
                        label="Uploading image"
                        className="rounded-[1.5rem]"
                      />
                    )}
                  </button>
                )}
              />

              <ImageUploadCropper
                aspectRatio={1}
                modalTitle="Crop menu item image"
                onCropComplete={handleImageUpload}
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

              <div className="space-y-3 pt-4">
                <p className="text-sm font-semibold text-[#23411f]">
                  Ingredients
                </p>
                <p className="text-xs text-gray-500">
                  Update ingredients for this item.
                </p>
                <div className="flex gap-2">
                  <TextInput
                    id="editIngredient"
                    placeholder="Ingredient name"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target;
                        if (input.value.trim()) {
                          setItemForm((current) => ({
                            ...current,
                            ingredients: [
                              ...current.ingredients,
                              {
                                name: input.value.trim(),
                                removable: true,
                                strict: false,
                                allergens: []
                              }
                            ]
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {itemForm.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 rounded-full border border-[#d8dfc0] bg-white px-3 py-1 text-sm"
                    >
                      <span>{ing.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setItemForm((current) => ({
                            ...current,
                            ingredients: current.ingredients.filter(
                              (_, i) => i !== idx
                            )
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  <Label>Allergens</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'gluten',
                      'egg',
                      'fish',
                      'crustaceans',
                      'molluscs',
                      'milk',
                      'peanut',
                      'tree_nuts',
                      'sesame',
                      'soya',
                      'celery',
                      'mustard',
                      'sulphites',
                      'lupin'
                    ].map((allergen) => (
                      <label
                        key={allergen}
                        className="flex items-center gap-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={itemForm.allergens.includes(allergen)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setItemForm((current) => ({
                              ...current,
                              allergens: checked
                                ? [...current.allergens, allergen]
                                : current.allergens.filter(
                                    (a) => a !== allergen
                                  )
                            }));
                          }}
                          className="rounded border-gray-300"
                        />
                        {allergen.replace('_', ' ')}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <p className="text-sm font-semibold text-[#23411f]">Upsells</p>
                <p className="text-xs text-gray-500">
                  Add optional extras with prices.
                </p>
                <div className="flex gap-2">
                  <TextInput
                    id="editUpsellLabel"
                    placeholder="Extra name"
                    className="flex-1"
                  />
                  <TextInput
                    id="editUpsellPrice"
                    type="number"
                    placeholder="Price"
                    className="w-24"
                    min={0}
                    step="0.01"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const labelInput =
                        document.getElementById('editUpsellLabel');
                      const priceInput =
                        document.getElementById('editUpsellPrice');
                      if (labelInput?.value.trim() && priceInput?.value) {
                        setItemForm((current) => ({
                          ...current,
                          upsells: [
                            ...current.upsells,
                            {
                              label: labelInput.value.trim(),
                              price: Number(priceInput.value)
                            }
                          ]
                        }));
                        labelInput.value = '';
                        priceInput.value = '';
                      }
                    }}
                    className="!bg-[#8fa31e]"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {itemForm.upsells.map((upsell, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded border border-[#d8dfc0] px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">{upsell.label}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          +£{upsell.price.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setItemForm((current) => ({
                            ...current,
                            upsells: current.upsells.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editItemName">Name</Label>
                <TextInput
                  id="editItemName"
                  value={itemForm.name}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  required
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemDescription">Description</Label>
                <Textarea
                  id="editItemDescription"
                  rows={3}
                  value={itemForm.description}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editItemPrice">Price</Label>
                  <TextInput
                    id="editItemPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={itemForm.price}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        price: event.target.value
                      }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editItemAvailability">Availability</Label>
                  <Select
                    id="editItemAvailability"
                    value={itemForm.isAvailable ? 'available' : 'unavailable'}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        isAvailable: event.target.value === 'available'
                      }))
                    }
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Dietary Options</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={itemForm.dietary.vegetarian}
                      onChange={(e) =>
                        setItemForm((current) => ({
                          ...current,
                          dietary: {
                            ...current.dietary,
                            vegetarian: e.target.checked
                          }
                        }))
                      }
                      className="rounded border-gray-300 text-[#8fa31e] focus:ring-[#8fa31e]"
                    />
                    <span className="text-sm">Vegetarian</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={itemForm.dietary.vegan}
                      onChange={(e) =>
                        setItemForm((current) => ({
                          ...current,
                          dietary: {
                            ...current.dietary,
                            vegan: e.target.checked
                          }
                        }))
                      }
                      className="rounded border-gray-300 text-[#8fa31e] focus:ring-[#8fa31e]"
                    />
                    <span className="text-sm">Vegan</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={itemForm.isMeal}
                    onChange={(e) =>
                      setItemForm((current) => ({
                        ...current,
                        isMeal: e.target.checked
                      }))
                    }
                    className="rounded border-gray-300 text-[#8fa31e] focus:ring-[#8fa31e]"
                  />
                  <span>Is a meal (combo/meal deal)</span>
                </Label>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Nutrition Information</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {['calories', 'fat', 'saturates', 'sugar', 'salt'].map(
                    (nutrient) => (
                      <div key={nutrient} className="flex items-center gap-2">
                        <span className="w-20 capitalize text-gray-600">
                          {nutrient}
                        </span>
                        <TextInput
                          type="number"
                          min={0}
                          value={itemForm.nutrition[nutrient]?.value || 0}
                          onChange={(e) =>
                            setItemForm((current) => ({
                              ...current,
                              nutrition: {
                                ...current.nutrition,
                                [nutrient]: {
                                  ...current.nutrition[nutrient],
                                  value: Number(e.target.value)
                                }
                              }
                            }))
                          }
                          className="w-20"
                        />
                        <Select
                          value={itemForm.nutrition[nutrient]?.level || 'green'}
                          onChange={(e) =>
                            setItemForm((current) => ({
                              ...current,
                              nutrition: {
                                ...current.nutrition,
                                [nutrient]: {
                                  ...current.nutrition[nutrient],
                                  level: e.target.value
                                }
                              }
                            }))
                          }
                          className="w-24"
                        >
                          <option value="green">Green</option>
                          <option value="amber">Amber</option>
                          <option value="red">Red</option>
                        </Select>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="!bg-[#8fa31e] hover:!bg-[#78871c]"
            onClick={handleUpdateMenuItem}
            isProcessing={submitting}
            disabled={!itemForm.name || !itemForm.price}
          >
            Save Changes
          </Button>
          <Button
            className="!bg-[#B42627] hover:!bg-[#910712]"
            onClick={() => {
              setEditingItem(null);
              setItemForm(emptyItemForm);
            }}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMenuToDelete(null);
        }}
        dismissible={true}
        onConfirm={confirmDeleteMenu}
        title="Delete Menu"
        message="Are you sure you want to delete this menu? This action cannot be undone."
        confirmText="Yes, Delete Menu"
      />

      <DeleteConfirmModal
        show={showDeleteItemModal}
        onClose={() => {
          setShowDeleteItemModal(false);
          setItemToDelete(null);
          setMenuForItemDelete(null);
        }}
        dismissible={true}
        onConfirm={handleDeleteMenuItem}
        title="Delete Menu Item"
        message="Are you sure you want to delete this menu item?"
        confirmText="Yes, Delete Item"
      />
    </div>
  );
}
