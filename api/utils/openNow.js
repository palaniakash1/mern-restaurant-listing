export const isRestaurantOpen = (openingHours) => {
  if (!openingHours) return false;

  const now = new Date();
  const day = now
    .toLocaleDateString("en-us", { weekday: "long" })
    .toLowerCase();

  const today = openingHours[day];

  if (!today || today.isClosed) return false;

  const currentTime =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  return currentTime >= today.open && currentTime <= today.close;
};
