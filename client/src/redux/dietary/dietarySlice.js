import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedDiet: null,
};

const dietarySlice = createSlice({
  name: "dietary",
  initialState,
  reducers: {
    setDietary: (state, action) => {
      state.selectedDiet = action.payload;
    },
    clearDietary: (state) => {
      state.selectedDiet = null;
    },
  },
});

export const { setDietary, clearDietary } = dietarySlice.actions;
export default dietarySlice.reducer;