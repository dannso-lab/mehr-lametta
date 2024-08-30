import React, { useContext, useEffect, useState } from "react";

type UserStatus = {
  isLoading: true
} | {
  isLoading: false;
  isLoggedIn: false;
} | {
  isLoading: false;
  isLoggedIn: true;
  name: string
}

const userStatusContext = React.createContext<UserStatus>({
  isLoading: true
})

export function UserStatusProvider({ children }: React.PropsWithChildren<{}>) {
  const [userStatus, setUserStatus] = useState<UserStatus>({ isLoading: true });
  const Provider = userStatusContext.Provider;
  useEffect(() => {
    fetch('/api/v1/login/whoami', {
      method: 'POST'
    })
      .then(res => {
        if (res.status === 404) {
          setUserStatus({
            isLoading: false,
            isLoggedIn: false
          })
        } else {

          return res.json().then(user => {
            setUserStatus({
              isLoading: false,
              isLoggedIn: true,
              name: user.name
            })

          })
        }

      })
      .catch(e => {
        console.log('e is:', e)
      })

  }, [])
  return (
    <Provider value={userStatus}>
      {children}
    </Provider>
  )
}

export function useUserStatus() {
  return useContext(userStatusContext)
}

export function useUserName(): string | undefined {
  const userStatus = useUserStatus();
  if (!userStatus.isLoading && userStatus.isLoggedIn) {
    return userStatus.name
  }
}

