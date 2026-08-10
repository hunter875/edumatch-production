// This component has been deprecated. Use auth hooks from @/lib/auth instead.
import React from 'react';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export default AuthGuard;
