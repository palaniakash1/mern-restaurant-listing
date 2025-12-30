import { useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import DashSidebar from "../components/DashSidebar";
import DashProfile from "../components/DashProfile";
import { HiMenu, HiOutlineChevronLeft } from "react-icons/hi";

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(tabFromUrl);
    }
    setIsSidebarOpen(false);
  }, [location.search]);

  return (
    <div className="min-h-screen flex bg-[#F6FDEB]">
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. DESKTOP SIDEBAR: Always visible, takes up space, hidden on mobile */}
      <div className="hidden md:block w-64 h-screen sticky top-0">
        <DashSidebar />
      </div>

      {/* 2. MOBILE SIDEBAR: Floating overlay, hidden on PC */}
      <div className="md:hidden">
        {isSidebarOpen && (
          <>
            {/* Dark Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
            {/* Drawer Container */}
            <div className="fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 !rounded-none">
              <DashSidebar
                className="!rounded-none"
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* TOP BAR */}
        <div className="flex items-center gap-3 px-3 py-4 border-b-2 border-[#8fa31e]">
          {/* HAMBURGER (mobile only) */}
          <button
            className="md:hidden text-2xl"
            onClick={() => setIsSidebarOpen(true)}
          >
            <HiMenu />
          </button>

          {/* BACK + TAB */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 uppercase font-semibold text-[#556b2f]"
          >
            <HiOutlineChevronLeft className="text-xl" />
            {tab}
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 overflow-y-auto">
          {tab === "profile" && <DashProfile />}
          {/* other tabs */}
        </div>
      </div>
    </div>
  );
}
