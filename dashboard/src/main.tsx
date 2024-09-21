// styles
import "semantic-ui-css/semantic.min.css";
import "./index.css";
// libs
import ReactDOM from "react-dom/client";
import { HashRouter, Link, Route, Routes, useParams } from "react-router-dom";
import { Grid, Menu } from "semantic-ui-react";
import {
  UserStatusProvider,
  useUserName,
  useUserStatus,
} from "./hooks/userStatus";
import { Pools } from "./pages/pools";
import { RelayPage } from "./pages/relay";

function DashboardMenu() {
  return (
    <Menu fluid inverted vertical borderless compact>
      <Menu.Item>
        <Menu.Header>Services</Menu.Header>
        <Menu.Menu>
          <Menu.Item as={Link} to="/services/pools">
            Pools
          </Menu.Item>
          <Menu.Item as={Link} to="/services/kv">
            KV
          </Menu.Item>
          <Menu.Item as={Link} to="/sandbox">
            Sandbox
          </Menu.Item>
          <Menu.Item as={Link} to="/services/admin">
            Admin
          </Menu.Item>
        </Menu.Menu>
      </Menu.Item>
    </Menu>
  );
}

function Home() {
  return (
    <>
      <h1>hi {useUserName() || "..."}</h1>
    </>
  );
}

function Sandbox() {
  return (
    <>
      <h1>hi this the sandbox</h1>
    </>
  );
}

function Uploads() {
  const { hash } = useParams();
  return (
    <>
      <h1>hi this uploads... {hash}</h1>
    </>
  );
}

function PageNotFound() {
  return (
    <>
      <h1>404</h1>
    </>
  );
}

function Login() {
  return (
    <>
      <h1>Sign in</h1>
      <form action="/api/v1/login/password" method="post">
        <section>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            autoFocus
          />
        </section>
        <section>
          <label htmlFor="current-password">Password</label>
          <input
            id="current-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </section>
        <button type="submit">Sign in</button>
      </form>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" Component={Home} />
      <Route path="/services/pools" Component={Pools} />
      <Route path="/sandbox" Component={Sandbox} />
      <Route path="/login" Component={Login} />
      {/*<Route path="/services/kv" Component={KVDashboard} />*/}
      <Route path="/services/admin" element={<Admin />} />
      <Route path="/uploads/:hash" Component={Uploads} />
      <Route path="/relay" Component={RelayPage} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function Admin() {
  return (
    <div>
      <ul>
        <li></li>
        <li></li>
      </ul>
    </div>
  );
}

function App() {
  const userStatus = useUserStatus();

  if (userStatus.isLoading) {
    return <div>...</div>;
  }

  if (!userStatus.isLoggedIn) {
    return <Login />;
  }

  return (
    <>
      <HashRouter>
        <div className="app-sidebar">
          <DashboardMenu />
        </div>
        <div className="app-content">
          <Grid padded>
            <Grid.Row>
              <Grid.Column>
                <AppRoutes />
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
      </HashRouter>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <UserStatusProvider>
    <App />
  </UserStatusProvider>
);
