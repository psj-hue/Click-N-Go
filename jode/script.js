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
    users.push({ email, password, role });
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
        document.getElementById("userRole").textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    } else {
        alert("Invalid email or password.");
    }
}

function logout() {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
}

function switchSection(section) {
    document.querySelectorAll(".content-section").forEach(sec => sec.style.display = "none");
    document.getElementById(section + "Section").style.display = "block";
}

function addItem(itemName) {
    let selectedItems = document.getElementById("selectedItems");
    selectedItems.textContent += selectedItems.textContent === "Selected Items: None" ? ` ${itemName}` : `, ${itemName}`;
}

function trackOrder() {
    document.getElementById("trackingStatus").textContent = "Order is on the way!";
    setTimeout(() => {
        document.getElementById("trackingStatus").textContent = "Driver is approaching your location!";
    }, 3000);
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
}

function deleteAccount() {
    if (confirm("Are you sure you want to delete your account?")) {
        logout();
        alert("Account deleted.");
    }
}
