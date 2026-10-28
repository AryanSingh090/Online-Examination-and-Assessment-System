```javascript
// Select HTML elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const roleInput = document.getElementById("role");
const message = document.getElementById("message");

// Handle login form submission
loginForm.addEventListener("submit", function (event) {

    // Prevent page reload
    event.preventDefault();

    // Get input values
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const role = roleInput.value;

    // Clear previous message
    message.textContent = "";

    // Check email
    if (email === "") {
        message.textContent = "Please enter your email address.";
        emailInput.focus();
        return;
    }

    // Check email format
    if (!emailInput.validity.valid) {
        message.textContent = "Please enter a valid email address.";
        emailInput.focus();
        return;
    }

    // Check password
    if (password.trim() === "") {
        message.textContent = "Please enter your password.";
        passwordInput.focus();
        return;
    }

    // Check minimum password length
    if (password.length < 6) {
        message.textContent =
            "Password must contain at least 6 characters.";
        passwordInput.focus();
        return;
    }

    // Check selected role
    if (!["student", "teacher", "admin"].includes(role)) {
        message.textContent = "Please select a valid role.";
        roleInput.focus();
        return;
    }

    // Frontend validation completed
    message.textContent =
        "Input validation successful. Authentication is not yet verified.";

    console.log("Email:", email);
    console.log("Selected role:", role);

});
```;
