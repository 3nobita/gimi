
document.addEventListener("DOMContentLoaded", () => {

    // Current Year
    document.getElementById("year").textContent =
        new Date().getFullYear();

    // Password Visibility
    const password = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    togglePassword.addEventListener("click", () => {

        const isPassword = password.type === "password";

        password.type = isPassword ? "text" : "password";

        togglePassword.innerHTML = isPassword
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';

        togglePassword.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );

    });

    // Login Loading State
    const form = document.getElementById("adminLoginForm");
    const loginButton = document.getElementById("loginButton");

    form.addEventListener("submit", () => {

        if (!form.checkValidity()) return;

        loginButton.disabled = true;

        loginButton.innerHTML = `
            <span>Authenticating...</span>
            <i class="fa-solid fa-spinner fa-spin"></i>
        `;

    });

});
