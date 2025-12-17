import React, { useEffect, useState } from "react";
import { Sidebar } from "flowbite-react";
import { HiArrowSmRight, HiUser, HiUsers } from "react-icons/hi";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { FaPizzaSlice } from "react-icons/fa";
import { MdFastfood } from "react-icons/md";
import { useDispatch } from "react-redux";
import { signOutSuccess } from "../redux/user/userSlice";

export default function DashSidebar() {
  const location = useLocation();
  const dispatch = useDispatch();
  const [tab, setTab] = useState("");
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
    w-full md:w-56 
    [&>div]:!bg-[#CC000120] 
    dark:[&>div]:!bg-[#CC000120]  
    [&>div]:!py-4 
    shadow-md rounded-r-xl
  "
    >
      <Sidebar.Items>
        <Sidebar.ItemGroup className="space-y-1">
          {/* PROFILE */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=profile"
            icon={HiUser}
            active={tab === "profile"}
            className={`
          rounded-lg transition-all duration-200 font-medium
          ${
            tab === "profile"
              ? "!bg-green-600 !text-white [&>a]:!text-white shadow-md"
              : "!text-white [&>a]:!text-white hover:bg-green-100 hover:!text-white [&>a:hover]:!text-green-700"
          }
        `}
          >
            Profile
          </Sidebar.Item>

          {/* USERS */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=users"
            icon={HiUsers}
            active={tab === "users"}
            className={`
          rounded-lg transition-all duration-200 font-medium
          ${
            tab === "users"
              ? "!bg-green-600 !text-white [&>a]:!text-white shadow-md"
              : "!text-white [&>a]:!text-white hover:bg-green-100 hover:!text-white [&>a:hover]:!text-green-700"
          }
        `}
          >
            Users
          </Sidebar.Item>

          {/* Categories */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=categories"
            icon={MdFastfood}
            active={tab === "categories"}
            className={`
          rounded-lg transition-all duration-200 font-medium
          ${
            tab === "categories"
              ? "!bg-green-600 !text-white [&>a]:!text-white shadow-md"
              : "!text-white [&>a]:!text-white hover:bg-green-100 hover:!text-white [&>a:hover]:!text-green-700"
          }
        `}
          >
            Categories
          </Sidebar.Item>

          {/* Foods */}
          <Sidebar.Item
            as={Link}
            to="/dashboard?tab=foods"
            icon={FaPizzaSlice}
            active={tab === "foods"}
            className={`
          rounded-lg transition-all duration-200 font-medium
          ${
            tab === "foods"
              ? "!bg-green-600 !text-white [&>a]:!text-white shadow-md"
              : "!text-white [&>a]:!text-white hover:bg-green-100 hover:!text-white [&>a:hover]:!text-green-700"
          }
        `}
          >
            Foods
          </Sidebar.Item>

          {/* SIGNOUT */}
          <Sidebar.Item
            icon={HiArrowSmRight}
            className="
          !text-[#CC0001] [&>a]:!text-white
          cursor-pointer 
          rounded-lg 
          transition-all 
          duration-200 
          hover:!bg-[#CC000120] 
          hover:text-red-600 
          [&>a:hover]:!text[#CC0001]
        "
            onClick={handleSignOut}
          >
            Signout
          </Sidebar.Item>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
