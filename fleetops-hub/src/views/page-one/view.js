let clickHandler;
let counter = 0;

export function mount(rootElement) {
    const button = rootElement.querySelector("#page-one-increase");
    const label = rootElement.querySelector("#page-one-counter-label");

    if (!button || !label) {
        return;
    }

    counter = 0;
    label.textContent = `Counter: ${counter}`;

    clickHandler = () => {
        counter += 1;
        label.textContent = `Counter: ${counter}`;
    };

    button.addEventListener("click", clickHandler);
}

export function unmount(rootElement) {
    const button = rootElement.querySelector("#page-one-increase");

    if (button && clickHandler) {
        button.removeEventListener("click", clickHandler);
    }

    clickHandler = null;
}
