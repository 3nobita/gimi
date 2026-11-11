
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

    // DATE
    const dateElement = document.getElementById("currentDate");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // INPUTS
    const nameInput = document.getElementById("productName");
    const categoryInput = document.getElementById("productCategory");
    const sizeInput = document.getElementById("productSize");
    const colorInput = document.getElementById("productColor");
    const stockInput = document.getElementById("productStock");
    const actualPriceInput = document.getElementById("actualPrice");
    const sellPriceInput = document.getElementById("sellPrice");
    const statusInput = document.getElementById("productStatus");

    // PREVIEW ELEMENTS
    const previewName = document.getElementById("previewName");
    const previewCategory = document.getElementById("previewCategory");
    const previewSize = document.getElementById("previewSize");
    const previewColor = document.getElementById("previewColor");
    const previewStock = document.getElementById("previewStock");
    const previewSellPrice = document.getElementById("previewSellPrice");
    const previewStatus = document.getElementById("previewStatus");

    // PRODUCT NAME
    nameInput.addEventListener("input", () => {
        previewName.textContent = nameInput.value.trim() || "Product Name";
    });

    // CATEGORY
    categoryInput.addEventListener("input", () => {
        previewCategory.textContent = categoryInput.value.trim() || "Product Category";
    });

    // SIZE
    sizeInput.addEventListener("input", () => {
        previewSize.innerHTML = '<i class="fa-solid fa-ruler"></i> ';
        previewSize.append(document.createTextNode(sizeInput.value.trim() || "No size"));
    });

    // COLOR
    colorInput.addEventListener("input", () => {
        previewColor.innerHTML = '<i class="fa-solid fa-palette"></i> ';
        previewColor.append(document.createTextNode(colorInput.value.trim() || "No color"));
    });

    // STOCK HEALTH
    const stockHealth = document.querySelector(".stock-health");
    const stockLabel = document.getElementById("stockLabel");
    const stockDescription = document.getElementById("stockDescription");

    function updateStock() {
        const stock = Number(stockInput.value) || 0;

        previewStock.textContent = `${stock} Units`;

        stockHealth.classList.remove("low", "out");

        if (stock <= 0) {
            stockHealth.classList.add("out");
            stockLabel.textContent = "Out of Stock";
            stockDescription.textContent = "This product has no available inventory.";
        } else if (stock <= 5) {
            stockHealth.classList.add("low");
            stockLabel.textContent = "Low Stock";
            stockDescription.textContent = "Consider replenishing your inventory.";
        } else {
            stockLabel.textContent = "Healthy Stock";
            stockDescription.textContent = "Your product has available inventory.";
        }
    }

    stockInput.addEventListener("input", updateStock);
    updateStock();

    // PRICING & PROFIT
    const profitPreview = document.getElementById("profitPreview");
    const profitAmount = document.getElementById("profitAmount");
    const profitMargin = document.getElementById("profitMargin");
    const profitMessage = document.getElementById("profitMessage");

    function formatCurrency(value) {
        return "₹" + value.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function updatePricing() {
        const actualPrice = Number(actualPriceInput.value) || 0;
        const sellPrice = Number(sellPriceInput.value) || 0;

        const profit = sellPrice - actualPrice;
        const margin = sellPrice > 0
            ? (profit / sellPrice) * 100
            : 0;

        previewSellPrice.textContent = formatCurrency(sellPrice);
        profitAmount.textContent = formatCurrency(profit);
        profitMargin.textContent = margin.toFixed(2) + "%";

        profitPreview.classList.toggle("negative", profit < 0);

        if (sellPrice === 0 && actualPrice === 0) {
            profitMessage.textContent = "Enter product prices to calculate profitability.";
        } else if (profit > 0) {
            profitMessage.textContent = "Your product has a positive gross profit per unit.";
        } else if (profit < 0) {
            profitMessage.textContent = "Warning: Your selling price is below the purchase price.";
        } else {
            profitMessage.textContent = "Your selling price equals your purchase price. No gross profit.";
        }
    }

    actualPriceInput.addEventListener("input", updatePricing);
    sellPriceInput.addEventListener("input", updatePricing);
    updatePricing();

    // PRODUCT STATUS
    function updateStatus() {
        const status = statusInput.value;

        previewStatus.className = "preview-status " +
            (status === "ACTIVE" ? "active" : "inactive");

        previewStatus.innerHTML = "<span></span> " + status;
    }

    statusInput.addEventListener("change", updateStatus);
    updateStatus();

    // ALERT CLOSE
    document.querySelector(".alert-close")?.addEventListener("click", () => {
        document.querySelector(".alert")?.remove();
    });

    // FORM VALIDATION
    const form = document.getElementById("productForm");
    const submitButton = document.getElementById("submitButton");

    form.addEventListener("submit", (e) => {
        const stock = Number(stockInput.value);
        const actualPrice = Number(actualPriceInput.value);
        const sellPrice = Number(sellPriceInput.value);

        if (stock < 0 || !Number.isInteger(stock)) {
            e.preventDefault();
            alert("Stock quantity must be a valid non-negative whole number.");
            stockInput.focus();
            return;
        }

        if (actualPrice < 0 || sellPrice < 0) {
            e.preventDefault();
            alert("Product prices cannot be negative.");
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Updating Product...';
    });

});
