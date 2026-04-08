// fonts.js
import {
  Poppins_100Thin,
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular as Poppins_400,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';

import {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular as Inter_400,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

// Export a centralized font object
const fonts = {
  poppins: {
    thin: Poppins_100Thin,
    extraLight: Poppins_200ExtraLight,
    light: Poppins_300Light,
    regular: Poppins_400,
    medium: Poppins_500Medium,
    semiBold: Poppins_600SemiBold,
    bold: Poppins_700Bold,
    extraBold: Poppins_800ExtraBold,
    black: Poppins_900Black,
  },
  inter: {
    thin: Inter_100Thin,
    extraLight: Inter_200ExtraLight,
    light: Inter_300Light,
    regular: Inter_400,
    medium: Inter_500Medium,
    semiBold: Inter_600SemiBold,
    bold: Inter_700Bold,
    extraBold: Inter_800ExtraBold,
    black: Inter_900Black,
  },
};
export default fonts;