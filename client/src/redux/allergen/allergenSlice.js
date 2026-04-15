import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedAllergens: [],
};

const allergenSlice = createSlice({
  name: "allergen",
  initialState,
  reducers: {
    toggleAllergen: (state, action) => {
      const allergenId = action.payload;
      if (state.selectedAllergens.includes(allergenId)) {
        state.selectedAllergens = state.selectedAllergens.filter((id) => id !== allergenId);
      } else {
        state.selectedAllergens.push(allergenId);
      }
    },
    clearAllergens: (state) => {
      state.selectedAllergens = [];
    },
    setAllergens: (state, action) => {
      state.selectedAllergens = action.payload;
    },
  },
});

export const { toggleAllergen, clearAllergens, setAllergens } = allergenSlice.actions;
export default allergenSlice.reducer;
