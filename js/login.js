const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const roleInput = document.getElementById("role");
const message = document.getElementById("message");

const dashboardByRole = {
    student: "student-dashboard.html",
    teacher: "teacher-dashboard.html",
};

function showValidationError(text, input) {
    message.textContent = text;
    input.focus();
}

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const role = roleInput.value;

    message.textContent = "";

    if (email === "") {
        showValidationError("Please enter your email address.", emailInput);
        return;
    }

    if (!emailInput.validity.valid) {
        showValidationError("Please enter a valid email address.", emailInput);
        return;
    }

    if (password.trim() === "") {
        showValidationError("Please enter your password.", passwordInput);
        return;
    }

    if (password.length < 6) {
        showValidationError(
            "Password must contain at least 6 characters.",
            passwordInput
        );
        return;
    }

    if (!Object.prototype.hasOwnProperty.call(dashboardByRole, role)) {
        showValidationError("Please select a valid role.", roleInput);
        return;
    }

    const dashboardPrefix = loginForm.dataset.dashboardPrefix;
    window.location.href = `${dashboardPrefix}${dashboardByRole[role]}`;
});
