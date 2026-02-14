import React from 'react';

// Context for managing the create modal state across the app
export const CreateModalContext = React.createContext({
  openModal: () => {},
});
