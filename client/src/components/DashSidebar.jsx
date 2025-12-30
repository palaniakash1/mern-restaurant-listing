import React, { useEffect, useState } from "react";
import { Sidebar } from "flowbite-react";
import { HiOutlineLogout, HiUser, HiX, HiUsers, HiHome } from "react-icons/hi";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { FaPizzaSlice } from "react-icons/fa";
import { MdApartment, MdBuild, MdFastfood } from "react-icons/md";
import { useDispatch } from "react-redux";
import { signOutSuccess } from "../redux/user/userSlice";
import { useSelector } from "react-redux";
import logo from "../assets/eatwisely.ico";

export default function DashSidebar({ onClose }) {
  const { currentUser } = useSelector((state) => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const [tab, setTab] = useState("");

  // Helper function to handle repeated styles
  const getItemClass = (itemTab) => `
    w-full !rounded-none transition-all duration-200
    ${
      tab === itemTab
        ? "!bg-red-600 !text-white"
        : "bg-transparent !text-white hover:!bg-red-600 hover:!text-white"
    }
  `;

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(tabFromUrl);
    }
  }, [location.search]);

  const handleSignOut = async () => {
    try {
      const res = await fetch(`/api/user/signout`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(data.message);
      } else {
        dispatch(signOutSuccess());
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Sidebar
      className="
        w-64 h-full
        shadow-md [&>div]:bg-[#8fa31e] [&>div]:p-0 [&>div]:rounded-none"
    >
      {/* ================= HEADER ================= */}
      {/* This gives identity + control */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-white/20 ">
        {/* LOGO / BRAND */}
        <Link to="/">
          <img
            src={logo}
            alt="Logo"
            className="w-[110px] h-auto object-contain"
          />
        </Link>

        {/* CLOSE BUTTON — MOBILE ONLY */}
        {/* On desktop sidebar is persistent, so no close button */}
        <button
          onClick={onClose}
          className="md:hidden text-white text-2xl hover:text-red-500"
        >
          <HiX />
        </button>
      </div>

      <Sidebar.Items className="mt-4">
        <Sidebar.ItemGroup className="flex flex-col gap-1">
          {/* Dashboard */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=dashboard"
            active={tab === "dashboard"}
            icon={() => <HiHome className="text-white text-xl" />}
            className={getItemClass("dashboard")}
          >
            Dashboard
          </Sidebar.Item>

          {/* PROFILE */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=profile"
            active={tab === "profile"}
            icon={() => <HiUser className="text-white text-xl" />}
            className={getItemClass("profile")}
          >
            Profile
          </Sidebar.Item>

          {/* users */}
          {currentUser?.role === "superAdmin" && (
            <Sidebar.Item
              as={Link}
              to="/dashboard?tab=users"
              icon={() => <HiUsers className="text-white text-xl" />}
              active={tab === "users"}
              className={getItemClass("users")}
            >
              Users
            </Sidebar.Item>
          )}

          {/* restaurants */}
          {["superAdmin", "admin"].includes(currentUser?.role) && (
            <Sidebar.Item
              as={Link}
              to="/dashboard?tab=restaurants"
              icon={() => <MdApartment className="text-white text-xl" />}
              active={tab === "restaurants"}
              className={getItemClass("restaurants")}
            >
              Restaurants
            </Sidebar.Item>
          )}

          {/* Categories */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=categories"
            icon={() => <MdFastfood className="text-white text-xl" />}
            active={tab === "categories"}
            className={getItemClass("categories")}
          >
            Categories
          </Sidebar.Item>
          {/* menu */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=menu"
            icon={() => <FaPizzaSlice className="text-white text-xl" />}
            active={tab === "menu"}
            className={getItemClass("menu")}
          >
            Menu
          </Sidebar.Item>
          <div className="border-t border-white/20 mt-4 pt-4">
            <Sidebar.Item
              icon={() => (
                <HiOutlineLogout className="text-red-500 hover:!text-white text-2xl" />
              )}
              className="!rounded-none !text-white hover:!bg-red-600 cursor-pointer"
              onClick={() => {
                handleSignOut();
              }}
            >
              Signout
            </Sidebar.Item>
          </div>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
