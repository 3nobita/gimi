
document.addEventListener("DOMContentLoaded", () => {

  // =====================================
  // MOBILE SIDEBAR
  // =====================================

  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const overlay = document.getElementById("sidebarOverlay");

  function closeSidebar() {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("active");
    document.body.style.overflow = "";
  }

  menuToggle?.addEventListener("click", () => {
    sidebar?.classList.add("open");
    overlay?.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  sidebarClose?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });


  // =====================================
  // BILL SEARCH
  // =====================================

  const searchInput = document.getElementById("billingSearch");
  const clearSearch = document.getElementById("clearSearch");
  const searchWrapper = document.querySelector(".search-input-wrapper");

  function updateSearchUI() {
    if (!searchInput || !searchWrapper) return;

    searchWrapper.classList.toggle(
      "has-value",
      searchInput.value.trim().length > 0
    );
  }

  searchInput?.addEventListener("input", updateSearchUI);

  clearSearch?.addEventListener("click", () => {
    searchInput.value = "";
    updateSearchUI();
    searchInput.focus();
  });

  updateSearchUI();


  // =====================================
  // NOTIFICATION MANAGEMENT
  // =====================================

  const notifications = document.querySelectorAll(".notification");

  notifications.forEach((notification) => {

    const closeButton = notification.querySelector(".notification-close");

    function dismissNotification() {
      notification.style.transition = "opacity .3s, transform .3s";
      notification.style.opacity = "0";
      notification.style.transform = "translateY(-8px)";

      setTimeout(() => {
        notification.remove();
      }, 300);
    }

    closeButton?.addEventListener("click", dismissNotification);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      if (notification.isConnected) {
        dismissNotification();
      }
    }, 6000);

  });


  // =====================================
  // TABLE ROW INTERACTION
  // =====================================

  const rows = document.querySelectorAll(".bill-row");

  rows.forEach((row) => {

    row.addEventListener("mouseenter", () => {
      row.style.position = "relative";
      row.style.zIndex = "1";
    });

    row.addEventListener("mouseleave", () => {
      row.style.zIndex = "0";
    });

  });


  // =====================================
  // CREATE BILL BUTTON FEEDBACK
  // =====================================

  const createBillButton = document.querySelector(".create-bill-btn");

  createBillButton?.addEventListener("mouseenter", () => {
    createBillButton.style.setProperty("--hover-state", "1");
  });

  // =====================================
  // INITIALIZATION
  // =====================================

  console.log("Nova Billing Dashboard Initialized");

});
