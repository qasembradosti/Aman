import { useDispatch, useSelector } from 'react-redux';

// Custom hooks for easier Redux usage
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Specific selector hooks
export const useAuth = () => useAppSelector((state) => state.auth);
export const useProducts = () => useAppSelector((state) => state.products);
export const useCategories = () => useAppSelector((state) => state.categories);
export const useWallet = () => useAppSelector((state) => state.wallet);
