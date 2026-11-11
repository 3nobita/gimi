
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

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSidebar();
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

    // Form elements
    const productForm = document.getElementById("productForm");

    const nameInput = document.querySelector('[name="product_name"]');
    const categoryInput = document.querySelector('[name="product_category"]');
    const sizeInput = document.querySelector('[name="product_size"]');
    const colorInput = document.querySelector('[name="product_color"]');

    const stockInput = document.getElementById("productStock");
    const actualPriceInput = document.getElementById("actualPrice");
    const sellingPriceInput = document.getElementById("sellingPrice");

    // Preview elements
    const previewName = document.getElementById("previewName");
    const previewCategory = document.getElementById("previewCategory");
    const previewSize = document.getElementById("previewSize");
    const previewColor = document.getElementById("previewColor");
    const previewStock = document.getElementById("previewStock");
    const previewPrice = document.getElementById("previewPrice");

    const profitAmount = document.getElementById("profitAmount");
    const profitMargin = document.getElementById("profitMargin");
    const pricingWarning = document.getElementById("pricingWarning");

    const submitButton = document.getElementById("submitButton");

    const currency = (value) => {
        return "₹" + Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Product preview
    function updatePreview() {

        previewName.textContent =
            nameInput.value.trim() || "Your Product Name";

        previewCategory.textContent =
            categoryInput.value.trim() || "Product Category";

        previewSize.textContent =
            sizeInput.value.trim() || "—";

        previewColor.textContent =
            colorInput.value.trim() || "—";

        previewStock.textContent =
            (stockInput.value || 0) + " Units";

        previewPrice.textContent =
            currency(sellingPriceInput.value);

        const actual = Number(actualPriceInput.value) || 0;
        const selling = Number(sellingPriceInput.value) || 0;

        const profit = selling - actual;

        const margin = selling > 0
            ? (profit / selling) * 100
            : 0;

        profitAmount.textContent = currency(profit);
        profitMargin.textContent = margin.toFixed(1) + "%";

        profitAmount.style.color = profit < 0
            ? "#e45165"
            : "#159c70";

        pricingWarning.hidden = !(
            actualPriceInput.value !== "" &&
            sellingPriceInput.value !== "" &&
            selling < actual
        );
    }

    [
        nameInput,
        categoryInput,
        sizeInput,
        colorInput,
        stockInput,
        actualPriceInput,
        sellingPriceInput
    ].forEach((input) => {
        input.addEventListener("input", updatePreview);
    });

    // Prevent accidental double submission
    productForm.addEventListener("submit", (e) => {

        if (!productForm.checkValidity()) {
            e.preventDefault();
            productForm.reportValidity();
            return;
        }

        const stock = Number(stockInput.value);
        const actual = Number(actualPriceInput.value);
        const selling = Number(sellingPriceInput.value);

        if (
            !Number.isInteger(stock) ||
            stock < 0 ||
            actual < 0 ||
            selling < 0
        ) {
            e.preventDefault();
            alert("Please enter valid stock and pricing values.");
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving Product...';
    });

    updatePreview();

});
