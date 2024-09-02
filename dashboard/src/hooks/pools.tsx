import React, { useContext, useEffect, useState } from "react";

interface PoolDesc {
  label: string
  id: string
}

type PoolsListing = {
  data: 'loading'
} | {
  data: 'loaded'
  pools: PoolDesc[]
} | {
  data: 'error-loading'
  errorStr: string
}

const poolsListingContext = React.createContext<PoolsListing>({
  data: 'loading'
})

export function PoolsListingProvider({ children }: React.PropsWithChildren<{}>) {
  const [poolsListing, setPoolsListing] = useState<PoolsListing>({ data: 'loading' });
  const Provider = poolsListingContext.Provider;
  useEffect(() => {
    fetch('/api/v1/pools', {
      method: 'GET'
    })
      .then(res => {
        if (res.status !== 200) {
          setPoolsListing({
            data: 'error-loading',
            errorStr: `http error ${res.status}`
          })
        } else {
          return res.json().then(({ pools }) => {
            setPoolsListing({
              data: 'loaded',
              pools,

            })

          })
        }

      })
      .catch(e => {
        setPoolsListing({
          data: 'error-loading',
          errorStr: `${e}`
        })
      })

  }, [])
  return (
    <Provider value={poolsListing}>
      {children}
    </Provider>
  )
}

export function usePoolListing() {
  return useContext(poolsListingContext)
}


