import { fetchAPI } from "@/services/FetchWrapper";
import { secureStorage } from "@/utils/secureStorage";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}
export default function useUserInteractor() {

    // const user = {
    //     id: 1,
    //     name: 'John Doe',
    //     email: 'john@adaptit.ca',
    //     role: 'admin',
    // };
    const [user, setUser] = useState<User | undefined>( undefined );
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const user = await secureStorage.getItem('baseUser');
            if (user) {
                const me = JSON.parse(user) as User;
                setUser(me);
                console.log('useUserInteractor useEffect userData:', me);
            }
            setIsLoading(false);
        })();
       
    }, []);

    const loginUser = async (userName:string, password:string) => {
        try{
            let fData = new FormData();
            fData.append('username', userName);
            fData.append('password', password);
            return fetchAPI('/', 'POST', fData)
        }
        catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
    return {
        user, loginUser
    }
}