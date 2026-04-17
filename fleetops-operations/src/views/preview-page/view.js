// API handler usage example
import UsersStorage from "../../services/api/users.js";

let clickHandler;

export function mount(rootElement) {
    const button = rootElement.querySelector("#home-action");
    const message = rootElement.querySelector("#home-message");

    if (!button || !message) {
        return;
    }

    clickHandler = () => {
        message.textContent = `Api test run at ${new Date().toLocaleTimeString()}.
        All users: ${JSON.stringify(UsersStorage.getAllUsersMockData())}
        User by ID (USR-1002): ${JSON.stringify(UsersStorage.getUserByIdMockData("USR-1002"))}
        Users by Status (active): ${JSON.stringify(UsersStorage.getUsersByStatusMockData("active"))}`;
    };

    button.addEventListener("click", clickHandler);
}

export function unmount(rootElement) {
    const button = rootElement.querySelector("#home-action");

    if (button && clickHandler) {
        button.removeEventListener("click", clickHandler);
    }

    clickHandler = null;
}
