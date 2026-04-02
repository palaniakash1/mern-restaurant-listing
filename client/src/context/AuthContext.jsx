import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback
} from 'react';
import {
  signin,
  signout as apiSignout,
  signup,
  googleSignIn,
  validateSession
} from '../services/authService';
import { useState } from 'react';

/**
 * =============================================================================
 * AUTH CONTEXT - React Context for Authentication State
 * =============================================================================
 *
 * This provides a React-friendly way to access auth state and actions.
 * It works ALONGSIDE Redux (doesn't replace it).
 *
 * Benefits of having both Context + Redux:
 *
 * 1. Redux: Great for complex state, time-travel debugging, middleware
 * 2. Context: Great for simple prop-drilling replacement, lighter weight
 *
 * In this app, we use:
 * - Redux for: Persistent user state, loading states, error handling
 * - Context for: Quick access to user data without connect() or useSelector()
 *
 * Usage:
 *
 * // In components:
 * const { user, login, logout } = useAuth();
 *
 * // In App.jsx:
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */

// =============================================================================
// CONTEXT SETUP
// =============================================================================

const AuthContext = createContext(null);

// =============================================================================
// ACTION TYPES
// =============================================================================

const ACTIONS = {
  INIT: 'INIT',
  SIGNIN_START: 'SIGNIN_START',
  SIGNIN_SUCCESS: 'SIGNIN_SUCCESS',
  SIGNIN_FAILURE: 'SIGNIN_FAILURE',
  SIGNOUT: 'SIGNOUT',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// =============================================================================
// REDUCER - State Management
// =============================================================================

/**
 * The reducer handles all auth-related state updates.
 *
 * State Shape:
 * {
 *   user: Object | null - The authenticated user object
 *   role: string | null - User's role (user, admin, superAdmin, etc.)
 *   isAuthenticated: boolean - Quick check if user is logged in
 *   isLoading: boolean - For async operations
 *   error: string | null - Error message if any
 *   isInitialized: boolean - Has the auth system been initialized?
 * }
 */
const authReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.INIT:
      return {
        ...state,
        user: action.payload?.user || null,
        role: action.payload?.role || null,
        isAuthenticated: !!action.payload?.user,
        isLoading: false,
        isInitialized: true
      };

    case ACTIONS.SIGNIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case ACTIONS.SIGNIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        role: action.payload.role,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case ACTIONS.SIGNIN_FAILURE:
      return {
        ...state,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };

    case ACTIONS.SIGNOUT:
      return {
        ...state,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isInitialized: false
};

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // =============================================================================
  // SESSION RESTORATION ON APP LOAD
  // =============================================================================

  /**
   * When the app loads, we need to check if the user has a valid session.
   * This runs once on mount using a state initializer pattern.
   */
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const isAuthPage = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'].some(
      path => window.location.pathname.startsWith(path)
    );

    if (isAuthPage) {
      dispatch({ type: ACTIONS.INIT, payload: null });
      setInitialized(true);
      return;
    }

    validateSession()
      .then((sessionData) => {
        if (sessionData) {
          dispatch({
            type: ACTIONS.INIT,
            payload: {
              user: sessionData,
              role: sessionData.role || 'user'
            }
          });
        } else {
          dispatch({ type: ACTIONS.INIT, payload: null });
        }
      })
      .catch((error) => {
        console.error('Auth initialization failed:', error);
        dispatch({ type: ACTIONS.INIT, payload: null });
      })
      .finally(() => {
        setInitialized(true);
      });
  }, [initialized]);

  // =============================================================================
  // AUTH ACTIONS
  // =============================================================================

  /**
   * LOGIN ACTION
   *
   * Usage: await login(email, password)
   *
   * Flow:
   * 1. Dispatch SIGNIN_START (sets loading)
   * 2. Call API to authenticate
   * 3. On success: Dispatch SIGNIN_SUCCESS with user data
   * 4. On failure: Dispatch SIGNIN_FAILURE with error
   */
  const login = useCallback(async (email, password) => {
    dispatch({ type: ACTIONS.SIGNIN_START });

    try {
      const user = await signin(email, password);
      const role = user.role || user.userRole || 'user';

      dispatch({
        type: ACTIONS.SIGNIN_SUCCESS,
        payload: { user, role }
      });

      return { success: true, user };
    } catch (error) {
      dispatch({
        type: ACTIONS.SIGNIN_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * SIGNUP ACTION
   *
   * Usage: await signup({ userName, email, password })
   *
   * Note: Signup doesn't auto-login the user.
   * After signup, user is redirected to sign-in page.
   */
  const register = useCallback(async (userData) => {
    dispatch({ type: ACTIONS.SIGNIN_START });

    try {
      await signup(userData);
      dispatch({ type: ACTIONS.SIGNIN_FAILURE, payload: null });
      return { success: true };
    } catch (error) {
      dispatch({
        type: ACTIONS.SIGNIN_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * GOOGLE SIGNIN ACTION
   *
   * Usage: await loginWithGoogle({ name, email, googlePhotoUrl })
   */
  const loginWithGoogle = useCallback(async (googleData) => {
    dispatch({ type: ACTIONS.SIGNIN_START });

    try {
      const user = await googleSignIn(googleData);
      const role = user.role || user.userRole || 'user';

      dispatch({
        type: ACTIONS.SIGNIN_SUCCESS,
        payload: { user, role }
      });

      return { success: true, user };
    } catch (error) {
      dispatch({
        type: ACTIONS.SIGNIN_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * LOGOUT ACTION
   *
   * Usage: await logout()
   *
   * Flow:
   * 1. Call API to invalidate session
   * 2. Clear local state
   * 3. Redirect to sign-in page
   */
  const logout = useCallback(async () => {
    try {
      await apiSignout();
    } finally {
      dispatch({ type: ACTIONS.SIGNOUT });
      sessionStorage.setItem('isLoggingOut', 'true');
      window.location.href = '/sign-in';
    }
  }, []);

  /**
   * UPDATE USER ACTION
   *
   * Usage: updateUser(newUserData)
   *
   * Updates the user object in state.
   * Used after profile updates, etc.
   */
  const updateUser = useCallback(
    (userData) => {
      dispatch({
        type: ACTIONS.SIGNIN_SUCCESS,
        payload: {
          user: { ...state.user, ...userData },
          role: state.role
        }
      });
    },
    [state.user, state.role]
  );

  /**
   * CLEAR ERROR ACTION
   *
   * Usage: clearError()
   */
  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const value = {
    // State
    user: state.user,
    role: state.role,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    isInitialized: state.isInitialized,

    // Actions
    login,
    register,
    loginWithGoogle,
    logout,
    updateUser,
    clearError,

    // Helpers
    hasPermission: (permission) => {
      if (!state.user) return false;
      // This would check against ROLE_PERMISSIONS
      return true;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// CUSTOM HOOK - Easy access to auth context
// =============================================================================

/**
 * useAuth - Custom hook to access auth context
 *
 * Usage:
 *
 * const {
 *   user,           // User object or null
 *   role,           // User's role
 *   isAuthenticated,// Boolean
 *   isLoading,     // Boolean
 *   error,         // Error message or null
 *   login,         // Function
 *   logout,        // Function
 *   register,      // Function
 *   updateUser,    // Function
 *   clearError,    // Function
 * } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// =============================================================================
// NAMED EXPORTS
// =============================================================================

export { AuthContext };
export default AuthProvider;
