// styles
import "semantic-ui-css/semantic.min.css";
import "./index.css";
// libs
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Link, Route, Routes, useParams } from "react-router-dom";
import { Grid, Menu } from "semantic-ui-react";

function DashboardMenu() {
  return (
    <Menu fluid inverted vertical borderless compact>
      <Menu.Item>
        <Menu.Header>Services</Menu.Header>
        <Menu.Menu>
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
      <h1>hi this is the home page</h1>
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" Component={Home} />
      <Route path="/sandbox" Component={Sandbox} />
      {/*<Route path="/services/kv" Component={KVDashboard} />*/}
      <Route path="/services/admin" element={<Admin />} />
      <Route path="/uploads/:hash" Component={Uploads} />
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
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
