import { Link } from "react-router-dom";

export default function signUp() {
  return (
    <main className="min-h-[88vh] pt-4">
      <div className="p-3 max-w-lg mx-auto">
        <h1 className="text-3xl text-center font-bold my-5">Sign Up</h1>
        <form className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username.."
            id="username"
            className="border p-3 rounded-lg bg-white "
          />
          <input
            type="text"
            placeholder="Email.."
            id="email"
            className="border p-3 rounded-lg bg-white"
          />
          <input
            type="text"
            placeholder="Password.."
            id="password"
            className="border p-3 rounded-lg bg-white"
          />

          <button className="uppercase bg-orange-600 p-3 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-60">
            Sign up
          </button>
        </form>
        <div className="flex gap-2 mt-4">
          <p className="capitalize">having an account?</p>
          <Link to={"/sign-in"}><span className="text-blue-700 underline">Sign in</span> </Link>
        </div>
      </div>
    </main>
  );
}
