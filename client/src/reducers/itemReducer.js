export const INITIAL_STATE = {
  title: '',
  cat: '',
  cover: '',
  images: [],
  desc: '',
  shortTitle: '',
  shortDesc: '',
  deliveryTime: 0,
  features: [],
  price: 0,
  diet: '',
  allergens: [],
};

export const itemReducer = (state, action) => {
  switch (action.type) {
    case 'CHANGE_INPUT':
      return {
        ...state,
        [action.payload.name]: action.payload.value,
      };
    case 'ADD_IMAGES':
      return {
        ...state,
        cover: action.payload.cover,
        images: action.payload.images,
      };
    case 'ADD_FEATURE':
      return {
        ...state,
        features: [...state.features, action.payload],
      };
    case 'TOGGLE_ALLERGEN':
      return {
        ...state,
        allergens: state.allergens.includes(action.payload)
          ? state.allergens.filter((allergen) => allergen !== action.payload)
          : [...state.allergens, action.payload],
      };
    case 'REMOVE_FEATURE':
      return {
        ...state,
        features: state.features.filter((feature) => feature !== action.payload),
      };

    default:
      return state;
  }
};
