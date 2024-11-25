let currentUser = {};
let generatedOTP = "";

function signUp(event) {
    event.preventDefault();

    // Get values from the sign-up form
    const email = document.getElementById('signUpEmail').value;
    const location = document.getElementById('signUpLocation').value;
    const phone = formatPhoneNumber(document.getElementById('signUpPhone').value);

    // Store the user information
    currentUser = { email, location, phone };

    // Redirect to OTP page
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('otpPage').style.display = 'block';

    // Generate OTP (Random 6-digit number)
    generatedOTP = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
    document.getElementById('otpMessage').innerText = `Your OTP is: ${generatedOTP}`;

    alert('Sign Up Successful! Please enter the OTP sent to your phone.');
}

function verifyOTP() {
    const otpInput = document.getElementById('otpInput').value.trim();

    if (otpInput === generatedOTP.toString()) {
        alert('OTP Verified Successfully!');
        toggleToApp();
    } else {
        alert('Invalid OTP. Please try again.');
    }
}

function addItem(item) {
    const selectedItems = document.getElementById('selectedItems');
    selectedItems.innerText = selectedItems.innerText === "Selected Items: None" 
        ? `Selected Items: ${item}` 
        : `${selectedItems.innerText}, ${item}`;
}

function toggleAuth() {
    const signUpForm = document.getElementById('signUpForm');
    const loginForm = document.getElementById('loginForm');

    // Toggle between sign up and login forms
    if (signUpForm.style.display === 'none') {
        signUpForm.style.display = 'block';
        loginForm.style.display = 'none';
    } else {
        signUpForm.style.display = 'none';
        loginForm.style.display = 'block';
    }
}

function toggleToApp() {
    // Hide the OTP page and show the app page
    document.getElementById('otpPage').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';

    // Populate account information (if applicable)
    populateAccountInfo();
}

function switchSection(section) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach((sec) => {
        sec.style.display = 'none';
    });

    // Show the selected section
    document.getElementById(section + 'Section').style.display = 'block';
}

function login(event) {
    event.preventDefault();

    // Simulate login
    alert('Login Successful!');
    toggleToApp();
}

function logout() {
    alert('You have logged out.');
    toggleToAuth();
}

function deleteAccount() {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        alert('Account deleted successfully!');
        resetApp();
    }
}

function toggleToAuth() {
    // Switch to the authentication section (Sign Up/Login page)
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appSection').style.display = 'none';
}

function resetApp() {
    // Reset all application states and forms
    currentUser = {};
    generatedOTP = "";

    document.getElementById('signUpForm').reset();
    document.getElementById('loginForm').reset();
    document.getElementById('otpInput').value = "";

    // Reset UI
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('otpPage').style.display = 'none';
    document.getElementById('appSection').style.display = 'none';

    // Clear any selected items
    document.getElementById('selectedItems').innerText = "Selected Items: None";
}

function populateAccountInfo() {
    // Display user account details in the Account Section
    document.getElementById('accountEmail').innerText = currentUser.email || "Not Provided";
    document.getElementById('accountLocation').innerText = currentUser.location || "Not Provided";
    document.getElementById('accountPhone').innerText = currentUser.phone || "Not Provided";
}

function clearPhoneNumberFormat(phoneNumber) {
    // Remove all non-numeric characters from the phone number
    return phoneNumber.replace(/\D/g, '');
}

function formatPhoneNumber(phoneNumber) {
    // Allow phone number to be entered in any format but sanitize it
    const cleaned = clearPhoneNumberFormat(phoneNumber);

    // Optionally format the number (e.g., add dashes or spaces)
    // For simplicity, returning the cleaned number
    return cleaned;
}
