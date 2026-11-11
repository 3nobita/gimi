
document.addEventListener("DOMContentLoaded", () => {

    // MOBILE SIDEBAR
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");

    function closeSidebar() {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("show");
    }

    menuToggle?.addEventListener("click", () => {
        sidebar?.classList.toggle("open");
        overlay?.classList.toggle("show");
    });

    overlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSidebar();
    });

    // CURRENT DATE
    const dateElement = document.getElementById("currentDate");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // PAGINATION + SEARCH + FILTER
    const tableBody = document.getElementById("purchaseTableBody");
    const searchInput = document.getElementById("historySearch");
    const statusFilter = document.getElementById("statusFilter");
    const pageSizeSelect = document.getElementById("pageSize");
    const pagination = document.getElementById("pagination");
    const paginationInfo = document.getElementById("paginationInfo");
    const paginationFooter = document.getElementById("paginationFooter");
    const filterEmpty = document.getElementById("filterEmpty");
    const recordCount = document.getElementById("recordCount");
    const clearFilters = document.getElementById("clearFilters");

    if (!tableBody) return;

    const allRows = Array.from(tableBody.querySelectorAll(".purchase-row"));

    let currentPage = 1;
    let pageSize = Number(pageSizeSelect.value);

    function getFilteredRows() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;

        return allRows.filter(row => {
            const searchText = row.dataset.search || "";
            const status = row.dataset.status || "";

            const matchesSearch = searchText.includes(searchTerm);
            const matchesStatus = selectedStatus === "ALL" || status === selectedStatus;

            return matchesSearch && matchesStatus;
        });
    }

    function createPageButton(label, page, options = {}) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "page-btn";
        button.textContent = label;

        if (options.active) button.classList.add("active");

        button.disabled = Boolean(options.disabled);

        button.addEventListener("click", () => {
            currentPage = page;
            renderTable();
        });

        return button;
    }

    function renderPagination(totalPages) {
        pagination.innerHTML = "";

        if (totalPages <= 1) return;

        pagination.appendChild(
            createPageButton("‹", currentPage - 1, {
                disabled: currentPage === 1
            })
        );

        let pages = [];

        if (totalPages <= 5) {
            pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        } else if (currentPage <= 3) {
            pages = [1, 2, 3, 4, "...", totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
        }

        pages.forEach(page => {
            if (page === "...") {
                const dots = document.createElement("span");
                dots.className = "page-dots";
                dots.textContent = "...";
                pagination.appendChild(dots);
                return;
            }

            pagination.appendChild(
                createPageButton(String(page), page, {
                    active: currentPage === page
                })
            );
        });

        pagination.appendChild(
            createPageButton("›", currentPage + 1, {
                disabled: currentPage === totalPages
            })
        );
    }

    function renderTable() {
        const filteredRows = getFilteredRows();
        const totalRecords = filteredRows.length;
        const totalPages = Math.ceil(totalRecords / pageSize);

        if (totalPages > 0 && currentPage > totalPages) {
            currentPage = totalPages;
        }

        if (totalPages === 0) currentPage = 1;

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalRecords);

        allRows.forEach(row => {
            row.hidden = true;
        });

        filteredRows.slice(startIndex, endIndex).forEach(row => {
            row.hidden = false;
        });

        recordCount.textContent = totalRecords;

        paginationInfo.textContent = totalRecords === 0
            ? "No records found"
            : `Showing ${startIndex + 1}–${endIndex} of ${totalRecords} records`;

        filterEmpty.hidden = totalRecords !== 0;
        paginationFooter.hidden = totalRecords === 0 || allRows.length === 0;

        renderPagination(totalPages);
    }

    searchInput.addEventListener("input", () => {
        currentPage = 1;
        renderTable();
    });

    statusFilter.addEventListener("change", () => {
        currentPage = 1;
        renderTable();
    });

    pageSizeSelect.addEventListener("change", () => {
        pageSize = Number(pageSizeSelect.value);
        currentPage = 1;
        renderTable();
    });

    clearFilters?.addEventListener("click", () => {
        searchInput.value = "";
        statusFilter.value = "ALL";
        pageSizeSelect.value = "8";
        pageSize = 8;
        currentPage = 1;
        renderTable();
    });

    renderTable();
});
