import { useEffect, useState } from "react";
import { Sidebar } from "flowbite-react";
import { HiX } from "react-icons/hi";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import logo from "../assets/eatwisely.ico";
import { LuLayoutDashboard } from "react-icons/lu";
import { CgProfile } from "react-icons/cg";
import { TbUsers } from "react-icons/tb";
import { PiBuildingApartment } from "react-icons/pi";
import { MdOutlineFastfood } from "react-icons/md";
import { BiFoodMenu } from "react-icons/bi";
import { VscSignOut } from "react-icons/vsc";
import { MdOutlineReviews } from "react-icons/md";
import { useAuth } from "../context/AuthContext";

export default function DashSidebar({ onClose }) {
  const { user: currentUser, logout } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState("");

  const getItemClass = (itemTab) => `
    w-full !rounded-none transition-all duration-200
    ${
      tab === itemTab
        ? "!bg-red-700 !text-white"
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
      await logout();
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
            icon={() => <LuLayoutDashboard className="text-white text-xl" />}
            className={getItemClass("dashboard")}
          >
            Dashboard
          </Sidebar.Item>
          {/* PROFILE */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=profile"
            active={tab === "profile"}
            label={currentUser.role}
            labelColor="red"
            icon={() => <CgProfile className="text-white text-xl" />}
            className={getItemClass("profile")}
          >
            Profile
          </Sidebar.Item>
          {/* users */}
          {currentUser?.role === "superAdmin" && (
            <Sidebar.Item
              as={Link}
              to="/dashboard?tab=users"
              icon={() => <TbUsers className="text-white text-xl" />}
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
              icon={() => (
                <PiBuildingApartment className="text-white text-xl" />
              )}
              active={tab === "restaurants"}
              className={getItemClass("restaurants")}
            >
              Restaurants
            </Sidebar.Item>
          )}
          {/* Categories */}
          {["superAdmin", "admin", "storeManager"].includes(
            currentUser?.role,
          ) && (
            <Sidebar.Item
              as={Link}
              to="/dashboard?tab=categories"
              icon={() => <MdOutlineFastfood className="text-white text-xl" />}
              active={tab === "categories"}
              className={getItemClass("categories")}
            >
              Categories
            </Sidebar.Item>
          )}
          {/* menu */}
          {["superAdmin", "admin", "storeManager"].includes(
            currentUser?.role,
          ) && (
            <Sidebar.Item
              as={Link}
              to="/dashboard?tab=menu"
              icon={() => <BiFoodMenu className="text-white text-xl" />}
              active={tab === "menu"}
              className={getItemClass("menu")}
            >
              Menu
            </Sidebar.Item>
          )}
          {/* reviews */}
          {["superAdmin", "admin", "storeManager", "user"].includes(
            currentUser?.role,
          ) && (
            <Sidebar.Item
              as={Link}
              to="/dashboard?tab=reviews"
              icon={() => <MdOutlineReviews className="text-white text-xl" />}
              active={tab === "reviews"}
              className={getItemClass("reviews")}
            >
              Reviews
            </Sidebar.Item>
          )}
          <div className="border-t border-white/20 mt-4 pt-4">
            <Sidebar.Item
              icon={() => (
                <VscSignOut className="text-red-500 text-2xl group-hover:text-white" />
              )}
              className="group !rounded-none !text-white hover:!bg-red-600 cursor-pointer"
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
