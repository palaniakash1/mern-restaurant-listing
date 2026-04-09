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
import {
  HiOutlineArrowPath,
  HiOutlineBuildingStorefront,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi2';
import AddressAutocomplete from './AddressAutocomplete';
import { apiDelete, apiGet, apiPatch, apiPost } from '../utils/api';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import ImageFrameLoader from './ImageFrameLoader';
import ImageUploadCropper from './ImageUploadCropper';

const buildRestaurantForm = () => ({
  name: '',
  tagline: '',
  description: '',
  contactNumber: '',
  email: '',
  website: '',
  imageLogo: '',
  bannerImage: '',
  adminId: '',
  address: {
    addressLine1: '',
    addressLine2: '',
    areaLocality: '',
    city: '',
    countyRegion: '',
    postcode: '',
    country: 'United Kingdom'
  },
  location: null,
  fsaSelection: null
});

const formatAddress = (address = {}) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.areaLocality,
    address.city,
    address.postcode
  ]
    .filter(Boolean)
    .join(', ');

const normalizeWebsiteUrl = (value = '') => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const limitTaglineWords = (value = '', maxWords = 7) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(' ');

const getTaglineWordCount = (value = '') =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const getPreviewHero = (formData) =>
  formData.bannerImage || formData.imageLogo || '';

const getBadgeUrl = (rating) =>
  rating && rating !== 'Exempt'
    ? `https://ratings.food.gov.uk/images/badges/fhrs/3/fhrs-badge-${rating}.svg`
    : null;

const PAGE_SIZE = 10;

const getAdminId = (admin) => {
  if (!admin) return '';
  return typeof admin === 'object' ? admin._id || '' : admin;
};

function LogoUpload({ value, progress, uploading, onSelect }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#23411f]">Brand logo</p>
          <p className="text-xs text-gray-500">
            Upload a polished restaurant logo with preview.
          </p>
        </div>
        <ImageUploadCropper
          aspectRatio={1}
          modalTitle="Crop restaurant logo"
          onCropComplete={onSelect}
          onError={() => {}}
          trigger={({ open }) => (
            <button
              type="button"
              onClick={open}
              className="inline-flex rounded-xl border border-[#d8dfc0] bg-white px-3 py-2 text-sm font-semibold text-[#23411f] shadow-sm"
            >
              Choose logo
            </button>
          )}
        />
      </div>

      <ImageUploadCropper
        aspectRatio={1}
        modalTitle="Crop restaurant logo preview"
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
                alt="Restaurant logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                Logo preview will appear here
              </div>
            )}
            {uploading && (
              <ImageFrameLoader
                progress={progress}
                label="Uploading logo"
                className="rounded-[1.5rem]"
              />
            )}
          </button>
        )}
      />
    </div>
  );
}

function SearchableAdminPicker({
  selectedAdmin,
  selectedAdminId,
  onSelect,
  fetchAdmins
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        const results = await fetchAdmins(query);
        if (!ignore) {
          setAdmins(results);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [fetchAdmins, open, query]);

  return (
    <div className="relative space-y-2">
      <Label>Assign admin</Label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm shadow-sm"
      >
        <span className={selectedAdminId ? 'text-[#23411f]' : 'text-gray-400'}>
          {selectedAdmin?.userName || 'Choose / assign admin'}
        </span>
        <HiOutlineArrowPath className={`h-4 w-4 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 w-full rounded-[1.25rem] border !border-[#dce6c1] bg-white p-3 shadow-xl">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search admins"
          />
          <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
            {loading && (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-gray-500">
                <Spinner size="sm" />
                Searching admins...
              </div>
            )}
            {!loading &&
              admins.map((admin) => (
                <button
                  key={admin._id}
                  type="button"
                  onClick={() => {
                    onSelect(admin);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col rounded-xl border border-transparent bg-[#fbfcf7] px-3 py-3 text-left hover:!!border-[#dce6c1] hover:!bg-[#f6fbe9]"
                >
                  <span className="text-sm font-semibold text-[#23411f]">
                    {admin.userName}
                  </span>
                  <span className="text-xs text-gray-500">{admin.email}</span>
                </button>
              ))}
            {!loading && admins.length === 0 && (
              <p className="px-2 py-3 text-sm text-gray-500">
                No admins match this search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BannerUpload({ value, progress, uploading, onCropComplete, onError }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#23411f]">Banner image</p>
          <p className="text-xs text-gray-500">
            Upload an exotic dish or signature highlight in a 16:9 frame.
          </p>
        </div>
        <ImageUploadCropper
          aspectRatio={16 / 9}
          modalTitle="Crop restaurant banner"
          onCropComplete={onCropComplete}
          onError={onError}
          trigger={({ open }) => (
            <button
              type="button"
              onClick={open}
              className="inline-flex rounded-xl border border-[#d8dfc0] bg-white px-3 py-2 text-sm font-semibold text-[#23411f] shadow-sm"
            >
              Upload banner
            </button>
          )}
        />
      </div>
      <ImageUploadCropper
        aspectRatio={16 / 9}
        modalTitle="Crop restaurant banner preview"
        onCropComplete={onCropComplete}
        onError={onError}
        trigger={({ open }) => (
          <button
            type="button"
            onClick={open}
            className="relative block w-full overflow-hidden rounded-[1.5rem] border border-[#dce6c1] bg-[#f7faef] text-left"
          >
            <div className="relative aspect-[16/9] w-full">
              {value ? (
                <img
                  src={value}
                  alt="Restaurant banner"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Banner preview will appear here
                </div>
              )}
              {uploading && (
                <ImageFrameLoader
                  progress={progress}
                  label="Uploading banner"
                  className="rounded-[1.5rem]"
                />
              )}
            </div>
          </button>
        )}
      />
    </div>
  );
}

function RestaurantPagePreview({ formData, selectedAdmin }) {
  const heroImage = getPreviewHero(formData);
  const website = normalizeWebsiteUrl(formData.website);
  const fallbackLocation =
    formData.address?.city || formData.address?.areaLocality || 'UK';
  const fullAddress = formatAddress(formData.address);
  const fsaBadge = getBadgeUrl(
    formData.fsaSelection?.rating || formData.fsaSelection?.value
  );

  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-[#e9dfd0] bg-[#f5f1e8] shadow-[0_18px_45px_rgba(64,48,20,0.06)]">
      <div className="relative h-[24rem] overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={formData.name || 'Restaurant'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#e8decf_0%,#f5f1e8_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white [text-shadow:0_10px_35px_rgba(0,0,0,0.9)]">
          <div className="max-w-3xl">
            <p className="text-5xl font-extrabold tracking-tight sm:text-7xl">
              {formData.name || 'Restaurant name'}
            </p>
            <p className="mt-3 text-sm uppercase tracking-[0.32em] text-white/80 sm:text-lg">
              {formData.tagline || 'Signature dining experience'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/90 sm:text-xs">
              <span>New Rating</span>
              <span className="opacity-40">|</span>
              <span>$$</span>
              <span className="opacity-40">|</span>
              <span>{fallbackLocation}</span>
            </div>
            {fsaBadge ? (
              <div className="mt-5 flex justify-center">
                <img
                  src={fsaBadge}
                  alt={`FSA Rating ${formData.fsaSelection?.rating || formData.fsaSelection?.value}`}
                  className="h-12 w-auto drop-shadow-[0_10px_25px_rgba(0,0,0,0.55)]"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[2.2rem] border border-[#e9dfd0] bg-white shadow-[0_22px_70px_rgba(65,48,24,0.08)]">
          <div className="border-b border-[#f0e8db] bg-[linear-gradient(135deg,#fbf8f2_0%,#f8f4ec_100%)] p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="max-w-2xl">
                <p className="!text-[8px] font-semibold uppercase tracking-[0.32em] text-[#8e5c2d]">
                  Curated Menu
                </p>
                <h3 className="mt-3 !text-[20px] sm:text-4xl font-black tracking-tight text-[#1c1917] leading-snug max-w-xl">
                  Designed to feel like a destination, not a list
                </h3>
                <p className="mt-4 text-base leading-8 text-[#6d6358]">
                  {formData.description ||
                    `Browse the standout dishes, signature sections, and high-intent menu story of ${
                      formData.name || 'this restaurant'
                    }.`}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {['Chef selection', 'Signature plates', 'Drinks'].map(
                  (label) => (
                    <span
                      key={label}
                      className="rounded-full bg-[#f1eadd] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#675d52]"
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="rounded-[1.9rem] border border-dashed border-[#dfd3c1] bg-[#faf6ef] px-6 py-14 text-center">
              <p className="text-sm uppercase tracking-[0.32em] text-[#8e5c2d]">
                Menu
              </p>
              <h4 className="mt-3 text-2xl font-bold text-[#1c1917]">
                Coming Soon
              </h4>
              <p className="mt-3 text-sm leading-7 text-[#6d6358]">
                This restaurant has not published its dishes yet.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:pt-8">
          <div className="overflow-hidden rounded-[2rem] border border-[#e9dfd0] bg-white shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
            <div className="h-44 overflow-hidden bg-[#f4ede2]">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={formData.name || 'Restaurant'}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
                Location
              </p>
              <h4 className="mt-5 text-2xl font-black text-[#1c1917]">
                {formData.address?.addressLine1 ||
                  formData.address?.areaLocality ||
                  formData.address?.city ||
                  'Visit us'}
              </h4>
              <p className="mt-3 text-sm leading-7 text-[#6d6358]">
                {fullAddress || 'Address preview'}
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#e9dfd0] bg-white p-6 shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
              Quick facts
            </p>
            <div className="mt-5 grid gap-4">
              <div className="rounded-[1.5rem] bg-[#faf6ef] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9d9284]">
                  Website
                </p>
                <p className="mt-2 text-sm font-semibold text-[#1c1917]">
                  {website || 'Add restaurant website'}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#faf6ef] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9d9284]">
                  Owner
                </p>
                <p className="mt-2 text-sm font-semibold text-[#1c1917]">
                  {selectedAdmin?.userName || 'Choose admin'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#e9dfd0] bg-white p-6 shadow-[0_18px_50px_rgba(64,48,20,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#faf6ef] text-[#8e5c2d]">
                {formData.imageLogo ? (
                  <img
                    src={formData.imageLogo}
                    alt={formData.name || 'Logo'}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold">
                    {formData.name?.charAt(0)?.toUpperCase() || 'R'}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8e5c2d]">
                Inquiries
              </p>
            </div>
            <div className="mt-5 space-y-5 text-sm">
              <div className="rounded-[1.35rem] bg-[#faf6ef] px-4 py-4 text-[#5f5549]">
                {formData.contactNumber || 'Contact number'}
              </div>
              <div className="rounded-[1.35rem] bg-[#faf6ef] px-4 py-4 text-[#5f5549]">
                {formData.email || 'restaurant@email.com'}
              </div>
              <div className="rounded-[1.35rem] bg-[#faf6ef] px-4 py-4 text-[#5f5549]">
                {website || 'Website link'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashRestaurants() {
  const { user: currentUser } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalMode, setModalMode] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [formData, setFormData] = useState(buildRestaurantForm());
  const [addressSearch, setAddressSearch] = useState('');
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [fsaOptions, setFsaOptions] = useState([]);
  const [fsaLoading, setFsaLoading] = useState(false);
  const [pendingDeleteRestaurant, setPendingDeleteRestaurant] = useState(null);

  const canCreateRestaurant = hasPermission(
    currentUser,
    'restaurant',
    'create'
  );
  const canUpdateRestaurant = hasPermission(
    currentUser,
    'restaurant',
    'updateById'
  );
  const canDeleteRestaurant = hasPermission(
    currentUser,
    'restaurant',
    'deleteById'
  );
  const canUpdateStatus = hasPermission(
    currentUser,
    'restaurant',
    'updateStatus'
  );
  const canRestoreRestaurant = hasPermission(
    currentUser,
    'restaurant',
    'restore'
  );
  const canReassignAdmin = hasPermission(
    currentUser,
    'restaurant',
    'reassignAdmin'
  );

  const listBaseEndpoint = useMemo(() => {
    if (currentUser?.role === 'superAdmin') {
      return '/api/restaurants/all';
    }
    if (currentUser?.role === 'admin') {
      return '/api/restaurants/me/all';
    }
    return null;
  }, [currentUser?.role]);

  const publishedCount = restaurants.filter(
    (item) => item.status === 'published'
  ).length;
  const draftCount = restaurants.filter(
    (item) => item.status === 'draft'
  ).length;
  const blockedCount = restaurants.filter(
    (item) => item.status === 'blocked'
  ).length;
  const scopedRestaurants = useMemo(() => {
    if (statusFilter === 'all') return restaurants;
    return restaurants.filter((item) => item.status === statusFilter);
  }, [restaurants, statusFilter]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(scopedRestaurants.length / PAGE_SIZE)),
    [scopedRestaurants.length]
  );
  const filteredRestaurants = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return scopedRestaurants.slice(startIndex, startIndex + PAGE_SIZE);
  }, [page, scopedRestaurants]);
  const syncRestaurantRecord = useCallback((nextRestaurant) => {
    setRestaurants((current) => {
      const nextId = String(nextRestaurant?._id || '');
      const remaining = current.filter(
        (restaurant) => String(restaurant._id) !== nextId
      );
      return [nextRestaurant, ...remaining];
    });
  }, []);
  const removeRestaurantRecord = useCallback((restaurantId) => {
    setRestaurants((current) =>
      current.filter((restaurant) => String(restaurant._id) !== String(restaurantId))
    );
  }, []);

  const fetchRestaurants = useCallback(async () => {
    if (!listBaseEndpoint) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const firstPage = await apiGet(
        `${listBaseEndpoint}?page=1&limit=100`
      );
      const pages = Math.max(1, firstPage.totalPages || 1);
      let dataset = firstPage.data || [];

      if (pages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: pages - 1 }, (_, index) =>
            apiGet(`${listBaseEndpoint}?page=${index + 2}&limit=100`)
          )
        );
        dataset = dataset.concat(
          remainingPages.flatMap((response) => response.data || [])
        );
      }

      setRestaurants(dataset);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [listBaseEndpoint]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    if (!modalMode) return;
    if (!formData.name || formData.name.trim().length < 2) {
      setFsaOptions([]);
      return;
    }

    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setFsaLoading(true);
        const params = new URLSearchParams({ name: formData.name.trim() });
        if (formData.address.postcode) {
          params.set('postcode', formData.address.postcode);
        }
        const data = await apiGet(`/api/fsa/search?${params.toString()}`);
        if (!ignore) {
          const payload = data.data || {};
          const options = [
            ...(payload.result ? [payload.result] : []),
            ...(payload.multipleOptions || [])
          ];
          setFsaOptions(options);
        }
      } catch {
        if (!ignore) {
          setFsaOptions([]);
        }
      } finally {
        if (!ignore) {
          setFsaLoading(false);
        }
      }
    }, 450);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [formData.address.postcode, formData.name, modalMode]);

  const fetchAvailableAdmins = useCallback(
    async (query = '') => {
      if (!canReassignAdmin && currentUser?.role !== 'superAdmin') {
        return [];
      }
      const data = await apiGet(
        `/api/users?page=1&limit=100&q=${encodeURIComponent(query)}`
      );
      return (data.data || []).filter((user) => user.role === 'admin');
    },
    [canReassignAdmin, currentUser?.role]
  );

  const resetModalState = () => {
    setModalMode(null);
    setSelectedRestaurant(null);
    setFormData(buildRestaurantForm());
    setAddressSearch('');
    setLogoProgress(0);
    setLogoUploading(false);
    setBannerProgress(0);
    setBannerUploading(false);
    setSelectedAdmin(null);
    setFsaOptions([]);
  };

  const handleLogoUpload = async (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      return;
    }

    setFormData((current) => ({
      ...current,
      imageLogo: URL.createObjectURL(file)
    }));
    setLogoUploading(true);
    setLogoProgress(10);

    try {
      const uploaded = await uploadToCloudinary({
        file,
        folder: 'restaurants/logos',
        resourceType: 'image',
        publicIdPrefix: 'restaurant-logo',
        onProgress: (progress) => setLogoProgress(progress)
      });
      setLogoProgress(100);
      setFormData((current) => ({
        ...current,
        imageLogo: uploaded.url
      }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBannerUpload = async (file) => {
    setBannerUploading(true);
    setBannerProgress(10);

    try {
      const uploaded = await uploadToCloudinary({
        file,
        folder: 'restaurants/banners',
        resourceType: 'image',
        publicIdPrefix: 'restaurant-banner',
        onProgress: (progress) => setBannerProgress(progress)
      });
      setBannerProgress(100);
      setFormData((current) => ({
        ...current,
        bannerImage: uploaded.url
      }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBannerUploading(false);
    }
  };

  const openCreateModal = () => {
    resetModalState();
    setModalMode('create');
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openEditModal = async (restaurant) => {
    resetModalState();
    setSelectedRestaurant(restaurant);
    setModalMode('edit');
    setFormData({
      name: restaurant.name || '',
      tagline: restaurant.tagline || '',
      description: restaurant.description || '',
      contactNumber: restaurant.contactNumber || '',
      email: restaurant.email || '',
      website: restaurant.website || '',
      imageLogo: restaurant.imageLogo || '',
      bannerImage: restaurant.bannerImage || '',
      adminId: restaurant.adminId || '',
      address: {
        addressLine1: restaurant.address?.addressLine1 || '',
        addressLine2: restaurant.address?.addressLine2 || '',
        areaLocality: restaurant.address?.areaLocality || '',
        city: restaurant.address?.city || '',
        countyRegion: restaurant.address?.countyRegion || '',
        postcode: restaurant.address?.postcode || '',
        country: restaurant.address?.country || 'United Kingdom'
      },
      location: restaurant.address?.location
        ? {
            lat: restaurant.address.location.coordinates?.[1],
            lng: restaurant.address.location.coordinates?.[0]
          }
        : null,
      fsaSelection: restaurant.fhrsId
        ? { fhrsId: restaurant.fhrsId, rating: restaurant.fsaRating?.value }
        : null
    });
    setAddressSearch(formatAddress(restaurant.address));
    if (restaurant.adminId && typeof restaurant.adminId === 'object') {
      setSelectedAdmin(restaurant.adminId);
      return;
    }
    const adminId = getAdminId(restaurant.adminId);
    if (!adminId) return;
    try {
      const admins = await fetchAvailableAdmins('');
      const adminMatch = admins.find((admin) => admin._id === adminId);
      if (adminMatch) {
        setSelectedAdmin(adminMatch);
      }
    } catch {
      setSelectedAdmin(null);
    }
  };

  const applyAddressDetails = (placeDetails) => {
    setAddressSearch(placeDetails.formattedAddress || '');
    setFormData((current) => ({
      ...current,
      address: {
        ...current.address,
        ...placeDetails.address
      },
      location: placeDetails.location
        ? {
            lat: placeDetails.location.coordinates[1],
            lng: placeDetails.location.coordinates[0]
          }
        : current.location
    }));
  };

  const applyFsaOption = (option) => {
    const fsaAddress = option.restaurantAddress || {};
    const nextAddress = {
      ...formData.address,
      addressLine1: fsaAddress.addressLine1 || formData.address.addressLine1,
      addressLine2: fsaAddress.addressLine2 || formData.address.addressLine2,
      areaLocality: fsaAddress.areaLocality || formData.address.areaLocality,
      city: fsaAddress.city || formData.address.city,
      countyRegion: fsaAddress.countyRegion || formData.address.countyRegion,
      postcode: fsaAddress.postcode || formData.address.postcode,
      country: fsaAddress.country || formData.address.country
    };
    setFormData((current) => ({
      ...current,
      name: option.name || current.name,
      address: nextAddress,
      fsaSelection: option
    }));
    setAddressSearch(formatAddress(nextAddress));
  };

  const buildRestaurantPayload = () => {
    const payload = {
      name: formData.name,
      tagline: formData.tagline,
      description: formData.description,
      contactNumber: formData.contactNumber,
      email: formData.email,
      website: normalizeWebsiteUrl(formData.website),
      imageLogo: formData.imageLogo,
      bannerImage: formData.bannerImage,
      address: formData.address
    };

    if (
      formData.location?.lat !== undefined &&
      formData.location?.lng !== undefined
    ) {
      payload.location = formData.location;
    }

    if (
      modalMode === 'create' &&
      currentUser?.role === 'superAdmin' &&
      selectedAdmin?._id
    ) {
      payload.adminId = selectedAdmin._id;
    }

    if (formData.fsaSelection?.fhrsId) {
      payload.fsa = {
        fhrsId: Number(formData.fsaSelection.fhrsId),
        isManuallyLinked: true
      };
    }

    return payload;
  };

  const handleCreateOrUpdateRestaurant = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (
        modalMode === 'create' &&
        currentUser?.role === 'superAdmin' &&
        !selectedAdmin?._id
      ) {
        throw new Error('Please choose an admin for this restaurant.');
      }

      if (modalMode === 'create') {
        await apiPost('/api/restaurants', buildRestaurantPayload());
        setSuccess('Restaurant created successfully.');
      }

      if (modalMode === 'edit' && selectedRestaurant) {
        await apiPatch(
          `/api/restaurants/id/${selectedRestaurant._id}`,
          buildRestaurantPayload()
        );
        if (
          canReassignAdmin &&
          selectedAdmin?._id &&
          selectedAdmin._id !== getAdminId(selectedRestaurant.adminId)
        ) {
          await apiPatch(
            `/api/restaurants/id/${selectedRestaurant._id}/admin`,
            {
              newAdminId: selectedAdmin._id
            }
          );
        }
        setSuccess('Restaurant updated successfully.');
      }

      resetModalState();
      await fetchRestaurants();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRestaurant = async (restaurant) => {
    try {
      setError(null);
      setSuccess(null);
      await apiDelete(`/api/restaurants/id/${restaurant._id}`);
      removeRestaurantRecord(restaurant._id);
      setSuccess('Restaurant deleted successfully.');
      setPendingDeleteRestaurant(null);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleStatusChange = async (restaurant, status) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await apiPatch(`/api/restaurants/id/${restaurant._id}/status`, {
        status
      });
      if (response?.data) {
        syncRestaurantRecord(response.data);
      }
      setSuccess(`Restaurant moved to ${status}.`);
    } catch (statusError) {
      setError(statusError.message);
    }
  };

  const handleRestoreRestaurant = async (restaurant) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await apiPatch(`/api/restaurants/id/${restaurant._id}/restore`, {});
      if (response?.data) {
        syncRestaurantRecord(response.data);
      }
      setSuccess('Restaurant restored successfully.');
    } catch (restoreError) {
      setError(restoreError.message);
    }
  };

  if (!listBaseEndpoint) {
    return (
      <Card className="border !border-[#dce6c1] bg-white shadow-sm">
        <p className="text-sm text-gray-600">
          Your current role does not have access to restaurant operations.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {error && <Alert color="failure">{error}</Alert>}
        {success && <Alert color="success">{success}</Alert>}

        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b62828]">
                Restaurant command center
              </p>
              <h2 className="text-2xl font-bold text-[#23411f] sm:text-3xl">
                Enterprise restaurant operations
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-gray-600">
                Create, edit, govern, and review restaurants with FSA
                assistance, brand asset upload, and privilege-aware ownership
                control.
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
                  <p className="mt-2 text-3xl font-bold">
                    {restaurants.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/12 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Published
                  </p>
                  <p className="mt-2 text-3xl font-bold">{publishedCount}</p>
                </div>
                <div className="rounded-2xl bg-white/12 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Blocked
                  </p>
                  <p className="mt-2 text-3xl font-bold">{blockedCount}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Draft restaurants</p>
            <p className="mt-2 text-3xl font-bold text-[#23411f]">
              {draftCount}
            </p>
          </Card>
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Owner control</p>
            <p className="mt-2 text-sm font-semibold text-[#23411f]">
              {canReassignAdmin
                ? 'Super admin reassignment enabled'
                : 'Scoped to owned stores'}
            </p>
          </Card>
          <Card className="border !border-[#dce6c1] bg-white shadow-sm">
            <p className="text-sm text-gray-500">Status governance</p>
            <p className="mt-2 text-sm font-semibold text-[#23411f]">
              {canUpdateStatus
                ? 'Publish, draft, and block controls available'
                : 'Read/write only for owned records'}
            </p>
          </Card>
        </div>

        <Card className="border !border-[#dce6c1] bg-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#23411f]">
                Restaurant registry
              </h3>
              <p className="text-sm text-gray-500">
                Premium control surface for restaurant records in your scope.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="blocked">Blocked</option>
              </Select>
              {canCreateRestaurant && (
                <Button
                  className="!bg-[#8fa31e] hover:!!bg-[#78871c]"
                  onClick={openCreateModal}
                >
                  <HiOutlinePlus className="mr-2 h-4 w-4" />
                  Add restaurant
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={
                statusFilter === 'all'
                  ? 'font-semibold text-[#23411f]'
                  : 'text-[#2563eb]'
              }
            >
              All ({restaurants.length})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setStatusFilter('published')}
              className={
                statusFilter === 'published'
                  ? 'font-semibold text-[#23411f]'
                  : 'text-[#2563eb]'
              }
            >
              Published ({publishedCount})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setStatusFilter('draft')}
              className={
                statusFilter === 'draft'
                  ? 'font-semibold text-[#23411f]'
                  : 'text-[#2563eb]'
              }
            >
              Draft ({draftCount})
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setStatusFilter('blocked')}
              className={
                statusFilter === 'blocked'
                  ? 'font-semibold text-[#23411f]'
                  : 'text-[#2563eb]'
              }
            >
              Blocked ({blockedCount})
            </button>
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f7faef] px-4 py-3 text-sm text-[#4e5e20]">
              <Spinner size="sm" />
              Loading restaurants...
            </div>
          )}

          <div className="mt-5 hidden overflow-x-auto md:block">
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell>Restaurant</Table.HeadCell>
                <Table.HeadCell>Location</Table.HeadCell>
                <Table.HeadCell>FSA</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
                <Table.HeadCell>Actions</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
                {filteredRestaurants.map((restaurant) => (
                  <Table.Row key={restaurant._id}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#f7faef]">
                          {restaurant.imageLogo ? (
                            <img
                              src={restaurant.imageLogo}
                              alt={restaurant.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <HiOutlineBuildingStorefront className="h-6 w-6 text-[#7e9128]" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#23411f]">
                            {restaurant.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {restaurant.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="max-w-xs text-sm text-gray-600">
                      {formatAddress(restaurant.address) || 'No address'}
                    </Table.Cell>
                    <Table.Cell>
                      {restaurant.fhrsId ? (
                        <div className="space-y-1">
                          <Badge color="success">
                            FHRS {restaurant.fsaRating?.value || 'Linked'}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            ID: {restaurant.fhrsId}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Not linked
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={
                          restaurant.status === 'published'
                            ? 'success'
                            : restaurant.status === 'blocked'
                              ? 'failure'
                              : 'warning'
                        }
                      >
                        {restaurant.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-2">
                        {canUpdateRestaurant && (
                          <Button
                            size="xs"
                            className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f] hover:shadow-md focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                            onClick={() => openEditModal(restaurant)}
                          >
                            <HiOutlinePencilSquare className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        {canUpdateStatus &&
                          restaurant.status !== 'published' && (
                            <Button
                              size="xs"
                              color="success"
                              onClick={() =>
                                handleStatusChange(restaurant, 'published')
                              }
                            >
                              Publish
                            </Button>
                          )}
                        {canUpdateStatus &&
                          restaurant.status !== 'draft' && (
                            <Button
                              size="xs"
                              color="warning"
                              onClick={() =>
                                handleStatusChange(restaurant, 'draft')
                              }
                            >
                              Draft
                            </Button>
                          )}
                        {canUpdateStatus && restaurant.status !== 'blocked' && (
                          <Button
                            size="xs"
                            color="failure"
                            onClick={() =>
                              handleStatusChange(restaurant, 'blocked')
                            }
                          >
                            Block
                          </Button>
                        )}
                        {canRestoreRestaurant &&
                          restaurant.status === 'blocked' && (
                            <Button
                              size="xs"
                              color="light"
                              onClick={() =>
                                handleRestoreRestaurant(restaurant)
                              }
                            >
                              Restore
                            </Button>
                          )}
                        {canDeleteRestaurant && (
                          <Button
                            color="failure"
                            size="xs"
                            onClick={() =>
                              setPendingDeleteRestaurant(restaurant)
                            }
                          >
                            <HiOutlineTrash className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
                {filteredRestaurants.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-10 text-center text-sm text-gray-500">
                      No restaurants found for the `{statusFilter}` filter.
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table>
          </div>

          <div className="mt-5 space-y-3 md:hidden">
            {filteredRestaurants.map((restaurant) => (
              <div
                key={restaurant._id}
                className="rounded-[1.5rem] border border-[#e6eccf] bg-[#fbfcf7] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#23411f]">
                      {restaurant.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatAddress(restaurant.address) || 'No address'}
                    </p>
                  </div>
                  <Badge
                    color={
                      restaurant.status === 'published'
                        ? 'success'
                        : restaurant.status === 'blocked'
                          ? 'failure'
                          : 'warning'
                    }
                  >
                    {restaurant.status}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canUpdateRestaurant && (
                    <Button
                      size="xs"
                      className="!bg-[#f7faef] !text-[#23411f] border border-[#d8dfc0] hover:!bg-[#23411f] hover:!text-white hover:border-[#23411f]"
                      onClick={() => openEditModal(restaurant)}
                    >
                      Edit
                    </Button>
                  )}
                  {canUpdateStatus && restaurant.status !== 'published' && (
                    <Button
                      size="xs"
                      color="success"
                      onClick={() =>
                        handleStatusChange(restaurant, 'published')
                      }
                    >
                      Publish
                    </Button>
                  )}
                  {canUpdateStatus && restaurant.status !== 'draft' && (
                    <Button
                      size="xs"
                      color="warning"
                      onClick={() => handleStatusChange(restaurant, 'draft')}
                    >
                      Draft
                    </Button>
                  )}
                  {canUpdateStatus && restaurant.status !== 'blocked' && (
                    <Button
                      size="xs"
                      color="failure"
                      onClick={() => handleStatusChange(restaurant, 'blocked')}
                    >
                      Block
                    </Button>
                  )}
                  {canRestoreRestaurant && restaurant.status === 'blocked' && (
                    <Button
                      size="xs"
                      color="light"
                      onClick={() => handleRestoreRestaurant(restaurant)}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredRestaurants.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-[#dce6c1] bg-[#fbfcf7] p-5 text-sm text-gray-500">
                No restaurants found for the `{statusFilter}` filter.
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-500">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <div className="flex gap-2">
              <Button
                color="light"
                size="xs"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
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
        </Card>
      </div>

      <Modal
        show={modalMode === 'create' || modalMode === 'edit'}
        onClose={resetModalState}
        size="7xl"
      >
        <Modal.Header>
          {modalMode === 'edit'
            ? 'Update restaurant workspace'
            : 'Create restaurant workspace'}
        </Modal.Header>
        <Modal.Body>
          <form className="space-y-6" onSubmit={handleCreateOrUpdateRestaurant}>
            <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
              <div className="space-y-6">
                <LogoUpload
                  value={formData.imageLogo}
                  progress={logoProgress}
                  uploading={logoUploading}
                  onSelect={handleLogoUpload}
                />
                <BannerUpload
                  value={formData.bannerImage}
                  progress={bannerProgress}
                  uploading={bannerUploading}
                  onCropComplete={handleBannerUpload}
                  onError={setError}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="restaurantName">Restaurant name</Label>
                  <TextInput
                    id="restaurantName"
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
                  <div className="rounded-[1.25rem] border !border-[#dce6c1] bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="!mb-0">FSA suggestions</Label>
                      {fsaLoading && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Spinner size="sm" />
                          Checking matches...
                        </div>
                      )}
                    </div>
                    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                      {!fsaLoading &&
                        fsaOptions.map((option) => (
                          <button
                            key={option.fhrsId}
                            type="button"
                            onClick={() => applyFsaOption(option)}
                            className="flex w-full flex-col rounded-xl border border-transparent bg-[#fbfcf7] px-3 py-3 text-left hover:!border-[#dce6c1] hover:!bg-[#f6fbe9]"
                          >
                            <span className="text-sm font-semibold text-[#23411f]">
                              {option.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              FHRS {option.rating} · {option.addressLabel || option.postcode || 'No postcode'}
                            </span>
                          </button>
                        ))}
                      {!fsaLoading && fsaOptions.length === 0 && (
                        <p className="text-sm text-gray-500">
                          FSA suggestions will appear here once the restaurant name and postcode are available.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="restaurantTagline">Tagline</Label>
                    <span className="text-xs text-gray-500">{getTaglineWordCount(formData.tagline)}/7 words</span>
                  </div>
                  <TextInput
                    id="restaurantTagline"
                    value={formData.tagline}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        tagline: limitTaglineWords(event.target.value, 7)
                      }))
                    }
                    placeholder="Short, premium, memorable"
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantContact">Contact number</Label>
                  <TextInput
                    id="restaurantContact"
                    value={formData.contactNumber}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        contactNumber: event.target.value
                      }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantEmail">Email</Label>
                  <TextInput
                    id="restaurantEmail"
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        email: event.target.value
                      }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="restaurantWebsite">Website</Label>
                  <TextInput
                    id="restaurantWebsite"
                    value={formData.website}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        website: event.target.value
                      }))
                    }
                    onBlur={() =>
                      setFormData((current) => ({
                        ...current,
                        website: normalizeWebsiteUrl(current.website)
                      }))
                    }
                    placeholder="google.com or https://www.google.com"
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="restaurantDescription">Description</Label>
                  <Textarea
                    id="restaurantDescription"
                    rows={4}
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
              <div className="space-y-4 rounded-[1.5rem] border border-[#e4ebce] bg-[#fbfcf7] p-4">
                <div>
                  <p className="text-sm font-semibold text-[#23411f]">
                    Address intelligence
                  </p>
                  <p className="text-xs text-gray-500">
                    Search and hydrate the restaurant address using map lookup.
                  </p>
                </div>
                <AddressAutocomplete
                  value={addressSearch}
                  onChange={setAddressSearch}
                  onSelect={applyAddressDetails}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    placeholder="Address line 1"
                    value={formData.address.addressLine1}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        address: {
                          ...current.address,
                          addressLine1: event.target.value
                        }
                      }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                  <TextInput
                    placeholder="Address line 2"
                    value={formData.address.addressLine2}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        address: {
                          ...current.address,
                          addressLine2: event.target.value
                        }
                      }))
                    }
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                  <TextInput
                    placeholder="Area / locality"
                    value={formData.address.areaLocality}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        address: {
                          ...current.address,
                          areaLocality: event.target.value
                        }
                      }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                  <TextInput
                    placeholder="City"
                    value={formData.address.city}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        address: {
                          ...current.address,
                          city: event.target.value
                        }
                      }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                  <TextInput
                    placeholder="County / region"
                    value={formData.address.countyRegion}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        address: {
                          ...current.address,
                          countyRegion: event.target.value
                        }
                      }))
                    }
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                  <TextInput
                    placeholder="Postcode"
                    value={formData.address.postcode}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        address: {
                          ...current.address,
                          postcode: event.target.value
                        }
                      }))
                    }
                    required
                    className="focus:!border-[#8fa31e] focus:!ring-[#8fa31e]"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-[#e4ebce] bg-[#fbfcf7] p-4">
                <div>
                  <p className="text-sm font-semibold text-[#23411f]">
                    Compliance and ownership
                  </p>
                  <p className="text-xs text-gray-500">
                    Choose the restaurant owner and preview the live experience.
                  </p>
                </div>

                {currentUser?.role === 'superAdmin' && (
                  <SearchableAdminPicker
                    selectedAdmin={selectedAdmin}
                    selectedAdminId={selectedAdmin?._id}
                    fetchAdmins={fetchAvailableAdmins}
                    onSelect={(admin) => {
                      setSelectedAdmin(admin);
                      setFormData((current) => ({
                        ...current,
                        adminId: admin._id
                      }));
                    }}
                  />
                )}

                <div className="rounded-[1.25rem] border !border-[#dce6c1] bg-white p-4">
                  <p className="text-sm font-semibold text-[#23411f]">
                    Preview
                  </p>
                  <div className="mt-3">
                    <RestaurantPagePreview
                      formData={formData}
                      selectedAdmin={selectedAdmin}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button color="gray" onClick={resetModalState}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="!bg-[#8fa31e] hover:!!bg-[#78871c]"
                isProcessing={submitting}
                disabled={logoUploading || bannerUploading}
              >
                {modalMode === 'edit' ? 'Save restaurant' : 'Create restaurant'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      <DeleteConfirmModal
        show={Boolean(pendingDeleteRestaurant)}
        onClose={() => setPendingDeleteRestaurant(null)}
        onConfirm={() => handleDeleteRestaurant(pendingDeleteRestaurant)}
        title="Delete Restaurant"
        message={`Are you sure you want to delete "${pendingDeleteRestaurant?.name}"? This action cannot be undone.`}
        confirmText="Yes, Delete Restaurant"
      />
    </>
  );
}
