
document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");

    // Mobile sidebar
    function closeSidebar() {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("show");
    }

    menuToggle?.addEventListener("click", () => {
        sidebar?.classList.toggle("open");
        overlay?.classList.toggle("show");
    });

    overlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    // Current date
    const currentDate = document.getElementById("currentDate");

    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // Search input focus
    const customerSearch = document.getElementById("customerSearch");

    if (customerSearch && customerSearch.value) {
        customerSearch.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                customerSearch.value = "";
            }
        });
    }

    // Alert auto dismiss
    document.querySelectorAll(".alert").forEach((alert) => {

        setTimeout(() => {
            alert.style.transition = "opacity .4s ease, transform .4s ease";
            alert.style.opacity = "0";
            alert.style.transform = "translateY(-8px)";

            setTimeout(() => alert.remove(), 400);

        }, 6000);

    });

});
