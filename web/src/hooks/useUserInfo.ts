import { useState } from "react";

const mockData = {
    userName: "ziye",
    userType: 'user',
}

interface IUserInfo {
    userName: string;
    userType: string;
}

interface IProps {
    refresh?: boolean;
}

export default function useUserInfo(props?: IProps) {
    const [userInfo, setUserInfo] = useState<IUserInfo>(mockData);

    const changePassword = (oldPawssword: string) => {
        console.log(oldPawssword, 'oldPawssword', setUserInfo, props);
        return true;
    }
    return {
        userInfo, changePassword
    }
}