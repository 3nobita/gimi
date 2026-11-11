
document.addEventListener("DOMContentLoaded", () => {

    const get = (id) => document.getElementById(id);

    // Current year
    if (get("currentYear")) {
        get("currentYear").textContent = new Date().getFullYear();
    }

    // Password visibility
    const passwordInput = get("password");
    const togglePassword = get("togglePassword");

    togglePassword?.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        togglePassword.innerHTML = isPassword
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';
    });

    // Live preview configuration
    const previewFields = [
        {
            input: "shopName",
            preview: "previewShopName",
            fallback: "Your Shop Name"
        },
        {
            input: "area",
            preview: "previewArea",
            fallback: "Shop Location"
        },
        {
            input: "shopNo",
            preview: "previewShopNo",
            fallback: "Not assigned"
        },
        {
            input: "contactPerson",
            preview: "previewContact",
            fallback: "Not provided"
        },
        {
            input: "contactNumber",
            preview: "previewMobile",
            fallback: "Not provided"
        },
        {
            input: "loginId",
            preview: "previewLogin",
            fallback: "Not created"
        }
    ];

    function updatePreview() {
        previewFields.forEach((field) => {
            const input = get(field.input);
            const preview = get(field.preview);

            if (!input || !preview) return;

            preview.textContent = input.value.trim() || field.fallback;
        });

        const shopName = get("shopName")?.value.trim();

        get("previewInitial").textContent = shopName
            ? shopName.charAt(0).toUpperCase()
            : "S";

        updateChecklist();
    }

    previewFields.forEach((field) => {
        get(field.input)?.addEventListener("input", updatePreview);
    });

    // Contact number: digits only
    get("contactNumber")?.addEventListener("input", (event) => {
        event.target.value = event.target.value
            .replace(/\D/g, "")
            .slice(0, 10);

        updatePreview();
    });

    // Checklist
    function updateChecklist() {
        const checks = {
            checkShop: Boolean(get("shopName")?.value.trim()),
            checkLocation: Boolean(get("area")?.value.trim()),
            checkContact: Boolean(
                get("contactPerson")?.value.trim() &&
                /^[6-9]\d{9}$/.test(get("contactNumber")?.value || "")
            ),
            checkLogin: Boolean(
                get("loginId")?.value.trim().length >= 4 &&
                get("password")?.value.length >= 8
            )
        };

        Object.entries(checks).forEach(([id, completed]) => {
            const item = get(id);

            if (!item) return;

            item.classList.toggle("completed", completed);

            item.querySelector("i").className = completed
                ? "fa-solid fa-circle-check"
                : "fa-regular fa-circle";
        });
    }

    get("password")?.addEventListener("input", updateChecklist);

    // Submit loading state + validation
    const form = get("shopRegistrationForm");
    const submitButton = get("submitButton");

    form?.addEventListener("submit", (event) => {

        const mobile = get("contactNumber").value.trim();

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            event.preventDefault();

            get("contactNumber").setCustomValidity(
                "Enter a valid 10-digit Indian mobile number."
            );

            get("contactNumber").reportValidity();

            return;
        }

        get("contactNumber").setCustomValidity("");

        if (!form.checkValidity()) {
            event.preventDefault();
            form.reportValidity();
            return;
        }

        submitButton.disabled = true;

        submitButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Creating Account...
        `;
    });

    get("contactNumber")?.addEventListener("input", (event) => {
        event.target.setCustomValidity("");
    });

    // Error alert close
    get("closeError")?.addEventListener("click", () => {
        get("errorAlert")?.remove();
    });

    updatePreview();

});
