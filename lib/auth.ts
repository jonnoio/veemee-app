import * as SecureStore from 'expo-secure-store';

export const getJWT = async () => {
  return await SecureStore.getItemAsync('veemee-jwt');
};

export const logout = async () => {
  await SecureStore.deleteItemAsync('veemee-jwt');
};

export const isLoggedIn = async () => {
  const token = await getJWT();
  return !!token;
};

