import React, { createContext, ReactNode } from 'react';
import useUserInteractor from '@/hooks/useUserInteractor';

export const UsersContext = createContext<ReturnType<typeof useUserInteractor>>({} as ReturnType<typeof useUserInteractor>);


interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const userInteractor = useUserInteractor();

    return (
        <UsersContext.Provider value={userInteractor}>
            {children}
        </UsersContext.Provider>
    );
};