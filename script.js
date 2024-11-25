let currentUser = {};
let generatedOTP = "";
let selectedOrderItem = "";

// Handles user sign-up
function signUp(event) {
    event.preventDefault();

    const email = document.getElementById('signUpEmail').value.trim();
    const location = document.getElementById('signUpLocation').value.trim();
    const phone = document.getElementById('signUpPhone').value.trim();

    // Save user information
    currentUser = { email, location, phone };

    // Redirect to OTP verification
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('otpPage').style.display = 'block';

    // Generate and display OTP
    generatedOTP = generateOTP();
    document.getElementById('otpMessage').innerText = `Your OTP is: ${generatedOTP}`;

    alert('Sign Up Successful! Please enter the OTP sent to your phone.');
}

// Verifies the OTP entered by the user
function verifyOTP() {
    const otpInput = document.getElementById('otpInput').value.trim();

    if (otpInput === generatedOTP.toString()) {
        alert('OTP Verified Successfully!');
        toggleToApp();
        populateAccountInfo();
    } else {
        alert('Invalid OTP. Please try again.');
    }
}

// Toggles between Sign Up and Login forms
function toggleAuth() {
    const signUpForm = document.getElementById('signUpForm');
    const loginForm = document.getElementById('loginForm');

    if (signUpForm.style.display === 'none') {
        signUpForm.style.display = 'block';
        loginForm.style.display = 'none';
    } else {
        signUpForm.style.display = 'none';
        loginForm.style.display = 'block';
    }
}

// Logs in the user
function login(event) {
    event.preventDefault();

    alert('Login Successful!');
    toggleToApp();
    populateAccountInfo();
}

// Switches to the main app section
function toggleToApp() {
    document.getElementById('otpPage').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
}

// Populates account information
function populateAccountInfo() {
    document.getElementById('accountEmail').innerText = currentUser.email || "Not Provided";
    document.getElementById('accountLocation').innerText = currentUser.location || "Not Provided";
    document.getElementById('accountPhone').innerText = currentUser.phone || "Not Provided";
}

// Logs out the user
function logout() {
    alert("Logged out successfully!");
    resetApp();
}

// Deletes the user's account
function deleteAccount() {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        alert("Account deleted successfully!");
        resetApp();
    }
}

// Resets the app to its initial state
function resetApp() {
    currentUser = {};
    generatedOTP = "";

    document.getElementById('signUpForm').reset();
    document.getElementById('loginForm').reset();
    document.getElementById('otpInput').value = "";

    document.getElementById('authSection').style.display = 'block';
    document.getElementById('otpPage').style.display = 'none';
    document.getElementById('appSection').style.display = 'none';

    document.getElementById('selectedItems').innerText = "Selected Items: None";
}

// Switches between sections of the app
function switchSection(section) {
    document.querySelectorAll('.content-section').forEach((sec) => {
        sec.style.display = 'none';
    });
    document.getElementById(section + 'Section').style.display = 'block';
}

// Selects an item for ordering
function selectItem(item) {
    selectedOrderItem = item;
    document.getElementById('selectedItem').innerText = item;
    switchSection('orderDetails');
}

// Submits the order and redirects to the home section
function submitOrder(event) {
    event.preventDefault();

    const fullName = document.getElementById('orderFullName').value.trim();
    const phoneNumber = document.getElementById('orderPhoneNumber').value.trim();
    const location = document.getElementById('orderLocation').value.trim();

    alert(`Order placed successfully!\nItem: ${selectedOrderItem}\nName: ${fullName}\nPhone: ${phoneNumber}\nLocation: ${location}`);
    switchSection('home');
}

// Generates a 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}
