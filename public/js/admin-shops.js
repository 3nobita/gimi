
document.addEventListener("DOMContentLoaded", () => {

    // Mobile sidebar
    const sidebar = document.getElementById("adminSidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");

    function openSidebar() {
        sidebar?.classList.add("open");
        overlay?.classList.add("show");
    }

    function closeSidebar() {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("show");
    }

    menuToggle?.addEventListener("click", () => {
        sidebar?.classList.contains("open")
            ? closeSidebar()
            : openSidebar();
    });

    overlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeSidebar();
    });

    // Current year
    const year = document.getElementById("currentYear");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    // Reset link extraction from WhatsApp URL
    const successElement = document.getElementById("successHtml");
    const resetInput = document.getElementById("resetLink");

    if (successElement && resetInput) {
        try {
            const whatsappLink = successElement.querySelector("a");

            if (whatsappLink) {
                const whatsappURL = new URL(
                    whatsappLink.getAttribute("href"),
                    window.location.origin
                );

                const message = whatsappURL.searchParams.get("text") || "";

                const decodedMessage = message
                    .replace(/&#x73;/gi, "s")
                    .replace(/&#x70;/gi, "p")
                    .replace(/&#x72;/gi, "r")
                    .replace(/&#x64;/gi, "d");

                const match = decodedMessage.match(
                    /https?:\/\/[^\s"'<>]+/i
                );

                if (match) {
                    resetInput.value = match[0];
                    resetInput.placeholder = "Reset link generated";
                } else {
                    resetInput.placeholder = "Reset link could not be extracted";
                }
            }
        } catch (error) {
            console.error("Reset link extraction failed:", error);
            resetInput.placeholder = "Unable to extract reset link";
        }
    }

    // Copy reset link
    const copyBtn = document.getElementById("copyBtn");

    copyBtn?.addEventListener("click", async () => {
        const input = document.getElementById("resetLink");

        if (!input?.value) {
            alert("Reset link not found!");
            return;
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(input.value);
            } else {
                input.select();

                const copied = document.execCommand("copy");

                if (!copied) throw new Error("Copy failed");
            }

            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            copyBtn.classList.add("copied");

            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Link';
                copyBtn.classList.remove("copied");
            }, 2000);

        } catch (error) {
            console.error("Copy failed:", error);
            alert("Unable to copy. Please copy the link manually.");
        }
    });

    // Dismiss alerts
    document.querySelectorAll("[data-dismiss]").forEach((button) => {
        button.addEventListener("click", () => {
            const target = document.getElementById(
                button.dataset.dismiss
            );

            target?.remove();
        });
    });

    // Prevent accidental double submission
    document.querySelectorAll(".reset-form").forEach((form) => {
        form.addEventListener("submit", () => {
            const button = form.querySelector("button");

            if (button) {
                button.disabled = true;
                button.innerHTML =
                    '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
            }
        });
    });

});
