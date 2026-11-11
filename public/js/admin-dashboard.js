
document.addEventListener("DOMContentLoaded", () => {

    // Mobile Sidebar
    const sidebar = document.getElementById("adminSidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");

    function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
    }

    menuToggle?.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
    });

    overlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    // Current Date
    const dateElement = document.getElementById("currentDate");

    dateElement.textContent = new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date());

    // Current Year
    document.getElementById("currentYear").textContent =
        new Date().getFullYear();

});
