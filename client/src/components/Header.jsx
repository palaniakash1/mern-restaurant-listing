import { FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
import logo from "../assets/eatwisely.ico";


export default function Header() {
  return (
    <header className="bg-green-100 shadow-md">
      <div className="flex flex-wrap justify-between items-center max-w-[1440px] mx-auto p-2">
        <Link to="/">
          <img
            src={logo}
            alt="Logo"
            className="w-[171px] h-[51px] object-cover"
          />
        </Link>
        <div className="flex gap-2">
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
        <ul className="flex gap-4">
          <Link to="/">
            <li className="hidden sm:inline text-zinc hover:text-green-600 active:text-green-500">
              Home
            </li>
          </Link>
          <Link to="/about">
            <li className="hidden sm:inline  text-zinc hover:text-green-600 active:text-green-500">
              About
            </li>
          </Link>
          <Link to="/sign-in">
            <li className="text-zinc hover:text-green-600 active:text-green-500">
              Sign in
            </li>
          </Link>
        </ul>
      </div>
    </header>
  );
}
