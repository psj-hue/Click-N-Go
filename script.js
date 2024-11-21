let users = [];
let currentUser = {};
let generatedOtp = "";

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

    // Save current user data for OTP page
    currentUser = { email, password, role, location, phone };
    generatedOtp = generateOtp();
    alert(`Sign up successful! Please enter the OTP sent to your phone. (OTP: ${generatedOtp})`); // Simulating OTP
    toggleToOtpVerification();
}

function toggleToOtpVerification() {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("otpVerification").style.display = "block";
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000); // Generates a random 6-digit OTP
}

function verifyOtp() {
    const otpInput = document.getElementById("otpInput").value;

    if (otpInput === generatedOtp) {
        document.getElementById("otpVerification").style.display = "none";
        document.getElementById("loadingPage").style.display = "block";

        // Simulate loading for 3 seconds
        setTimeout(() => {
            document.getElementById("loadingPage").style.display = "none";
            alert("OTP Verified Successfully!");
            toggleToApp();
        }, 3000);
    } else {
        alert("Invalid OTP. Please try again.");
    }
}

function toggleToApp() {
    document.getElementById("otpVerification").style.display = "none";
    document.getElementById("appSection").style.display = "block";
    document.getElementById("userEmail").textContent = currentUser.email;
    document.getElementById("userRole").textContent =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    document.getElementById("userLocation").textContent = currentUser.location || "N/A";
    document.getElementById("userPhone").textContent = currentUser.phone || "N/A";
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const user = users.find((user) => user.email === email && user.password === password);

    if (user) {
        alert("Login successful!");
        currentUser = user; // Set current user for session
        toggleToApp();
    } else {
        alert("Invalid email or password.");
    }
}

function logout() {
    currentUser = {};
    document.getElementById("authSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
}

function deleteAccount() {
    if (confirm("Are you sure you want to delete your account?")) {
        const email = currentUser.email;
        users = users.filter((user) => user.email !== email);
        logout();
        alert("Account deleted.");
    }
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
