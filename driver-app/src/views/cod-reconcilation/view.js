import CodStorage from "../../services/api/cod.js";

export async function mount(rootElement) {
    const view = rootElement || document;

    const submitBtn = view.querySelector(".submit-btn");
    const addNoteBtn = view.querySelector(".add-note-btn");
    const uploadProofBtn = view.querySelector(".upload-proof-btn");
    const proofInput = view.querySelector(".proof-upload-input");
    const noteContainer = view.querySelector(".note-container");

    // UI Elements for mapping
    const summaryCards = view.querySelectorAll(".summary-grid .card");
    const totalExpectedAmount = summaryCards[0]?.querySelector(".stat-value");
    const totalExpectedCount = summaryCards[0]?.querySelector(".helper-text");
    const totalCollectedAmount = summaryCards[1]?.querySelector(".stat-value");
    const totalCollectedCount = summaryCards[1]?.querySelector(".helper-text");
    
    const discrepancyCard = view.querySelector(".discrepancy-card");
    const discrepancyAmount = discrepancyCard?.querySelector(".stat-value");
    
    const alertCard = view.querySelector(".alert-card");
    const tableBody = view.querySelector(".table-body");

    const routeSpans = view.querySelectorAll("header .helper-text .text-title");
    const dateEl = routeSpans[0];
    const routeIdEl = routeSpans[1];

    // Fetch and map data
    try {
        const routeId = localStorage.getItem('activeRouteId') || new URLSearchParams(window.location.search).get('routeId') || '1';
        
        if (dateEl) dateEl.innerText = new Date().toLocaleDateString();
        if (routeIdEl) routeIdEl.innerText = routeId;

        const data = await CodStorage.getReconciliationSummary(routeId);
        
        if (data && data.summary) {
            if (totalExpectedAmount) totalExpectedAmount.innerText = `$${parseFloat(data.summary.total_expected || 0).toFixed(2)}`;
            if (totalExpectedCount) totalExpectedCount.innerText = `${data.summary.expected_delivery_count || 0} deliveries`;
            
            if (totalCollectedAmount) totalCollectedAmount.innerText = `$${parseFloat(data.summary.total_collected || 0).toFixed(2)}`;
            if (totalCollectedCount) totalCollectedCount.innerText = `${data.summary.validated_count || 0} validated deliveries`;
            
            const discrepancy = parseFloat(data.summary.discrepancy || 0);
            if (discrepancy !== 0) {
                if (discrepancyCard) {
                    discrepancyCard.style.display = 'flex';
                    if (discrepancyAmount) discrepancyAmount.innerText = `-$${Math.abs(discrepancy).toFixed(2)}`;
                }
                if (alertCard) alertCard.style.display = 'flex';
            } else {
                if (discrepancyCard) discrepancyCard.style.display = 'none';
                if (alertCard) alertCard.style.display = 'none';
            }
        }
        
        if (data && data.orders && data.orders.length > 0) {
            if (tableBody) {
                tableBody.innerHTML = "";
                data.orders.forEach((order, index) => {
                    const isLast = index === data.orders.length - 1;
                    const row = document.createElement("div");
                    row.className = `row table-row ${isLast ? 'table-row--last' : ''}`;
                    row.innerHTML = `
                        <span class="helper-text col-id order-id">${order.order_id || 'ORD-N/A'}</span>
                        <span class="helper-text col-name">${order.customer_name || 'Customer'}</span>
                        <span class="helper-text col-amt text-right">$${parseFloat(order.expected_amount || 0).toFixed(2)}</span>
                    `;
                    tableBody.appendChild(row);
                });
            }
        } else {
            // Empty state
            if (tableBody) {
                tableBody.innerHTML = `<p class="helper-text text-center mt-4 mb-4" style="width: 100%;">no orders</p>`;
            }
            if (totalExpectedAmount) totalExpectedAmount.innerText = `$0.00`;
            if (totalExpectedCount) totalExpectedCount.innerText = `0 deliveries`;
            if (totalCollectedAmount) totalCollectedAmount.innerText = `$0.00`;
            if (totalCollectedCount) totalCollectedCount.innerText = `0 validated deliveries`;
            
            if (discrepancyCard) discrepancyCard.style.display = 'none';
            if (alertCard) alertCard.style.display = 'none';
        }
    } catch (error) {
        console.error("Failed to load reconciliation data:", error);
        if (tableBody) {
            tableBody.innerHTML = `<p class="helper-text text-danger text-center mt-4 mb-4" style="width: 100%;">Failed to load reconciliation data: ${error.message || "Network Error"}</p>`;
        }
        if (totalExpectedAmount) totalExpectedAmount.innerText = `$0.00`;
        if (totalExpectedCount) totalExpectedCount.innerText = `0 deliveries`;
        if (totalCollectedAmount) totalCollectedAmount.innerText = `$0.00`;
        if (totalCollectedCount) totalCollectedCount.innerText = `0 validated deliveries`;
        
        if (discrepancyCard) discrepancyCard.style.display = 'none';
        if (alertCard) alertCard.style.display = 'none';
    }

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
