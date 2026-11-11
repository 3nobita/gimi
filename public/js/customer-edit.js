
document.addEventListener("DOMContentLoaded", () => {

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

    // Current date
    const dateElement = document.getElementById("currentDate");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // Live customer preview
    const nameInput = document.getElementById("customerName");
    const mobileInput = document.getElementById("customerMobile");
    const emailInput = document.getElementById("customerEmail");
    const addressInput = document.getElementById("customerAddress");

    const previewName = document.getElementById("previewName");
    const previewInitial = document.getElementById("previewInitial");
    const previewMobile = document.getElementById("previewMobile");
    const previewEmail = document.getElementById("previewEmail");
    const previewAddress = document.getElementById("previewAddress");

    nameInput?.addEventListener("input", () => {
        const name = nameInput.value.trim();

        previewName.textContent = name || "Customer Name";
        previewInitial.textContent = name ? name.charAt(0).toUpperCase() : "C";
    });

    mobileInput?.addEventListener("input", () => {
        mobileInput.value = mobileInput.value.replace(/\D/g, "").slice(0, 10);
        previewMobile.textContent = mobileInput.value || "Not provided";
    });

    emailInput?.addEventListener("input", () => {
        previewEmail.textContent = emailInput.value.trim() || "Not provided";
    });

    addressInput?.addEventListener("input", () => {
        previewAddress.textContent = addressInput.value.trim() || "Not provided";
    });

    // Alert close
    document.querySelector(".alert-close")?.addEventListener("click", () => {
        document.querySelector(".alert")?.remove();
    });

    // Form submit
    const form = document.getElementById("customerForm");
    const submitButton = document.getElementById("submitButton");

    form?.addEventListener("submit", (e) => {
        const mobile = mobileInput.value.trim();

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            e.preventDefault();
            mobileInput.focus();
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    });

});
