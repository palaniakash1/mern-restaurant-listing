import { FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
import logo from "../assets/eatwisely.ico";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";

export default function Header() {
  const [openDropdown, setOpenDropdown] = useState(false);
  const { currentUser } = useSelector((state) => state.user);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest(".dropdown-area")) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <header className="bg-green-100 shadow-md min-w-full flex flex-wrap justify-between px-7">
      <div className="flex flex-wrap justify-between items-center min-w-full mx-auto p-2">
        <Link to="/">
          <img
            src={logo}
            alt="Logo"
            className="w-[171px] h-[51px] object-cover"
          />
        </Link>
        <div className="flex gap-2 flex-wrap">
          <form className="bg-white p-2 rounded-md shadow-sm flex items-center gap-2">
            <input
              type="text"
              id="search-name"
              className="bg-transparent focus:outline-none w-24 sm:w-64"
              placeholder="search by restaurant..."
            />
            <FaSearch className="text-red-600" />
          </form>
          <form className="bg-white p-2 rounded-md shadow-sm flex items-center gap-2">
            <input
              type="text"
              id="search-location"
              className="bg-transparent focus:outline-none w-24 sm:w-64"
              placeholder="search by Location..."
            />
            <FaSearch className="text-red-600" />
          </form>
        </div>
        <ul className="flex gap-4 items-center">
          <Link to="/">
            <li className="hidden sm:block text-zinc hover:text-green-600 active:text-green-500 cursor-pointer">
              Home
            </li>
          </Link>
          <Link to="/about">
            <li className="hidden sm:block  text-zinc hover:text-green-600 active:text-green-500 cursor-pointer">
              About
            </li>
          </Link>

          {currentUser ? (
            <div className="relative dropdown-area">
              {/* avatar button */}
              <button
                onClick={() => setOpenDropdown((prev) => !prev)}
                className="flex items-center"
              >
                <img
                  src={currentUser.profilePicture}
                  alt={currentUser.userName}
                  className="w-10 h-10 rounded-full border cursor-pointer object-cover"
                />
              </button>
              {/* dropdown menu */}
              {openDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 shadow-lg border rounded-lg z-50">
                  {/* header */}
                  <div className="p-3 border-b dark:border-gray-700">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      @{currentUser.userName}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-300 truncate">
                      {currentUser.email}
                    </span>
                  </div>

                  {/* profile link */}
                  <Link
                    to="/dashboard?tab=profile"
                    onClick={() => setOpenDropdown(false)}
                  >
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      Profile
                    </div>
                  </Link>
                  {/* Divider */}
                  <div className="border-t dark:border-gray-700"></div>
                  <div
                    onClick={() => {
                      setOpenDropdown(false);
                      // handleSignout();
                    }}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    Sign out
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/sign-in">
              <button className="px-4 py-2 text-sm border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 transition">
                Sign In
              </button>
            </Link>
          )}
        </ul>
      </div>
    </header>
  );
}
