import React, { useEffect, useState } from "react";
import { Sidebar } from "flowbite-react";
import { HiArrowSmRight, HiUser } from "react-icons/hi";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";

export default function DashSidebar() {
  const location = useLocation();
  const [tab, setTab] = useState("");
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(tabFromUrl);
    }
  }, [location.search]);

  return (
    <Sidebar className="w-full md:w-56">
      <Sidebar.Items>
        <Sidebar.ItemGroup>
          <Link to="/dashboard?tab=profile">
            <Sidebar.Item
              active={tab === "profile"}
              icon={HiUser}
              label={"User"}
              labelColor="dark"
              className=""
            >
              Profile
            </Sidebar.Item>
          </Link>
          <Sidebar.Item className="cursor-pointer" icon={HiArrowSmRight}>
            Signout
          </Sidebar.Item>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
