import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Table } from "flowbite-react";

export default function DashUsers() {
  const { currentUser } = useSelector((state) => state.user);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/user/all-users?page=${page}&limit=${limit}`,
          {
            credentials: "include",
          }
        );
        const data = await res.json();

        if (res.ok) {
          setUsers(data.data);
          setTotalPages(data.totalPages);
        }
      } catch (error) {
        console.log(error.message);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser.role === "superAdmin") {
      fetchUsers();
    }
  }, [currentUser?.role, page, limit]);

  const getPagination = (current, total) => {
    const pages = new Set();

    pages.add(1);
    pages.add(total);

    for (let i = current - 1; i <= current + 1; i++) {
      if (i > 1 && i < total) {
        pages.add(i);
      }
    }

    return [...pages].sort((a, b) => a - b);
  };
  return (
    <div className="">
      {/* DESKTOP / TABLET TABLE */}
      <div className="hidden md:block overflow-x-auto scrollbar scrollbar-track-emerald-200 scrollbar-thumb-emerald-400">
        <Table hoverable className="shadow-md bg-white min-w-[900px]">
          <Table.Head>
            <Table.HeadCell>Profile</Table.HeadCell>
            <Table.HeadCell>Username</Table.HeadCell>
            <Table.HeadCell>Email</Table.HeadCell>
            <Table.HeadCell>Role</Table.HeadCell>
            <Table.HeadCell>Edit</Table.HeadCell>
            <Table.HeadCell>Delete</Table.HeadCell>
          </Table.Head>

          <Table.Body className="divide-y">
            {users.map((user) => (
              <Table.Row key={user._id}>
                <Table.Cell>
                  <img
                    src={user.profilePicture}
                    alt={user.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </Table.Cell>

                <Table.Cell className="font-medium text-gray-900">
                  {user.userName}
                </Table.Cell>

                <Table.Cell>{user.email}</Table.Cell>

                <Table.Cell>
                  <span className="px-2 py-1 text-xs rounded bg-gray-100">
                    {user.role}
                  </span>
                </Table.Cell>

                <Table.Cell>
                  <button className="text-blue-600 hover:underline">
                    Edit ✏️
                  </button>
                </Table.Cell>

                <Table.Cell>
                  <button className="text-red-600 hover:underline">
                    Delete 🗑️
                  </button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {loading && (
          <p className="text-center py-6 text-gray-500 w-full bg-white">Loading users...</p>
        )}
        {/* ADVANCED PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
            {/* PREV */}
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className={`
        px-4 py-2 rounded-md border text-sm font-medium
        transition-all
        ${
          page === 1
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-[#CC0001]"
        }
      `}
            >
              &lt; Prev
            </button>

            {/* PAGE NUMBERS */}
            {getPagination(page, totalPages).map((p, index, arr) => {
              const prev = arr[index - 1];

              return (
                <React.Fragment key={p}>
                  {/* DOTS */}
                  {prev && p - prev > 1 && (
                    <span className="px-2 text-gray-400 select-none">…</span>
                  )}

                  {/* PAGE BUTTON */}
                  <button
                    onClick={() => setPage(p)}
                    className={`
              w-10 h-10 rounded-md flex items-center justify-center
              text-sm font-semibold transition-all
              ${
                page === p
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white border hover:bg-gray-100"
              }
            `}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

            {/* NEXT */}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={`
        px-4 py-2 rounded-md border text-sm font-medium
        transition-all
        ${
          page === totalPages
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-[#CC0001]"
        }
      `}
            >
              Next &gt;
            </button>
          </div>
        )}
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden flex flex-col gap-4">
        {loading && (
          <p className="text-center py-6 text-gray-500">Loading users...</p>
        )}
        {users.map((user) => (
          <div
            key={user._id}
            className="bg-white rounded-lg shadow-md p-4 flex gap-4 items-start"
          >
            <img
              src={user.profilePicture}
              alt={user.userName}
              className="w-12 h-12 rounded-full object-cover"
            />

            <div className="flex-1 space-y-1">
              <p className="font-semibold text-gray-900">{user.userName}</p>
              <p className="text-sm text-gray-600">{user.email}</p>

              <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100">
                {user.role}
              </span>

              <div className="flex gap-4 mt-3">
                <button className="text-blue-600 text-sm">✏️ Edit</button>
                <button className="text-red-600 text-sm">🗑️ Delete</button>
              </div>
            </div>
          </div>
        ))}
        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`px-3 py-1 border rounded ${
                    page === pageNumber
                      ? "bg-emerald-500 text-white"
                      : "bg-white"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
