setInterval(updateClock, 1000);

document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateUIForSignedInUser(currentUser);
    }
    loadFaq();
    loadPreferences();
    updateMap();
    displayWelcomeMessage();
});

let currentUser = null;
let feedbackMessages = JSON.parse(localStorage.getItem('feedbackMessages')) || [];
const faqData = [
    { question: "What is Click n' Go?", answer: "Click n' Go is a digital platform providing motor-taxi and delivery services." },
    { question: "How do I book a service?", answer: "You can book a service after logging in through the 'Orders' section." },
    { question: "Is my data safe?", answer: "We take data privacy seriously and ensure your information is protected." }
];

async function updateUIForSignedInUser(user) {
    toggleVisibility('authSection', 'appContent');
    document.getElementById('accountEmail').innerText = user.email;
    populateAccountInfo(user);
    // Simulate getting user role - replace with your actual logic if needed
    const role = user.role || 'customer'; // Default to customer
    document.getElementById('userRole').innerText = role;
    switchSection('home'); // Show home section after login
}

async function signUp(event) {
    event.preventDefault();
    const email = document.getElementById('signUpEmail').value.trim();
    const password = document.getElementById('signUpPassword').value.trim();

    if (!isValidEmail(email)) {
        document.getElementById('authMessage').innerText = 'Invalid email format.';
        return;
    }
    if (password.length < 6) {
        document.getElementById('authMessage').innerText = 'Password must be at least 6 characters.';
        return;
    }

    const existingUsers = JSON.parse(localStorage.getItem('users')) || [];
    if (existingUsers.find(user => user.email === email)) {
        document.getElementById('authMessage').innerText = 'Email already in use.';
        return;
    }

    const newUser = { email: email, password: password, role: 'customer' }; // Default role
    existingUsers.push(newUser);
    localStorage.setItem('users', JSON.stringify(existingUsers));
    document.getElementById('authMessage').innerText = 'Sign up successful! Please log in.';
    document.getElementById('signupFormElem').reset();
    toggleAuth('loginForm');
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        document.getElementById('authMessage').innerText = 'Login successful!';
        currentUser = { email: user.email, role: user.role };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUIForSignedInUser(currentUser);
    } else {
        document.getElementById('authMessage').innerText = 'Invalid credentials.';
    }
}

function populateAccountInfo(user) {
    document.getElementById('accountEmail').innerText = user.email;
    // You might want to store and retrieve additional account info in local storage
    // For now, these are placeholders
    document.getElementById('accountLocation').innerText = 'Not Set';
    document.getElementById('accountPhone').innerText = 'Not Set';
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    toggleVisibility('appContent', 'authSection');
    document.getElementById('authMessage').innerText = 'Logged out successfully.';
}

function deleteAccount() {
    const confirmDelete = confirm("Are you sure you want to delete your account?");
    if (confirmDelete) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const updatedUsers = users.filter(user => user.email !== currentUser.email);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        localStorage.removeItem('currentUser');
        currentUser = null;
        toggleVisibility('appContent', 'authSection');
        document.getElementById('authMessage').innerText = 'Account deleted successfully.';
    }
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(item => item.innerHTML = '');
}

function toggleAuth(formId) {
    document.getElementById('signUpForm').style.display = formId === 'signUpForm' ? 'block' : 'none';
    document.getElementById('loginForm').style.display = formId === 'loginForm' ? 'block' : 'none';
    document.getElementById('authMessage').innerText = '';
}

function switchSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(`${section}Section`).style.display = 'block';
}

function toggleVisibility(hideSection, showSection) {
    document.getElementById(hideSection).style.display = 'none';
    document.getElementById(showSection).style.display = 'block';
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhoneNumber(phone) {
    const phoneRegex = /^[+]?[\d\s-]*$/;
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    if (!phoneRegex.test(phone.trim())) {
        return false;
    }
    return cleanedPhone.length >= 7;
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

async function loadAllUsers() {
    const allUsersElement = document.getElementById('allUsers');
    allUsersElement.innerHTML = '<div class="loading-message loading">Loading users...</div>';
    setTimeout(async () => {
        allUsersElement.innerHTML = '';
        const users = JSON.parse(localStorage.getItem('users')) || [];
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.innerHTML = `
                <p>Email: ${user.email}</p>
                <p>Role: ${user.role}</p>
                <hr />
            `;
            allUsersElement.appendChild(userDiv);
        });
    }, 1500);
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clockDisplay').innerText = `${hours}:${minutes}:${seconds}`;
}

function displayWelcomeMessage() {
    const now = new Date();
    const hour = now.getHours();
    let message = "";

    if (hour >= 5 && hour < 12) {
        message = "Good morning!";
    } else if (hour >= 12 && hour < 18) {
        message = "Good afternoon!";
    } else {
        message = "Good evening!";
    }
    document.getElementById('welcomeMessage').innerText = message;
}

function clearInput(inputId) {
    document.getElementById(inputId).value = '';
}

function displayDashboard(role) {
    if (role === 'customer') {
        document.getElementById('orderPanel').style.display = 'block';
        document.getElementById('orderRequestPanel').style.display = 'none';
    }
    if (role === 'driver') {
        document.getElementById('orderPanel').style.display = 'none';
        document.getElementById('orderRequestPanel').style.display = 'block';
    }
}

function submitFeedback(event) {
    event.preventDefault();
    const feedbackMessage = document.getElementById('feedbackMessage').value.trim();
    const feedbackStatus = document.getElementById('feedbackStatus');
    feedbackStatus.classList.add('loading');
    feedbackStatus.innerText = 'Sending feedback...';
    setTimeout(() => {
        feedbackMessages.push({
            user: currentUser.email,
            message: feedbackMessage
        });
        feedbackStatus.classList.remove('loading');
        feedbackStatus.innerText = 'Feedback Sent!';
        localStorage.setItem('feedbackMessages', JSON.stringify(feedbackMessages));
        document.getElementById('feedbackForm').reset();
        notifyUser("Feedback sent!");
    }, 1500);
}

function showOrderHistory() {
    switchSection('orderHistory');
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const orderList = document.getElementById('orderList');
    orderList.innerHTML = '';
    if (orders.length === 0) {
        orderList.innerHTML = 'No previous orders.';
    }
    orders.forEach((order, index) => {
        const orderElement = document.createElement('div');
        orderElement.innerHTML = `
            <p>Order #${index + 1}:</p>
            <p>Date: ${order.date}</p>
            <p>Item: ${order.items}</p>
            <p>Status: ${order.status}</p>
            <hr />
        `;
        orderList.appendChild(orderElement);
    });
}

function simulateOrder() {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const newOrder = {
        date: new Date().toDateString(),
        items: "Test Order",
        status: "Pending"
    };
    orders.push(newOrder);
    localStorage.setItem('orders', JSON.stringify(orders));
    notifyUser("Order Placed!");
    updateTracking();
    alert('Order Received! Check order history.');
}

function loadFaq() {
    const faqListElement = document.getElementById('faqList');
    faqListElement.innerHTML = '';
    faqData.forEach(faq => {
        const faqElement = document.createElement('div');
        faqElement.innerHTML = `
            <p>Q: ${faq.question}</p>
            <p>A: ${faq.answer}</p>
            <hr/>
        `;
        faqListElement.appendChild(faqElement);
    });
}

function loadPreferences() {
    const userPreferences = JSON.parse(localStorage.getItem('userPreferences')) || {};
    if (userPreferences.language) {
        document.getElementById('languageSelect').value = userPreferences.language;
    }
}

function savePreferences() {
    const languageSelect = document.getElementById('languageSelect').value;
    const userPreferencesStatus = document.getElementById('userPreferencesStatus');
    userPreferencesStatus.classList.add('loading');
    userPreferencesStatus.innerText = 'Saving preferences...';
    setTimeout(() => {
        userPreferencesStatus.classList.remove('loading');
        userPreferencesStatus.innerText = 'Preferences Saved!';
        const userPreferences = {
            language: languageSelect
        };
        localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
    }, 1500);
}

function updateMap() {
    // Replace with actual map API integration if needed
    document.getElementById('userLocationDisplay').innerText = 'Location services are currently unavailable.';
}

function notifyUser(message) {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Click n Go!', {
                    body: message,
                });
            }
        });
    }
}

function updateTracking() {
    const trackingPanel = document.getElementById('trackingPanel');
    trackingPanel.innerHTML = `<div class="loading-message loading"> Tracking order...</div>`;
    const trackingAnimation = document.createElement('div');
    trackingAnimation.style.position = 'relative';
    trackingAnimation.innerHTML = `<div style="background-color:#2d6a4f; border-radius:50%; width:15px; height:15px;"></div>`;
    trackingPanel.appendChild(trackingAnimation);
    setTimeout(() => {
        let currentPosition = 0;
        const animationInterval = setInterval(() => {
            trackingPanel.innerHTML = '';
            currentPosition += 10;
            if (currentPosition > 200) {
                clearInterval(animationInterval);
                trackingPanel.innerHTML = ` <p> Order is now delivered. </p>`;
                return;
            }
            trackingAnimation.style.left = currentPosition + 'px';
            trackingPanel.appendChild(trackingAnimation);
        }, 500);
    }, 2000);
}
