import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Explore from "./components/content/Explore";
import Live from "./components/content/Live";
import Contacts from "./components/content/Contacts";

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Explore />} />
        <Route path="projects" element={<Live />} />
        <Route path="contacts" element={<Contacts />} />
      </Route>
    </Routes>
  </BrowserRouter>
);