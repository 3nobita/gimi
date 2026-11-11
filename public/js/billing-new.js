
document.addEventListener("DOMContentLoaded", () => {
    const billForm = document.getElementById("billForm");
    const container = document.getElementById("itemsContainer");
    const addRowBtn = document.getElementById("addRowBtn");

    const existingCust = document.getElementById("existingCust");
    const custName = document.getElementById("custName");
    const custMobile = document.getElementById("custMobile");

    const discountInput = document.getElementById("discount");
    const paymentStatus = document.getElementById("paymentStatus");

    const summaryItems = document.getElementById("summaryItems");
    const totalItems = document.getElementById("totalItems");
    const subtotalElement = document.getElementById("subtotal");
    const discountTotal = document.getElementById("discountTotal");
    const grandTotal = document.getElementById("grandTotal");
    const paymentPreview = document.getElementById("paymentPreview");

    const generateBtn = document.getElementById("generateBtn");

    let rowIndex = 0;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2
        }).format(amount);
    };

    // CUSTOMER AUTOFILL

    existingCust.addEventListener("change", function () {
        const selectedOption = this.options[this.selectedIndex];

        custName.value = selectedOption.dataset.name || "";
        custMobile.value = selectedOption.dataset.mobile || "";
    });

    // UPDATE PRODUCT META

    function updateProductMeta(row) {
        const select = row.querySelector(".product-select");
        const meta = row.querySelector(".product-meta");

        const selectedOption = select.options[select.selectedIndex];

        if (!select.value) {
            meta.textContent = "Select an item to see its price and stock.";
            return;
        }

        const price = Number(selectedOption.dataset.price) || 0;
        const stock = Number(selectedOption.dataset.stock) || 0;

        meta.innerHTML = "";

        const priceText = document.createElement("strong");
        priceText.textContent = formatCurrency(price);

        const stockText = document.createElement("span");
        stockText.textContent = ` · Available stock: ${stock}`;

        meta.append(priceText, stockText);
    }

    // REINDEX PRODUCT INPUTS

    function reindexRows() {
        const rows = container.querySelectorAll(".item-row");

        rows.forEach((row, index) => {
            row.querySelector(".product-select").name =
                `items[${index}][product_id]`;

            row.querySelector(".qty-input").name =
                `items[${index}][quantity]`;

            row.querySelector(".remove-row").disabled =
                rows.length === 1;
        });

        rowIndex = rows.length - 1;
    }

    // ADD PRODUCT ROW

    addRowBtn.addEventListener("click", () => {
        const firstRow = container.querySelector(".item-row");
        const newRow = firstRow.cloneNode(true);

        const productSelect = newRow.querySelector(".product-select");
        const quantityInput = newRow.querySelector(".qty-input");
        const meta = newRow.querySelector(".product-meta");

        productSelect.value = "";
        quantityInput.value = "1";
        meta.textContent = "Select an item to see its price and stock.";

        container.appendChild(newRow);

        reindexRows();
        updateSummary();

        productSelect.focus();
    });

    // REMOVE PRODUCT ROW

    container.addEventListener("click", (event) => {
        const removeButton = event.target.closest(".remove-row");

        if (!removeButton || removeButton.disabled) return;

        const row = removeButton.closest(".item-row");

        row.remove();

        reindexRows();
        updateSummary();
    });

    // QUANTITY CONTROLS

    container.addEventListener("click", (event) => {
        const minusBtn = event.target.closest(".qty-minus");
        const plusBtn = event.target.closest(".qty-plus");

        if (!minusBtn && !plusBtn) return;

        const row = event.target.closest(".item-row");
        const quantityInput = row.querySelector(".qty-input");

        let quantity = Number(quantityInput.value) || 1;

        if (minusBtn) {
            quantity = Math.max(1, quantity - 1);
        }

        if (plusBtn) {
            quantity += 1;
        }

        quantityInput.value = quantity;

        updateSummary();
    });

    // UPDATE SUMMARY ON PRODUCT / QUANTITY CHANGE

    container.addEventListener("change", (event) => {
        if (
            event.target.matches(".product-select") ||
            event.target.matches(".qty-input")
        ) {
            const row = event.target.closest(".item-row");

            updateProductMeta(row);
            updateSummary();
        }
    });

    container.addEventListener("input", (event) => {
        if (event.target.matches(".qty-input")) {
            updateSummary();
        }
    });

    // CALCULATE BILL SUMMARY

    function updateSummary() {
        const rows = container.querySelectorAll(".item-row");

        let subtotal = 0;
        let itemCount = 0;

        summaryItems.innerHTML = "";

        rows.forEach((row) => {
            const select = row.querySelector(".product-select");
            const quantityInput = row.querySelector(".qty-input");

            const selectedOption = select.options[select.selectedIndex];

            if (!select.value) return;

            const price = Number(selectedOption.dataset.price) || 0;
            const quantity = Math.max(1, Number(quantityInput.value) || 1);

            const productName = selectedOption.textContent
                .split(" — ")[0]
                .trim();

            const lineTotal = price * quantity;

            subtotal += lineTotal;
            itemCount += quantity;

            const productRow = document.createElement("div");
            productRow.className = "summary-product";

            const info = document.createElement("div");
            info.className = "summary-product-info";

            const name = document.createElement("strong");
            name.textContent = productName;

            const details = document.createElement("small");
            details.textContent =
                `${quantity} × ${formatCurrency(price)}`;

            const amount = document.createElement("strong");
            amount.className = "summary-product-price";
            amount.textContent = formatCurrency(lineTotal);

            info.append(name, details);
            productRow.append(info, amount);

            summaryItems.appendChild(productRow);
        });

        if (summaryItems.children.length === 0) {
            const empty = document.createElement("div");
            empty.className = "summary-empty";

            const icon = document.createElement("span");
            icon.textContent = "▤";

            const message = document.createElement("p");
            message.textContent =
                "Your selected products will appear here.";

            empty.append(icon, message);
            summaryItems.appendChild(empty);
        }

        const discount = Math.max(
            0,
            Number(discountInput.value) || 0
        );

        const finalDiscount = Math.min(discount, subtotal);
        const finalAmount = Math.max(0, subtotal - finalDiscount);

        totalItems.textContent = itemCount;
        subtotalElement.textContent = formatCurrency(subtotal);
        discountTotal.textContent = `− ${formatCurrency(finalDiscount)}`;
        grandTotal.textContent = formatCurrency(finalAmount);

        paymentPreview.textContent =
            `Payment: ${paymentStatus.value}`;

        // Update remove buttons
        reindexRows();
    }

    // DISCOUNT AND PAYMENT EVENTS

    discountInput.addEventListener("input", updateSummary);
    paymentStatus.addEventListener("change", updateSummary);

    // PREVENT DOUBLE SUBMISSION

    billForm.addEventListener("submit", (event) => {
        if (!billForm.checkValidity()) {
            return;
        }

        const rows = container.querySelectorAll(".item-row");

        if (!rows.length) {
            event.preventDefault();
            alert("Please add at least one product.");
            return;
        }

        generateBtn.disabled = true;
        generateBtn.querySelector("span:first-child").textContent =
            "Generating Bill...";

        generateBtn.querySelector(".generate-arrow").textContent = "⌛";
    });

    // INITIAL SETUP

    reindexRows();
    updateSummary();
});
