
document.addEventListener("DOMContentLoaded", () => {

    // Mobile Sidebar
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");

    function openSidebar() {
        sidebar?.classList.add("open");
        overlay?.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("show");
        document.body.style.overflow = "";
    }

    menuToggle?.addEventListener("click", () => {
        if (sidebar?.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSidebar();
    });

    // Current Date
    const currentDate = document.getElementById("currentDate");

    if (currentDate) {
        currentDate.textContent = new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(new Date());
    }

    // Alert Close
    document.querySelectorAll(".alert-close").forEach(button => {
        button.addEventListener("click", () => {
            button.closest(".alert")?.remove();
        });
    });

    // Search products currently displayed on the page
    const searchInput = document.getElementById("tableSearch");
    const productRows = document.querySelectorAll(".product-row");
    const noSearchResults = document.getElementById("noSearchResults");

    searchInput?.addEventListener("input", () => {
        const searchValue = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;

        productRows.forEach(row => {
            const name = (row.dataset.name || "").toLowerCase();
            const category = (row.dataset.category || "").toLowerCase();

            const matches = name.includes(searchValue) ||
                            category.includes(searchValue);

            row.style.display = matches ? "" : "none";

            if (matches) visibleCount++;
        });

        if (noSearchResults) {
            noSearchResults.style.display =
                visibleCount === 0 && productRows.length > 0 ? "" : "none";
        }
    });

    // Status select visual feedback
    document.querySelectorAll(".status-select").forEach(select => {
        select.addEventListener("change", () => {
            select.disabled = true;
            select.style.opacity = "0.6";
        });
    });

});
