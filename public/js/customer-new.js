
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
        if (event.key === "Escape") closeSidebar();
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

    // Form fields
    const nameInput = document.getElementById("customerName");
    const mobileInput = document.getElementById("customerMobile");
    const emailInput = document.getElementById("customerEmail");
    const addressInput = document.getElementById("customerAddress");

    // Preview fields
    const previewName = document.getElementById("previewName");
    const previewInitial = document.getElementById("previewInitial");
    const previewMobile = document.getElementById("previewMobile");
    const previewEmail = document.getElementById("previewEmail");
    const previewAddress = document.getElementById("previewAddress");

    // Live customer preview
    function updatePreview() {

        const name = nameInput.value.trim();
        const mobile = mobileInput.value.trim();
        const email = emailInput.value.trim();
        const address = addressInput.value.trim();

        previewName.textContent = name || "Customer Name";

        previewInitial.textContent = name
            ? name.charAt(0).toUpperCase()
            : "?";

        previewMobile.textContent = mobile
            ? "+91 " + mobile
            : "Not provided";

        previewEmail.textContent = email || "Not provided";

        previewAddress.textContent = address || "Not provided";
    }

    [nameInput, mobileInput, emailInput, addressInput].forEach(input => {
        input.addEventListener("input", updatePreview);
    });

    // Allow only numeric mobile input
    mobileInput.addEventListener("input", () => {
        mobileInput.value = mobileInput.value
            .replace(/\D/g, "")
            .slice(0, 10);
    });

    // Form validation
    const customerForm = document.getElementById("customerForm");
    const submitButton = document.getElementById("submitButton");

    customerForm.addEventListener("submit", (event) => {

        const mobile = mobileInput.value.trim();

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            event.preventDefault();

            mobileInput.setCustomValidity(
                "Enter a valid 10-digit Indian mobile number."
            );

            mobileInput.reportValidity();
            mobileInput.setCustomValidity("");

            mobileInput.focus();
            return;
        }

        if (!customerForm.checkValidity()) {
            event.preventDefault();
            customerForm.reportValidity();
            return;
        }

        submitButton.disabled = true;

        submitButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving Customer...';
    });

    updatePreview();

});
