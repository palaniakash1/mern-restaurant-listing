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
  TextInput,
  Textarea
} from 'flowbite-react';
import { HiOutlinePlusCircle, HiOutlineTrash } from 'react-icons/hi2';
import { apiDelete, apiGet, apiPatch, apiPost } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

const emptyMenuForm = {
  restaurantId: '',
  categoryId: ''
};

const emptyItemForm = {
  name: '',
  description: '',
  price: '',
  image: '',
  isAvailable: true
};

export default function DashMenu() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(user?.restaurantId || '');
  const [menus, setMenus] = useState([]);
  const [menuForm, setMenuForm] = useState(emptyMenuForm);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [activeMenu, setActiveMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canCreateMenu = hasPermission(user, 'menu', 'create');
  const canAddItem = hasPermission(user, 'menu', 'addItem');
  const canToggleAvailability = hasPermission(user, 'menu', 'toggleAvailability');
  const canDeleteMenu = hasPermission(user, 'menu', 'delete');

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant._id === selectedRestaurantId),
    [restaurants, selectedRestaurantId]
  );

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
      const restaurant = await apiGet(`/api/restaurants/id/${user.restaurantId}`);
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

      const generic = await apiGet(`/api/categories?restaurantId=${restaurantId}&page=1&limit=100`);
      return generic.data || [];
    },
    [user]
  );

  const loadMenus = useCallback(async (restaurantId) => {
    if (!restaurantId) {
      setMenus([]);
      return;
    }

    const data = await apiGet(`/api/menu/restaurant/${restaurantId}?page=1&limit=100`);
    setMenus(data.data || []);
  }, []);

  useEffect(() => {
    let ignore = false;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        const restaurantData = await loadRestaurants();

        if (ignore) return;

        setRestaurants(restaurantData);
        const defaultRestaurantId = user?.restaurantId || restaurantData[0]?._id || '';
        setSelectedRestaurantId(defaultRestaurantId);
        setMenuForm((current) => ({ ...current, restaurantId: defaultRestaurantId }));
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      ignore = true;
    };
  }, [loadRestaurants, user?.restaurantId]);

  useEffect(() => {
    let ignore = false;

    const syncRestaurantContext = async () => {
      if (!selectedRestaurantId) return;

      try {
        setLoading(true);
        const categoryData = await loadCategories(selectedRestaurantId);
        await loadMenus(selectedRestaurantId);
        if (!ignore) {
          setCategories(categoryData);
          setMenuForm((current) => ({
            ...current,
            restaurantId: selectedRestaurantId,
            categoryId: current.categoryId || categoryData[0]?._id || ''
          }));
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    syncRestaurantContext();

    return () => {
      ignore = true;
    };
  }, [loadCategories, loadMenus, selectedRestaurantId]);

  const handleCreateMenu = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await apiPost('/api/menu', {
        restaurantId: menuForm.restaurantId,
        categoryId: menuForm.categoryId
      });
      setSuccess('Menu created successfully.');
      await loadMenus(selectedRestaurantId);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMenuItem = async () => {
    if (!activeMenu?._id) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await apiPost(`/api/menu/${activeMenu._id}/items`, {
        items: [
          {
            name: itemForm.name,
            description: itemForm.description,
            image: itemForm.image,
            price: Number(itemForm.price),
            isAvailable: itemForm.isAvailable
          }
        ]
      });
      setSuccess('Menu item added successfully.');
      setActiveMenu(null);
      setItemForm(emptyItemForm);
      await loadMenus(selectedRestaurantId);
    } catch (itemError) {
      setError(itemError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (menuId, itemId, isAvailable) => {
    try {
      setError(null);
      setSuccess(null);
      await apiPatch(`/api/menu/${menuId}/items/${itemId}/availability`, {
        isAvailable: !isAvailable
      });
      setSuccess('Menu item availability updated.');
      await loadMenus(selectedRestaurantId);
    } catch (toggleError) {
      setError(toggleError.message);
    }
  };

  const handleDeleteMenu = async (menuId) => {
    const confirmed = window.confirm('Delete this menu?');
    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);
      await apiDelete(`/api/menu/${menuId}`);
      setSuccess('Menu deleted successfully.');
      await loadMenus(selectedRestaurantId);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="space-y-5">
      {error && <Alert color="failure">{error}</Alert>}
      {success && <Alert color="success">{success}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border border-[#dce6c1] bg-white shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b62828]">
              Menu operations
            </p>
            <h2 className="text-2xl font-bold text-[#23411f]">Menus and menu items</h2>
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
            >
              <option value="">Select restaurant</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant._id} value={restaurant._id}>
                  {restaurant.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f5faeb] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7e9128]">Menus</p>
              <p className="mt-2 text-3xl font-bold text-[#23411f]">{menus.length}</p>
            </div>
            <div className="rounded-2xl bg-[#fff4f4] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#b62828]">Restaurant</p>
              <p className="mt-2 text-sm font-semibold text-[#5c1111]">
                {selectedRestaurant?.name || 'Not selected'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8f7f1] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7a7a6b]">Categories</p>
              <p className="mt-2 text-3xl font-bold text-[#23411f]">{categories.length}</p>
            </div>
          </div>
        </Card>

        {canCreateMenu && (
          <Card className="border border-[#dce6c1] bg-white shadow-sm">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[#23411f]">Create menu</h3>
              <p className="text-sm text-gray-500">Create one menu per restaurant category.</p>
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
                className="bg-[#8fa31e] hover:bg-[#78871c]"
                isProcessing={submitting}
                disabled={!menuForm.restaurantId || !menuForm.categoryId}
              >
                Create menu
              </Button>
            </form>
          </Card>
        )}
      </div>

      <Card className="border border-[#dce6c1] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#23411f]">Active menus</h3>
            <p className="text-sm text-gray-500">
              Manage menu items and availability for the selected restaurant.
            </p>
          </div>
          {loading && <Spinner size="sm" />}
        </div>

        <div className="space-y-4">
          {menus.map((menu) => (
            <div
              key={menu._id}
              className="rounded-[1.75rem] border border-[#e7edd2] bg-[#fbfcf7] p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-semibold text-[#23411f]">
                      {menu.categoryId?.name || 'Menu'}
                    </h4>
                    <Badge color={menu.status === 'published' ? 'success' : 'warning'}>
                      {menu.status || 'draft'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{menu.items?.length || 0} menu items</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canAddItem && (
                    <Button
                      size="xs"
                      className="bg-[#8fa31e] hover:bg-[#78871c]"
                      onClick={() => setActiveMenu(menu)}
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

              <div className="mt-4 hidden overflow-x-auto md:block">
                <Table hoverable>
                  <Table.Head>
                    <Table.HeadCell>Item</Table.HeadCell>
                    <Table.HeadCell>Price</Table.HeadCell>
                    <Table.HeadCell>Status</Table.HeadCell>
                    <Table.HeadCell>Actions</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {(menu.items || []).map((item) => (
                      <Table.Row key={item._id}>
                        <Table.Cell>
                          <div>
                            <p className="font-medium text-[#23411f]">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.description || 'No description'}
                            </p>
                          </div>
                        </Table.Cell>
                        <Table.Cell>£{Number(item.price || 0).toFixed(2)}</Table.Cell>
                        <Table.Cell>
                          <Badge color={item.isAvailable ? 'success' : 'failure'}>
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {canToggleAvailability && (
                            <Button
                              color="light"
                              size="xs"
                              onClick={() =>
                                handleToggleAvailability(menu._id, item._id, item.isAvailable)
                              }
                            >
                              Toggle availability
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal show={Boolean(activeMenu)} onClose={() => setActiveMenu(null)}>
        <Modal.Header>Add menu item</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Name</Label>
              <TextInput
                id="itemName"
                value={itemForm.name}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemDescription">Description</Label>
              <Textarea
                id="itemDescription"
                rows={3}
                value={itemForm.description}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itemPrice">Price</Label>
                <TextInput
                  id="itemPrice"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemImage">Image URL</Label>
                <TextInput
                  id="itemImage"
                  value={itemForm.image}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      image: event.target.value
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemAvailability">Availability</Label>
              <Select
                id="itemAvailability"
                value={itemForm.isAvailable ? 'available' : 'unavailable'}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    isAvailable: event.target.value === 'available'
                  }))
                }
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </Select>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="bg-[#8fa31e] hover:bg-[#78871c]"
            onClick={handleAddMenuItem}
            isProcessing={submitting}
          >
            Add item
          </Button>
          <Button color="gray" onClick={() => setActiveMenu(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
