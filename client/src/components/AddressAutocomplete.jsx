import { useEffect, useState } from "react";
import { Spinner } from "flowbite-react";

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  disabled = false,
  placeholder = "Search address or postcode",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (disabled || !value || value.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(value.trim())}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch address suggestions");
        }

        setSuggestions(data.data || []);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [disabled, value]);

  const handleSelect = async (suggestion) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/places/details/${suggestion.placeId}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch place details");
      }

      setSuggestions([]);
      onSelect?.(data.data, suggestion);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#8fa31e] focus:outline-none focus:ring-2 focus:ring-[#8fa31e] disabled:bg-gray-100"
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" />
          Searching saved map suggestions...
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {suggestions.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="flex w-full flex-col border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:!bg-[#f6fdeb]"
            >
              <span className="text-sm font-semibold text-gray-800">
                {suggestion.structuredFormat?.mainText || suggestion.description}
              </span>
              <span className="text-xs text-gray-500">
                {suggestion.structuredFormat?.secondaryText || suggestion.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
