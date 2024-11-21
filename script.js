let users = [];

function toggleAuth() {
    document.getElementById("signUpForm").style.display =
        document.getElementById("signUpForm").style.display === "none" ? "block" : "none";
    document.getElementById("loginForm").style.display =
        document.getElementById("loginForm").style.display === "none" ? "block" : "none";
}

function signUp(event) {
    event.preventDefault();
    const email = document.getElementById("signUpEmail").value;
    const password = document.getElementById("signUpPassword").value;
    const role = document.getElementById("role").value;
    const location = document.getElementById("signUpLocation").value;
    const phone = document.getElementById("signUpPhone").value;

    if (users.find((user) => user.email === email)) {
        alert("This email is already registered. Please use another email.");
        return;
    }

    users.push({ email, password, role, location, phone });
    alert("Sign up successful! Please log in.");
    toggleAuth();
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const user = users.find((user) => user.email === email && user.password === password);

    if (user) {
        document.getElementById("authSection").style.display = "none";
        document.getElementById("appSection").style.display = "block";
        document.getElementById("userEmail").textContent = email;
        document.getElementById("userRole").textContent =
            user.role.charAt(0).toUpperCase() + user.role.slice(1);
        document.getElementById("userLocation").textContent = user.location || "N/A";
        document.getElementById("userPhone").textContent = user.phone || "N/A";
    } else {
        alert("Invalid email or password.");
    }
}

function logout() {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
}

function switchSection(section) {
    document.querySelectorAll(".content-section").forEach((sec) => (sec.style.display = "none"));
    document.getElementById(section + "Section").style.display = "block";
}

function addItem(itemName) {
    let selectedItems = document.getElementById("selectedItems");
    if (selectedItems.textContent === "Selected Items: None") {
        selectedItems.textContent = `Selected Items: ${itemName}`;
    } else {
        selectedItems.textContent += `, ${itemName}`;
    }
}

function trackOrder() {
    const trackingStatus = document.getElementById("trackingStatus");
    trackingStatus.textContent = "Order is on the way!";
    setTimeout(() => {
        trackingStatus.textContent = "Driver is approaching your location!";
    }, 3000);
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
}

function deleteAccount() {
    if (confirm("Are you sure you want to delete your account?")) {
        const email = document.getElementById("userEmail").textContent;
        users = users.filter((user) => user.email !== email);
        logout();
        alert("Account deleted.");
    }
}
