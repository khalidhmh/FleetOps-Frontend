import api from "/shared/api-handler.js";
import {usersMockData} from "../storage/users.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:3000");

// ─── API Methods ─────────────────────────────────────────────────────────────
function getAllUsersMockData() {
    return [...usersMockData];
}

function getUserByIdMockData(userId) {
    return usersMockData.find((user) => user.id === userId) || null;
}

function getUsersByStatusMockData(status) {
    return usersMockData.filter((user) => user.status === status);
}

const UsersStorage = {
    getAllUsersMockData,
    getUserByIdMockData,
    getUsersByStatusMockData,
};

export { usersMockData };
export default UsersStorage;
