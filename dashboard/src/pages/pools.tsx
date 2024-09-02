import { PoolsListingProvider, usePoolListing } from "../hooks/pools";

function PoolsList() {
  const poolslisting = usePoolListing();

  if (poolslisting.data === "loading") {
    return <div>{"..."}</div>;
  }

  if (poolslisting.data === "error-loading") {
    return <div>{`Can't load pools: ${poolslisting.errorStr}`}</div>;
  }

  return (
    <>
      <pre>{JSON.stringify(poolslisting.pools, null, 2)}</pre>
    </>
  );
}

function CreatePool() {
  return (
    <>
      <input type="text"></input>
    </>
  );
}

export function Pools() {
  return (
    <>
      <PoolsListingProvider>
        <h1>pools</h1>
        <PoolsList />
      </PoolsListingProvider>
    </>
  );
}
