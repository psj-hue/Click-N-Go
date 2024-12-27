let currentUser = null; // Store the current user information

document.addEventListener('DOMContentLoaded', () => {
    // Check for a previously logged-in user in local storage
    const storedUser = localStorage.getItem('clickngoUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateUIForSignedInUser(currentUser);
    } else {
        switchSection('homeSection'); // Show default home if not signed in
    }

    loadFaq();
    updateClock();
    displayWelcomeMessage();
    setInterval(updateClock, 1000);
    loadPreferences(); // Load user preferences on page load
});

function updateUIForSignedInUser(user) {
    toggleVisibility('authSection', 'appSection');
    populateAccountInfo(user);
    displayDashboard(user.role); // Use the role stored during sign-up/login
    updateMap();
    // After successful sign-in, ensure the default section is visible
    switchSection('homeSection');
}

async function signUp(event) {
    event.preventDefault();
    const email = document.getElementById('signUpEmail').value.trim();
    const password = document.getElementById('signUpPassword').value.trim();
    const location = document.getElementById('signUpLocation').value.trim();
    const phone = document.getElementById('signUpPhone').value.trim();
    const role = document.getElementById('signUpRole').value;

    if (!isValidEmail(email)) {
        document.getElementById('signUpEmailError').innerText = 'Invalid Email format.';
        return;
    } else {
        document.getElementById('signUpEmailError').innerText = '';
    }

    if (password.length < 6) {
        document.getElementById('signUpPasswordError').innerText = 'Password must be at least 6 characters.';
        return;
    } else {
        document.getElementById('signUpPasswordError').innerText = '';
    }
    if (!isValidPhoneNumber(phone)) {
        document.getElementById('signUpPhoneError').innerText = 'Invalid Phone number.';
        return;
    } else {
        document.getElementById('signUpPhoneError').innerText = '';
    }

    const otp = generateOTP();
    sessionStorage.setItem('signUpData', JSON.stringify({ email, password, location, phone, role, otp }));
    document.getElementById('otpMessage').innerText = `Please enter the OTP sent to your email (for demo, it's: ${otp})`;
    toggleVisibility('authSection', 'otpPage');
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
}

function verifyOTP() {
    const enteredOTP = document.getElementById('otpInput').value.trim();
    const otpError = document.getElementById('otpError');
    const otpStatus = document.getElementById('otpStatus');
    const signUpData = JSON.parse(sessionStorage.getItem('signUpData'));

    if (!signUpData || enteredOTP === "") {
        otpError.innerText = "Invalid OTP or sign-up process incomplete.";
        return;
    }

    if (parseInt(enteredOTP) === signUpData.otp) {
        otpStatus.innerText = 'Verifying OTP...';
        otpStatus.classList.add('loading');

        setTimeout(() => {
            otpStatus.classList.remove('loading');
            // Store user data in local storage
            let users = JSON.parse(localStorage.getItem('clickngoUsers')) || [];
            const newUser = {
                email: signUpData.email,
                password: signUpData.password,
                location: signUpData.location,
                phone: signUpData.phone,
                role: signUpData.role
            };
            users.push(newUser);
            localStorage.setItem('clickngoUsers', JSON.stringify(users));

            otpStatus.innerText = 'OTP Verified! Registration successful.';
            sessionStorage.removeItem('signUpData');
            currentUser = newUser;
            localStorage.setItem('clickngoUser', JSON.stringify(currentUser));
            updateUIForSignedInUser(currentUser);
        }, 1500);
    } else {
        otpError.innerText = "Incorrect OTP. Please try again.";
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const loginError = document.getElementById('loginEmailError'); // Using email error for simplicity

    // Retrieve users from local storage
    const users = JSON.parse(localStorage.getItem('clickngoUsers')) || [];
    const user = users.find(user => user.email === email && user.password === password);

    if (user) {
        document.getElementById('authMessage').innerText = 'Login successful!';
        currentUser = user; // Simulate logged-in user
        localStorage.setItem('clickngoUser', JSON.stringify(currentUser));
        updateUIForSignedInUser(currentUser);
    } else {
        loginError.innerText = 'Invalid credentials.';
    }
}

function populateAccountInfo(user) {
    document.getElementById('accountEmail').innerText = user.email || "Not Provided";
    document.getElementById('userEmailDisplay').innerText = user.email || "User";
    document.getElementById('accountLocation').innerText = user.location || "Not Provided";
    document.getElementById('accountPhone').innerText = user.phone || "Not Provided";
    document.getElementById('userRole').innerText = user.role || "Not Provided";
    if (user.role === 'admin') {
        loadAllUsers();
    }
}

async function getUserProfile(email) {
    const users = JSON.parse(localStorage.getItem('clickngoUsers')) || [];
    return users.find(user => user.email === email);
}

function logout() {
    localStorage.removeItem('clickngoUser');
    currentUser = null;
    document.getElementById('authMessage').innerText = 'Logged out successfully!';
    resetApp();
    switchSection('homeSection'); // Go back to the home/auth section
}

function deleteAccount() {
    const userEmail = currentUser?.email;
    if (userEmail && confirm('Are you sure you want to delete your account?')) {
        let users = JSON.parse(localStorage.getItem('clickngoUsers')) || [];
        users = users.filter(user => user.email !== userEmail);
        localStorage.setItem('clickngoUsers', JSON.stringify(users));
        document.getElementById('authMessage').innerText = 'Account deleted!';
        logout(); // Also log out after deleting
    }
}

function resetApp() {
    document.getElementById('signupFormElem').reset();
    document.getElementById('loginFormElem').reset();
    toggleVisibility('appSection', 'authSection');
    document.querySelectorAll('.error-message').forEach(item => item.innerHTML = '');
}

function switchSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    if (sectionId === 'accountSection' && currentUser?.role === 'admin') {
        document.getElementById('adminSection').style.display = 'block';
        loadAllUsers();
    } else {
        document.getElementById('adminSection').style.display = 'none';
    }
    document.getElementById(sectionId).style.display = 'block';
    document.getElementById('authMessage').innerText = '';
    if (sectionId === 'orderItemsSection') {
        updateMap();
    }
}

function toggleAuth(formId) {
    document.getElementById('signUpForm').style.display = formId === 'signUpForm' ? 'block' : 'none';
    document.getElementById('loginForm').style.display = formId === 'loginForm' ? 'block' : 'none';
    document.getElementById('authMessage').innerText = '';
    document.getElementById('loginEmailError').innerText = ''; // Clear login error when toggling
    document.getElementById('signUpEmailError').innerText = ''; // Clear signup error when toggling
    document.getElementById('signUpPasswordError').innerText = '';
    document.getElementById('signUpPhoneError').innerText = '';
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
        const users = JSON.parse(localStorage.getItem('clickngoUsers')) || [];
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.innerHTML = `
                <p>Email: ${user.email}</p>
                <p>Location: ${user.location}</p>
                <p>Phone Number: ${user.phone}</p>
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
    const errorElement = document.getElementById(inputId + 'Error');
    if (errorElement) {
        errorElement.innerText = '';
    }
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
        const feedbackMessages = JSON.parse(localStorage.getItem('feedbackMessages')) || [];
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
    switchSection('orderHistorySection');
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
    const faqData = [
        {
            question: "What services do you provide?",
            answer: "We provide 12-hour motor-taxi and delivery services."
        },
        {
            question: "How can I place an order?",
            answer: "You can place an order through our Facebook page."
        },
        {
            question: "How do I contact support?",
            answer: "You can email us at clickngoservice@gmail.com or call us at 09165540988."
        }
    ];
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
    const location = currentUser?.location || 'Location Not Set';
    document.getElementById('userLocationDisplay').innerText = location;
    // Basic placeholder map (replace with actual map API)
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
