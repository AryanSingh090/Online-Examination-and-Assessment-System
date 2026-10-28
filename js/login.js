const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const roleInput = document.getElementById("role");
const message = document.getElementById("message");

const dashboardByRole = {
    student: "student-dashboard.html",
    teacher: "teacher-dashboard.html",
    admin: "admin-dashboard.html",
};

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const role = roleInput.value;

    message.textContent = "";

    if (email === "") {
        message.textContent = "Please enter your email address.";
        emailInput.focus();
        return;
    }

    if (!emailInput.validity.valid) {
        message.textContent = "Please enter a valid email address.";
        emailInput.focus();
        return;
    }

    if (password.trim() === "") {
        message.textContent = "Please enter your password.";
        passwordInput.focus();
        return;
    }

    if (password.length < 6) {
        message.textContent = "Password must contain at least 6 characters.";
        passwordInput.focus();
        return;
    }

    if (!Object.prototype.hasOwnProperty.call(dashboardByRole, role)) {
        message.textContent = "Please select a valid role.";
        roleInput.focus();
        return;
    }

    const dashboardPrefix = loginForm.dataset.dashboardPrefix;
    window.location.href = `${dashboardPrefix}${dashboardByRole[role]}`;
});
