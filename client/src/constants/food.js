// Dietary vocabulary. Keep in sync with api/utils/food.js.
export const DIETS = [
  { value: 'veg', label: 'Veg' },
  { value: 'egg', label: 'Contains egg' },
  { value: 'nonveg', label: 'Non-veg' },
];

export const ALLERGENS = [
  { value: 'nuts', label: 'Nuts' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'soy', label: 'Soy' },
  { value: 'egg', label: 'Egg' },
  { value: 'sesame', label: 'Sesame' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
];

export const SORTS = [
  { value: 'sales', label: 'Best selling' },
  { value: 'rating', label: 'Top rated' },
  { value: 'createdAt', label: 'Newest' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'price', label: 'Price: high to low' },
];

export const dietLabel = (value) => DIETS.find((diet) => diet.value === value)?.label;
export const allergenLabel = (value) =>
  ALLERGENS.find((allergen) => allergen.value === value)?.label || value;

// Average rating to one decimal, or null when there are no reviews yet.
export const averageRating = (item) =>
  item.starNumber > 0 ? Math.round((item.totalStars / item.starNumber) * 10) / 10 : null;
