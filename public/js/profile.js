
document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");

    // Mobile Sidebar
    function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
    }

    menuToggle?.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
    });

    overlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSidebar();
    });

    // Current Year
    document.getElementById("currentYear").textContent =
        new Date().getFullYear();

    // Live Preview
    const fields = {
        shopName: {
            input: document.getElementById("shopName"),
            preview: document.getElementById("previewShopName")
        },
        area: {
            input: document.querySelector('[name="area"]'),
            preview: document.getElementById("previewArea")
        },
        contact: {
            input: document.querySelector('[name="contact_person"]'),
            preview: document.getElementById("previewContact")
        },
        phone: {
            input: document.querySelector('[name="contact_number"]'),
            preview: document.getElementById("previewPhone")
        },
        email: {
            input: document.querySelector('[name="email"]'),
            preview: document.getElementById("previewEmail")
        },
        address: {
            input: document.querySelector('[name="shop_address"]'),
            preview: document.getElementById("previewAddress")
        }
    };

    function getValue(input, fallback) {
        return input.value.trim() || fallback;
    }

    function updatePreview() {

        const name = getValue(fields.shopName.input, "Your Shop");

        fields.shopName.preview.textContent = name;

        document.getElementById("previewAvatar").textContent =
            name.charAt(0).toUpperCase();

        fields.area.preview.innerHTML =
            '<i class="fa-solid fa-location-dot"></i> ' +
            escapeHTML(getValue(fields.area.input, "Area not provided"));

        fields.contact.preview.textContent =
            getValue(fields.contact.input, "Not provided");

        fields.phone.preview.textContent =
            getValue(fields.phone.input, "Not provided");

        fields.email.preview.textContent =
            getValue(fields.email.input, "Not provided");

        fields.address.preview.textContent =
            getValue(fields.address.input, "Not provided");
    }

    function escapeHTML(value) {
        return value.replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    Object.values(fields).forEach(({ input }) => {
        input?.addEventListener("input", updatePreview);
    });

    // Google Maps Preview
    const googleLink = document.getElementById("googleLink");
    const previewMapLink = document.getElementById("previewMapLink");

    googleLink.addEventListener("input", () => {

        const value = googleLink.value.trim();

        try {
            const url = new URL(value);

            const isValidProtocol =
                url.protocol === "https:" || url.protocol === "http:";

            if (value && isValidProtocol) {
                previewMapLink.href = url.href;
                previewMapLink.style.display = "flex";
            } else {
                previewMapLink.style.display = "none";
            }

        } catch {
            previewMapLink.style.display = "none";
        }
    });

    // Form Submit Loading State
    const form = document.getElementById("profileForm");
    const saveButton = document.getElementById("saveButton");

    form.addEventListener("submit", () => {

        if (!form.checkValidity()) return;

        saveButton.disabled = true;

        saveButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Saving Changes...</span>
        `;
    });

    // Dismiss Alerts
    document.querySelectorAll(".alert-close").forEach(button => {
        button.addEventListener("click", () => {
            button.closest(".alert").remove();
        });
    });

    updatePreview();

});
