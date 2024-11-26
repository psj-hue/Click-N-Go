let currentUser = {};
let generatedOTP = "";
const orders = []; // Array to store shared orders

// Handles user sign-up
function signUp(event) {
    event.preventDefault();

    const email = document.getElementById('signUpEmail').value.trim();
    const location = document.getElementById('signUpLocation').value.trim();
    const phone = document.getElementById('signUpPhone').value.trim();

    currentUser = { email, location, phone };

    document.getElementById('authSection').style.display = 'none';
    document.getElementById('otpPage').style.display = 'block';

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

// Populates the user's account information
function populateAccountInfo() {
    document.getElementById('accountEmail').innerText = currentUser.email || "Not Provided";
    document.getElementById('accountLocation').innerText = currentUser.location || "Not Provided";
    document.getElementById('accountPhone').innerText = currentUser.phone || "Not Provided";
}

// Logs out the user and resets the app state
function logout() {
    alert('Logged out successfully!');
    resetApp();
}

// Deletes the user's account and resets the app state
function deleteAccount() {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        alert('Account deleted successfully!');
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

    updateOrderList(); // Clear order list
}

// Switches between different app sections
function switchSection(section) {
    document.querySelectorAll('.content-section').forEach((sec) => {
        sec.style.display = 'none';
    });
    document.getElementById(section + 'Section').style.display = 'block';
}

// Adds a new order to the shared list
function addOrder(event) {
    event.preventDefault();

    const orderDescription = document.getElementById('orderDescription').value.trim();
    if (orderDescription) {
        orders.push({ description: orderDescription, user: currentUser.email || "Anonymous" });
        updateOrderList();
        document.getElementById('orderDescription').value = '';
    } else {
        alert("Please enter a valid order description.");
    }
}

// Updates the shared orders list display
function updateOrderList() {
    const orderList = document.getElementById('orderList');
    orderList.innerHTML = '<h3>Shared Orders:</h3>';

    if (orders.length === 0) {
        orderList.innerHTML += '<p>No orders shared yet. Be the first to add one!</p>';
    } else {
        orders.forEach((order, index) => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `<strong>Order ${index + 1}:</strong> ${order.description} <br><em>Shared by: ${order.user}</em>`;
            orderList.appendChild(orderItem);
        });
    }
}

// Handles sending feedback from the contact page
function sendFeedback(event) {
    event.preventDefault();
    const message = document.getElementById('contactMessage').value.trim();
    if (message) {
        alert(`Your message has been sent:\n"${message}"`);
        document.getElementById('contactMessage').value = '';
    } else {
        alert("Please enter a valid message.");
    }
}

// Handles sending messages to developers
function sendDeveloperMessage(event) {
    event.preventDefault();
    const message = document.getElementById('devMessage').value.trim();
    if (message) {
        alert(`Your message to the developers has been sent:\n"${message}"`);
        document.getElementById('devMessage').value = '';
    } else {
        alert("Please enter a valid message.");
    }
}

// Generates a 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}
