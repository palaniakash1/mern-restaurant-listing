import { FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-orange-100 shadow-md">
      <div className="flex flex-wrap justify-between items-center max-w-[1440px] mx-auto p-2">
        <Link to="/">
          <h1 className="text-lg sm:text-2xl font-bold flex flex-wrap ">
            <span className="text-orange-600">Menu</span>
            <span className="text-orange-500">Mapper</span>
          </h1>
        </Link>
        <div className="flex gap-2">
          <form className="bg-white p-2 rounded-md shadow-sm flex items-center gap-2">
            <input
              type="text"
              id="search-name"
              className="bg-transparent focus:outline-none w-24 sm:w-64"
              placeholder="search by restaurant..."
            />
            <FaSearch className="text-orange-600" />
          </form>
          <form className="bg-white p-2 rounded-md shadow-sm flex items-center gap-2">
            <input
              type="text"
              id="search-location"
              className="bg-transparent focus:outline-none w-24 sm:w-64"
              placeholder="search by Location..."
            />
            <FaSearch className="text-orange-600" />
          </form>
        </div>
        <ul className="flex gap-4">
          <Link to="/">
            <li className="hidden sm:inline text-zinc-900 hover:text-zinc-600 active:text-zinc-500">
              Home
            </li>
          </Link>
          <Link to="/about">
            <li className="hidden sm:inline  text-zinc-900 hover:text-zinc-600 active:text-zinc-500">
              About
            </li>
          </Link>
          <Link to="/sign-in">
            <li className="text-zinc-900 hover:text-zinc-600 active:text-zinc-500">
              Sign in
            </li>
          </Link>
        </ul>
      </div>
    </header>
  );
}
