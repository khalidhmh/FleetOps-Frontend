export function mount(rootElement) {
    const view = rootElement || document;

    const submitBtn = view.querySelector(".submit-btn");
    const addNoteBtn = view.querySelector(".add-note-btn");
    const uploadProofBtn = view.querySelector(".upload-proof-btn");
    const proofInput = view.querySelector(".proof-upload-input");
    const noteContainer = view.querySelector(".note-container");

    if (submitBtn) {
        submitBtn.addEventListener("click", () => {
            alert("Reconciliation submitted successfully!");
        });
    }

    // Add Note Logic
    if (addNoteBtn && noteContainer) {
        addNoteBtn.addEventListener("click", () => {
            if (!view.querySelector(".driver-note-textarea")) {
                const textarea = document.createElement("textarea");
                textarea.className = "issue-textarea driver-note-textarea mt-2";
                textarea.placeholder = "Enter driver note here...";
                
                const saveBtn = document.createElement("button");
                saveBtn.className = "button primary btn-sm w-full mt-1";
                saveBtn.innerText = "Save Note";
                
                saveBtn.addEventListener("click", () => {
                    if (textarea.value.trim()) {
                        alert("Note saved!");
                        // Replace textarea with static text
                        const savedNote = document.createElement("p");
                        savedNote.className = "helper-text text-title mt-2";
                        savedNote.innerText = `Note: ${textarea.value}`;
                        noteContainer.innerHTML = "";
                        noteContainer.appendChild(savedNote);
                        addNoteBtn.innerText = "Edit Note";
                    } else {
                        textarea.remove();
                        saveBtn.remove();
                    }
                });

                noteContainer.innerHTML = "";
                noteContainer.appendChild(textarea);
                noteContainer.appendChild(saveBtn);
                textarea.focus();
            }
        });
    }

    // Upload Proof Logic
    if (uploadProofBtn && proofInput) {
        uploadProofBtn.addEventListener("click", () => {
            proofInput.click();
        });

        proofInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                alert(`File selected: ${file.name}`);
                uploadProofBtn.innerText = "Change Proof";
                uploadProofBtn.classList.remove("secondary");
                uploadProofBtn.classList.add("primary");
                
                // Show file name in the UI
                let fileLabel = view.querySelector(".uploaded-file-label");
                if (!fileLabel) {
                    fileLabel = document.createElement("span");
                    fileLabel.className = "helper-text text-success mt-1 uploaded-file-label";
                    noteContainer.appendChild(fileLabel);
                }
                fileLabel.innerText = `📎 ${file.name}`;
            }
        });
    }
}

export function unmount() {
}
