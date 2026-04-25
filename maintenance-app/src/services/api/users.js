import {usersMockData} from "../storage/users.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

// ─── API Methods ─────────────────────────────────────────────────────────────
function getAllUsers() {
    return [...usersMockData];
}

function getUserById(userId) {
    const all = getAllUsers();
    return all.find((user) => user.id === userId) || null;
}

function getUsersByStatus(status) {
    const all = getAllUsers();
    return all.filter((user) => user.status === status);
}

const UsersApi = {
    getAllUsers,
    getUserById,
    getUsersByStatus,
};

export { usersMockData };
export default UsersApi;
