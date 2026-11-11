
document.addEventListener("DOMContentLoaded", () => {

    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const loginForm = document.getElementById("loginForm");
    const loginButton = document.getElementById("loginButton");

    // Show / Hide Password
    togglePassword?.addEventListener("click", () => {

        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        togglePassword.innerHTML = isPassword
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';

        togglePassword.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );

    });

    // Login Button Loading State
    loginForm?.addEventListener("submit", () => {

        if (!loginForm.checkValidity()) return;

        loginButton.disabled = true;

        loginButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Signing you in...</span>
        `;

    });

});
