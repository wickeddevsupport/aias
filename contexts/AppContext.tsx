
import React, { createContext, useReducer, Dispatch, ReactNode, useEffect } from 'react';
import { AppState, AppAction } from '../types'; // Types remain central
import { initialState } from './initialState'; // Import initial state
import { appReducer } from './appReducer'; // Import the main reducer

// Create Context
export const AppContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction>; }>({
  state: initialState,
  dispatch: () => null, // Placeholder dispatch
});


// Context Provider Component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Optional: Log state updates for debugging
  // useEffect(() => {
  //   console.log("AppContext State Updated:", state);
  // }, [state]);


  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
